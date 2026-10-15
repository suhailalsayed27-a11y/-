import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Tag, MapPin, Users, ClipboardList, Settings,
  LogOut, Menu, X, CheckCircle, XCircle, Eye, EyeOff, Trash2, Edit3, Plus,
  TrendingUp, UserCheck, Building, Package, ArrowLeft, Search, Star, Shield,
  Megaphone, Loader2, Scale, Wallet,
  type LucideIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useStaticData } from '@/hooks/useStaticData';
import Logo from '@/components/Logo';
import type { Profile, Listing, Order, Category, City, Dispute } from '@/types';
import { formatYER } from '@/lib/commission';

type Section = 'dashboard' | 'listings' | 'categories' | 'cities' | 'users' | 'providers' | 'orders' | 'disputes' | 'finance' | 'homepage' | 'notifications';

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
    { key: 'orders', label: 'الطلبات', icon: ClipboardList },
    { key: 'disputes', label: 'النزاعات', icon: Scale },
    { key: 'finance', label: 'المالية', icon: Wallet },
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
    pendingListings: 0, pendingProviders: 0,
  });
  const [categoryStats, setCategoryStats] = useState<{ name: string; count: number }[]>([]);
  const [cityStats, setCityStats] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [usersRes, provRes, clientRes, listRes, orderRes, pendListRes, pendProvRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('account_type', 'client'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'client'),
        supabase.from('listings').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('provider_status', 'pending').neq('account_type', 'client'),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        providers: provRes.count || 0,
        clients: clientRes.count || 0,
        listings: listRes.count || 0,
        orders: orderRes.count || 0,
        pendingListings: pendListRes.count || 0,
        pendingProviders: pendProvRes.count || 0,
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
    { label: 'العملاء', value: stats.clients, icon: Building, color: 'from-accent-500 to-accent-600' },
    { label: 'الخدمات', value: stats.listings, icon: Package, color: 'from-accent-500 to-accent-600' },
    { label: 'الطلبات', value: stats.orders, icon: ClipboardList, color: 'from-pink-500 to-pink-600' },
    { label: 'بانتظار المراجعة', value: stats.pendingListings, icon: TrendingUp, color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Pending alerts */}
      {(stats.pendingListings > 0 || stats.pendingProviders > 0) && (
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
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Listing | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const fetchListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('*, category:categories(*), provider:profiles(*)')
      .order('created_at', { ascending: false });
    setListings((data as Listing[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('listings').update({ status }).eq('id', id);
    setListings(listings.map((l) => l.id === id ? { ...l, status: status as Listing['status'] } : l));
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
            { key: 'published', label: 'منشورة' },
            { key: 'pending', label: 'بانتظار المراجعة' },
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
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {l.provider?.avatar_url ? (
                <img src={l.provider.avatar_url} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-lg font-bold text-primary-700 shrink-0">
                  {l.provider?.full_name?.charAt(0) || '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{l.service_name}</p>
                <p className="text-sm text-slate-500 truncate">
                  {l.provider?.full_name} • {l.city} • {Number(l.price).toLocaleString('ar-EG')} ر.ي
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`badge ${
                    l.status === 'published' ? 'bg-success-100 text-success-700' :
                    l.status === 'pending' ? 'bg-accent-100 text-accent-700' :
                    l.status === 'hidden' ? 'bg-slate-200 text-slate-600' :
                    'bg-error-100 text-error-700'
                  }`}>
                    {l.status === 'published' ? 'منشورة' : l.status === 'pending' ? 'بانتظار' : l.status === 'hidden' ? 'مخفية' : 'مرفوضة'}
                  </span>
                  {l.featured && <span className="badge bg-accent-100 text-accent-700">مميزة</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {l.status === 'pending' && (
                <>
                  <button onClick={() => updateStatus(l.id, 'published')} className="btn-ghost !bg-success-50 !text-success-600 !px-2.5 !py-1.5" title="موافقة">
                    <CheckCircle size={16} />
                  </button>
                  <button onClick={() => updateStatus(l.id, 'rejected')} className="btn-ghost !bg-error-50 !text-error-600 !px-2.5 !py-1.5" title="رفض">
                    <XCircle size={16} />
                  </button>
                </>
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
  const { categories } = useStaticData();
  const [serviceName, setServiceName] = useState(listing?.service_name || '');
  const [categoryId, setCategoryId] = useState(listing?.category_id || '');
  const [city, setCity] = useState(listing?.city || 'صنعاء');
  const [description, setDescription] = useState(listing?.description || '');
  const [price, setPrice] = useState(String(listing?.price || ''));
  const [experience, setExperience] = useState(listing?.experience || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    if (listing) {
      await supabase.from('listings').update({
        service_name: serviceName, category_id: categoryId, city, description,
        price: Number(price), experience,
      }).eq('id', listing.id);
    } else {
      // Admin adds listing — need a provider. Use first demo provider.
      const { data: demoProvider } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      if (demoProvider) {
        await supabase.from('listings').insert({
          provider_id: demoProvider.id, category_id: categoryId,
          service_name: serviceName, city, description,
          price: Number(price), experience, status: 'published',
        });
      }
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
            <option value="صنعاء">صنعاء</option>
            <option value="عدن">عدن</option>
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
function CategoriesSection() {
  const { categories, services, reload } = useStaticData();
  const [editing, setEditing] = useState<Category | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddService, setShowAddService] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');

  const updateCategory = async (id: string, name: string, iconName: string) => {
    await supabase.from('categories').update({ name, icon_name: iconName }).eq('id', id);
    reload();
    setEditing(null);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('حذف هذا التصنيف سيحذف جميع الخدمات بداخله. هل أنت متأكد؟')) return;
    await supabase.from('categories').delete().eq('id', id);
    reload();
  };

  const addCategory = async (name: string, iconName: string) => {
    await supabase.from('categories').insert({ name, icon_name: iconName });
    reload();
    setShowAdd(false);
  };

  const addService = async (categoryId: string) => {
    if (!newServiceName.trim()) return;
    const maxOrder = services.filter((s) => s.category_id === categoryId).length;
    await supabase.from('services_catalog').insert({ category_id: categoryId, name: newServiceName, sort_order: maxOrder + 1 });
    setNewServiceName('');
    setShowAddService(null);
    reload();
  };

  const deleteService = async (id: string) => {
    if (!confirm('حذف هذه الخدمة؟')) return;
    await supabase.from('services_catalog').delete().eq('id', id);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">التصنيفات والخدمات</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary !py-2 !text-sm">
          <Plus size={18} /> إضافة تصنيف
        </button>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const catServices = services.filter((s) => s.category_id === cat.id);
          return (
            <div key={cat.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {cat.name === 'التقنية والرقمية' ? '💻' : cat.name === 'الأعمال والإدارة' ? '💼' : cat.name === 'المطاعم والضيافة' ? '🍔' : '💄'}
                  </span>
                  <span className="font-bold text-slate-800">{cat.name}</span>
                  <span className="badge bg-slate-100 text-slate-500">{catServices.length} خدمة</span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setEditing(cat)} className="btn-ghost !bg-blue-50 !text-blue-600 !px-2.5 !py-1.5">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="btn-ghost !bg-error-50 !text-error-600 !px-2.5 !py-1.5">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Services list */}
              <div className="flex flex-wrap gap-2">
                {catServices.map((s) => (
                  <span key={s.id} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                    {s.name}
                    <button onClick={() => deleteService(s.id)} className="text-slate-300 hover:text-error-500">
                      <X size={14} />
                    </button>
                  </span>
                ))}
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
                  />
                  <button onClick={() => addService(cat.id)} className="btn-primary !px-3 !py-2 !text-sm">
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
        <CategoryEditModal category={editing} onClose={() => setEditing(null)} onSave={updateCategory} />
      )}
      {showAdd && (
        <CategoryEditModal category={null} onClose={() => setShowAdd(false)} onSave={addCategory} />
      )}
    </div>
  );
}

function CategoryEditModal({ category, onClose, onSave }: { category: Category | null; onClose: () => void; onSave: (id: string, name: string, icon: string) => void }) {
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon_name || 'Briefcase');

  return (
    <Modal title={category ? 'تعديل التصنيف' : 'إضافة تصنيف'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم التصنيف</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">الأيقونة</label>
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className="input-field">
            <option value="Laptop">💻 تقنية</option>
            <option value="Briefcase">💼 أعمال</option>
            <option value="UtensilsCrossed">🍔 مطاعم</option>
            <option value="Sparkles">💄 جمال</option>
            <option value="Camera">📷 تصوير</option>
            <option value="Wrench">🔧 صيانة</option>
            <option value="GraduationCap">🎓 تعليم</option>
          </select>
        </div>
        <button
          onClick={() => onSave(category?.id || '', name, icon)}
          disabled={!name}
          className="btn-primary w-full"
        >
          حفظ
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
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers((data as Profile[]) || []);
      setLoading(false);
    })();
  }, []);

  const toggleDisable = async (u: Profile) => {
    await supabase.from('profiles').update({ is_disabled: !u.is_disabled }).eq('id', u.id);
    setUsers(users.map((x) => x.id === u.id ? { ...x, is_disabled: !x.is_disabled } : x));
  };

  const deleteUser = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع.')) return;
    await supabase.from('profiles').delete().eq('id', id);
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
              <th className="px-4 py-3 font-bold hidden md:table-cell">المدينة</th>
              <th className="px-4 py-3 font-bold">الحالة</th>
              <th className="px-4 py-3 font-bold">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => (
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
                    {u.is_admin && <Shield size={14} className="text-primary-500" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 hidden sm:table-cell" dir="ltr">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.account_type === 'provider' ? 'bg-primary-50 text-primary-700' : u.account_type === 'client' ? 'bg-blue-50 text-blue-700' : 'bg-accent-50 text-accent-700'}`}>
                    {u.account_type === 'provider' ? 'مقدم' : u.account_type === 'client' ? 'عميل' : 'مقدم وعميل'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{u.city || '-'}</td>
                <td className="px-4 py-3">
                  {u.is_disabled ? (
                    <span className="badge bg-error-100 text-error-700">معطل</span>
                  ) : (
                    <span className="badge bg-success-100 text-success-700">نشط</span>
                  )}
                </td>
                <td className="px-4 py-3">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-slate-400">لا توجد نتائج</div>}
      </div>
    </div>
  );
}

// ============ PROVIDERS ============
function ProvidersSection() {
  const [providers, setProviders] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('account_type', 'client')
        .order('created_at', { ascending: false });
      setProviders((data as Profile[]) || []);
      setLoading(false);
    })();
  }, []);

  const updateStatus = async (id: string, status: string, verified: boolean) => {
    await supabase.from('profiles').update({ provider_status: status, provider_verified: verified }).eq('id', id);
    setProviders(providers.map((p) => p.id === id ? { ...p, provider_status: status as Profile['provider_status'], provider_verified: verified } : p));
  };

  const filtered = filter === 'all' ? providers : providers.filter((p) => p.provider_status === filter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
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
                <p className="font-bold text-slate-800 truncate">{p.full_name}</p>
                <p className="text-sm text-slate-500 truncate" dir="ltr">{p.email}</p>
                <div className="flex items-center gap-2 mt-1">
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
                  <CheckCircle size={16} /> قبول
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
function DisputesSection() {
  const [disputes, setDisputes] = useState<(Dispute & { order?: Order; opener?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [outcome, setOutcome] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadDisputes = async () => {
    const { data } = await supabase
      .from('disputes')
      .select('*, order:orders(*, listing:listings(*), client:profiles!orders_client_id_fkey(*), provider:profiles!orders_provider_id_fkey(*)), opener:profiles!disputes_opened_by_fkey(*)')
      .order('created_at', { ascending: false });
    setDisputes((data as (Dispute & { order?: Order; opener?: Profile })[]) || []);
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
    setResolution('');
    setOutcome('');
    loadDisputes();
  };

  if (loading) return <LoadingSpinner />;

  const STATUS_LABELS: Record<string, string> = {
    open: 'مفتوح', under_review: 'قيد المراجعة',
    resolved_customer: 'حُل لصالح العميل', resolved_provider: 'حُل لصالح مقدم الخدمة',
    resolved_partial: 'حل جزري',
  };

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-slate-800">النزاعات</h2>

      {disputes.length === 0 ? (
        <EmptyState text="لا توجد نزاعات" />
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <div key={d.id} className="card p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className={`badge ${d.status === 'open' ? 'bg-error-100 text-error-700' : 'bg-success-100 text-success-700'}`}>
                    {STATUS_LABELS[d.status] || d.status}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{new Date(d.created_at).toLocaleDateString('ar-EG')}</span>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-bold text-slate-700">السبب: {d.reason}</p>
                  <p className="text-sm text-slate-600 mt-1">{d.details}</p>
                </div>
                <div className="text-sm text-slate-500 border-t border-slate-100 pt-2">
                  <p>الخدمة: {d.order?.listing?.service_name || 'غير محدد'}</p>
                  <p>العميل: {d.opener?.full_name}</p>
                  <p>قيمة الطلب: {formatYER(d.order?.service_price || 0)} ريال</p>
                </div>
                {d.admin_resolution && (
                  <div className="rounded-xl bg-slate-50 p-3 mt-2">
                    <p className="text-xs font-bold text-slate-500">قرار الأدمن:</p>
                    <p className="text-sm text-slate-600">{d.admin_resolution}</p>
                  </div>
                )}
              </div>

              {d.status === 'open' && (
                <button
                  onClick={() => setResolveModal(d.id)}
                  className="btn-primary mt-3 !py-2 !text-sm"
                >
                  <Scale size={16} />
                  اتخاذ قرار
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => !actionLoading && setResolveModal(null)}>
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
                  <option value="resolved_partial">حل جزري</option>
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

// ============ FINANCE ============
function FinanceSection() {
  const [stats, setStats] = useState({
    totalOrderValue: 0, totalCustomerFees: 0, totalProviderFees: 0,
    mahraRevenue: 0, completedCount: 0, cancelledCount: 0, disputedCount: 0,
    totalOrders: 0, avgOrderValue: 0,
  });
  const [settings, setSettings] = useState({
    customer_fee_percentage: 2.5, provider_fee_percentage: 2.5,
    minimum_customer_fee: 100, minimum_provider_fee: 100,
  });
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

      setStats({
        totalOrderValue: totalValue, totalCustomerFees: totalCustFees, totalProviderFees: totalProvFees,
        mahraRevenue: totalMahra, completedCount: completed.length, cancelledCount: cancelled.length,
        disputedCount: disputed.length, totalOrders: all.length,
        avgOrderValue: all.length > 0 ? totalValue / all.length : 0,
      });

      const { data: cs } = await supabase.from('commission_settings').select('*').eq('id', 1).maybeSingle();
      if (cs) setSettings(cs as typeof settings);
      setLoading(false);
    })();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    await supabase.from('commission_settings').update({
      customer_fee_percentage: settings.customer_fee_percentage,
      provider_fee_percentage: settings.provider_fee_percentage,
      minimum_customer_fee: settings.minimum_customer_fee,
      minimum_provider_fee: settings.minimum_provider_fee,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <LoadingSpinner />;

  const statCards = [
    { label: 'إجمالي قيمة الطلبات', value: formatYER(stats.totalOrderValue), icon: Package, color: 'from-blue-500 to-blue-600' },
    { label: 'رسوم العملاء', value: formatYER(stats.totalCustomerFees), icon: TrendingUp, color: 'from-accent-500 to-accent-600' },
    { label: 'رسوم مقدمي الخدمات', value: formatYER(stats.totalProviderFees), icon: UserCheck, color: 'from-orange-500 to-orange-600' },
    { label: 'إيرادات مَهَرَة', value: formatYER(stats.mahraRevenue), icon: Wallet, color: 'from-success-500 to-success-600' },
    { label: 'متوسط قيمة الطلب', value: formatYER(Math.round(stats.avgOrderValue)), icon: TrendingUp, color: 'from-primary-500 to-primary-600' },
    { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: ClipboardList, color: 'from-slate-500 to-slate-600' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-bold text-slate-800">لوحة المالية</h2>

      {/* Financial stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} mb-3`}>
                <Icon size={22} className="text-white" />
              </div>
              <p className="text-xl font-black text-slate-800">{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Order status counts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-black text-success-600">{stats.completedCount}</p>
          <p className="text-xs text-slate-500">مكتملة</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-black text-error-600">{stats.cancelledCount}</p>
          <p className="text-xs text-slate-500">ملغاة</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-black text-orange-600">{stats.disputedCount}</p>
          <p className="text-xs text-slate-500">نزاعات</p>
        </div>
      </div>

      {/* Commission settings */}
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

      <div className="rounded-xl bg-accent-50 p-4">
        <p className="text-sm text-accent-700">
          ملاحظة: نظام الدفع الحالي غير متصل. يتم حساب العمولات على الخادم (Server-side) ولا يمكن للمستخدمين التلاعب بها.
          عند ربط بوابة دفع، سيتم تفعيل الدفع الفعلي والتسوية.
        </p>
      </div>
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
    await supabase.from('homepage_settings').update({
      hero_title: settings.hero_title,
      hero_description: settings.hero_description,
      hero_image_url: settings.hero_image_url || null,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving(false);
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
      setError(rpcError.message);
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
            سيصل الإشعار لكل المستخدمين النشطين في المنصة. استخدم هذه الميزة للإعلانات والتحديثات المهمة.
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
          <p className="text-xs text-slate-400 mt-1">عند النقر على الإشعار سيتم توجيه المستخدم لهذا الرابط</p>
        </div>

        {error && (
          <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700">
            <CheckCircle size={18} />
            تم إرسال الإشعار إلى {sentCount} مستخدم بنجاح
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

      {/* Recent broadcasts */}
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
      // Deduplicate by title+created_at (since broadcasts go to all users)
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
