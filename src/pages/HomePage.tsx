import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Plus, ArrowLeft, TrendingUp, Users, Briefcase, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStaticData } from '@/hooks/useStaticData';
import { getCategoryColor } from '@/types';
import type { Listing, HomepageSettings } from '@/types';
import ListingCard from '@/components/ListingCard';

// Map icon names from DB to lucide components
// Fallback static categories (in case DB is loading)
const FALLBACK_CATEGORIES = [
  { name: 'التقنية والرقمية', icon_name: 'Laptop' },
  { name: 'الأعمال والإدارة', icon_name: 'Briefcase' },
  { name: 'المطاعم والضيافة', icon_name: 'UtensilsCrossed' },
  { name: 'الجمال والعناية', icon_name: 'Sparkles' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { categories, cities, loading } = useStaticData();
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [settings, setSettings] = useState<HomepageSettings | null>(null);
  const [stats, setStats] = useState({ providers: 0, listings: 0, cities: 0 });

  useEffect(() => {
    (async () => {
      const [featRes, settingsRes, provRes, listRes] = await Promise.all([
        supabase
          .from('listings')
          .select('*, category:categories(*), provider:profiles(*)')
          .eq('status', 'published')
          .eq('featured', true)
          .order('rating', { ascending: false })
          .limit(8),
        supabase.from('homepage_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('account_type', 'client'),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      ]);
      setFeatured((featRes.data as Listing[]) || []);
      if (settingsRes.data) setSettings(settingsRes.data as HomepageSettings);
      setStats({
        providers: provRes.count || 0,
        listings: listRes.count || 0,
        cities: cities.length || 2,
      });
    })();
  }, [cities.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (selectedCity) params.set('city', selectedCity);
    navigate(`/services?${params.toString()}`);
  };

  const cats = loading ? FALLBACK_CATEGORIES : categories;

  return (
    <div className="pb-20 md:pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-10 h-48 w-48 rounded-full bg-accent-400 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-20">
          
            
          
          <div className="text-center max-w-2xl mx-auto">
            
            <p className="mb-2 text-sm font-bold tracking-wide text-primary-100">مرحبًا بكم في مَهَرَة</p>
            <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight">
              {settings?.hero_title || 'مهارتك تستحق فرصة'}
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8 leading-relaxed">
              {settings?.hero_description || 'اعرض مهارتك، وابحث عن عملاء يحتاجون ما تقدمه.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
              <Link to="/add-skill" className="btn-accent w-full sm:w-auto !h-14 !text-lg">
                <Plus size={22} />
                أضف مهارتك
              </Link>
              <Link to="/services" className="btn-secondary w-full sm:w-auto !h-14 !text-lg !bg-white/10 !text-white !ring-white/30 hover:!bg-white/20">
                <Search size={22} />
                ابحث عن خدمة
              </Link>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="rounded-2xl bg-white p-2 shadow-2xl shadow-primary-900/20">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ما الخدمة التي تبحث عنها؟"
                    className="w-full rounded-xl border-0 bg-slate-50 pr-11 pl-4 py-3.5 text-base text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500/30 outline-none"
                  />
                </div>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="rounded-xl border-0 bg-slate-50 px-4 py-3.5 text-base text-slate-700 focus:ring-2 focus:ring-primary-500/30 outline-none cursor-pointer"
                >
                  <option value="">كل المدن</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <button type="submit" className="btn-primary !h-auto sm:!px-8">
                  <Search size={20} />
                  بحث
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Wave separator */}
        <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none">
          <path d="M0 80L60 70C120 60 240 40 360 35C480 30 600 40 720 45C840 50 960 50 1080 45C1200 40 1320 30 1380 25L1440 20V80H0Z" fill="#f8fafc"/>
        </svg>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 -mt-4 relative z-10">
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          {[
            { icon: Users, label: 'مقدم خدمة', value: stats.providers, color: 'text-primary-600', bg: 'bg-primary-50' },
            { icon: Briefcase, label: 'خدمة منشورة', value: stats.listings, color: 'text-accent-600', bg: 'bg-accent-50' },
            { icon: MapPin, label: 'مدن', value: stats.cities, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="card flex flex-col items-center justify-center p-4 md:p-6 text-center">
                <div className={`flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl ${s.bg} mb-2`}>
                  <Icon size={20} className={s.color} />
                </div>
                <span className="text-xl md:text-2xl font-black text-slate-800">{s.value}</span>
                <span className="text-xs md:text-sm text-slate-500">{s.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-800">التصنيفات</h2>
          <Link to="/services" className="flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700">
            عرض الكل
            <ArrowLeft size={16} className="rotate-180" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {cats.map((cat) => {
            const color = getCategoryColor(cat.name);
            return (
              <Link
                key={cat.name}
                to={`/services?category=${encodeURIComponent(cat.name)}`}
                className="card card-hover group flex flex-col items-center p-5 md:p-8 text-center"
              >
                <div className={`flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${color.gradient} mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                  <span className="text-2xl md:text-3xl">
                    {cat.name === 'التقنية والرقمية' ? '💻' : cat.name === 'الأعمال والإدارة' ? '💼' : cat.name === 'المطاعم والضيافة' ? '🍔' : '💄'}
                  </span>
                </div>
                <h3 className="text-sm md:text-base font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
                  {cat.name}
                </h3>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured listings */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-6 md:py-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp size={22} className="text-accent-500" />
              <h2 className="text-xl md:text-2xl font-black text-slate-800">خدمات مميزة</h2>
            </div>
            <Link to="/services" className="flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700">
              عرض الكل
              <ArrowLeft size={16} className="rotate-180" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 md:p-12 text-center">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-primary-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="relative">
            <Award size={40} className="mx-auto text-accent-400 mb-4" />
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3">هل لديك مهارة؟</h2>
            <p className="text-slate-300 text-lg mb-6 max-w-md mx-auto">
              انضم إلى مَهَرَة اليوم، أضف مهارتك وابدأ في كسب العملاء.
            </p>
            <Link to="/add-skill" className="btn-accent !h-14 !text-lg inline-flex">
              <Plus size={22} />
              أضف مهارتك الآن
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
