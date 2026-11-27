import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Tag, MapPin, Users, ClipboardList, Settings,
  LogOut, Menu, X, CheckCircle, XCircle, Eye, EyeOff, Trash2, Edit3, Plus,
  TrendingUp, UserCheck, Package, ArrowLeft, Search, Star, Shield, ShieldCheck,
  Megaphone, Loader2, Scale, Wallet, ArrowRightLeft, Clock, Phone, Mail, User, AlertTriangle, IdCard,
  type LucideIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useStaticData } from '@/hooks/useStaticData';
import Logo from '@/components/Logo';
import type { Profile, Listing, Order, Category, City, Dispute } from '@/types';
import { formatYER } from '@/lib/commission';

type Section = 'dashboard' | 'listings' | 'categories' | 'cities' | 'users' | 'providers' | 'verifications' | 'orders' | 'disputes' | 'finance' | 'homepage' | 'notifications';

export default function AdminPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!profile || !profile.is_admin)) {
      navigate('/');
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-slate-400">جاري التحميل...</div>
      </div>
    );
  }

  if (!profile || !profile.is_admin) return null;

  const section = (location.pathname.split('/')[2] || 'dashboard') as Section;

  const navItems: { key: Section; label: string; icon: LucideIcon }[] = [
    { key: 'dashboard', label: 'لوحة الإحصائيات', icon: LayoutDashboard },
    { key: 'listings', label: 'الخدمات', icon: Package },
    { key: 'categories', label: 'التصنيفات', icon: Tag },
    { key: 'cities', label: 'المدن', icon: MapPin },
    { key: 'users', label: 'المستخدمون', icon: Users },
    { key: 'providers', label: 'مقدمو الخدمات', icon: UserCheck },
    { key: 'verifications', label: 'توثيق الهويات', icon: ShieldCheck },
    { key: 'orders', label: 'الطلبات', icon: ClipboardList },
    { key: 'disputes', label: 'النزاعات', icon: Scale },
    { key: 'finance', label: 'المالية والمحافظ', icon: Wallet },
    { key: 'notifications', label: 'إرسال إشعار', icon: Megaphone },
    { key: 'homepage', label: 'الصفحة الرئيسية', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-slate-900 text-white transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:static lg:translate-x-0 lg:flex-shrink-0`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <Link to="/admin" className="flex items-center gap-2">
              <Logo size="sm" />
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/60">
              <X size={22} />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Shield size={14} />
              لوحة تحكم الأدمن
            </div>
            <p className="mt-1 text-sm font-bold text-white/90 truncate">{profile.full_name}</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.key;
              return (
                <Link
                  key={item.key}
                  to={`/admin/${item.key === 'dashboard' ? '' : item.key}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                    active ? 'bg-primary-600 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-white/10 space-y-1">
            <Link to="/" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white/60 hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
              العودة للموقع
            </Link>
            <button
              onClick={() => { supabase.auth.signOut(); navigate('/'); }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-error-400 hover:bg-error-500/10 transition-colors"
            >
              <LogOut size={20} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-600">
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-black text-slate-800">
              {navItems.find((n) => n.key === section)?.label || 'لوحة التحكم'}
            </h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {section === 'dashboard' && <DashboardSection />}
          {section === 'listings' && <ListingsSection />}
          {section === 'categories' && <CategoriesSection />}
          {section === 'cities' && <CitiesSection />}
          {section === 'users' && <UsersSection />}
          {section === 'providers' && <ProvidersSection />}
          {section === 'verifications' && <VerificationsSection />}
          {section === 'orders' && <OrdersSection />}
          {section === 'disputes' && <DisputesSection />}
          {section === 'finance' && <FinanceSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'homepage' && <HomepageSection />}
        </main>
      </div>
    </div>
  );
}

// ============ DASHBOARD ============
function DashboardSection() {
  const [stats, setStats] = useState({
    totalUsers: 0, providers: 0, clients: 0, listings: 0, orders: 0,
    pendingListings: 0, pendingProviders: 0, pendingVerifications: 0, totalWalletBalances: 0
  });
  const [categoryStats, setCategoryStats] = useState<{ name: string; count: number }[]>([]);
  const [cityStats, setCityStats] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [usersRes, provRes, clientRes, listRes, orderRes, pendListRes, pendProvRes, pendVerifRes, walletsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('account_type', 'client'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'client'),
        supabase.from('listings').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('provider_status', 'pending').neq('account_type', 'client'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending').neq('account_type', 'client'),
        supabase.from('wallets').select('balance')
      ]);

      const totalWalletBalances = (walletsRes.data || []).reduce((sum, w) => sum + Number(w.balance), 0);

      setStats({
        totalUsers: usersRes.count || 0,
        providers: provRes.count || 0,
        clients: clientRes.count || 0,
        listings: listRes.count || 0,
        orders: orderRes.count || 0,
        pendingListings: pendListRes.count || 0,
        pendingProviders: pendProvRes.count || 0,
        pendingVerifications: pendVerifRes.count || 0,
        totalWalletBalances
      });

      const cats = await supabase.from('categories').select('id, name');
      const catCounts = await Promise.all(
        (cats.data as Category[] || []).map(async (c) => {
          const { count } = await supabase.from('listings').select('id', { count: 'exact', head: true }).eq('category_id', c.id);
          return { name: c.name, count: count || 0 };
        })
      );
      setCategoryStats(catCounts);

      const cities = await supabase.from('profiles').select('city').not('city', 'is', null);
      const cityMap: Record<string, number> = {};
      (cities.data as Profile[] || []).forEach((p) => {
        if (p.city) cityMap[p.city] = (cityMap[p.city] || 0) + 1;
      });
      setCityStats(Object.entries(cityMap).map(([name, count]) => ({ name, count })));

      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  const statCards = [
    { label: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'مقدمو الخدمات', value: stats.providers, icon: UserCheck, color: 'from-primary-500 to-primary-600' },
    { label: 'الطلبات', value: stats.orders, icon: ClipboardList, color: 'from-pink-500 to-pink-600' },
    { label: 'إجمالي أموال المحافظ', value: formatYER(stats.totalWalletBalances) + ' ر.ي', icon: Wallet, color: 'from-emerald-500 to-emerald-600' },
    { label: 'الخدمات', value: stats.listings, icon: Package, color: 'from-accent-500 to-accent-600' },
    { label: 'بانتظار المراجعة', value: stats.pendingListings, icon: TrendingUp, color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Pending alerts */}
      {(stats.pendingListings > 0 || stats.pendingProviders > 0 || stats.pendingVerifications > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.pendingListings > 0 && (
            <Link to="/admin/listings" className="card flex items-center gap-3 px-4 py-3 !bg-accent-50 !ring-accent-100">
              <TrendingUp size={20} className="text-accent-600" />
              <span className="text-sm font-bold text-accent-700">{stats.pendingListings} خدمة بانتظار المراجعة</span>
            </Link>
          )}
          {stats.pendingProviders > 0 && (
            <Link to="/admin/providers" className="card flex items-center gap-3 px-4 py-3 !bg-blue-50 !ring-blue-100">
              <UserCheck size={20} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-700">{stats.pendingProviders} مقدم خدمة بانتظار الموافقة</span>
            </Link>
          )}
          {stats.pendingVerifications > 0 && (
            <Link to="/admin/verifications" className="card flex items-center gap-3 px-4 py-3 !bg-emerald-50 !ring-emerald-100">
              <ShieldCheck size={20} className="text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">{stats.pendingVerifications} هوية شخصية بانتظار التوثيق</span>
            </Link>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} mb-3`}>
                <Icon size={22} className="text-white" />
              </div>
              <p className="text-2xl font-black text-slate-800">{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Category & City breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4">الخدمات في كل تصنيف</h3>
          <div className="space-y-3">
            {categoryStats.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-slate-600">{c.name}</span>
                  <span className="font-bold text-slate-800">{c.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${stats.listings > 0 ? (c.count / stats.listings) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-4">المستخدمون في كل مدينة</h3>
          <div className="space-y-3">
            {cityStats.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-slate-600">{c.name}</span>
                  <span className="font-bold text-slate-800">{c.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${stats.totalUsers > 0 ? (c.count / stats.totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            {cityStats.length === 0 && <p className="text-sm text-slate-400">لا توجد بيانات</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ LISTINGS ============
function ListingsSection() {
  const { reload } = useStaticData();
  const [listings, setListings] = useState<(Listing & { rejection_reason?: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Listing | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [rejectingListing, setRejectingListing] = useState<Listing | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const fetchListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('*, category:categories(*), provider:profiles(*)')
      .order('created_at', { ascending: false });
    setListings((data as (Listing & { rejection_reason?: string | null })[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, []);

  const updateStatus = async (id: string, status: string) => {
    if (status === 'published') {
      const { error } = await supabase.rpc('admin_approve_service', { p_listing_id: id });
      if (error) {
        alert('حدث خطأ أثناء الموافقة: ' + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from('listings').update({ status }).eq('id', id);
      if (error) {
        alert('حدث خطأ: ' + error.message);
        return;
      }
    }

    const targetListing = listings.find((l) => l.id === id);
    if (status === 'published' && targetListing?.provider_id) {
      await supabase.from('notifications').insert({
        user_id: targetListing.provider_id,
        type: 'system',
        title: 'تمت الموافقة على خدمتك 🎉',
        body: `تمت مراجعة والموافقة على خدمتك "${targetListing.service_name}" وهي الآن منشورة للعملاء.`,
        link: `/listings/${targetListing.id}`,
      });
    }

    setListings(listings.map((l) => l.id === id ? {
      ...l,
      status: status as Listing['status'],
      rejection_reason: status === 'published' ? null : l.rejection_reason,
    } : l));
  };

  const handleConfirmReject = async () => {
    if (!rejectingListing) return;
    const reasonText = rejectionReason.trim();
    if (!reasonText) {
      alert('يرجى كتابة سبب رفض الخدمة');
      return;
    }

    setRejectSubmitting(true);

    const { error } = await supabase.rpc('admin_reject_service', {
      p_listing_id: rejectingListing.id,
      p_reason: reasonText,
    });

    if (error) {
      setRejectSubmitting(false);
      alert('حدث خطأ أثناء رفض الخدمة: ' + error.message);
      return;
    }

    if (rejectingListing.provider_id) {
      await supabase.from('notifications').insert({
        user_id: rejectingListing.provider_id,
        type: 'system',
        title: 'تم رفض طلب نشر خدمتك',
        body: `تم رفض خدمتك "${rejectingListing.service_name}". السبب: ${reasonText}`,
        link: '/profile',
      });
    }

    setListings(listings.map((l) => l.id === rejectingListing.id ? {
      ...l,
      status: 'rejected' as Listing['status'],
      rejection_reason: reasonText,
    } : l));

    setRejectSubmitting(false);
    setRejectingListing(null);
    setRejectionReason('');
  };

  const toggleFeatured = async (l: Listing) => {
    await supabase.from('listings').update({ featured: !l.featured }).eq('id', l.id);
    setListings(listings.map((item) => item.id === l.id ? { ...item, featured: !item.featured } : item));
  };

  const deleteListing = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    await supabase.from('listings').delete().eq('id', id);
    setListings(listings.filter((l) => l.id !== id));
  };

  const filtered = filter === 'all' ? listings : listings.filter((l) => l.status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'pending', label: `بانتظار المراجعة (${listings.filter((l) => l.status === 'pending').length})` },
            { key: 'published', label: 'منشورة' },
            { key: 'hidden', label: 'مخفية' },
            { key: 'rejected', label: 'مرفوضة' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                filter === f.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary !py-2 !text-sm">
          <Plus size={18} /> إضافة خدمة
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((l) => (
          <div key={l.id} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {l.provider?.avatar_url ? (
                <img src={l.provider.avatar_url} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-lg font-bold text-primary-700 shrink-0">
                  {l.provider?.full_name?.charAt(0) || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate">{l.service_name}</p>
                <p className="text-sm text-slate-500 truncate">
                  {l.provider?.full_name} • {l.city} • {Number(l.price).toLocaleString('ar-EG')} ر.ي
                </p>
                {l.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{l.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`badge ${
                    l.status === 'published' ? 'bg-success-100 text-success-700' :
                    l.status === 'pending' ? 'bg-accent-100 text-accent-700' :
                    l.status === 'hidden' ? 'bg-slate-200 text-slate-600' :
                    'bg-error-100 text-error-700'
                  }`}>
                    {l.status === 'published' ? 'منشورة' : l.status === 'pending' ? 'بانتظار المراجعة' : l.status === 'hidden' ? 'مخفية' : 'مرفوضة'}
                  </span>
                  {l.featured && <span className="badge bg-accent-100 text-accent-700">مميزة</span>}
                </div>
                {l.status === 'rejected' && l.rejection_reason && (
                  <p className="mt-2 rounded-lg bg-error-50 px-3 py-1.5 text-xs text-error-700">
                    <span className="font-bold">سبب الرفض:</span> {l.rejection_reason}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {l.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateStatus(l.id, 'published')}
                    className="btn-ghost !bg-success-50 !text-success-600 hover:!bg-success-100 !px-3 !py-1.5 !text-xs font-bold flex items-center gap-1"
                    title="موافقة ونشر"
                  >
                    <CheckCircle size={16} /> موافقة
                  </button>
                  <button
                    onClick={() => {
                      setRejectingListing(l);
                      setRejectionReason('');
                    }}
                    className="btn-ghost !bg-error-50 !text-error-600 hover:!bg-error-100 !px-3 !py-1.5 !text-xs font-bold flex items-center gap-1"
                    title="رفض مع سبب"
                  >
                    <XCircle size={16} /> رفض
                  </button>
                </>
              )}
              {l.status === 'rejected' && (
                <button
                  onClick={() => updateStatus(l.id, 'published')}
                  className="btn-ghost !bg-success-50 !text-success-600 !px-2.5 !py-1.5 !text-xs font-bold"
                  title="موافقة ونشر"
                >
                  <CheckCircle size={16} />
                </button>
              )}
              {l.status === 'published' && (
                <button onClick={() => updateStatus(l.id, 'hidden')} className="btn-ghost !bg-slate-100 !px-2.5 !py-1.5" title="إخفاء">
                  <EyeOff size={16} />
                </button>
              )}
              {l.status === 'hidden' && (
                <button onClick={() => updateStatus(l.id, 'published')} className="btn-ghost !bg-success-50 !text-success-600 !px-2.5 !py-1.5" title="إظهار">
                  <Eye size={16} />
                </button>
              )}
              <button onClick={() => toggleFeatured(l)} className={`btn-ghost !px-2.5 !py-1.5 ${l.featured ? '!bg-accent-50 !text-accent-600' : ''}`} title="تمييز">
                <Star size={16} className={l.featured ? 'fill-amber-400 text-amber-400' : ''} />
              </button>
              <Link to={`/listings/${l.id}`} className="btn-ghost !bg-slate-100 !px-2.5 !py-1.5" title="عرض">
                <Eye size={16} />
              </Link>
              <button onClick={() => setEditing(l)} className="btn-ghost !bg-blue-50 !text-blue-600 !px-2.5 !py-1.5" title="تعديل">
                <Edit3 size={16} />
              </button>
              <button onClick={() => deleteListing(l.id)} className="btn-ghost !bg-error-50 !text-error-600 !px-2.5 !py-1.5" title="حذف">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState text="لا توجد خدمات" />}
      </div>

      {rejectingListing && (
        <Modal
          title="رفض الخدمة وإرسال السبب"
          onClose={() => !rejectSubmitting && setRejectingListing(null)}
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-bold text-slate-800">{rejectingListing.service_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                مقدم الخدمة: {rejectingListing.provider?.full_name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                سبب رفض الخدمة (سيصل كرسالة إشعار لصاحب الخدمة) *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الرفض بوضوح (مثال: يرجى إضافة وصف أوضح للخدمة وتحديد السعر بدقة)..."
                rows={4}
                className="input-field resize-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectingListing(null)}
                disabled={rejectSubmitting}
                className="btn-ghost flex-1 !bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectSubmitting || !rejectionReason.trim()}
                className="btn-primary flex-1 !bg-error-600 disabled:opacity-50"
              >
                {rejectSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> جاري الرفض...
                  </span>
                ) : (
                  'تأكيد الرفض وإرسال الرسالة'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {(editing || showAdd) && (
        <ListingEditModal
          listing={editing}
          onClose={() => { setEditing(null); setShowAdd(false); }}
          onSaved={() => { setEditing(null); setShowAdd(false); fetchListings(); reload(); }}
        />
      )}
    </div>
  );
}

function ListingEditModal({ listing, onClose, onSaved }: { listing: Listing | null; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const { categories, cities } = useStaticData();
  const [serviceName, setServiceName] = useState(listing?.service_name || '');
  const [categoryId, setCategoryId] = useState(listing?.category_id || '');
  const [city, setCity] = useState(listing?.city || 'صنعاء');
  const [description, setDescription] = useState(listing?.description || '');
  const [price, setPrice] = useState(String(listing?.price || ''));
  const [experience, setExperience] = useState(listing?.experience || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    if (listing) {
      const { error } = await supabase.from('listings').update({
        service_name: serviceName, category_id: categoryId, city, description,
        price: Number(price), experience,
      }).eq('id', listing.id);
      if (error) alert('تعذر التعديل: ' + error.message);
    } else {
      const { error } = await supabase.from('listings').insert({
        provider_id: profile.id, category_id: categoryId,
        service_name: serviceName, city, description,
        price: Number(price), experience, status: 'published',
      });
      if (error) alert('تعذر إضافة الخدمة: ' + error.message);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal title={listing ? 'تعديل الخدمة' : 'إضافة خدمة'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم الخدمة</label>
          <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">التصنيف</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field">
            <option value="">اختر</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">المدينة</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field">
            {cities.length > 0 ? (
              cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)
            ) : (
              <>
                <option value="صنعاء">صنعاء</option>
                <option value="عدن">عدن</option>
              </>
            )}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">السعر</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">الخبرة</label>
            <input type="text" value={experience} onChange={(e) => setExperience(e.target.value)} className="input-field" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">الوصف</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-field resize-none" />
        </div>
        <button onClick={handleSave} disabled={saving || !serviceName || !categoryId} className="btn-primary w-full">
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
    </Modal>
  );
}

// ============ CATEGORIES ============
const ICON_EMOJIS: Record<string, string> = {
  Laptop: '💻',
  Briefcase: '💼',
  UtensilsCrossed: '🍔',
  Sparkles: '💄',
  Camera: '📷',
  Wrench: '🔧',
  Tool: '🛠️',
  GraduationCap: '🎓',
  Car: '🚗',
  Home: '🏠',
  HeartPulse: '🩺',
  Palette: '🎨',
  Truck: '🚚',
  ShoppingBag: '🛍️',
};

function CategoriesSection() {
  const { categories, services, reload } = useStaticData();
  const [editing, setEditing] = useState<Category | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddService, setShowAddService] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [busy, setBusy] = useState(false);

  const updateCategory = async (id: string, name: string, iconName: string) => {
    setBusy(true);
    const { error } = await supabase
      .from('categories')
      .update({ name: name.trim(), icon_name: iconName })
      .eq('id', id);
    setBusy(false);

    if (error) {
      alert('تعذر تعديل التصنيف: ' + error.message);
      return;
    }
    await reload();
    setEditing(null);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('حذف هذا التصنيف سيحذف جميع الخدمات بداخله. هل أنت متأكد؟')) return;
    setBusy(true);
    await supabase.from('services_catalog').delete().eq('category_id', id);
    const { error } = await supabase.from('categories').delete().eq('id', id);
    setBusy(false);

    if (error) {
      alert('تعذر حذف التصنيف (قد يكون مرتبطاً بخدمات منشورة للمستخدمين): ' + error.message);
      return;
    }
    await reload();
  };

  const addCategory = async (_id: string, name: string, iconName: string) => {
    setBusy(true);
    const { error } = await supabase
      .from('categories')
      .insert({ name: name.trim(), icon_name: iconName });
    setBusy(false);

    if (error) {
      alert('تعذر إضافة التصنيف: ' + error.message);
      return;
    }
    await reload();
    setShowAdd(false);
  };

  const addService = async (categoryId: string) => {
    if (!newServiceName.trim() || busy) return;
    setBusy(true);
    const maxOrder = services.filter((s) => s.category_id === categoryId).length;
    const { error } = await supabase
      .from('services_catalog')
      .insert({ category_id: categoryId, name: newServiceName.trim(), sort_order: maxOrder + 1 });
    setBusy(false);

    if (error) {
      alert('تعذر إضافة الخدمة: ' + error.message);
      return;
    }
    setNewServiceName('');
    setShowAddService(null);
    await reload();
  };

  const deleteService = async (id: string) => {
    if (!confirm('حذف هذه الخدمة؟')) return;
    const { error } = await supabase.from('services_catalog').delete().eq('id', id);
    if (error) {
      alert('تعذر حذف الخدمة: ' + error.message);
      return;
    }
    await reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">التصنيفات والخدمات ({categories.length})</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary !py-2 !text-sm">
          <Plus size={18} /> إضافة تصنيف
        </button>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const catServices = services.filter((s) => s.category_id === cat.id);
          const emoji = ICON_EMOJIS[cat.icon_name] || '✨';
          return (
            <div key={cat.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{emoji}</span>
                  <span className="font-bold text-slate-800">{cat.name}</span>
                  <span className="badge bg-slate-100 text-slate-500">{catServices.length} خدمة</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setEditing(cat)}
                    className="btn-ghost !bg-blue-50 !text-blue-600 !px-2.5 !py-1.5"
                    title="تعديل التصنيف والأيقونة"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="btn-ghost !bg-error-50 !text-error-600 !px-2.5 !py-1.5"
                    title="حذف التصنيف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {catServices.map((s) => (
                  <span key={s.id} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-600 border border-slate-100">
                    {s.name}
                    <button
                      onClick={() => deleteService(s.id)}
                      className="text-slate-400 hover:text-error-500 transition-colors"
                      title="حذف الخدمة"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
                {catServices.length === 0 && (
                  <span className="text-xs text-slate-400">لا توجد خدمات فرعية في هذا التصنيف بعد</span>
                )}
              </div>

              {showAddService === cat.id ? (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="اسم الخدمة الجديدة"
                    className="input-field !py-2 !text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addService(cat.id)}
                    autoFocus
                  />
                  <button
                    onClick={() => addService(cat.id)}
                    disabled={busy || !newServiceName.trim()}
                    className="btn-primary !px-3 !py-2 !text-sm disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                  <button onClick={() => setShowAddService(null)} className="btn-ghost !bg-slate-100 !px-3">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowAddService(cat.id); setNewServiceName(''); }}
                  className="mt-3 flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700"
                >
                  <Plus size={16} /> إضافة خدمة
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <CategoryEditModal category={editing} onClose={() => setEditing(null)} onSave={updateCategory} saving={busy} />
      )}
      {showAdd && (
        <CategoryEditModal category={null} onClose={() => setShowAdd(false)} onSave={addCategory} saving={busy} />
      )}
    </div>
  );
}

function CategoryEditModal({
  category,
  onClose,
  onSave,
  saving = false,
}: {
  category: Category | null;
  onClose: () => void;
  onSave: (id: string, name: string, icon: string) => void;
  saving?: boolean;
}) {
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon_name || 'Briefcase');

  return (
    <Modal title={category ? 'تعديل التصنيف والأيقونة' : 'إضافة تصنيف جديد'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم التصنيف</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: الصيانة والكهرباء"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">الأيقونة</label>
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className="input-field">
            <option value="Laptop">💻 تقنية ورقمية</option>
            <option value="Briefcase">💼 أعمال وإدارة</option>
            <option value="UtensilsCrossed">🍔 مطاعم وضيافة</option>
            <option value="Sparkles">💄 جمال وعناية</option>
            <option value="Camera">📷 تصوير ومونتاج</option>
            <option value="Wrench">🔧 صيانة وإصلاح</option>
            <option value="Tool">🛠️ أدوات وحرف يدوية</option>
            <option value="GraduationCap">🎓 تعليم وتدريب</option>
            <option value="Car">🚗 سيارات وميكانيك</option>
            <option value="Home">🏠 خدمات منزلية</option>
            <option value="HeartPulse">🩺 صحة وطب</option>
            <option value="Palette">🎨 تصميم وفنون</option>
            <option value="Truck">🚚 نقل وتوصيل</option>
            <option value="ShoppingBag">🛍️ تسوق وتجارة</option>
          </select>
        </div>
        <button
          onClick={() => onSave(category?.id || '', name, icon)}
          disabled={!name.trim() || saving}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
    </Modal>
  );
}

// ============ CITIES ============
function CitiesSection() {
  const { cities, reload } = useStaticData();
  const [newCity, setNewCity] = useState('');
  const [editing, setEditing] = useState<City | null>(null);

  const addCity = async () => {
    if (!newCity.trim()) return;
    const maxOrder = cities.length;
    await supabase.from('cities').insert({ name: newCity, sort_order: maxOrder + 1 });
    setNewCity('');
    reload();
  };

  const updateCity = async (id: string, name: string) => {
    await supabase.from('cities').update({ name }).eq('id', id);
    reload();
    setEditing(null);
  };

  const deleteCity = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المدينة؟')) return;
    await supabase.from('cities').delete().eq('id', id);
    reload();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-slate-800">إدارة المدن</h2>

      <div className="card p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="اسم المدينة الجديدة"
            className="input-field"
            onKeyDown={(e) => e.key === 'Enter' && addCity()}
          />
          <button onClick={addCity} className="btn-primary !px-4 shrink-0">
            <Plus size={18} /> إضافة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cities.map((c) => (
          <div key={c.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
                <MapPin size={20} className="text-primary-600" />
              </div>
              {editing?.id === c.id ? (
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="input-field !py-2"
                  onBlur={() => updateCity(c.id, editing.name)}
                  onKeyDown={(e) => e.key === 'Enter' && updateCity(c.id, editing.name)}
                  autoFocus
                />
              ) : (
                <span className="font-bold text-slate-800">{c.name}</span>
              )}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setEditing(c)} className="btn-ghost !bg-blue-50 !text-blue-600 !px-2.5 !py-1.5">
                <Edit3 size={16} />
              </button>
              <button onClick={() => deleteCity(c.id)} className="btn-ghost !bg-error-50 !text-error-600 !px-2.5 !py-1.5">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ USERS ============
function UsersSection() {
  const { profile: currentAdmin } = useAuth();
  const [users, setUsers] = useState<(Profile & { is_verified?: boolean; auth_user_id?: string })[]>([]);
  const [wallets, setWallets] = useState<{ user_id: string; balance: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: usersData }, { data: walletsData }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('wallets').select('user_id, balance'),
      ]);
      setUsers((usersData as (Profile & { is_verified?: boolean; auth_user_id?: string })[]) || []);
      setWallets(walletsData || []);
      setLoading(false);
    })();
  }, []);

  const toggleDisable = async (u: Profile) => {
    if (u.id === currentAdmin?.id) return;
    const { error } = await supabase.from('profiles').update({ is_disabled: !u.is_disabled }).eq('id', u.id);
    if (error) {
      alert('حدث خطأ: ' + error.message);
      return;
    }
    setUsers(users.map((x) => x.id === u.id ? { ...x, is_disabled: !x.is_disabled } : x));
  };

  const deleteUser = async (id: string) => {
    if (id === currentAdmin?.id) return;
    if (!confirm('هل أنت متأكد من حذف ملف هذا المستخدم؟ (يفضل استخدام زر التعطيل بدلاً من الحذف للحفاظ على سجل الطلبات)')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      alert('لا يمكن حذف المستخدم لارتباطه بطلبات أو معاملات مالية سابقة. استخدم زر التعطيل بدلاً من ذلك.');
      return;
    }
    setUsers(users.filter((u) => u.id !== id));
  };

  const filtered = users.filter((u) =>
    !search || u.full_name.includes(search) || u.email.includes(search)
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن مستخدم..."
          className="input-field !pr-11"
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-right">
            <tr>
              <th className="px-4 py-3 font-bold">الاسم</th>
              <th className="px-4 py-3 font-bold hidden sm:table-cell">البريد</th>
              <th className="px-4 py-3 font-bold">النوع</th>
              <th className="px-4 py-3 font-bold">رصيد المحفظة</th>
              <th className="px-4 py-3 font-bold">الحالة</th>
              <th className="px-4 py-3 font-bold">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => {
              const wallet = wallets.find((w) => w.user_id === u.id || (u.auth_user_id && w.user_id === u.auth_user_id));
              const isSelf = u.id === currentAdmin?.id;
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                          {u.full_name.charAt(0)}
                        </div>
                      )}
                      <span className="font-bold text-slate-800">{u.full_name}</span>
                      {u.is_verified && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          <ShieldCheck size={11} /> موثق
                        </span>
                      )}
                      {u.is_admin && <Shield size={14} className="text-primary-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell" dir="ltr">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.account_type === 'provider' ? 'bg-primary-50 text-primary-700' : u.account_type === 'client' ? 'bg-blue-50 text-blue-700' : 'bg-accent-50 text-accent-700'}`}>
                      {u.account_type === 'provider' ? 'مقدم' : u.account_type === 'client' ? 'عميل' : 'مقدم وعميل'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-black text-emerald-600">
                    {wallet ? formatYER(Number(wallet.balance)) : '0'} ر.ي
                  </td>
                  <td className="px-4 py-3">
                    {u.is_disabled ? (
                      <span className="badge bg-error-100 text-error-700">معطل</span>
                    ) : (
                      <span className="badge bg-success-100 text-success-700">نشط</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <span className="text-xs font-bold text-slate-400">حسابك الحالي</span>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => toggleDisable(u)}
                          className={`btn-ghost !px-2.5 !py-1.5 ${u.is_disabled ? '!bg-success-50 !text-success-600' : '!bg-accent-50 !text-accent-600'}`}
                          title={u.is_disabled ? 'تفعيل' : 'تعطيل'}
                        >
                          {u.is_disabled ? <CheckCircle size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button onClick={() => deleteUser(u.id)} className="btn-ghost !bg-error-50 !text-error-600 !px-2.5 !py-1.5" title="حذف">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-slate-400">لا توجد نتائج</div>}
      </div>
    </div>
  );
}

// ============ PROVIDERS ============
function ProvidersSection() {
  const [providers, setProviders] = useState<(Profile & { is_verified?: boolean; verification_status?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('account_type', 'client')
        .order('created_at', { ascending: false });
      setProviders((data as (Profile & { is_verified?: boolean; verification_status?: string })[]) || []);
      setLoading(false);
    })();
  }, []);

  const updateStatus = async (id: string, status: string, verified: boolean) => {
    await supabase
      .from('profiles')
      .update({
        provider_status: status,
        provider_verified: verified,
        is_verified: verified,
        verification_status: verified ? 'verified' : 'rejected',
      })
      .eq('id', id);

    setProviders(
      providers.map((p) =>
        p.id === id
          ? { ...p, provider_status: status as Profile['provider_status'], provider_verified: verified, is_verified: verified }
          : p
      )
    );
  };

  const filtered = filter === 'all' ? providers : providers.filter((p) => p.provider_status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'pending', label: 'بانتظار الموافقة' },
            { key: 'approved', label: 'موافق عليه' },
            { key: 'rejected', label: 'مرفوض' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
                filter === f.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Link to="/admin/verifications" className="btn-primary !py-2 !text-xs">
          <ShieldCheck size={16} /> مراجعة البطاقات الشخصية
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start gap-3">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-100 text-xl font-bold text-primary-700">
                  {p.full_name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-slate-800 truncate">{p.full_name}</p>
                  {p.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      <ShieldCheck size={12} /> موثق
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 truncate" dir="ltr">{p.email}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-slate-400">{p.city || 'غير محدد'}</span>
                  <span className={`badge ${
                    p.provider_status === 'approved' ? 'bg-success-100 text-success-700' :
                    p.provider_status === 'pending' ? 'bg-accent-100 text-accent-700' :
                    'bg-error-100 text-error-700'
                  }`}>
                    {p.provider_status === 'approved' ? 'موافق عليه' : p.provider_status === 'pending' ? 'بانتظار' : 'مرفوض'}
                  </span>
                </div>
                {p.bio && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.bio}</p>}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {p.provider_status !== 'approved' && (
                <button onClick={() => updateStatus(p.id, 'approved', true)} className="btn-primary !py-2 !text-xs flex-1">
                  <CheckCircle size={16} /> قبول وتوثيق
                </button>
              )}
              {p.provider_status !== 'rejected' && (
                <button onClick={() => updateStatus(p.id, 'rejected', false)} className="btn-ghost !bg-error-50 !text-error-600 !py-2 !text-xs flex-1">
                  <XCircle size={16} /> رفض
                </button>
              )}
              <Link to={`/listings?provider=${p.id}`} className="btn-ghost !bg-slate-100 !py-2 !text-xs">
                <Package size={16} /> الخدمات
              </Link>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState text="لا يوجد مقدمو خدمات" />}
      </div>
    </div>
  );
}

// ============ IDENTITY VERIFICATIONS ============
interface VerifiableProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  city?: string;
  district?: string;
  bio?: string;
  experience_years?: number;
  id_front_url?: string | null;
  id_back_url?: string | null;
  verification_status?: string;
  is_verified?: boolean;
  created_at: string;
}

function VerificationsSection() {
  const [items, setItems] = useState<VerifiableProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [viewingDocs, setViewingDocs] = useState<{
    profile: VerifiableProfile;
    frontUrl: string | null;
    backUrl: string | null;
  } | null>(null);
  const [loadingDocsId, setLoadingDocsId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VerifiableProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const loadVerifications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, city, district, bio, experience_years, id_front_url, id_back_url, verification_status, is_verified, created_at')
      .neq('account_type', 'client')
      .order('created_at', { ascending: false });

    setItems((data as VerifiableProfile[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadVerifications();
  }, []);

  const openIdPreview = async (p: VerifiableProfile) => {
    if (!p.id_front_url && !p.id_back_url) {
      alert('لم يقم مقدم الخدمة برفع صور البطاقة الشخصية بعد.');
      return;
    }

    setLoadingDocsId(p.id);
    let frontUrl: string | null = null;
    let backUrl: string | null = null;

    if (p.id_front_url) {
      const { data } = await supabase.storage
        .from('identity_documents')
        .createSignedUrl(p.id_front_url, 600);
      frontUrl = data?.signedUrl || null;
    }

    if (p.id_back_url) {
      const { data } = await supabase.storage
        .from('identity_documents')
        .createSignedUrl(p.id_back_url, 600);
      backUrl = data?.signedUrl || null;
    }

    setLoadingDocsId(null);
    setViewingDocs({ profile: p, frontUrl, backUrl });
  };

  const approveVerification = async (p: VerifiableProfile) => {
    setActionBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        is_verified: true,
        provider_verified: true,
        provider_status: 'approved',
        verification_status: 'verified',
      })
      .eq('id', p.id);

    if (error) {
      setActionBusy(false);
      alert('حدث خطأ: ' + error.message);
      return;
    }

    await supabase.from('notifications').insert({
      user_id: p.id,
      type: 'system',
      title: 'تم توثيق حسابك بنجاح ✓',
      body: 'مبارك! تم التحقق من هويتك وتفعيل شارة (موثق) بجانب اسمك لزيادة ثقة أصحاب المطاعم والعملاء.',
      link: '/profile',
    });

    setActionBusy(false);
    setViewingDocs(null);
    loadVerifications();
  };

  const confirmRejectVerification = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionBusy(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        is_verified: false,
        provider_verified: false,
        verification_status: 'rejected',
      })
      .eq('id', rejectTarget.id);

    if (error) {
      setActionBusy(false);
      alert('حدث خطأ: ' + error.message);
      return;
    }

    await supabase.from('notifications').insert({
      user_id: rejectTarget.id,
      type: 'system',
      title: 'تم رفض طلب توثيق الهوية',
      body: `لم يتم قبول توثيق هويتك. السبب: ${rejectReason.trim()}`,
      link: '/profile',
    });

    setActionBusy(false);
    setRejectTarget(null);
    setRejectReason('');
    setViewingDocs(null);
    loadVerifications();
  };

  const filtered = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'verified') return item.is_verified === true || item.verification_status === 'verified';
    return item.verification_status === filter;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'pending', label: `بانتظار المراجعة (${items.filter((i) => i.verification_status === 'pending').length})` },
            { key: 'verified', label: `موثقون (${items.filter((i) => i.is_verified).length})` },
            { key: 'rejected', label: 'مرفوضة' },
            { key: 'all', label: 'الكل' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                filter === f.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-800">{p.full_name}</h3>
                {p.is_verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                    <ShieldCheck size={14} /> موثق
                  </span>
                ) : p.verification_status === 'pending' ? (
                  <span className="badge bg-accent-100 text-accent-700">بانتظار فحص البطاقة</span>
                ) : p.verification_status === 'rejected' ? (
                  <span className="badge bg-error-100 text-error-700">مرفوض</span>
                ) : (
                  <span className="badge bg-slate-100 text-slate-500">لم يرفع البطاقة</span>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>المدينة: {p.city || 'غير محدد'} {p.district ? `- ${p.district}` : ''}</span>
                {p.phone && <span dir="ltr">{p.phone}</span>}
                {typeof p.experience_years === 'number' && p.experience_years > 0 && (
                  <span>الخبرة: {p.experience_years} سنوات</span>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1 text-xs">
                <span className={p.id_front_url ? 'text-success-600 font-bold' : 'text-slate-400'}>
                  {p.id_front_url ? '✓ الوجه الأمامي مرفوع' : '✗ الوجه الأمامي ناقص'}
                </span>
                <span className={p.id_back_url ? 'text-success-600 font-bold' : 'text-slate-400'}>
                  {p.id_back_url ? '✓ الوجه الخلفي مرفوع' : '✗ الوجه الخلفي ناقص'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => openIdPreview(p)}
                disabled={loadingDocsId === p.id || (!p.id_front_url && !p.id_back_url)}
                className="btn-ghost !bg-slate-100 !px-3 !py-2 !text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
              >
                {loadingDocsId === p.id ? <Loader2 size={15} className="animate-spin" /> : <IdCard size={15} />}
                فحص البطاقة
              </button>

              {!p.is_verified && (
                <button
                  onClick={() => approveVerification(p)}
                  disabled={actionBusy}
                  className="btn-primary !px-3.5 !py-2 !text-xs flex items-center gap-1.5"
                >
                  <CheckCircle size={15} /> توثيق وتفعيل الشارة
                </button>
              )}

              <button
                onClick={() => {
                  setRejectTarget(p);
                  setRejectReason('');
                }}
                disabled={actionBusy}
                className="btn-ghost !bg-error-50 !text-error-600 !px-3 !py-2 !text-xs font-bold flex items-center gap-1"
              >
                <XCircle size={15} /> رفض
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState text="لا توجد طلبات توثيق في هذا القسم" />}
      </div>

      {/* نافذة معاينة صور البطاقة الشخصية */}
      {viewingDocs && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewingDocs(null)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-800">فحص البطاقة الشخصية: {viewingDocs.profile.full_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewingDocs.profile.city || ''} • {viewingDocs.profile.phone || ''}
                </p>
              </div>
              <button onClick={() => setViewingDocs(null)} className="text-slate-400 hover:text-slate-600">
                <X size={22} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 p-3 bg-slate-50">
                <p className="text-xs font-bold text-slate-700 mb-2">الوجه الأمامي للبطاقة:</p>
                {viewingDocs.frontUrl ? (
                  <img
                    src={viewingDocs.frontUrl}
                    alt="الوجه الأمامي"
                    className="w-full h-60 object-contain rounded-xl bg-white"
                  />
                ) : (
                  <div className="h-60 flex items-center justify-center text-xs text-slate-400">غير مرفوع</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-3 bg-slate-50">
                <p className="text-xs font-bold text-slate-700 mb-2">الوجه الخلفي للبطاقة:</p>
                {viewingDocs.backUrl ? (
                  <img
                    src={viewingDocs.backUrl}
                    alt="الوجه الخلفي"
                    className="w-full h-60 object-contain rounded-xl bg-white"
                  />
                ) : (
                  <div className="h-60 flex items-center justify-center text-xs text-slate-400">غير مرفوع</div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => approveVerification(viewingDocs.profile)}
                disabled={actionBusy}
                className="btn-primary flex-1"
              >
                <ShieldCheck size={18} /> اعتماد البيانات وتفعيل شارة (موثق)
              </button>
              <button
                onClick={() => {
                  setRejectTarget(viewingDocs.profile);
                  setRejectReason('');
                }}
                disabled={actionBusy}
                className="btn-ghost !bg-error-50 !text-error-600 flex-1"
              >
                <XCircle size={18} /> رفض الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة رفض التوثيق مع سبب */}
      {rejectTarget && (
        <Modal
          title="رفض طلب التوثيق"
          onClose={() => !actionBusy && setRejectTarget(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              مقدم الخدمة: <strong className="text-slate-800">{rejectTarget.full_name}</strong>
            </p>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                سبب الرفض (سيصل كإشعار لمقدم الخدمة لإعادة التصوير) *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: الصورة غير واضحة أو بيانات البطاقة غير مطابقة للاسم المسجل..."
                rows={3}
                className="input-field resize-none"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRejectTarget(null)}
                disabled={actionBusy}
                className="btn-ghost flex-1 !bg-slate-100"
              >
                إلغاء
              </button>
              <button
                onClick={confirmRejectVerification}
                disabled={actionBusy || !rejectReason.trim()}
                className="btn-primary flex-1 !bg-error-600 disabled:opacity-50"
              >
                {actionBusy ? 'جاري الإرسال...' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============ ORDERS ============
function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, listing:listings(*), client:profiles!orders_client_id_fkey(*), provider:profiles!orders_provider_id_fkey(*), dispute:disputes(*)')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const STATUS_LABELS: Record<string, string> = {
    new: 'جديد', in_progress: 'قيد التنفيذ', provider_completed: 'تم الإنجاز',
    awaiting_customer_confirmation: 'بانتظار التأكيد', completed: 'مكتمل',
    cancelled: 'ملغي', disputed: 'نزاع', confirmation_expired: 'انتهت المهلة',
  };

  const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700', in_progress: 'bg-accent-100 text-accent-700',
    provider_completed: 'bg-accent-100 text-accent-700', awaiting_customer_confirmation: 'bg-orange-100 text-orange-700',
    completed: 'bg-success-100 text-success-700', cancelled: 'bg-error-100 text-error-700',
    disputed: 'bg-error-100 text-error-700', confirmation_expired: 'bg-slate-200 text-slate-700',
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const reason = newStatus === 'cancelled' ? 'إلغاء من الإدارة' : null;
    const { error } = await supabase.rpc('admin_update_order_status', {
      p_order_id: orderId, p_status: newStatus, p_reason: reason,
    });
    if (error) { alert(error.message); return; }
    loadOrders();
  };

  const filtered = orders.filter((o) => {
    const matchFilter = filter === 'all' || o.status === filter;
    const matchSearch = !search || o.id.includes(search) || o.listing?.service_name?.includes(search);
    return matchFilter && matchSearch;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="بحث برقم الطلب أو اسم الخدمة..."
        className="input-field"
      />

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'new', label: 'جديدة' },
          { key: 'in_progress', label: 'قيد التنفيذ' },
          { key: 'awaiting_customer_confirmation', label: 'بانتظار التأكيد' },
          { key: 'completed', label: 'مكتملة' },
          { key: 'cancelled', label: 'ملغاة' },
          { key: 'disputed', label: 'نزاعات' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
              filter === f.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {f.label} ({f.key === 'all' ? orders.length : orders.filter((o) => o.status === f.key).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((o) => (
          <div key={o.id} className="card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{o.listing?.service_name || 'خدمة'}</p>
                <p className="text-sm text-slate-500">
                  العميل: {o.client?.full_name} ← مقدم الخدمة: {o.provider?.full_name}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`badge ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString('ar-EG')}</span>
                  <span className="text-xs font-bold text-primary-600">{formatYER(o.service_price)} ر.ي</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-left text-xs text-slate-400" dir="ltr">
                  <p>#{o.id.slice(0, 8)}</p>
                  <p>عمولة: {formatYER(o.mahra_revenue)}</p>
                </div>
                <select
                  value={o.status}
                  onChange={(e) => handleStatusChange(o.id, e.target.value)}
                  className="input-field !py-1.5 !text-xs !w-auto"
                >
                  <option value="new">جديد</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="provider_completed">تم الإنجاز</option>
                  <option value="awaiting_customer_confirmation">بانتظار التأكيد</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                  <option value="disputed">نزاع</option>
                  <option value="confirmation_expired">انتهت المهلة</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState text="لا توجد طلبات" />}
      </div>
    </div>
  );
}

// ============ DISPUTES ============
interface OrderLogItem {
  id: string;
  order_id: string;
  status_from: string | null;
  status_to: string;
  note: string | null;
  created_at: string;
}

type DetailedDispute = Dispute & {
  order?: Order & {
    listing?: Listing & { category?: Category };
    client?: Profile;
    provider?: Profile;
  };
  opener?: Profile;
};

function DisputesSection() {
  const [disputes, setDisputes] = useState<DetailedDispute[]>([]);
  const [orderLogs, setOrderLogs] = useState<Record<string, OrderLogItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DetailedDispute | null>(null);
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [outcome, setOutcome] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadDisputes = async () => {
    setLoading(true);
    const { data: rawDisputes, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !rawDisputes) {
      console.error('Error loading disputes:', error);
      setLoading(false);
      return;
    }

    const orderIds = Array.from(new Set(rawDisputes.map((d) => d.order_id).filter(Boolean)));

    const [ordersRes, logsRes] = await Promise.all([
      orderIds.length > 0
        ? supabase.from('orders').select('*').in('id', orderIds)
        : Promise.resolve({ data: [] }),
      orderIds.length > 0
        ? supabase.from('order_logs').select('*').in('order_id', orderIds).order('created_at', { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

    const ordersList = (ordersRes.data as Order[]) || [];
    const listingIds = Array.from(new Set(ordersList.map((o) => o.listing_id).filter(Boolean)));
    const profileIds = Array.from(
      new Set([
        ...rawDisputes.map((d) => d.opened_by),
        ...ordersList.map((o) => o.client_id),
        ...ordersList.map((o) => o.provider_id),
      ].filter(Boolean))
    );

    const [listingsRes, categoriesRes, profilesRes] = await Promise.all([
      listingIds.length > 0
        ? supabase.from('listings').select('*').in('id', listingIds)
        : Promise.resolve({ data: [] }),
      supabase.from('categories').select('*'),
      profileIds.length > 0
        ? supabase.from('profiles').select('*').in('id', profileIds)
        : Promise.resolve({ data: [] }),
    ]);

    const categoriesMap = new Map(((categoriesRes.data as Category[]) || []).map((c) => [c.id, c]));
    const listingsMap = new Map(
      ((listingsRes.data as Listing[]) || []).map((l) => [
        l.id,
        { ...l, category: categoriesMap.get(l.category_id) },
      ])
    );
    const profilesMap = new Map(((profilesRes.data as Profile[]) || []).map((p) => [p.id, p]));
    const ordersMap = new Map(
      ordersList.map((o) => [
        o.id,
        {
          ...o,
          listing: listingsMap.get(o.listing_id),
          client: profilesMap.get(o.client_id),
          provider: profilesMap.get(o.provider_id),
        },
      ])
    );

    const enrichedDisputes: DetailedDispute[] = rawDisputes.map((d) => ({
      ...d,
      order: ordersMap.get(d.order_id),
      opener: profilesMap.get(d.opened_by),
    }));

    const groupedLogs: Record<string, OrderLogItem[]> = {};
    ((logsRes.data as OrderLogItem[]) || []).forEach((log) => {
      if (!groupedLogs[log.order_id]) groupedLogs[log.order_id] = [];
      groupedLogs[log.order_id].push(log);
    });

    setOrderLogs(groupedLogs);
    setDisputes(enrichedDisputes);
    setLoading(false);
  };

  useEffect(() => { loadDisputes(); }, []);

  const handleResolve = async () => {
    if (!resolveModal || !resolution.trim() || !outcome) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('resolve_dispute', {
      p_dispute_id: resolveModal,
      p_resolution: resolution.trim(),
      p_outcome: outcome,
    });
    setActionLoading(false);
    if (error) { alert(error.message); return; }
    setResolveModal(null);
    setSelectedDispute(null);
    setResolution('');
    setOutcome('');
    loadDisputes();
  };

  if (loading) return <LoadingSpinner />;

  const STATUS_LABELS: Record<string, string> = {
    open: 'مفتوح', under_review: 'قيد المراجعة',
    resolved_customer: 'حُل لصالح العميل', resolved_provider: 'حُل لصالح مقدم الخدمة',
    resolved_partial: 'حل جزئي',
  };

  const STAGE_LABELS: Record<string, string> = {
    new: 'بعد إنشاء الطلب مباشرة (قبل قبول مقدم الخدمة)',
    in_progress: 'أثناء تنفيذ الخدمة (قيد التنفيذ)',
    provider_completed: 'بعد إعلان مقدم الخدمة إنجاز العمل',
    awaiting_customer_confirmation: 'بعد تسليم الخدمة (بانتظار تأكيد العميل)',
    completed: 'بعد اكتمال الطلب',
    cancelled: 'بعد إلغاء الطلب',
    confirmation_expired: 'بعد انتهاء مهلة التأكيد',
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'غير مسجل';
    return new Date(dateStr).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisputeLifecycle = (d: DetailedDispute) => {
    const logs = orderLogs[d.order_id] || [];
    const acceptedLog = logs.find((l) => l.status_to === 'in_progress');
    const deliveredLog = [...logs].reverse().find((l) =>
      l.status_to === 'provider_completed' || l.status_to === 'awaiting_customer_confirmation'
    );
    const disputeLog = logs.find((l) => l.status_to === 'disputed');
    const previousStageKey = disputeLog?.status_from
      || (deliveredLog ? 'awaiting_customer_confirmation' : acceptedLog ? 'in_progress' : 'new');

    const isOpenedByProvider = d.opened_by === d.order?.provider_id;
    const isOpenedByClient = d.opened_by === d.order?.client_id;

    return {
      acceptedAt: acceptedLog?.created_at || null,
      deliveredAt: deliveredLog?.created_at || null,
      stageLabel: STAGE_LABELS[previousStageKey] || previousStageKey,
      openerRole: isOpenedByProvider ? 'مقدم الخدمة' : isOpenedByClient ? 'العميل' : 'طرف في الطلب',
      isOpenedByProvider,
    };
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-slate-800">النزاعات ({disputes.length})</h2>

      {disputes.length === 0 ? (
        <EmptyState text="لا توجد نزاعات" />
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => {
            const info = getDisputeLifecycle(d);
            const categoryName = d.order?.listing?.category?.name;

            return (
              <div
                key={d.id}
                onClick={() => setSelectedDispute(d)}
                className="card p-5 cursor-pointer transition-all hover:ring-2 hover:ring-primary-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${d.status === 'open' ? 'bg-error-100 text-error-700' : 'bg-success-100 text-success-700'}`}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                    <span className={`badge ${info.isOpenedByProvider ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      فاتح النزاع: {info.openerRole} ({d.opener?.full_name || 'غير معروف'})
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(d.created_at)}</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">السبب: {d.reason}</p>
                    {d.details && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{d.details}</p>}
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1.5 border border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-700">الخدمة:</span>
                      <span className="text-slate-800">{d.order?.listing?.service_name || 'غير محدد'}</span>
                      {categoryName && (
                        <span className="badge bg-primary-100 text-primary-700">
                          النوع: {categoryName}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span><strong className="text-slate-700">العميل:</strong> {d.order?.client?.full_name || 'غير محدد'}</span>
                      <span><strong className="text-slate-700">مقدم الخدمة:</strong> {d.order?.provider?.full_name || 'غير محدد'}</span>
                      <span><strong className="text-slate-700">قيمة الطلب:</strong> {formatYER(d.order?.service_price || 0)} ريال</span>
                    </div>
                    <p className="text-xs text-amber-700 font-medium pt-0.5">
                      مرحلة النزاع: {info.stageLabel}
                    </p>
                  </div>

                  {d.admin_resolution && (
                    <div className="rounded-xl bg-success-50/70 border border-success-100 p-3 mt-2">
                      <p className="text-xs font-bold text-success-700">قرار الأدمن:</p>
                      <p className="text-sm text-slate-700">{d.admin_resolution}</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedDispute(d)}
                    className="btn-secondary !py-2 !px-3.5 !text-xs"
                  >
                    <Eye size={15} />
                    عرض كل التفاصيل والخط الزمني
                  </button>
                  {d.status === 'open' && (
                    <button
                      onClick={() => setResolveModal(d.id)}
                      className="btn-primary !py-2 !px-3.5 !text-xs"
                    >
                      <Scale size={15} />
                      اتخاذ قرار
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDispute && (() => {
        const info = getDisputeLifecycle(selectedDispute);
        const listing = selectedDispute.order?.listing;
        const client = selectedDispute.order?.client;
        const provider = selectedDispute.order?.provider;
        const orderCity = (selectedDispute.order as any)?.city;

        return (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
            onClick={() => setSelectedDispute(null)}
          >
            <div
              className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto animate-slide-up space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-slate-800">تفاصيل النزاع الكاملة</h3>
                    <span className={`badge ${selectedDispute.status === 'open' ? 'bg-error-100 text-error-700' : 'bg-success-100 text-success-700'}`}>
                      {STATUS_LABELS[selectedDispute.status] || selectedDispute.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1" dir="ltr">
                    Dispute #{selectedDispute.id.slice(0, 8)} • Order #{selectedDispute.order_id?.slice(0, 8)}
                  </p>
                </div>
                <button onClick={() => setSelectedDispute(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X size={22} />
                </button>
              </div>

              <div className="rounded-2xl bg-error-50 border border-error-100 p-4 space-y-2">
                <div className="flex items-center gap-2 text-error-700 font-bold text-sm">
                  <AlertTriangle size={18} />
                  <span>
                    رفع النزاع: {info.openerRole} ({selectedDispute.opener?.full_name || 'غير معروف'})
                  </span>
                </div>
                <p className="text-xs text-error-800">
                  <strong>المرحلة التي حدث فيها النزاع:</strong> {info.stageLabel}
                </p>
                <div className="pt-1 border-t border-error-200/60">
                  <p className="text-sm font-bold text-slate-800">السبب: {selectedDispute.reason}</p>
                  {selectedDispute.details && (
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">{selectedDispute.details}</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Package size={16} className="text-primary-600" />
                  بيانات الخدمة والطلب
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <p className="text-slate-600">
                    <span className="font-bold text-slate-700">اسم الخدمة:</span> {listing?.service_name || 'غير محدد'}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-bold text-slate-700">نوع / تصنيف الخدمة:</span>{' '}
                    <span className="badge bg-primary-100 text-primary-700">
                      {listing?.category?.name || 'غير محدد'}
                    </span>
                  </p>
                  <p className="text-slate-600">
                    <span className="font-bold text-slate-700">قيمة الخدمة:</span> {formatYER(selectedDispute.order?.service_price || 0)} ريال
                  </p>
                  <p className="text-slate-600">
                    <span className="font-bold text-slate-700">مدينة الخدمة:</span> {listing?.city || orderCity || 'غير محدد'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`rounded-2xl border p-4 space-y-2 ${!info.isOpenedByProvider ? 'border-blue-300 bg-blue-50/40' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">بيانات العميل</span>
                    {!info.isOpenedByProvider && (
                      <span className="text-[11px] font-bold text-error-600">• فاتح النزاع</span>
                    )}
                  </div>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                    <User size={15} className="text-slate-400" />
                    {client?.full_name || 'غير متوفر'}
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5" dir="ltr">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{client?.email || 'لا يوجد بريد'}</span>
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5" dir="ltr">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span>{client?.phone || 'لا يوجد رقم هاتف'}</span>
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>{client?.city || orderCity || listing?.city || 'المدينة غير محددة'}</span>
                  </p>
                </div>

                <div className={`rounded-2xl border p-4 space-y-2 ${info.isOpenedByProvider ? 'border-purple-300 bg-purple-50/40' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">بيانات مقدم الخدمة</span>
                    {info.isOpenedByProvider && (
                      <span className="text-[11px] font-bold text-error-600">• فاتح النزاع</span>
                    )}
                  </div>
                  <p className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                    <User size={15} className="text-slate-400" />
                    {provider?.full_name || 'غير متوفر'}
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5" dir="ltr">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{provider?.email || 'لا يوجد بريد'}</span>
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5" dir="ltr">
                    <Phone size={14} className="text-slate-400 shrink-0" />
                    <span>{provider?.phone || 'لا يوجد رقم هاتف'}</span>
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>{provider?.city || listing?.city || orderCity || 'المدينة غير محددة'}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Clock size={16} className="text-primary-600" />
                  الخط الزمني للخدمة والطلب والنزاع
                </h4>

                <div className="space-y-2.5 text-xs border-r-2 border-primary-200 pr-3 mr-1">
                  <div>
                    <p className="font-bold text-slate-700">1. تاريخ ووقت نشر الخدمة في المنصة</p>
                    <p className="text-slate-500">{formatDateTime(listing?.created_at)}</p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-700">2. تاريخ ووقت طلب العميل للخدمة</p>
                    <p className="text-slate-500">{formatDateTime(selectedDispute.order?.created_at)}</p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-700">3. تاريخ ووقت قبول مقدم الخدمة للطلب</p>
                    <p className="text-slate-500">
                      {info.acceptedAt ? formatDateTime(info.acceptedAt) : 'لم يُسجل قبول (حدث النزاع قبل القبول أو لم يُحفظ في السجل)'}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-700">4. تاريخ ووقت تسليم الخدمة</p>
                    <p className="text-slate-500">
                      {info.deliveredAt ? formatDateTime(info.deliveredAt) : 'لم يتم التسليم بعد (حدث النزاع قبل مرحلة التسليم)'}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-error-600">5. تاريخ ووقت رفع النزاع ({info.openerRole})</p>
                    <p className="text-slate-600 font-medium">{formatDateTime(selectedDispute.created_at)}</p>
                  </div>
                </div>
              </div>

              {selectedDispute.admin_resolution && (
                <div className="rounded-2xl bg-success-50 border border-success-100 p-4">
                  <p className="text-xs font-bold text-success-700 mb-1">قرار الإدارة المتخذ:</p>
                  <p className="text-sm text-slate-700">{selectedDispute.admin_resolution}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="btn-ghost flex-1 !bg-slate-100"
                >
                  إغلاق
                </button>
                {selectedDispute.status === 'open' && (
                  <button
                    onClick={() => setResolveModal(selectedDispute.id)}
                    className="btn-primary flex-1"
                  >
                    <Scale size={16} />
                    اتخاذ قرار في النزاع
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {resolveModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40" onClick={() => !actionLoading && setResolveModal(null)}>
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800 mb-4">حل النزاع</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">القرار *</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="input-field"
                >
                  <option value="">اختر القرار...</option>
                  <option value="resolved_customer">لصالح العميل (إلغاء/استرداد)</option>
                  <option value="resolved_provider">لصالح مقدم الخدمة (إكتمال)</option>
                  <option value="resolved_partial">حل جزئي</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات القرار *</label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="اشرح سبب القرار..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setResolveModal(null)} disabled={actionLoading} className="btn-ghost flex-1 !bg-slate-100">إلغاء</button>
                <button onClick={handleResolve} disabled={actionLoading || !outcome || !resolution.trim()} className="btn-primary flex-1">
                  {actionLoading ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جاري...</span> : 'تأكيد القرار'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ FINANCE & WALLETS ============
function FinanceSection() {
  const [tab, setTab] = useState<'overview' | 'wallets' | 'transactions'>('overview');

  const [stats, setStats] = useState({
    totalOrderValue: 0, totalCustomerFees: 0, totalProviderFees: 0,
    mahraRevenue: 0, completedCount: 0, cancelledCount: 0, disputedCount: 0,
    totalOrders: 0, avgOrderValue: 0, totalWalletBalances: 0
  });

  const [settings, setSettings] = useState({
    customer_fee_percentage: 2.5, provider_fee_percentage: 2.5,
    minimum_customer_fee: 100, minimum_provider_fee: 100,
  });

  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: orders } = await supabase.from('orders').select('service_price, customer_fee, provider_fee, mahra_revenue, status');
      const all = orders || [];
      const completed = all.filter((o: { status: string }) => o.status === 'completed');
      const cancelled = all.filter((o: { status: string }) => o.status === 'cancelled');
      const disputed = all.filter((o: { status: string }) => o.status === 'disputed');
      const totalValue = all.reduce((s: number, o: { service_price: number }) => s + Number(o.service_price), 0);
      const totalCustFees = all.reduce((s: number, o: { customer_fee: number }) => s + Number(o.customer_fee), 0);
      const totalProvFees = all.reduce((s: number, o: { provider_fee: number }) => s + Number(o.provider_fee), 0);
      const totalMahra = all.reduce((s: number, o: { mahra_revenue: number }) => s + Number(o.mahra_revenue), 0);

      const { data: cs } = await supabase.from('commission_settings').select('*').eq('id', 1).maybeSingle();
      if (cs) setSettings(cs as typeof settings);

      const [{ data: wData }, { data: tData }, { data: pData }] = await Promise.all([
        supabase.from('wallets').select('*'),
        supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, auth_user_id, full_name, email')
      ]);

      const totalWalletBalances = (wData || []).reduce((sum, w) => sum + Number(w.balance), 0);

      setWallets(wData || []);
      setTransactions(tData || []);
      setProfiles(pData || []);

      setStats({
        totalOrderValue: totalValue, totalCustomerFees: totalCustFees, totalProviderFees: totalProvFees,
        mahraRevenue: totalMahra, completedCount: completed.length, cancelledCount: cancelled.length,
        disputedCount: disputed.length, totalOrders: all.length,
        avgOrderValue: all.length > 0 ? totalValue / all.length : 0,
        totalWalletBalances
      });

      setLoading(false);
    })();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from('commission_settings').upsert({
      id: 1,
      customer_fee_percentage: settings.customer_fee_percentage,
      provider_fee_percentage: settings.provider_fee_percentage,
      minimum_customer_fee: settings.minimum_customer_fee,
      minimum_provider_fee: settings.minimum_provider_fee,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    setSaving(false);

    if (error) {
      alert('حدث خطأ أثناء الحفظ: ' + error.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getTxTypeLabel = (type: string) => {
    const types: Record<string, string> = { deposit: 'إيداع', withdrawal: 'سحب', payment: 'دفع لخدمة', refund: 'استرداد', commission: 'عمولة للمنصة' };
    return types[type] || type;
  };

  const getTxStatusLabel = (status: string) => {
    const statuses: Record<string, string> = { pending: 'بانتظار التأكيد', completed: 'مكتمل', rejected: 'مرفوض', failed: 'فاشل' };
    return statuses[status] || status;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="font-bold text-slate-800">المالية والمحافظ الحقيقية</h2>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button onClick={() => setTab('overview')} className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors ${tab === 'overview' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
          نظرة عامة وإعدادات
        </button>
        <button onClick={() => setTab('wallets')} className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors flex items-center gap-2 ${tab === 'wallets' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
          <Wallet size={16} /> محافظ المستخدمين
        </button>
        <button onClick={() => setTab('transactions')} className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors flex items-center gap-2 ${tab === 'transactions' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
          <ArrowRightLeft size={16} /> سجل المعاملات
        </button>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 mb-3">
                <Wallet size={22} className="text-white" />
              </div>
              <p className="text-xl font-black text-slate-800">{formatYER(stats.totalWalletBalances)}</p>
              <p className="text-sm text-slate-500">إجمالي أموال المحافظ</p>
            </div>
            <div className="card p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-success-500 to-success-600 mb-3">
                <TrendingUp size={22} className="text-white" />
              </div>
              <p className="text-xl font-black text-slate-800">{formatYER(stats.mahraRevenue)}</p>
              <p className="text-sm text-slate-500">أرباح مَهَرَة المكتملة</p>
            </div>
            <div className="card p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mb-3">
                <Package size={22} className="text-white" />
              </div>
              <p className="text-xl font-black text-slate-800">{formatYER(stats.totalOrderValue)}</p>
              <p className="text-sm text-slate-500">قيمة جميع الطلبات</p>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-4">إعدادات العمولة</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">نسبة عمولة العميل (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.customer_fee_percentage}
                  onChange={(e) => setSettings({ ...settings, customer_fee_percentage: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">نسبة عمولة مقدم الخدمة (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.provider_fee_percentage}
                  onChange={(e) => setSettings({ ...settings, provider_fee_percentage: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الحد الأدنى لعمولة العميل</label>
                <input
                  type="number"
                  value={settings.minimum_customer_fee}
                  onChange={(e) => setSettings({ ...settings, minimum_customer_fee: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الحد الأدنى لعمولة مقدم الخدمة</label>
                <input
                  type="number"
                  value={settings.minimum_provider_fee}
                  onChange={(e) => setSettings({ ...settings, minimum_provider_fee: Number(e.target.value) })}
                  className="input-field"
                />
              </div>
            </div>
            {saved && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700">
                <CheckCircle size={18} /> تم حفظ الإعدادات
              </div>
            )}
            <button onClick={handleSaveSettings} disabled={saving} className="btn-primary mt-4 w-full">
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>
      )}

      {tab === 'wallets' && (
        <div className="card overflow-x-auto animate-fade-in">
          <div className="p-4 border-b border-slate-100 bg-accent-50 text-accent-700 text-sm">
            ملاحظة: هذا الجدول يعرض الأرصدة الحقيقية المخزنة في قاعدة البيانات. لإضافة أو سحب أرصدة، يتم ذلك تلقائياً عند الدفع لخدمة أو استردادها عبر النظام.
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-right">
              <tr>
                <th className="px-4 py-3 font-bold">المستخدم</th>
                <th className="px-4 py-3 font-bold hidden sm:table-cell">البريد الإلكتروني</th>
                <th className="px-4 py-3 font-bold">الرصيد الحالي</th>
                <th className="px-4 py-3 font-bold hidden md:table-cell">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wallets.map(w => {
                const user = profiles.find((p) => p.id === w.user_id || p.auth_user_id === w.user_id);
                return (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">{user?.full_name || 'مستخدم مجهول'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell" dir="ltr">{user?.email || '-'}</td>
                    <td className="px-4 py-3 font-black text-emerald-600 text-lg">
                      {formatYER(Number(w.balance))} {w.currency === 'YER' ? 'ر.ي' : w.currency}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {new Date(w.created_at).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                );
              })}
              {wallets.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">لا توجد محافظ مسجلة حتى الآن</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="card overflow-x-auto animate-fade-in">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-right">
              <tr>
                <th className="px-4 py-3 font-bold hidden sm:table-cell">رقم العملية</th>
                <th className="px-4 py-3 font-bold">المستخدم</th>
                <th className="px-4 py-3 font-bold">النوع</th>
                <th className="px-4 py-3 font-bold">المبلغ</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map(tx => {
                const wallet = wallets.find((w) => w.id === tx.wallet_id);
                const user = profiles.find((p) => p.id === wallet?.user_id || p.auth_user_id === wallet?.user_id);
                const isPositive = ['deposit', 'refund'].includes(tx.type);
                return (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell" dir="ltr">#{tx.id.slice(0,8)}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{user?.full_name || 'مجهول'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${isPositive ? 'bg-success-50 text-success-700' : 'bg-slate-100 text-slate-700'}`}>
                        {getTxTypeLabel(tx.type)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-black ${isPositive ? 'text-success-600' : 'text-slate-700'}`} dir="ltr">
                      {isPositive ? '+' : '-'}{formatYER(Number(tx.amount))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${tx.status === 'completed' ? 'text-success-600 font-bold' : tx.status === 'pending' ? 'text-accent-600' : 'text-error-600'}`}>
                        {getTxStatusLabel(tx.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(tx.created_at).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">لا توجد عمليات مسجلة حتى الآن</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ HOMEPAGE ============
function HomepageSection() {
  const [settings, setSettings] = useState({ hero_title: '', hero_description: '', hero_image_url: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('homepage_settings').select('*').eq('id', 1).maybeSingle();
      if (data) setSettings(data);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('homepage_settings').upsert({
      id: 1,
      hero_title: settings.hero_title,
      hero_description: settings.hero_description,
      hero_image_url: settings.hero_image_url || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    setSaving(false);

    if (error) {
      alert('حدث خطأ أثناء حفظ إعدادات الصفحة الرئيسية: ' + error.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="font-bold text-slate-800">إدارة الصفحة الرئيسية</h2>

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">العنوان الرئيسي</label>
          <input
            type="text"
            value={settings.hero_title}
            onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">الوصف</label>
          <textarea
            value={settings.hero_description}
            onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })}
            rows={3}
            className="input-field resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">رابط صورة الخلفية (اختياري)</label>
          <input
            type="url"
            value={settings.hero_image_url || ''}
            onChange={(e) => setSettings({ ...settings, hero_image_url: e.target.value })}
            placeholder="https://..."
            className="input-field"
            dir="ltr"
          />
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700">
            <CheckCircle size={18} /> تم حفظ التغييرات
          </div>
        )}

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-slate-800 mb-2">الخدمات المميزة</h3>
        <p className="text-sm text-slate-500">
          للتحكم في الخدمات المميزة، اذهب إلى قسم الخدمات واضغط على أيقونة النجمة لتمييز أو إزالة تمييز أي خدمة.
        </p>
        <Link to="/admin/listings" className="btn-secondary !py-2 !text-sm mt-3 inline-flex">
          إدارة الخدمات
        </Link>
      </div>
    </div>
  );
}

// ============ NOTIFICATIONS (Admin Broadcast) ============
function NotificationsSection() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);

  const handleSend = async () => {
    setError(null);
    if (!title.trim()) {
      setError('يرجى إدخال عنوان الإشعار');
      return;
    }
    setSending(true);

    const { data, error: rpcError } = await supabase.rpc('send_notification_to_all', {
      p_title: title.trim(),
      p_body: body.trim() || null,
      p_link: link.trim() || null,
    });

    setSending(false);

    if (rpcError) {
      setError(rpcError.message || 'حدث خطأ أثناء الإرسال');
      return;
    }

    setSentCount(data || 0);
    setSuccess(true);
    setTitle('');
    setBody('');
    setLink('');
    setTimeout(() => setSuccess(false), 4000);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="font-bold text-slate-800">إرسال إشعار لكل المستخدمين</h2>

      <div className="card p-5 space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-accent-50 px-4 py-3">
          <Megaphone size={20} className="text-accent-600 shrink-0 mt-0.5" />
          <p className="text-sm text-accent-700">
            سيصل الإشعار لكل المستخدمين النشطين في المنصة دفعة واحدة بشكل آمن.
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">عنوان الإشعار *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: تحديث جديد في المنصة"
            className="input-field"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">نص الإشعار</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب تفاصيل الإشعار هنا..."
            rows={4}
            className="input-field resize-none"
            maxLength={500}
          />
          <p className="text-xs text-slate-400 mt-1">{body.length}/500</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">رابط عند النقر (اختياري)</label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/services أو /orders"
            className="input-field"
            dir="ltr"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700">
            <CheckCircle size={18} />
            تم إرسال الإشعار إلى {sentCount} مستخدم بنجاح!
          </div>
        )}

        <button onClick={handleSend} disabled={sending} className="btn-primary w-full !h-12">
          {sending ? (
            <span className="flex items-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              جاري الإرسال...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Megaphone size={20} />
              إرسال الإشعار
            </span>
          )}
        </button>
      </div>

      <RecentBroadcasts />
    </div>
  );
}

function RecentBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<{ id: string; title: string; body: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, created_at')
        .eq('type', 'admin_broadcast')
        .order('created_at', { ascending: false })
        .limit(10);
      const seen = new Set<string>();
      const unique = (data || []).filter((b: { id: string; title: string; body: string | null; created_at: string }) => {
        const key = `${b.title}-${b.created_at}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setBroadcasts(unique);
      setLoading(false);
    })();
  }, []);

  if (loading) return null;
  if (broadcasts.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="font-bold text-slate-800 mb-4">آخر الإشعارات المرسلة</h3>
      <div className="space-y-3">
        {broadcasts.map((b) => (
          <div key={b.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <p className="text-sm font-bold text-slate-700">{b.title}</p>
            {b.body && <p className="text-xs text-slate-500 mt-1">{b.body}</p>}
            <p className="text-[10px] text-slate-400 mt-1">
              {new Date(b.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ SHARED COMPONENTS ============
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-pulse text-slate-400">جاري التحميل...</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="card p-8 text-center text-slate-400">{text}</div>
  );
}