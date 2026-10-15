import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Inbox, Clock, CheckCircle, XCircle, Loader2, AlertTriangle,
  Timer, MessageSquare, Shield, X, Image as ImageIcon, type LucideIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatYER } from '@/lib/commission';
import type { Order, OrderStatus } from '@/types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  new: { label: 'طلب جديد', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  in_progress: { label: 'قيد التنفيذ', color: 'text-accent-700', bg: 'bg-accent-100', icon: Loader2 },
  provider_completed: { label: 'تم الإنجاز', color: 'text-accent-700', bg: 'bg-accent-100', icon: CheckCircle },
  awaiting_customer_confirmation: { label: 'بانتظار تأكيد العميل', color: 'text-orange-700', bg: 'bg-orange-100', icon: Timer },
  pending_payment: { label: 'بانتظار الدفع', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  paid: { label: 'تم الدفع', color: 'text-success-700', bg: 'bg-success-100', icon: CheckCircle },
  waiting_for_provider: { label: 'بانتظار مقدم الخدمة', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  accepted: { label: 'تم القبول', color: 'text-accent-700', bg: 'bg-accent-100', icon: CheckCircle },
  completed_by_customer: { label: 'أكد العميل الاستلام', color: 'text-success-700', bg: 'bg-success-100', icon: CheckCircle },
  protection_period: { label: 'فترة حماية 48 ساعة', color: 'text-orange-700', bg: 'bg-orange-100', icon: Timer },
  resolved: { label: 'تم حل النزاع', color: 'text-success-700', bg: 'bg-success-100', icon: CheckCircle },
  refunded: { label: 'تم الاسترداد', color: 'text-slate-700', bg: 'bg-slate-200', icon: XCircle },
  completed: { label: 'مكتمل', color: 'text-success-700', bg: 'bg-success-100', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'text-error-700', bg: 'bg-error-100', icon: XCircle },
  disputed: { label: 'نزاع', color: 'text-error-700', bg: 'bg-error-100', icon: AlertTriangle },
  confirmation_expired: { label: 'انتهت مهلة التأكيد', color: 'text-slate-700', bg: 'bg-slate-200', icon: Clock },
};

function formatTimeRemaining(deadline: string): string {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;
  if (diff <= 0) return 'انتهت المهلة';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `متبقي ${hours} ساعة و${minutes} دقيقة`;
  return `متبقي ${minutes} دقيقة`;
}

export default function OrdersPage() {
  const { profile, session, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showDisputeModal, setShowDisputeModal] = useState<string | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetails, setDisputeDetails] = useState('');
  const [completeNote, setCompleteNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Tick every 30 seconds to update countdown timers
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth/signin', { state: { from: '/orders' } });
    }
  }, [session, loading, navigate]);

  const loadOrders = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('orders')
      .select('*, listing:listings(*, category:categories(*)), client:profiles!orders_client_id_fkey(*), provider:profiles!orders_provider_id_fkey(*), dispute:disputes(*)')
      .or(`client_id.eq.${profile.id},provider_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) || []);
    setLoadingOrders(false);
  }, [profile]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  const handleAccept = async (orderId: string) => {
    setActionLoading(true);
    setActionError(null);
    const { error } = await supabase.rpc('accept_order', { p_order_id: orderId });
    setActionLoading(false);
    if (error) { setActionError(error.message); return; }
    loadOrders();
  };

  const handleComplete = async () => {
    if (!showCompleteModal) return;
    setActionLoading(true);
    setActionError(null);
    const { error } = await supabase.rpc('provider_complete_order', {
      p_order_id: showCompleteModal,
      p_note: completeNote || null,
      p_evidence: [],
    });
    setActionLoading(false);
    if (error) { setActionError(error.message); return; }
    setShowCompleteModal(null);
    setCompleteNote('');
    loadOrders();
  };

  const handleConfirm = async (orderId: string) => {
    setActionLoading(true);
    setActionError(null);
    const { error } = await supabase.rpc('customer_confirm_order', { p_order_id: orderId });
    setActionLoading(false);
    if (error) { setActionError(error.message); return; }
    loadOrders();
  };

  const handleDispute = async () => {
    if (!showDisputeModal) return;
    if (!disputeReason.trim() || !disputeDetails.trim()) {
      setActionError('يرجى ملء جميع الحقول');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    const { error } = await supabase.rpc('open_dispute', {
      p_order_id: showDisputeModal,
      p_reason: disputeReason.trim(),
      p_details: disputeDetails.trim(),
      p_evidence: [],
    });
    setActionLoading(false);
    if (error) { setActionError(error.message); return; }
    setShowDisputeModal(null);
    setDisputeReason('');
    setDisputeDetails('');
    loadOrders();
  };

  const handleCancel = async (orderId: string) => {
    setActionLoading(true);
    setActionError(null);
    const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId, p_reason: null });
    setActionLoading(false);
    if (error) { setActionError(error.message); return; }
    loadOrders();
  };

  const handleContact = async (order: Order) => {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', order.listing_id)
      .or(`and(user1_id.eq.${order.client_id},user2_id.eq.${order.provider_id}),and(user1_id.eq.${order.provider_id},user2_id.eq.${order.client_id})`)
      .maybeSingle();
    if (existing) {
      navigate(`/messages?conv=${existing.id}`);
      return;
    }
    const otherId = profile?.id === order.client_id ? order.provider_id : order.client_id;
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ listing_id: order.listing_id, user1_id: profile?.id, user2_id: otherId })
      .select('id')
      .single();
    if (newConv) navigate(`/messages?conv=${newConv.id}`);
  };

  if (!session) return null;

  const filterTabs: { key: OrderStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'new', label: 'جديدة' },
    { key: 'in_progress', label: 'قيد التنفيذ' },
    { key: 'awaiting_customer_confirmation', label: 'بانتظار التأكيد' },
    { key: 'completed', label: 'مكتملة' },
    { key: 'cancelled', label: 'ملغاة' },
    { key: 'disputed', label: 'نزاعات' },
  ];

  return (
    <div className="pb-20 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-black text-slate-800 mb-1">الطلبات</h1>
        <p className="text-slate-500 mb-6">إدارة طلبات الخدمات الخاصة بك</p>

        {actionError && (
          <div className="mb-4 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700 flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)}><X size={16} /></button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                filter === tab.key ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              {tab.key !== 'all' && (
                <span className="mr-1.5 text-xs opacity-75">
                  ({orders.filter((o) => o.status === tab.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {loadingOrders ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-6 w-1/3 rounded bg-slate-200 mb-3" />
                <div className="h-4 w-1/2 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Inbox size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد طلبات</h3>
            <p className="text-sm text-slate-400 mb-4">ليس لديك طلبات في هذه الحالة</p>
            <Link to="/services" className="btn-primary">تصفح الخدمات</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const config = STATUS_CONFIG[order.status];
              const StatusIcon = config.icon;
              const isProvider = profile?.id === order.provider_id;
              const isClient = profile?.id === order.client_id;
              const otherParty = isProvider ? order.client : order.provider;

              return (
                <div key={order.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {otherParty?.avatar_url ? (
                        <img
                          src={otherParty.avatar_url}
                          alt={otherParty.full_name}
                          className="h-12 w-12 rounded-xl object-cover shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-lg font-bold text-primary-700 shrink-0 ${otherParty?.avatar_url ? 'hidden' : ''}`}>
                        {otherParty?.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/listings/${order.listing_id}`} className="font-bold text-slate-800 hover:text-primary-600 transition-colors block truncate">
                          {order.listing?.service_name || 'خدمة'}
                        </Link>
                        <p className="text-sm text-slate-500 truncate">
                          {isProvider ? 'من' : 'إلى'}: {otherParty?.full_name}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`badge ${config.bg} ${config.color}`}>
                            <StatusIcon size={12} />
                            {config.label}
                          </span>
                          {order.listing?.city && (
                            <span className="text-xs text-slate-400">{order.listing.city}</span>
                          )}
                          <span className="text-xs text-slate-400">
                            {new Date(order.created_at).toLocaleDateString('ar-EG')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="text-sm font-black text-primary-600">
                        {formatYER(order.service_price)}
                      </span>
                      <span className="text-xs text-slate-400 mr-1">ر.ي</span>
                    </div>
                  </div>

                  {/* Fee breakdown for provider */}
                  {isProvider && order.status !== 'cancelled' && (
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                      <div>
                        <p className="text-[10px] text-slate-400">قيمة الخدمة</p>
                        <p className="text-sm font-bold text-slate-700">{formatYER(order.service_price)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">رسوم مَهَرَة</p>
                        <p className="text-sm font-bold text-error-600">- {formatYER(order.provider_fee)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">المستحق لك</p>
                        <p className="text-sm font-bold text-success-600">{formatYER(order.provider_net)}</p>
                      </div>
                    </div>
                  )}

                  {/* Fee breakdown for client */}
                  {isClient && order.status !== 'cancelled' && (
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                      <div>
                        <p className="text-[10px] text-slate-400">قيمة الخدمة</p>
                        <p className="text-sm font-bold text-slate-700">{formatYER(order.service_price)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">رسوم مَهَرَة</p>
                        <p className="text-sm font-bold text-accent-600">+ {formatYER(order.customer_fee)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">الإجمالي</p>
                        <p className="text-sm font-bold text-primary-600">{formatYER(order.customer_total)}</p>
                      </div>
                    </div>
                  )}

                  {/* 48h countdown timer */}
                  {order.status === 'awaiting_customer_confirmation' && order.confirmation_deadline && (
                    <div className="mt-3 rounded-xl bg-orange-50 border border-orange-100 p-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-orange-700">
                        <Timer size={16} className="animate-pulse" />
                        {isClient
                          ? 'تم إبلاغنا بأن الخدمة اكتملت. يرجى تأكيد الاستلام.'
                          : 'بانتظار تأكيد العميل'}
                      </div>
                      <p className="text-xs text-orange-600 mt-1 font-medium">
                        {formatTimeRemaining(order.confirmation_deadline)} لتأكيد الاستلام
                      </p>
                    </div>
                  )}

                  {/* Completion note from provider */}
                  {order.completion_note && order.status !== 'cancelled' && (
                    <div className="mt-3 rounded-xl bg-accent-50 p-3">
                      <p className="text-xs font-bold text-accent-700 mb-1">ملاحظة مقدم الخدمة:</p>
                      <p className="text-sm text-slate-600">{order.completion_note}</p>
                    </div>
                  )}

                  {/* Dispute info */}
                  {order.status === 'disputed' && order.dispute && (
                    <div className="mt-3 rounded-xl bg-error-50 border border-error-100 p-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-error-700 mb-1">
                        <AlertTriangle size={16} />
                        النزاع: {order.dispute.reason}
                      </div>
                      <p className="text-xs text-slate-600">{order.dispute.details}</p>
                      {order.dispute.status !== 'open' && order.dispute.admin_resolution && (
                        <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-error-100">
                          قرار الأدمن: {order.dispute.admin_resolution}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Cancel info */}
                  {order.status === 'cancelled' && order.cancel_reason && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                      سبب الإلغاء: {order.cancel_reason}
                    </div>
                  )}

                  {/* Payment status */}
                  {order.status !== 'cancelled' && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5">
                        الدفع: {order.payment_status === 'not_connected' ? 'بانتظار ربط بوابة الدفع' : order.payment_status}
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                    <button
                      onClick={() => handleContact(order)}
                      className="flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700"
                    >
                      <MessageSquare size={14} />
                      مراسلة
                    </button>

                    <div className="flex gap-2 flex-wrap">
                      {/* Provider: accept new order */}
                      {isProvider && order.status === 'new' && (
                        <>
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={actionLoading}
                            className="btn-ghost !bg-error-50 !text-error-600 !px-3 !py-1.5 !text-xs"
                          >
                            رفض
                          </button>
                          <button
                            onClick={() => handleAccept(order.id)}
                            disabled={actionLoading}
                            className="btn-primary !px-3 !py-1.5 !text-xs"
                          >
                            قبول الطلب
                          </button>
                        </>
                      )}

                      {/* Provider: mark complete */}
                      {isProvider && order.status === 'in_progress' && (
                        <button
                          onClick={() => setShowCompleteModal(order.id)}
                          disabled={actionLoading}
                          className="btn-primary !px-3 !py-1.5 !text-xs"
                        >
                          <CheckCircle size={14} />
                          تم إنجاز الخدمة
                        </button>
                      )}

                      {/* Client: confirm or dispute */}
                      {isClient && order.status === 'awaiting_customer_confirmation' && (
                        <>
                          <button
                            onClick={() => setShowDisputeModal(order.id)}
                            disabled={actionLoading}
                            className="btn-ghost !bg-error-50 !text-error-600 !px-3 !py-1.5 !text-xs"
                          >
                            <AlertTriangle size={14} />
                            لم أستلم / نزاع
                          </button>
                          <button
                            onClick={() => handleConfirm(order.id)}
                            disabled={actionLoading}
                            className="btn-primary !bg-success-600 !px-3 !py-1.5 !text-xs"
                          >
                            <CheckCircle size={14} />
                            تم الاستلام
                          </button>
                        </>
                      )}

                      {/* Client: cancel new order */}
                      {isClient && order.status === 'new' && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={actionLoading}
                          className="btn-ghost !bg-error-50 !text-error-600 !px-3 !py-1.5 !text-xs"
                        >
                          إلغاء الطلب
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dispute modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => !actionLoading && setShowDisputeModal(null)}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-100">
                <AlertTriangle size={20} className="text-error-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">فتح نزاع</h3>
                <p className="text-xs text-slate-500">سيتم مراجعة النزاع من قبل الإدارة</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">سبب النزاع *</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="input-field"
                >
                  <option value="">اختر السبب...</option>
                  <option value="لم أستلم الخدمة">لم أستلم الخدمة</option>
                  <option value="جودة الخدمة غير مطابقة">جودة الخدمة غير مطابقة</option>
                  <option value="تأخر في التسليم">تأخر في التسليم</option>
                  <option value="خدمة مختلفة عما تم الاتفاق عليه">خدمة مختلفة عما تم الاتفاق عليه</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">تفاصيل المشكلة *</label>
                <textarea
                  value={disputeDetails}
                  onChange={(e) => setDisputeDetails(e.target.value)}
                  placeholder="اشرح بالتفصيل ما حدث..."
                  rows={4}
                  className="input-field resize-none"
                  maxLength={1000}
                />
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <ImageIcon size={14} className="text-slate-400" />
                  إرفاق الأدلة (صور/ملفات) سيتوفر قريباً
                </p>
              </div>
              {actionError && (
                <p className="text-sm text-error-600 bg-error-50 rounded-xl p-3">{actionError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDisputeModal(null); setDisputeReason(''); setDisputeDetails(''); setActionError(null); }}
                  disabled={actionLoading}
                  className="btn-ghost flex-1 !bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDispute}
                  disabled={actionLoading}
                  className="btn-primary flex-1 !bg-error-600"
                >
                  {actionLoading ? (
                    <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جاري...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Shield size={16} /> فتح النزاع</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => !actionLoading && setShowCompleteModal(null)}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100">
                <CheckCircle size={20} className="text-success-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">تأكيد إنجاز الخدمة</h3>
                <p className="text-xs text-slate-500">سيبدأ عداد 48 ساعة لتأكيد العميل</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات الإنجاز (اختياري)</label>
                <textarea
                  value={completeNote}
                  onChange={(e) => setCompleteNote(e.target.value)}
                  placeholder="أضف تفاصيل عن ما تم إنجازه..."
                  rows={3}
                  className="input-field resize-none"
                  maxLength={500}
                />
              </div>
              <div className="rounded-xl bg-orange-50 p-3">
                <p className="text-xs text-orange-700">
                  بعد التأكيد سيكون لدى العميل 48 ساعة لتأكيد الاستلام أو فتح نزاع.
                  إذا لم يرد العميل خلال 48 ساعة، يصبح الطلب مؤهلاً للتسوية.
                </p>
              </div>
              {actionError && (
                <p className="text-sm text-error-600 bg-error-50 rounded-xl p-3">{actionError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCompleteModal(null); setCompleteNote(''); setActionError(null); }}
                  disabled={actionLoading}
                  className="btn-ghost flex-1 !bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="btn-primary flex-1 !bg-success-600"
                >
                  {actionLoading ? (
                    <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جاري...</span>
                  ) : (
                    <span className="flex items-center gap-2"><CheckCircle size={16} /> تأكيد الإنجاز</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
