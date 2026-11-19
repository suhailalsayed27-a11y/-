import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle2, ShieldAlert, AlertTriangle, Loader2,
  ArrowRight, MessageSquare, Shield, Check, User,
  Banknote, Calendar, AlertCircle, XCircle, ImagePlus, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatYER } from '@/lib/commission';
import type { Order, OrderStatus, OrderLog } from '@/types';

const PROGRESS_STEPS: { status: string; label: string }[] = [
  { status: 'new', label: 'تم طلب الخدمة' },
  { status: 'in_progress', label: 'قيد التجهيز' },
  { status: 'awaiting_customer_confirmation', label: 'تم تسليم العمل' },
  { status: 'completed', label: 'مكتمل والمبلغ مودع' },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showClientConfirmModal, setShowClientConfirmModal] = useState(false); 
  
  const [disputeReason, setDisputeReason] = useState('لم يتم استلام الخدمة');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [deliverNote, setDeliverNote] = useState('');

  const fetchOrderData = useCallback(async () => {
    if (!id) return;
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*, listing:listings(*), client:profiles!orders_client_id_fkey(*), provider:profiles!orders_provider_id_fkey(*), dispute:disputes(*)')
        .eq('id', id)
        .single();

      if (orderErr) throw orderErr;
      setOrder(orderData as Order);

      const { data: logsData } = await supabase
        .from('order_logs')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true });

      setLogs((logsData as OrderLog[]) || []);
    } catch (err: any) {
      console.error('Error loading order detail:', err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderData();
    if (!id) return;

    const channel = supabase
      .channel(`realtime-order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, () => fetchOrderData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_logs', filter: `order_id=eq.${id}` }, () => fetchOrderData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchOrderData]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-600 mb-2" />
        <p className="text-slate-500 font-bold">جاري تحميل تفاصيل الطلب...</p>
      </div>
    );
  }

  if (!order || !profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <XCircle className="mx-auto h-16 w-16 text-error-500 mb-4" />
        <h2 className="text-xl font-black text-slate-800">الطلب غير موجود</h2>
        <Link to="/orders" className="btn-primary mt-4">العودة للطلبات</Link>
      </div>
    );
  }

  const isClient = profile.id === order.client_id;
  const isProvider = profile.id === order.provider_id;

  const getNormalizedStatus = (status: string) => {
    if (['new', 'pending', 'idle', 'pending_payment', 'paid', 'waiting_for_provider'].includes(status)) return 'new';
    if (['accepted', 'in_progress'].includes(status)) return 'in_progress';
    if (['provider_completed', 'awaiting_customer_confirmation'].includes(status)) return 'awaiting_customer_confirmation';
    if (['completed', 'completed_by_customer', 'resolved'].includes(status)) return 'completed';
    return status;
  };

  const getStepStatus = (stepStatus: string) => {
    if (order.status === 'cancelled' || order.status === 'disputed' || order.status === 'refunded') return 'disabled';
    const orderStatusOrder = ['new', 'in_progress', 'awaiting_customer_confirmation', 'completed'];
    const currentNorm = getNormalizedStatus(order.status);
    const stepNorm = getNormalizedStatus(stepStatus);
    const currentIndex = orderStatusOrder.indexOf(currentNorm);
    const stepIndex = orderStatusOrder.indexOf(stepNorm);

    if (currentNorm === 'completed' || currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  // --- الإجراءات (RPC) ---
  
  // قبول الطلب وبدء العمل
  const handleStartOrder = async () => {
    setActionLoading(true); setActionError(null);
    const { error } = await supabase.rpc('start_order', { p_order_id: order.id });
    setActionLoading(false);
    if (error) setActionError(error.message);
  };

  // تسليم العمل
  const handleDeliverOrder = async () => {
    setActionLoading(true); setActionError(null);
    const { error } = await supabase.rpc('deliver_order', { p_order_id: order.id });
    setActionLoading(false);
    setShowDeliverModal(false);
    if (error) setActionError(error.message);
  };

  // تأكيد إنجاز العمل (نعم، تم استلام الخدمة)
  const handleConfirmCompletion = async () => {
    setActionLoading(true); setActionError(null);
    const { error } = await supabase.rpc('accept_order', { p_order_id: order.id });
    setActionLoading(false);
    if (error) setActionError(error.message);
  };

  // اختيار صورة الدليل للنزاع
  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setActionError('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
      return;
    }
    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
  };

  // فتح نزاع بنفس رقم الطلب مع إمكانية إرفاق صورة
  const handleOpenDispute = async () => {
    const finalReason = disputeReason.trim() || 'لم يتم استلام الخدمة';
    if (!disputeDetails.trim()) {
      setActionError('يرجى كتابة تفاصيل النزاع والمشكلة');
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      let evidenceUrl: string | null = null;

      if (evidenceFile) {
        const fileExt = evidenceFile.name.split('.').pop();
        const filePath = `${order.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('dispute-evidence')
          .upload(filePath, evidenceFile);

        if (uploadError) {
          throw new Error('فشل رفع الصورة: ' + uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('dispute-evidence')
          .getPublicUrl(filePath);

        evidenceUrl = urlData.publicUrl;
      }

      const { error } = await supabase.rpc('dispute_order', {
        p_order_id: order.id,
        p_reason: finalReason,
        p_details: disputeDetails.trim(),
        p_evidence_url: evidenceUrl,
      });

      if (error) throw error;

      // ضمان تطابق رقم النزاع مع رقم الطلب وحفظ رابط الصورة
      await supabase
        .from('disputes')
        .update({ id: order.id, evidence_url: evidenceUrl })
        .eq('order_id', order.id);

      setShowDisputeModal(false);
      setDisputeDetails('');
      setEvidenceFile(null);
      setEvidencePreview(null);
      await fetchOrderData();
    } catch (err: any) {
      setActionError(err.message || 'حدث خطأ أثناء فتح النزاع');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('هل أنت متأكد من رفض/إلغاء هذا الطلب واسترداد المبلغ للعميل؟')) return;
    setActionLoading(true); setActionError(null);
    const { error } = await supabase.rpc('cancel_order', { p_order_id: order.id });
    setActionLoading(false);
    if (error) setActionError(error.message);
  };

  const otherParty = isClient ? order.provider : order.client;
  const activeDispute = Array.isArray(order.dispute) ? order.dispute[0] : (order.dispute as any);

  return (
    <div className="pb-24 pt-6 max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <Link to="/orders" className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowRight size={18} /> العودة لجميع الطلبات
        </Link>
        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
          طلب #{order.id.slice(0, 8)}
        </span>
      </div>

      {actionError && (
        <div className="mb-6 rounded-2xl bg-error-50 p-4 text-sm text-error-700 flex items-center justify-between border border-error-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold text-xs underline">تجاهل</button>
        </div>
      )}

      {/* Main Order Header Card */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 font-bold text-2xl border border-primary-100">
              {otherParty?.avatar_url ? (
                <img src={otherParty.avatar_url} alt={otherParty.full_name} className="h-full w-full object-cover rounded-2xl" />
              ) : (
                otherParty?.full_name?.charAt(0) || '?'
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-md mb-2 inline-block">
                {isClient ? 'مقدم الخدمة' : 'طالب الخدمة'}
              </span>
              <h1 className="text-xl font-black text-slate-800">{order.listing?.service_name || 'خدمة مهارة'}</h1>
              <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5 mt-1">
                <User size={14} /> {otherParty?.full_name}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:items-end justify-center bg-slate-50 md:bg-transparent p-4 md:p-0 rounded-2xl">
            <span className="text-xs text-slate-400 font-bold mb-1">
              {isClient ? 'المبلغ الإجمالي المحجوز' : 'المبلغ المتفق عليه لك'}
            </span>
            <div className="text-2xl font-black text-primary-600">
              {formatYER(isClient ? order.customer_total : order.provider_net)}{' '}
              <span className="text-xs text-slate-400 font-bold">ر.ي</span>
            </div>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        {order.status !== 'cancelled' && order.status !== 'disputed' ? (
          <div className="pt-6">
            <h3 className="text-xs font-bold text-slate-400 mb-4">مراحل تقدم الطلب (مزامنة تلقائية)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PROGRESS_STEPS.map((step, idx) => {
                const state = getStepStatus(step.status);
                return (
                  <div
                    key={step.status}
                    className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                      state === 'completed'
                        ? 'bg-success-50/50 border-success-200 text-success-800'
                        : state === 'current'
                        ? 'bg-primary-50 border-primary-300 text-primary-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black">المرحلة {idx + 1}</span>
                      {state === 'completed' ? (
                        <CheckCircle2 size={16} className="text-success-600" />
                      ) : state === 'current' ? (
                        <Loader2 size={16} className="animate-spin text-primary-600" />
                      ) : (
                        <Clock size={16} />
                      )}
                    </div>
                    <span className="text-xs font-bold leading-snug">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`mt-6 p-4 rounded-2xl space-y-3 ${
            order.status === 'cancelled' ? 'bg-error-50 text-error-700' : 'bg-orange-50 text-orange-800 border border-orange-200'
          }`}>
            <div className="flex items-center gap-3">
              <AlertCircle className="shrink-0" size={24} />
              <div>
                <h4 className="font-bold text-sm">
                  {order.status === 'cancelled'
                    ? 'الطلب ملغي'
                    : `الطلب قيد مراجعة النزاع (رقم النزاع: #${order.id.slice(0, 8)})`}
                </h4>
                <p className="text-xs opacity-90">
                  {order.status === 'cancelled'
                    ? 'تم إلغاء هذا الطلب وإعادة الأموال المحجوزة.'
                    : 'تم إيقاف تحويل الأموال وتجري الآن مراجعة المشكلة من الإدارة.'}
                </p>
              </div>
            </div>

            {order.status === 'disputed' && activeDispute && (
              <div className="rounded-xl bg-white/80 p-3 text-xs space-y-1.5 border border-orange-200/70">
                <p><strong className="text-slate-700">السبب:</strong> {activeDispute.reason}</p>
                {activeDispute.details && <p><strong className="text-slate-700">التفاصيل:</strong> {activeDispute.details}</p>}
                {activeDispute.evidence_url && (
                  <div className="pt-1">
                    <p className="font-bold text-slate-700 mb-1">الصورة المرفقة:</p>
                    <a href={activeDispute.evidence_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={activeDispute.evidence_url}
                        alt="دليل النزاع"
                        className="max-h-48 rounded-lg border border-slate-200 object-contain"
                      />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Action Card based on Role & State */}
          <div className="card p-6 bg-gradient-to-br from-white to-slate-50/80">
            <h2 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
              <Shield size={18} className="text-primary-600" /> الإجراءات المتاحة
            </h2>

            <div className="flex flex-wrap gap-3">
              {/* أزرار مقدم الخدمة فقط */}
              {isProvider && (order.status === 'new' || order.status === 'pending_payment' || order.status === 'paid' || order.status === 'waiting_for_provider') && (
                <>
                  <button onClick={handleStartOrder} disabled={actionLoading} className="btn-primary flex-1 sm:flex-none">
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} قبول الطلب وبدء العمل
                  </button>
                  <button onClick={handleCancelOrder} disabled={actionLoading} className="btn-ghost !bg-error-50 !text-error-600 flex-1 sm:flex-none">
                    رفض الطلب
                  </button>
                </>
              )}

              {isProvider && order.status === 'in_progress' && (
                <>
                  <button onClick={() => setShowDeliverModal(true)} disabled={actionLoading} className="btn-primary !bg-success-600">
                    <CheckCircle2 size={16} /> تم تسليم العمل
                  </button>
                  <button
                    onClick={() => {
                      setDisputeReason('مشكلة أثناء تنفيذ الطلب');
                      setShowDisputeModal(true);
                    }}
                    disabled={actionLoading}
                    className="btn-ghost !bg-error-50 !text-error-600"
                  >
                    <ShieldAlert size={16} /> فتح نزاع
                  </button>
                </>
              )}

              {/* أزرار العميل فقط */}
              {isClient && (order.status === 'awaiting_customer_confirmation' || order.status === 'provider_completed') && (
                <button onClick={() => setShowClientConfirmModal(true)} disabled={actionLoading} className="btn-primary !bg-success-600 w-full sm:w-auto">
                  <CheckCircle2 size={16} /> تأكيد إنجاز العمل
                </button>
              )}

              {isClient && order.status === 'in_progress' && (
                <button
                  onClick={() => {
                    setDisputeReason('تأخر أو مشكلة في تنفيذ الخدمة');
                    setShowDisputeModal(true);
                  }}
                  disabled={actionLoading}
                  className="btn-ghost !bg-error-50 !text-error-600"
                >
                  <ShieldAlert size={16} /> فتح نزاع
                </button>
              )}

              {isClient && (order.status === 'new' || order.status === 'pending_payment' || order.status === 'paid') && (
                <button onClick={handleCancelOrder} disabled={actionLoading} className="btn-ghost !bg-error-50 !text-error-600">
                  إلغاء الطلب 
                </button>
              )}
            </div>
          </div>

          {/* Timeline Logs */}
          <div className="card p-6">
            <h2 className="text-base font-black text-slate-800 mb-6 flex items-center gap-2">
              <Calendar size={18} className="text-primary-600" /> السجل الزمني للتحديثات
            </h2>

            <div className="relative border-r-2 border-slate-100 pr-6 mr-3 space-y-6">
              <div className="relative">
                <div className="absolute -right-[31px] top-0 h-4 w-4 rounded-full bg-primary-600 ring-4 ring-white" />
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">طلب جديد</h4>
                    <span className="text-[10px] text-slate-400 dir-ltr font-mono">
                      {new Date(order.created_at).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">تم إرسال الطلب وحجز المبلغ.</p>
                </div>
              </div>

              {logs.map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -right-[31px] top-0 h-4 w-4 rounded-full bg-primary-600 ring-4 ring-white" />
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-800">{log.title}</h4>
                      <span className="text-[10px] text-slate-400 dir-ltr font-mono">
                        {new Date(log.created_at).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {log.description && <p className="text-xs text-slate-500 mt-1">{log.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Financial Info */}
        <div className="space-y-6">
          <div className="card p-6 bg-slate-50 border border-slate-200/60">
            <h3 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5"><Shield size={14}/> حماية الأمانة</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-bold">
              لا يتم تحويل المبلغ إلى مقدم الخدمة إلا بعد تأكيد العميل استلام الخدمة. وفي حال وجود مشكلة، يمكنك فتح نزاع لتعليق المبلغ.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Modal: Client Confirmation (Yes/No) */}
      {showClientConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !actionLoading && setShowClientConfirmModal(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-scale-up text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 mb-4">
              <CheckCircle2 size={32} className="text-primary-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">تأكيد إنجاز العمل</h3>
            <p className="text-base font-bold text-slate-700 mb-8">هل تم تسليمك الخدمة التي طلبتها؟</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowClientConfirmModal(false);
                  handleConfirmCompletion();
                }}
                disabled={actionLoading}
                className="btn-primary w-full !bg-success-600 !h-12 !text-base"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'نعم، تم استلام الخدمة'}
              </button>

              <button
                onClick={() => {
                  setShowClientConfirmModal(false);
                  setDisputeReason('لم يتم استلام الخدمة');
                  setShowDisputeModal(true);
                }}
                disabled={actionLoading}
                className="btn-ghost w-full !bg-error-50 !text-error-700 !h-12 !text-base"
              >
                لا، لم يتم استلام الخدمة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Deliver Work (For Provider) */}
      {showDeliverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !actionLoading && setShowDeliverModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800 mb-2">تأكيد تسليم العمل</h3>
            <p className="text-xs text-slate-500 mb-4">بمجرد التأكيد، سيصل إشعار للعميل لمراجعة العمل والموافقة لتحويل رصيدك.</p>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowDeliverModal(false)} disabled={actionLoading} className="btn-ghost flex-1 !bg-slate-100">إلغاء</button>
              <button onClick={handleDeliverOrder} disabled={actionLoading} className="btn-primary flex-1 !bg-success-600">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'تأكيد التسليم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Open Dispute */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !actionLoading && setShowDisputeModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-100 text-error-600 shrink-0">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">فتح نزاع حول الطلب</h3>
                <p className="text-xs text-slate-500">رقم الطلب والنزاع: <span className="font-mono font-bold">#{order.id.slice(0, 8)}</span></p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">عنوان / سبب النزاع *</label>
                <input
                  type="text"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="مثال: لم يتم استلام الخدمة"
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">تفاصيل المشكلة *</label>
                <textarea
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  placeholder="اشرح المشكلة بالتفصيل (مثال: الخدمة لم تكتمل أو غير مطابقة)..."
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs focus:ring-2 focus:ring-primary-500 outline-none h-28 resize-none"
                />
              </div>

              {/* إرفاق صورة للنزاع */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  إرفاق صورة توضيحية / دليل (اختياري - بحد أقصى 5MB)
                </label>
                {!evidencePreview ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-colors">
                    <ImagePlus size={22} className="text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-600">اضغط لاختيار صورة من جهازك</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEvidenceChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative rounded-2xl border border-slate-200 p-2 bg-slate-50">
                    <img
                      src={evidencePreview}
                      alt="معاينة الصورة"
                      className="max-h-40 w-full rounded-xl object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setEvidenceFile(null); setEvidencePreview(null); }}
                      className="absolute top-3 left-3 flex h-7 w-7 items-center justify-center rounded-full bg-error-600 text-white shadow"
                      title="إزالة الصورة"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowDisputeModal(false)} disabled={actionLoading} className="btn-ghost flex-1 !bg-slate-100">تراجع</button>
              <button onClick={handleOpenDispute} disabled={actionLoading || !disputeDetails.trim()} className="btn-primary flex-1 !bg-error-600 disabled:opacity-50">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : 'تأكيد فتح النزاع'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}