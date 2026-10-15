import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Clock3, History, LockKeyhole, Wallet as WalletIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatYER } from '@/lib/commission';

type WalletAccount = {
  available_balance: number;
  pending_balance: number;
  total_earnings: number;
  total_paid: number;
  total_withdrawn: number;
  total_fees: number;
  currency: string;
};

type WalletTransaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
};

type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  provider: string | null;
  created_at: string;
};

const transactionLabels: Record<string, string> = {
  PAYMENT: 'دفع خدمة',
  COMMISSION: 'عمولة مَهَرَة',
  EARNING: 'مستحقات خدمة',
  PAYOUT: 'طلب سحب',
  REFUND: 'استرداد',
  HOLD: 'مبلغ معلّق',
  RELEASE: 'تحرير مبلغ معلّق',
  DISPUTE_HOLD: 'مبلغ قيد النزاع',
  ADJUSTMENT: 'تسوية إدارية',
};

export default function WalletPage() {
  const { profile, session, loading } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletAccount | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(true);

  const loadWallet = useCallback(async () => {
    if (!profile) return;
    setLoadingWallet(true);
    const [walletRes, transactionsRes, withdrawalsRes] = await Promise.all([
      supabase.from('wallet_accounts').select('available_balance, pending_balance, total_earnings, total_paid, total_withdrawn, total_fees, currency').eq('profile_id', profile.id).maybeSingle(),
      supabase.from('wallet_transactions').select('id, type, amount, status, description, created_at').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('withdrawals').select('id, amount, status, provider, created_at').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(10),
    ]);
    setWallet((walletRes.data as WalletAccount | null) || null);
    setTransactions((transactionsRes.data as WalletTransaction[]) || []);
    setWithdrawals((withdrawalsRes.data as Withdrawal[]) || []);
    setLoadingWallet(false);
  }, [profile]);

  useEffect(() => {
    if (!loading && !session) navigate('/auth/signin', { state: { from: '/wallet' } });
  }, [loading, navigate, session]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  if (!session || !profile) return null;

  const currency = wallet?.currency === 'YER' ? 'ريال يمني' : wallet?.currency || 'YER';
  const amount = (value: number | undefined) => `${formatYER(Number(value || 0))} ${currency}`;

  return (
    <div className="pb-20 md:pb-8" dir="rtl">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/profile" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary-600">
          <ArrowRight size={16} /> العودة إلى الحساب
        </Link>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-bold text-primary-600">الحساب المالي</p>
            <h1 className="text-2xl font-black text-slate-800">محفظتي</h1>
            <p className="mt-1 text-sm text-slate-500">رصيدك داخل مَهَرَة، منفصل عن أي تحويل خارجي.</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <WalletIcon size={24} />
          </div>
        </div>

        {loadingWallet ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => <div key={item} className="card h-28 animate-pulse bg-slate-100" />)}
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-3xl bg-gradient-to-br from-primary-700 to-primary-900 p-6 text-white shadow-lg shadow-primary-900/15">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/70">الرصيد المتاح للسحب</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{currency}</span>
              </div>
              <p className="mt-3 text-3xl font-black">{amount(wallet?.available_balance)}</p>
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/70">
                <span>المعلّق: {amount(wallet?.pending_balance)}</span>
                <span>المسحوب: {amount(wallet?.total_withdrawn)}</span>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="card p-4"><p className="text-xs text-slate-400">إجمالي الأرباح</p><p className="mt-2 text-lg font-black text-success-600">{amount(wallet?.total_earnings)}</p></div>
              <div className="card p-4"><p className="text-xs text-slate-400">المبالغ المعلقة</p><p className="mt-2 text-lg font-black text-orange-600">{amount(wallet?.pending_balance)}</p></div>
              <div className="card p-4"><p className="text-xs text-slate-400">إجمالي المدفوعات</p><p className="mt-2 text-lg font-black text-primary-600">{amount(wallet?.total_paid)}</p></div>
              <div className="card p-4"><p className="text-xs text-slate-400">عمولات مَهَرَة</p><p className="mt-2 text-lg font-black text-slate-700">{amount(wallet?.total_fees)}</p></div>
            </div>

            <div className="mb-6 rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <LockKeyhole size={20} className="mt-0.5 shrink-0 text-orange-600" />
                <div>
                  <h2 className="font-bold text-orange-800">السحب الإلكتروني قريبًا</h2>
                  <p className="mt-1 text-sm leading-relaxed text-orange-700">سيظهر زر السحب بعد ربط مزود دفع موثوق وتفعيل وسيلة استلام. لن يتم تنفيذ أي تحويل حقيقي من هذه الصفحة حاليًا.</p>
                </div>
              </div>
              <button disabled className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-orange-200 px-4 py-3 text-sm font-bold text-orange-500">
                <ArrowDownToLine size={18} /> سحب الأموال غير متاح بعد
              </button>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div><h2 className="font-bold text-slate-800">طرق استلام الأموال</h2><p className="mt-1 text-xs text-slate-400">أضف جيب أو حسابًا بنكيًا بعد تفعيل التكامل.</p></div>
                <LockKeyhole size={18} className="text-slate-400" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-dashed border-slate-200 p-4"><p className="font-bold text-slate-700">جيب</p><p className="mt-1 text-xs text-slate-400">قريبًا بعد توفير API الرسمي</p></div>
                <div className="rounded-xl border border-dashed border-slate-200 p-4"><p className="font-bold text-slate-700">حساب بنكي</p><p className="mt-1 text-xs text-slate-400">قريبًا حسب سياسة مَهَرَة</p></div>
              </div>
            </div>

            {withdrawals.length > 0 && (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 font-bold text-slate-800">طلبات السحب</h2>
                <div className="space-y-3">
                  {withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between gap-3 text-sm">
                      <div><p className="font-bold text-slate-700">{withdrawal.provider || 'مزود غير محدد'}</p><p className="text-xs text-slate-400">{new Date(withdrawal.created_at).toLocaleDateString('ar-EG')}</p></div>
                      <div className="text-left"><p className="font-black text-slate-700">{amount(withdrawal.amount)}</p><p className="text-xs text-orange-600">{withdrawal.status === 'REQUESTED' ? 'قيد المراجعة' : withdrawal.status}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <History size={19} className="text-primary-600" />
                <h2 className="font-bold text-slate-800">سجل العمليات</h2>
              </div>
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-5 py-12 text-center text-slate-400">
                  <Clock3 size={30} className="text-slate-300" />
                  <p className="text-sm">لا توجد عمليات مالية بعد</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-700">{transactionLabels[transaction.type] || transaction.type}</p>
                        <p className="mt-1 text-xs text-slate-400">{transaction.description || 'عملية مالية'} · {new Date(transaction.created_at).toLocaleDateString('ar-EG')}</p>
                      </div>
                      <span className={`shrink-0 text-sm font-black ${transaction.amount >= 0 ? 'text-success-600' : 'text-slate-700'}`} dir="ltr">
                        {transaction.amount > 0 ? '+' : ''}{formatYER(transaction.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
