import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Search, MapPin, Building2, Clock, Plus,
  CheckCircle2, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStaticData } from '@/hooks/useStaticData';
import { useAuth } from '@/contexts/AuthContext';

interface JobItem {
  id: string;
  title: string;
  description: string;
  job_type: string;
  city: string;
  salary_min?: number | null;
  salary_max?: number | null;
  created_at: string;
  business?: {
    business_name?: string | null;
    full_name: string;
  };
}

const JOB_TYPES: Record<string, string> = {
  all: 'الكل',
  part_time: 'دوام جزئي (Part-Time)',
  full_time: 'دوام كامل',
  shift: 'نظام ورديات',
  temporary: 'عمل مؤقت',
};

export default function JobsPage() {
  const { cities } = useStaticData();
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [jobType, setJobType] = useState('all');
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const isBusiness = (profile?.account_type as string) === 'business';

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, business:profiles!jobs_business_id_fkey(business_name, full_name)')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    setJobs((data as unknown as JobItem[]) || []);
    setLoading(false);
  };

  const handleApply = async (jobId: string) => {
    if (!profile) {
      alert('يرجى تسجيل الدخول أولاً للتقديم على الوظيفة');
      return;
    }
    setApplyingId(jobId);
    const { error } = await supabase.from('job_applications').insert({
      job_id: jobId,
      applicant_id: profile.id,
      status: 'pending',
    });
    setApplyingId(null);
    if (!error) {
      setAppliedIds((prev) => [...prev, jobId]);
    }
  };

  const filtered = jobs.filter((j) => {
    const matchCity = !city || j.city === city;
    const matchType = jobType === 'all' || j.job_type === jobType;
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      j.title.toLowerCase().includes(q) ||
      (j.description || '').toLowerCase().includes(q);
    return matchCity && matchType && matchQ;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900">سوق فرص العمل</h1>
            <p className="text-sm text-slate-500 mt-1">
              وظائف دوام كامل وجزئي لدى المطاعم، الكافيهات، والشركات
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/talents" className="btn-ghost !bg-white border border-slate-200 !text-slate-700 !px-4 !py-2.5 !text-sm font-bold">
              دليل الكفاءات
            </Link>
            {isBusiness && (
              <Link to="/post-job" className="btn-accent !px-4 !py-2.5 !text-sm">
                <Plus size={17} />
                نشر وظيفة
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-sm mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن وظيفة: باريستا، كاشير، طباخ، مبيعات..."
                className="input-field !pr-11"
              />
            </div>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field">
              <option value="">كل المدن</option>
              {cities.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(JOB_TYPES).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setJobType(key)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  jobType === key
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-slate-200/80">
            <Briefcase size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-600">لا توجد وظائف مطابقة حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((job) => {
              const applied = appliedIds.includes(job.id);
              return (
                <div key={job.id} className="rounded-2xl bg-white p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                          <Building2 size={22} />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900">{job.title}</h3>
                          <p className="text-xs font-bold text-slate-500">
                            {job.business?.business_name || job.business?.full_name || 'منشأة تجارية'}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-lg bg-accent-50 px-2.5 py-1 text-xs font-bold text-accent-700">
                        {JOB_TYPES[job.job_type] || job.job_type}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                      {job.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin size={14} className="text-primary-500" />
                        {job.city}
                      </span>
                      {job.salary_min && (
                        <span className="font-black text-emerald-700">
                          {job.salary_min.toLocaleString()} ر.ي
                        </span>
                      )}
                    </div>

                    {!isBusiness && (
                      <button
                        type="button"
                        disabled={applied || applyingId === job.id}
                        onClick={() => handleApply(job.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                          applied
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'btn-primary !py-2 !px-4 !text-xs'
                        }`}
                      >
                        {applied ? (
                          <>
                            <CheckCircle2 size={15} />
                            تم التقديم
                          </>
                        ) : applyingId === job.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <>
                            <Clock size={14} />
                            تقديم سريع
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}