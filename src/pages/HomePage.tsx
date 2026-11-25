import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Plus, ArrowLeft, TrendingUp, Users,
  Briefcase, Award, Sparkles, Building2, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStaticData } from '@/hooks/useStaticData';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryColor } from '@/types';
import type { Listing, HomepageSettings } from '@/types';
import ListingCard from '@/components/ListingCard';

const FALLBACK_CATEGORIES = [
  { name: 'التقنية والرقمية', icon_name: 'Laptop' },
  { name: 'الأعمال والإدارة', icon_name: 'Briefcase' },
  { name: 'المطاعم والضيافة', icon_name: 'UtensilsCrossed' },
  { name: 'الجمال والعناية', icon_name: 'Sparkles' },
];

interface RecentJob {
  id: string;
  title: string;
  job_type: string;
  city: string;
  salary_min?: number | null;
  salary_max?: number | null;
  business?: {
    business_name?: string | null;
    full_name: string;
    business_type?: string | null;
  };
}

const JOB_TYPE_BADGES: Record<string, string> = {
  part_time: 'دوام جزئي',
  full_time: 'دوام كامل',
  shift: 'نظام ورديات',
  temporary: 'عمل مؤقت',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { categories, cities, loading } = useStaticData();

  const [searchTarget, setSearchTarget] = useState<'services' | 'jobs'>('services');
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [settings, setSettings] = useState<HomepageSettings | null>(null);
  const [stats, setStats] = useState({ providers: 0, listings: 0, jobs: 0 });

  const isBusiness = (profile?.account_type as string) === 'business';

  useEffect(() => {
    (async () => {
      const [featRes, jobsRes, settingsRes, provRes, listRes, jobsCountRes] = await Promise.all([
        supabase
          .from('listings')
          .select('*, category:categories(*), provider:profiles(*)')
          .eq('status', 'published')
          .eq('featured', true)
          .order('rating', { ascending: false })
          .limit(8),
        supabase
          .from('jobs')
          .select('id, title, job_type, city, salary_min, salary_max, business:profiles!jobs_business_id_fkey(business_name, full_name, business_type)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(4),
        supabase.from('homepage_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'individual'),
        supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      ]);

      setFeatured((featRes.data as Listing[]) || []);
      setRecentJobs((jobsRes.data as unknown as RecentJob[]) || []);
      if (settingsRes.data) setSettings(settingsRes.data as HomepageSettings);
      setStats({
        providers: provRes.count || 0,
        listings: listRes.count || 0,
        jobs: jobsCountRes.count || 0,
      });
    })();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (selectedCity) params.set('city', selectedCity);
    navigate(`/${searchTarget}?${params.toString()}`);
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

        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-16 md:pt-16 md:pb-24">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <p className="mb-2 text-sm font-bold tracking-wide text-primary-100">مرحبًا بكم في مَهَرَة</p>
            <h1 className="text-3xl md:text-5xl font-black mb-3 leading-tight">
              {settings?.hero_title || 'منصتك المتكاملة للخدمات وفرص العمل'}
            </h1>
            <p className="text-base md:text-lg text-primary-100 leading-relaxed">
              {settings?.hero_description || 'اعرض مهارتك، اطلب خدمة، أو ابحث عن وظيفة دوام كامل وجزئي لدى أفضل المنشآت.'}
            </p>
          </div>

          {/* البطاقتان الرئيسيتان: سوق الخدمات vs سوق فرص العمل */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
            {/* بطاقة 1: سوق الخدمات */}
            <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-6 flex flex-col justify-between hover:bg-white/15 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-lg">
                    <Sparkles size={24} />
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                    للأفراد وأصحاب المهارات
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white mb-2">سوق الخدمات</h2>
                <p className="text-sm text-primary-100 leading-relaxed mb-5">
                  تصفح خدمات المحترفين في التصميم، البرمجة، الصيانة، الضيافة وغيرها، أو أضف مهارتك وابدأ باستقبال الطلبات.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Link to="/services" className="btn-accent flex-1 !py-3 !text-sm">
                  <Search size={18} />
                  تصفح الخدمات
                </Link>
                <Link
                  to="/add-skill"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-3 text-sm font-bold text-white transition-colors"
                >
                  <Plus size={18} />
                  أضف مهارتك
                </Link>
              </div>
            </div>

            {/* بطاقة 2: سوق فرص العمل */}
            <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-6 flex flex-col justify-between hover:bg-white/15 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg">
                    <Briefcase size={24} />
                  </div>
                  <span className="rounded-full bg-amber-400/20 text-amber-200 px-3 py-1 text-xs font-bold">
                    دوام كامل وجزئي (Part-Time)
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white mb-2">سوق فرص العمل</h2>
                <p className="text-sm text-primary-100 leading-relaxed mb-5">
                  وظائف شاغرة في المطاعم، الكافيهات، الشركات والمتاجر (باريستا، كاشير، طباخ، مبيعات) أو ابحث في دليل الكفاءات.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Link to="/jobs" className="btn-secondary flex-1 !py-3 !text-sm !text-primary-800">
                  <Briefcase size={18} />
                  استكشف الوظائف
                </Link>
                {isBusiness ? (
                  <Link
                    to="/post-job"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-3 text-sm font-bold text-white transition-colors"
                  >
                    <Plus size={18} />
                    انشر وظيفة
                  </Link>
                ) : (
                  <Link
                    to="/talents"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-3 text-sm font-bold text-white transition-colors"
                  >
                    <Users size={18} />
                    الكفاءات
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* شريط البحث الموحد */}
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-center gap-2 mb-2.5">
              <button
                type="button"
                onClick={() => setSearchTarget('services')}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  searchTarget === 'services'
                    ? 'bg-white text-primary-700 shadow'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                البحث في الخدمات
              </button>
              <button
                type="button"
                onClick={() => setSearchTarget('jobs')}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  searchTarget === 'jobs'
                    ? 'bg-white text-primary-700 shadow'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                البحث في فرص العمل
              </button>
            </div>

            <form onSubmit={handleSearch} className="rounded-2xl bg-white p-2 shadow-2xl shadow-primary-900/20">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      searchTarget === 'services'
                        ? 'ما الخدمة التي تبحث عنها؟ (تصميم، صيانة، برمجة...)'
                        : 'ما الوظيفة التي تبحث عنها؟ (باريستا، كاشير، طباخ...)'
                    }
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
            { icon: Users, label: 'فرد وكفاءة', value: stats.providers, color: 'text-primary-600', bg: 'bg-primary-50' },
            { icon: Sparkles, label: 'خدمة منشورة', value: stats.listings, color: 'text-accent-600', bg: 'bg-accent-50' },
            { icon: Briefcase, label: 'فرصة عمل متاحة', value: stats.jobs, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      {/* أحدث فرص العمل */}
      {recentJobs.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-10 md:pt-14">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Briefcase size={22} className="text-amber-500" />
              <h2 className="text-xl md:text-2xl font-black text-slate-800">أحدث فرص العمل</h2>
            </div>
            <Link to="/jobs" className="flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700">
              جميع الوظائف
              <ArrowLeft size={16} className="rotate-180" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                to="/jobs"
                className="card card-hover p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Building2 size={20} />
                    </div>
                    <span className="badge bg-amber-50 text-amber-700">
                      {JOB_TYPE_BADGES[job.job_type] || job.job_type}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-800 mb-1 line-clamp-1">{job.title}</h3>
                  <p className="text-xs font-bold text-slate-500 mb-3">
                    {job.business?.business_name || job.business?.full_name || 'منشأة'}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-primary-500" />
                    {job.city}
                  </span>
                  {job.salary_min ? (
                    <span className="font-bold text-emerald-700">
                      {job.salary_min.toLocaleString()} ر.ي
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      تقديم سريع
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-800">تصنيفات الخدمات</h2>
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
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
              {isBusiness ? 'تبحث عن موظفين أو كفاءات لمنشأتك؟' : 'هل لديك مهارة أو تبحث عن عمل؟'}
            </h2>
            <p className="text-slate-300 text-lg mb-6 max-w-md mx-auto">
              {isBusiness
                ? 'انشر إعلانك الوظيفي الآن واستقبل طلبات المتقدمين في مدينتك بسهولة.'
                : 'انضم إلى مَهَرَة اليوم، اعرض خدماتك أو قدّم على فرص العمل المتاحة.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isBusiness ? (
                <Link to="/post-job" className="btn-accent !h-14 !text-lg inline-flex">
                  <Plus size={22} />
                  نشر فرصة عمل الآن
                </Link>
              ) : (
                <>
                  <Link to="/add-skill" className="btn-accent !h-14 !text-lg inline-flex">
                    <Plus size={22} />
                    أضف مهارتك الآن
                  </Link>
                  <Link to="/jobs" className="btn-secondary !h-14 !text-lg inline-flex">
                    <Briefcase size={22} />
                    تصفح الوظائف
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}