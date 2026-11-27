import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useStaticData } from '@/hooks/useStaticData';

export default function PostJobPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { cities } = useStaticData();

  const [title, setTitle] = useState('');
  const [jobType, setJobType] = useState('part_time');
  const [city, setCity] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !title.trim() || !city) return;

    setSaving(true);
    const { error } = await supabase.from('jobs').insert({
      business_id: profile.id,
      title: title.trim(),
      job_type: jobType,
      city,
      salary_min: salaryMin ? Number(salaryMin) : null,
      description: description.trim(),
      status: 'published',
    });
    setSaving(false);

    if (!error) {
      navigate('/jobs');
    } else {
      alert('حدث خطأ أثناء نشر الوظيفة: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-12">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-primary-600 mb-4"
        >
          <ArrowRight size={16} />
          رجوع
        </button>

        <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
              <Briefcase size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">نشر فرصة عمل جديدة</h1>
              <p className="text-xs text-slate-500">أعلن عن شاغر وظيفي في منشأتك واستقبل طلبات المتقدمين</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">المسمى الوظيفي *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: باريستا محترف، كاشير، طباخ..."
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الدوام *</label>
                <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="input-field">
                  <option value="part_time">دوام جزئي (Part-Time)</option>
                  <option value="full_time">دوام كامل</option>
                  <option value="shift">نظام ورديات</option>
                  <option value="temporary">عمل مؤقت</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">المدينة *</label>
                <select required value={city} onChange={(e) => setCity(e.target.value)} className="input-field">
                  <option value="">اختر المدينة</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الراتب المتوقع (ر.ي - اختياري)</label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="مثال: 80000"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">تفاصيل الوظيفة والمتطلبات *</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب ساعات العمل، المهام المطلوبة، والخبرة إن وجدت..."
                className="input-field"
              />
            </div>

            <button type="submit" disabled={saving} className="btn-accent w-full !py-3.5 !text-base">
              {saving ? <Loader2 size={20} className="animate-spin" /> : 'نشر الوظيفة الآن'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}