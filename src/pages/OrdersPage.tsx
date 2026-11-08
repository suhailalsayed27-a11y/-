import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Inbox, Clock, CheckCircle, XCircle, Loader2, AlertTriangle,
  Timer, MessageSquare, Shield, X, Play, ShieldAlert,
  type LucideIcon, LayoutList
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatYER } from '@/lib/commission';
import type { Order, OrderStatus } from '@/types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  new: { label: 'طلب جديد', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  in_progress: { label: 'قيد التنفيذ', color: 'text-accent-700', bg: 'bg-accent-100', icon: Loader2 },
  provider_completed: { label: 'تم الإنجاز', color: 'text-accent-700', bg: 'bg-accent-100', icon: CheckCircle },
  awaiting_customer_confirmation: { label: 'بانتظار التأكيد', color: 'text-orange-700', bg: 'bg-orange-100', icon: Timer },
  pending_payment: { label: 'بانتظار الدفع', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  paid: { label: 'تم الدفع', color: 'text-success-700', bg: 'bg-success-100', icon: CheckCircle },
  waiting_for_provider: { label: 'بانتظار مقدم الخدمة', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  accepted: { label: 'تم القبول', color: 'text-accent-700', bg: 'bg-accent-100', icon: CheckCircle },
  completed_by_customer: { label: 'أكد العميل الاستلام', color: 'text-success-700', bg: 'bg-success-100', icon: CheckCircle },
  protection_period: { label: 'فترة حماية', color: 'text-orange-700', bg: 'bg-orange-100', icon: Timer },
  resolved: { label: 'تم حل النزاع', color: 'text-success-700', bg: 'bg-success-100', icon: CheckCircle },
  refunded: { label: 'تم الاسترداد', color: 'text-slate-700', bg: 'bg-slate-200', icon: XCircle },
  completed: { label: 'مكتمل', color: 'text-success-700', bg: 'bg-success-100', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'text-error-700', bg: 'bg-error-100', icon: XCircle },
  disputed: { label: 'نزاع', color: 'text-error-700', bg: 'bg-error-100', icon: AlertTriangle },
  confirmation_expired: { label: 'انتهت مهلة التأكيد', color: 'text-slate-700', bg: 'bg-slate-200', icon: Clock },
};

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
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          listing:listings(*, category:categories(*)),
          client:client_id(*),
          provider:provider_id(*),
          dispute:disputes(*)
        `)
        .or(`client_id.eq.${profile.id},provider_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setOrders((data as unknown as Order[]) || []);
    } catch (err: any) {
      console.error('Error loading orders:', err.message);
    } finally {
      setLoadingOrders(false);
    }
  }, [profile]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // تحديث فلاتر الحالات لدمج الحالات المترادفة
  const filtered = orders.filter((o) => {
    if (filter === 'all') return true;
    
    // دمج حالات الطلب الجديد للظهور تحت تصنيف "جديدة"
    if (filter === 'new') {
      return ['new', 'pending_payment', 'paid', 'waiting_for_provider'].includes(o.status);
    }
    // دمج حالات التنفيذ للظهور تحت "قيد التنفيذ"
    if (filter === 'in_progress') {
      return ['accepted', 'in_progress'].includes(o.status);
    }
    // دمج حالات الانتهاء للظهور تحت "مكتملة"
    if (filter === 'completed') {
      return ['completed', 'completed_by_customer', 'resolved'].includes(o.status);
    }
    
    return o.status === filter;
  });

  // دوال التحكم الجديدة المربوطة بـ RPC
  const handleStart = async (orderId: string) => {
    setActionLoading(true); setActionError(null);
    const { error } = await supabase.rpc('start_order', { p_order_id: orderId });
    setActionLoading(false);
    if (error) { setActionError(error.message); return; }
    loadOrders();
  };

  const handleDeliver = async () => {
    if (!showCompleteModal) return;
    setActionLoading(true); setActionError(null);
    const { error } = await supabase.rpc('deliver_order', { p_order_id: showCompleteModal });
    setActionLoading(false);
    if (error) { setActionError(error.message); return; }
    setShowCompleteModal(null);
    setCompleteNote('');
    loadOrders();
  };

  const handleAccept = async (orderId: string) => {
    setActionLoading(true); setActionError(null);
    const { error } = await supabase.rpc('accept_order', { p_order_id: orderId });
    setActionLoading(false);
    if (error) { setActionError(error.message); return; }
    loadOrders();
  };

  const handleDispute = async () => {
    if (!showDisputeModal) return;
    setActionLoading(true); setActionError(null);
    const { error } = await supabase.rpc('dispute_order', { p_order_id: showDisputeModal });
    setActionLoading(false);
    if (error) { setActionError(error.message); return; }
    setShowDisputeModal(null);
    setDisputeReason('');
    setDisputeDetails('');
    loadOrders();
  };

  const handleCancel = async (orderId: string) => {
    setActionLoading(true); setActionError(null);
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
    if (existing) { navigate(`/messages?conv=${existing.id}`); return; }
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
    <div className="pb-24 md:pb-12 min-h-screen relative">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-black text-slate-800 mb-1">الطلبات</h1>
        <p className="text-slate-500 mb-6">إدارة طلبات الخدمات الخاصة بك كمقدم خدمة أو عميل</p>

        {actionError && (
          <div className="mb-4 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700 flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)}><X size={16} /></button>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
          {filterTabs.map((tab) => {
            // Count logic based on merged statuses
            let count = 0;
            if (tab.key === 'all') count = orders.length;
            else if (tab.key === 'new') count = orders.filter(o => ['new', 'pending_payment', 'paid', 'waiting_for_provider'].includes(o.status)).length;
            else if (tab.key === 'in_progress') count = orders.filter(o => ['accepted', 'in_progress'].includes(o.status)).length;
            else if (tab.key === 'completed') count = orders.filter(o => ['completed', 'completed_by_customer', 'resolved'].includes(o.status)).length;
            else count = orders.filter(o => o.status === tab.key).length;

            return (
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
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
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
            <p className="text-sm text-slate-400 mb-4">ليس لديك طلبات في هذه الحالة حالياً</p>
            <Link to="/services" className="btn-primary">تصفح الخدمات</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG['new'];
              const StatusIcon = config.icon;
              const isProvider = profile?.id === order.provider_id;
              const isClient = profile?.id === order.client_id;
              const isAdmin = (profile as any)?.is_admin === true || (profile as any)?.role === 'admin';
              const otherParty = isProvider ? order.client : order.provider;

              return (
                <div key={order.id} className="card p-5 cursor-pointer hover:border-primary-200 transition-colors" onClick={() => navigate(`/orders/${order.id}`)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {otherParty?.avatar_url ? (
                        <img
                          src={otherParty.avatar_url}
                          alt={otherParty.full_name}
                          className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-100"
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-lg font-bold text-primary-700 shrink-0 border border-primary-50 ${otherParty?.avatar_url ? 'hidden' : ''}`}>
                        {otherParty?.full_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/listings/${order.listing_id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-slate-800 hover:text-primary-600 transition-colors block truncate">
                          {order.listing?.service_name || 'خدمة مهارة'}
                        </Link>
                        <p className="text-sm text-slate-500 truncate">
                          {isProvider ? 'من العميل' : 'مقدم الخدمة'}: <span className="font-bold text-slate-600">{otherParty?.full_name}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`badge ${config.bg} ${config.color}`}>
                            <StatusIcon size={12} />
                            {config.label}
                          </span>
                          {order.listing?.city && (
                            <span className="text-xs text-slate-400">{order.listing.city}</span>
                          )}
                          <span className="text-xs font-mono text-slate-400">#{order.id.slice(0, 6)}</span>
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

                  {/* Fee breakdowns */}
                  {isProvider && order.status !== 'cancelled' && (
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
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

                  {isClient && order.status !== 'cancelled' && (
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
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

                  {/* Action buttons */}
                  <div className="mt-4 flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-slate-50">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleContact(order); }}
                      className="flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <MessageSquare size={14} /> مراسلة
                    </button>

                    <div className="flex gap-2 flex-wrap">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}
                        className="btn-ghost !bg-slate-100 !text-slate-700 !px-4 !py-1.5 !text-xs font-bold flex items-center gap-1.5"
                      >
                        <LayoutList size={14} /> تتبع الطلب
                      </button>

                      {/* Quick Actions based on status */}
                      {(isProvider || isAdmin) && (order.status === 'new' || order.status === 'paid') && (
                        <button onClick={(e) => { e.stopPropagation(); handleStart(order.id); }} disabled={actionLoading} className="btn-primary !px-4 !py-1.5 !text-xs shadow-sm">
                          <Play size={14} /> قبول والبدء
                        </button>
                      )}

                      {(isProvider || isAdmin) && order.status === 'in_progress' && (
                        <button onClick={(e) => { e.stopPropagation(); setShowCompleteModal(order.id); }} disabled={actionLoading} className="btn-primary !bg-success-600 !px-4 !py-1.5 !text-xs shadow-sm">
                          <CheckCircle size={14} /> تسليم العمل
                        </button>
                      )}

                      {(isClient || isAdmin) && (order.status === 'awaiting_customer_confirmation' || order.status === 'provider_completed') && (
                        <button onClick={(e) => { e.stopPropagation(); handleAccept(order.id); }} disabled={actionLoading} className="btn-primary !bg-success-600 !px-4 !py-1.5 !text-xs shadow-sm">
                          <CheckCircle size={14} /> تأكيد الاستلام
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

      {/* Floating Action Buttons (Bottom Left) */}
      <div className="fixed bottom-20 md:bottom-8 left-4 flex flex-col gap-3 z-40">
        {/* زر التتبع */}
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="group flex items-center gap-2 bg-white text-slate-700 border border-slate-200 shadow-lg px-4 py-3 rounded-full hover:bg-slate-50 transition-all active:scale-95"
        >
          <span className="text-sm font-bold hidden sm:block group-hover:block whitespace-nowrap pr-1">تتبع طلباتي</span>
          <LayoutList size={20} className="text-primary-600" />
        </button>

        {/* زر النزاعات */}
        <button 
          onClick={() => setFilter('disputed')}
          className="group flex items-center gap-2 bg-error-50 text-error-700 border border-error-100 shadow-lg px-4 py-3 rounded-full hover:bg-error-100 transition-all active:scale-95"
        >
          <span className="text-sm font-bold hidden sm:block group-hover:block whitespace-nowrap pr-1">النزاعات والشكاوى</span>
          <ShieldAlert size={20} className="text-error-600" />
        </button>
      </div>

      {/* نوافذ الشكاوى والتسليم (Modals) */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => !actionLoading && setShowDisputeModal(null)}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-100"><AlertTriangle size={20} className="text-error-600" /></div>
              <div><h3 className="text-lg font-black text-slate-800">فتح نزاع</h3><p className="text-xs text-slate-500">سيتم مراجعة النزاع وإيقاف تحويل الرصيد</p></div>
            </div>
            <div className="space-y-4">
              {actionError && <p className="text-sm text-error-600 bg-error-50 rounded-xl p-3">{actionError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowDisputeModal(null)} disabled={actionLoading} className="btn-ghost flex-1 !bg-slate-100">إلغاء</button>
                <button onClick={handleDispute} disabled={actionLoading} className="btn-primary flex-1 !bg-error-600">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />} تأكيد الشكوى
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => !actionLoading && setShowCompleteModal(null)}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-100"><CheckCircle size={20} className="text-success-600" /></div>
              <div><h3 className="text-lg font-black text-slate-800">تسليم العمل</h3><p className="text-xs text-slate-500">سيبدأ عداد 24 ساعة لتأكيد العميل</p></div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-orange-50 p-3 text-xs text-orange-700">إذا لم يؤكد العميل خلال 24 ساعة، سيتم تحرير الرصيد لمحفظتك تلقائياً.</div>
              {actionError && <p className="text-sm text-error-600 bg-error-50 rounded-xl p-3">{actionError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowCompleteModal(null)} disabled={actionLoading} className="btn-ghost flex-1 !bg-slate-100">إلغاء</button>
                <button onClick={handleDeliver} disabled={actionLoading} className="btn-primary flex-1 !bg-success-600">
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} تأكيد التسليم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}