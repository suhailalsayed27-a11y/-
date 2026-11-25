import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, Inbox, ShieldCheck, Sparkles, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useStaticData } from '@/hooks/useStaticData';
import type { Listing } from '@/types';
import ListingCard from '@/components/ListingCard';

const SHIFT_OPTIONS = [
  { id: 'morning', label: 'فترة صباحية' },
  { id: 'evening', label: 'فترة مسائية' },
  { id: 'full_day', label: 'دوام كامل' },
  { id: 'urgent', label: 'طوارئ / فوري' },
];

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const { categories, cities, loading } = useStaticData();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [minRating, setMinRating] = useState(searchParams.get('minRating') || '');

  // فلاتر التوثيق والمطابقة الذكية
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === '1');
  const [availableOnly, setAvailableOnly] = useState(searchParams.get('available') === '1');
  const [selectedShift, setSelectedShift] = useState(searchParams.get('shift') || '');
  const [smartSort, setSmartSort] = useState(true);

  useEffect(() => {
    setSearch(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || '');
    setCity(searchParams.get('city') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setMinRating(searchParams.get('minRating') || '');
    setVerifiedOnly(searchParams.get('verified') === '1');
    setAvailableOnly(searchParams.get('available') === '1');
    setSelectedShift(searchParams.get('shift') || '');
  }, [searchParams]);

  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    let query = supabase
      .from('listings')
      .select('*, category:categories(*), provider:profiles(*)')
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('rating', { ascending: false });

    if (search.trim()) query = query.ilike('service_name', `%${search.trim()}%`);
    if (category) {
      const cat = categories.find((c) => c.name === category);
      if (cat) query = query.eq('category_id', cat.id);
    }
    if (city) query = query.eq('city', city);
    if (minPrice) query = query.gte('price', Number(minPrice));
    if (maxPrice) query = query.lte('price', Number(maxPrice));
    if (minRating) query = query.gte('rating', Number(minRating));

    const { data } = await query.limit(80);
    setListings((data as Listing[]) || []);
    setLoadingListings(false);
  }, [search, category, city, minPrice, maxPrice, minRating, categories]);

  useEffect(() => {
    if (!loading) fetchListings();
  }, [fetchListings, loading]);

  // حساب درجة المطابقة الذكية (Smart Matching Score)
  const calculateSmartScore = useCallback(
    (item: Listing) => {
      const provider = (item.provider || {}) as Record<string, any>;
      const userProfile = (profile || {}) as Record<string, any>;

      let score = 0;

      // 1. التوثيق بالبطاقة الشخصية (أعلى أولوية للأمان)
      if (provider.is_verified || provider.provider_verified) {
        score += 35;
      }

      // 2. التوفر الفوري للعمل
      if (provider.is_available_now !== false) {
        score += 25;
      }

      // 3. الخدمة المميزة
      if (item.featured) {
        score += 10;
      }

      // 4. القرب الجغرافي (المدينة والحي)
      const targetCity = city || userProfile.city;
      if (targetCity && (item.city === targetCity || provider.city === targetCity)) {
        score += 15;
      }
      if (
        userProfile.district &&
        provider.district &&
        String(provider.district).trim() === String(userProfile.district).trim()
      ) {
        score += 15;
      }

      // 5. مطابقة الوردية المطلوبة
      if (
        selectedShift &&
        Array.isArray(provider.available_shifts) &&
        provider.available_shifts.includes(selectedShift)
      ) {
        score += 12;
      }

      // 6. سنوات الخبرة (حد أقصى 10 نقاط)
      const expYears = Number(provider.experience_years || 0);
      score += Math.min(expYears * 2, 10);

      // 7. التقييم ومؤشر الالتزام
      const ratingVal = Number(item.rating || 0);
      const commitmentVal = Number(provider.commitment_score ?? 5);
      score += ratingVal * 2 + commitmentVal;

      return score;
    },
    [city, profile, selectedShift]
  );

  // تطبيق فلاتر التوثيق/التوفر/الوردية وترتيب المطابقة الذكية
  const displayedListings = useMemo(() => {
    const filtered = listings.filter((item) => {
      const provider = (item.provider || {}) as Record<string, any>;
      const isVerified = Boolean(provider.is_verified || provider.provider_verified);
      const isAvailable = provider.is_available_now !== false;

      if (verifiedOnly && !isVerified) return false;
      if (availableOnly && !isAvailable) return false;
      if (selectedShift) {
        const shifts = Array.isArray(provider.available_shifts) ? provider.available_shifts : [];
        if (!shifts.includes(selectedShift)) return false;
      }
      return true;
    });

    if (!smartSort) return filtered;

    return [...filtered].sort((a, b) => calculateSmartScore(b) - calculateSmartScore(a));
  }, [listings, verifiedOnly, availableOnly, selectedShift, smartSort, calculateSmartScore]);

  const syncUrlParams = (overrides?: {
    q?: string;
    category?: string;
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    minRating?: string;
    verified?: boolean;
    available?: boolean;
    shift?: string;
  }) => {
    const next = {
      q: overrides?.q !== undefined ? overrides.q : search,
      category: overrides?.category !== undefined ? overrides.category : category,
      city: overrides?.city !== undefined ? overrides.city : city,
      minPrice: overrides?.minPrice !== undefined ? overrides.minPrice : minPrice,
      maxPrice: overrides?.maxPrice !== undefined ? overrides.maxPrice : maxPrice,
      minRating: overrides?.minRating !== undefined ? overrides.minRating : minRating,
      verified: overrides?.verified !== undefined ? overrides.verified : verifiedOnly,
      available: overrides?.available !== undefined ? overrides.available : availableOnly,
      shift: overrides?.shift !== undefined ? overrides.shift : selectedShift,
    };

    const params = new URLSearchParams();
    if (next.q.trim()) params.set('q', next.q.trim());
    if (next.category) params.set('category', next.category);
    if (next.city) params.set('city', next.city);
    if (next.minPrice) params.set('minPrice', next.minPrice);
    if (next.maxPrice) params.set('maxPrice', next.maxPrice);
    if (next.minRating) params.set('minRating', next.minRating);
    if (next.verified) params.set('verified', '1');
    if (next.available) params.set('available', '1');
    if (next.shift) params.set('shift', next.shift);
    setSearchParams(params);
  };

  const handleSelectCategory = (selectedCat: string) => {
    setCategory(selectedCat);
    syncUrlParams({ category: selectedCat });
  };

  const toggleVerifiedFilter = () => {
    const nextVal = !verifiedOnly;
    setVerifiedOnly(nextVal);
    syncUrlParams({ verified: nextVal });
  };

  const toggleAvailableFilter = () => {
    const nextVal = !availableOnly;
    setAvailableOnly(nextVal);
    syncUrlParams({ available: nextVal });
  };

  const applyFilters = () => {
    syncUrlParams();
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setVerifiedOnly(false);
    setAvailableOnly(false);
    setSelectedShift('');
    setSearchParams({});
    setShowFilters(false);
  };

  const activeFilters = [
    category,
    city,
    minPrice,
    maxPrice,
    minRating,
    verifiedOnly ? '1' : '',
    availableOnly ? '1' : '',
    selectedShift,
  ].filter(Boolean).length;

  return (
    <div className="pb-20 md:pb-8">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-black text-slate-800 mb-4">الخدمات</h1>

          {/* Search + Filter toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="ابحث عن خدمة..."
                className="input-field !pr-11"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                activeFilters > 0 ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline">فلترة</span>
              {activeFilters > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>

          {/* أزرار المطابقة الذكية والتوثيق والتوفر السريعة */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSmartSort(!smartSort)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                smartSort
                  ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles size={14} className={smartSort ? 'text-primary-600' : 'text-slate-400'} />
              المطابقة الذكية {smartSort ? 'مفعّلة' : ''}
            </button>

            <button
              type="button"
              onClick={toggleVerifiedFilter}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                verifiedOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <ShieldCheck size={14} />
              موثقون فقط
            </button>

            <button
              type="button"
              onClick={toggleAvailableFilter}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                availableOnly
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${availableOnly ? 'bg-white' : 'bg-emerald-500'}`} />
              متاحون الآن
            </button>
          </div>

          {/* Quick category tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => handleSelectCategory('')}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                !category ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectCategory(c.name)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  category === c.name ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="fixed inset-0 z-50 md:relative md:z-auto" onClick={() => setShowFilters(false)}>
          <div className="absolute inset-0 bg-black/30 md:hidden" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-6 md:relative md:rounded-3xl md:max-w-md md:mx-auto md:mt-4 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800">الفلاتر والمطابقة</h3>
              <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600">
                <X size={22} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">التصنيف</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                  <option value="">كل التصنيفات</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">المدينة</label>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field">
                  <option value="">كل المدن</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Shift */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2">
                  <Clock size={15} className="text-primary-600" />
                  وقت / وردية العمل
                </label>
                <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)} className="input-field">
                  <option value="">كل الأوقات</option>
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">السعر (ر.ي)</label>
                <div className="flex gap-2">
                  <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="من" className="input-field" />
                  <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="إلى" className="input-field" />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">التقييم</label>
                <select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="input-field">
                  <option value="">كل التقييمات</option>
                  <option value="4">4 نجوم فأكثر</option>
                  <option value="4.5">4.5 نجوم فأكثر</option>
                  <option value="5">5 نجوم</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={clearFilters} className="btn-ghost flex-1 !bg-slate-100">
                  مسح الفلاتر
                </button>
                <button onClick={applyFilters} className="btn-primary flex-1">
                  تطبيق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            {loadingListings ? 'جاري التحميل...' : `${displayedListings.length} خدمة متاحة`}
          </p>
          {smartSort && !loadingListings && displayedListings.length > 0 && (
            <span className="text-xs font-bold text-primary-600 flex items-center gap-1">
              <Sparkles size={13} /> مرتبة حسب الأنسب لك
            </span>
          )}
        </div>

        {loadingListings ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-24 rounded-t-2xl bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                  <div className="h-8 w-full rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Inbox size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">لا توجد خدمات مطابقة</h3>
            <p className="text-sm text-slate-400">جرّب تعديل الفلاتر أو البحث بكلمات أخرى</p>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="btn-ghost mt-4 !bg-slate-100">
                مسح الفلاتر
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayedListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}