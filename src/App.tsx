import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Search, MapPin, ShieldCheck, MessageSquare,
  Briefcase, Loader2, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStaticData } from '@/hooks/useStaticData';

interface TalentProfile {
  id: string;
  full_name: string;
  city?: string | null;
  district?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  skills?: string[] | null;
  desired_roles?: string[] | null;
  experience_years?: number | null;
  is_available_now?: boolean;
  open_to_work?: boolean;
  is_verified?: boolean;
}

export default function TalentsPage() {
  const { cities } = useStaticData();
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    fetchTalents();
  }, []);

  const fetchTalents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, city, district, bio, avatar_url, skills, desired_roles, experience_years, is_available_now, open_to_work, is_verified')
      .eq('account_type', 'individual')
      .order('is_verified', { ascending: false });

    setTalents((data as TalentProfile[]) || []);
    setLoading(false);
  };

  const filteredTalents = talents.filter((t) => {
    const matchesCity = !selectedCity || t.city === selectedCity;
    const matchesAvail = !onlyAvailable || t.is_available_now !== false;
    const q = searchQuery.trim().toLowerCase();
    const skillsText = [...(t.skills || []), ...(t.desired_roles || [])].join(' ').toLowerCase();
    const matchesQuery =
      !q ||
      t.full_name.toLowerCase().includes(q) ||
      (t.bio || '').toLowerCase().includes(q) ||
      skillsText.includes(q);
    return matchesCity && matchesAvail && matchesQuery;
  });

  return (
    <div className="pb-24 md:pb-10">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800">دليل الكفاءات والأفراد</h1>
            <p className="text-sm text-slate-500 mt-1">
              ابحث عن أصحاب المهارات والباحثين عن عمل وتواصل معهم مباشرة
            </p>
          </div>
          <Link to="/jobs" className="btn-primary !px-4 !py-2.5 !text-sm self-start">
            سوق فرص العمل
          </Link>
        </div>

        {/* البحث والفلترة */}
        <div className="card p-4 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالمهارة أو الوظيفة: باريستا، مصمم، كاشير، مبرمج..."
                className="input-field !pr-11"
              />
            </div>

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="input-field"
            >
              <option value="">جميع المدن</option>
              {cities.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded text-primary-600"
            />
            إظهار المتاحين للعمل الفوري فقط
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary-600" />
          </div>
        ) : filteredTalents.length === 0 ? (
          <div className="card p-12 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-bold">لا توجد نتائج مطابقة لبحثك</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTalents.map((person) => (
              <div key={person.id} className="card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    {person.avatar_url ? (
                      <img
                        src={person.avatar_url}
                        alt={person.full_name}
                        className="h-14 w-14 rounded-2xl object-cover bg-slate-100"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-lg font-black text-primary-700">
                        {person.full_name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="font-black text-slate-800 truncate">{person.full_name}</h3>
                        {person.is_verified && (
                          <ShieldCheck size={15} className="text-blue-600 shrink-0" />
                        )}
                      </div>
                      {person.city && (
                        <p className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <MapPin size={12} className="text-primary-500" />
                          {person.city}{person.district ? ` - ${person.district}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {person.bio && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                      {person.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {person.is_available_now !== false && (
                      <span className="badge bg-emerald-50 text-emerald-700 text-[11px]">
                        <Clock size={11} className="ml-1 inline" />
                        متاح للعمل
                      </span>
                    )}
                    {(person.experience_years ?? 0) > 0 && (
                      <span className="badge bg-slate-100 text-slate-700 text-[11px]">
                        <Briefcase size={11} className="ml-1 inline" />
                        خبرة {person.experience_years} سنوات
                      </span>
                    )}
                    {(person.skills || []).slice(0, 3).map((sk, idx) => (
                      <span key={idx} className="badge bg-primary-50 text-primary-700 text-[11px]">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  to={`/messages?to=${person.id}`}
                  className="btn-primary w-full !py-2 !text-xs mt-2"
                >
                  <MessageSquare size={14} />
                  تواصل مباشر
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}