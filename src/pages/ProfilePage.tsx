import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, LogOut, Plus, ClipboardList, Star, Shield, Phone, Briefcase, Camera, X, CheckCircle, Loader2, AlertCircle, Wallet as WalletIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useStaticData } from '@/hooks/useStaticData';

import type { Listing, Order, Review } from '@/types';
import ListingCard from '@/components/ListingCard';

type Tab = 'services' | 'orders' | 'reviews' | 'edit';

export default function ProfilePage() {
  const { profile, session, loading, signOut, refreshProfile } = useAuth();
  const { cities } = useStaticData();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('services');
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [showAdminPromote, setShowAdminPromote] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth/signin', { state: { from: '/profile' } });
    }
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!profile) return;
    setEditName(profile.full_name);
    setEditPhone(profile.phone || '');
    setEditCity(profile.city || '');
    setEditBio(profile.bio || '');
    setEditAvatar(profile.avatar_url);

    (async () => {
      const [listRes, orderRes] = await Promise.all([
        supabase
          .from('listings')
          .select('*, category:categories(*), provider:profiles(*)')
          .eq('provider_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('*, listing:listings(*, category:categories(*)), client:profiles!orders_client_id_fkey(*), provider:profiles!orders_provider_id_fkey(*)')
          .or(`client_id.eq.${profile.id},provider_id.eq.${profile.id}`)
          .order('created_at', { ascending: false }),
      ]);
      setMyListings((listRes.data as Listing[]) || []);
      setMyOrders((orderRes.data as Order[]) || []);

      // Get reviews on my listings
      if ((listRes.data as Listing[])?.length > 0) {
        const listingIds = (listRes.data as Listing[]).map((l) => l.id);
        const revRes = await supabase
          .from('reviews')
          .select('*')
          .in('listing_id', listingIds)
          .order('created_at', { ascending: false });
        setMyReviews((revRes.data as Review[]) || []);
      }
    })();
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        phone: editPhone,
        city: editCity,
        bio: editBio,
        avatar_url: editAvatar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (!error) {
      setProfileSaved(true);
      await refreshProfile();
      setTimeout(() => setProfileSaved(false), 2000);
    }
    setSavingProfile(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setEditAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAdminPromote = async () => {
    setAdminLoading(true);
    setAdminError(null);
    const { error } = await supabase.rpc('promote_to_admin', { p_admin_code: adminCode });
    if (error) {
      setAdminError(error.message === 'رمز الأدمن غير صحيح' ? 'رمز الأدمن غير صحيح' : error.message);
    } else {
      await refreshProfile();
      setShowAdminPromote(false);
      setAdminCode('');
      navigate('/admin');
    }
    setAdminLoading(false);
  };

  if (!session || !profile) return null;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'services', label: 'الخدمات', count: myListings.length },
    { key: 'orders', label: 'الطلبات', count: myOrders.length },
    { key: 'reviews', label: 'التقييمات', count: myReviews.length },
    { key: 'edit', label: 'تعديل الملف' },
  ];

  return (
    <div className="pb-20 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Profile header */}
        <div className="card overflow-hidden mb-6">
          <div className="relative h-32 overflow-hidden bg-transparent">
            
            <img
              src="/مهرة1.png"
              alt="شعار مَهَرَة"
              className="absolute bottom-3 left-5 h-14 w-14 rounded-2xl object-cover opacity-80 shadow-lg ring-2 ring-white/30"
            />
            {profile.is_admin && (
              <span className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-bold text-white">
                <Shield size={14} />
                أدمن
              </span>
            )}
          </div>
          <div className="px-6 pb-6">
            <div className="relative z-10 flex items-end gap-4 -mt-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-slate-50 object-cover p-1 ring-4 ring-white shadow-lg"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                />
              ) : null}
              <div className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-100 text-3xl font-black text-primary-700 ring-4 ring-white shadow-lg ${profile.avatar_url ? 'hidden' : ''}`}>
                {profile.full_name.charAt(0)}
              </div>
              <div className="flex-1 pb-1">
                <p className="mb-0.5 text-xs font-bold text-primary-600">الملف الشخصي</p>
                <h1 className="text-xl font-black text-slate-800">
                  مرحبًا بك، {profile.full_name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                  {profile.city && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-primary-500" />
                      {profile.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Briefcase size={14} className="text-primary-500" />
                    {profile.account_type === 'provider' ? 'مقدم خدمة' : profile.account_type === 'client' ? 'عميل' : 'مقدم وعميل'}
                  </span>
                  {profile.provider_verified && (
                    <span className="flex items-center gap-1 text-success-600">
                      <CheckCircle size={14} />
                      موثق
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab('edit')}
                  className="btn-ghost !bg-primary-50 !text-primary-700 hidden sm:flex"
                >
                  تعديل الملف
                </button>
                <button
                  onClick={() => signOut()}
                  className="btn-ghost !bg-error-50 !text-error-600 hidden sm:flex"
                >
                  <LogOut size={18} />
                  خروج
                </button>
              </div>
            </div>

            {profile.bio && (
              <p className="mt-4 text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
            )}

            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.skills.map((skill, i) => (
                  <span key={i} className="badge bg-primary-50 text-primary-700">{skill}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <Link to="/wallet" className="card mb-6 flex items-center justify-between gap-4 border-primary-100 bg-primary-50/60 p-4 transition-colors hover:bg-primary-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700"><WalletIcon size={20} /></div>
            <div><p className="font-bold text-slate-800">المحفظة المالية</p><p className="text-xs text-slate-500">الرصيد، الأرباح، وسجل العمليات</p></div>
          </div>
          <span className="text-sm font-bold text-primary-700">عرض المحفظة</span>
        </Link>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                tab === t.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="mr-1.5 text-xs opacity-75">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'services' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">خدماتي</h2>
              <Link to="/add-skill" className="btn-primary !px-4 !py-2 !text-sm">
                <Plus size={18} />
                إضافة خدمة
              </Link>
            </div>
            {myListings.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-slate-400 mb-4">لم تنشر أي خدمة بعد</p>
                <Link to="/add-skill" className="btn-primary">
                  <Plus size={18} />
                  أضف أول خدمة
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myListings.map((l) => (
                  <div key={l.id} className="relative">
                    <ListingCard listing={l} />
                    {l.status === 'pending' && (
                      <span className="absolute top-2 right-2 z-10 badge bg-accent-100 text-accent-700">بانتظار المراجعة</span>
                    )}
                    {l.status === 'hidden' && (
                      <span className="absolute top-2 right-2 z-10 badge bg-slate-200 text-slate-600">مخفية</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">طلباتي</h2>
            {myOrders.length === 0 ? (
              <div className="card p-8 text-center">
                <ClipboardList size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-400">لا توجد طلبات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((order) => (
                  <Link key={order.id} to={`/listings/${order.listing_id}`} className="card p-4 flex items-center gap-3 card-hover">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                      <ClipboardList size={20} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{order.listing?.service_name}</p>
                      <p className="text-sm text-slate-500">
                        {profile.id === order.provider_id ? order.client?.full_name : order.provider?.full_name}
                      </p>
                    </div>
                    <span className={`badge ${
                      order.status === 'new' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'in_progress' ? 'bg-accent-100 text-accent-700' :
                      order.status === 'completed' ? 'bg-success-100 text-success-700' :
                      'bg-error-100 text-error-700'
                    }`}>
                      {order.status === 'new' ? 'جديد' : order.status === 'in_progress' ? 'قيد التنفيذ' : order.status === 'completed' ? 'مكتمل' : 'ملغي'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'reviews' && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">التقييمات</h2>
            {myReviews.length === 0 ? (
              <div className="card p-8 text-center">
                <Star size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-400">لا توجد تقييمات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myReviews.map((rev) => (
                  <div key={rev.id} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700">{rev.client_name}</span>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <Star key={i} size={14} className={i <= rev.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'} />
                        ))}
                      </div>
                    </div>
                    {rev.comment && <p className="text-sm text-slate-600">{rev.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'edit' && (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">تعديل الملف الشخصي</h2>
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                {editAvatar ? (
                  <img src={editAvatar} alt="avatar" className="h-20 w-20 rounded-2xl bg-slate-50 object-contain p-1" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-100 text-2xl font-bold text-primary-700">
                    {editName.charAt(0) || '?'}
                  </div>
                )}
                <label className="btn-ghost !bg-slate-100 cursor-pointer">
                  <Camera size={18} />
                  تغيير الصورة
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">الهاتف</label>
                  <div className="relative">
                    <Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="input-field !pr-10" dir="ltr" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">المدينة</label>
                  <select value={editCity} onChange={(e) => setEditCity(e.target.value)} className="input-field">
                    <option value="">اختر المدينة</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">نبذة عنك</label>
                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} className="input-field resize-none" placeholder="اكتب نبذة قصيرة عنك..." />
              </div>

              {profileSaved && (
                <div className="flex items-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700">
                  <CheckCircle size={18} />
                  تم حفظ التغييرات بنجاح
                </div>
              )}

              <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary w-full">
                {savingProfile ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    جاري الحفظ...
                  </span>
                ) : 'حفظ التغييرات'}
              </button>

              {/* Admin promotion */}
              <div className="pt-4 border-t border-slate-100">
                {!profile.is_admin && !showAdminPromote && (
                  <button
                    onClick={() => setShowAdminPromote(true)}
                    className="btn-ghost !text-slate-400 w-full"
                  >
                    <Shield size={18} />
                    ترقية إلى حساب أدمن
                  </button>
                )}
                {showAdminPromote && (
                  <div className="rounded-xl bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-700">ترقية إلى أدمن</h3>
                      <button onClick={() => { setShowAdminPromote(false); setAdminError(null); }} className="text-slate-400">
                        <X size={18} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      placeholder="أدخل رمز الأدمن"
                      className="input-field"
                      dir="ltr"
                    />
                    {adminError && (
                      <div className="flex items-center gap-2 text-sm text-error-600">
                        <AlertCircle size={16} />
                        {adminError}
                      </div>
                    )}
                    <button onClick={handleAdminPromote} disabled={adminLoading || !adminCode} className="btn-primary w-full !text-sm">
                      {adminLoading ? 'جاري...' : 'ترقية'}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => { signOut(); navigate('/'); }}
                className="btn-ghost !bg-error-50 !text-error-600 w-full sm:hidden"
              >
                <LogOut size={18} />
                تسجيل الخروج
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
