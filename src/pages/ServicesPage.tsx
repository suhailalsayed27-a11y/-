import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStaticData } from '@/hooks/useStaticData';
import type { Listing } from '@/types';
import ListingCard from '@/components/ListingCard';

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
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

  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    let query = supabase
      .from('listings')
      .select('*, category:categories(*), provider:profiles(*)')
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('rating', { ascending: false });

    if (search) query = query.ilike('service_name', `%${search}%`);
    if (category) {
      const cat = categories.find((c) => c.name === category);
      if (cat) query = query.eq('category_id', cat.id);
    }
    if (city) query = query.eq('city', city);
    if (minPrice) query = query.gte('price', Number(minPrice));
    if (maxPrice) query = query.lte('price', Number(maxPrice));
    if (minRating) query = query.gte('rating', Number(minRating));

    const { data } = await query.limit(50);
    setListings((data as Listing[]) || []);
    setLoadingListings(false);
  }, [search, category, city, minPrice, maxPrice, minRating, categories]);

  useEffect(() => {
    if (!loading) fetchListings();
  }, [fetchListings, loading]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category) params.set('category', category);
    if (city) params.set('city', city);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minRating) params.set('minRating', minRating);
    setSearchParams(params);
    setShowFilters(false);
    fetchListings();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setSearchParams({});
    fetchListings();
  };

  const activeFilters = [category, city, minPrice, maxPrice, minRating].filter(Boolean).length;

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
                onChange={(e) => { setSearch(e.target.value); }}
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

          {/* Quick category tabs */}
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => { setCategory(''); applyFilters(); }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                !category ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategory(c.name); }}
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
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-6 md:relative md:rounded-3xl md:max-w-md md:mx-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800">الفلاتر</h3>
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
        <p className="text-sm text-slate-500 mb-4">
          {loadingListings ? 'جاري التحميل...' : `${listings.length} خدمة متاحة`}
        </p>

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
        ) : listings.length === 0 ? (
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
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
