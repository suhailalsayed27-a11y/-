import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, City, ServiceCatalogItem } from '@/types';

export function useStaticData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [catRes, cityRes, svcRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('cities').select('*').order('sort_order'),
      supabase.from('services_catalog').select('*').order('sort_order'),
    ]);
    setCategories((catRes.data as Category[]) || []);
    setCities((cityRes.data as City[]) || []);
    setServices((svcRes.data as ServiceCatalogItem[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { categories, cities, services, loading, reload: load };
}
