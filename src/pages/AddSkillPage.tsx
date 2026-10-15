import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useStaticData } from '@/hooks/useStaticData';
import { getCategoryColor } from '@/types';

interface WorkImage {
  url: string;
  file?: File;
}

export default function AddSkillPage() {
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const { categories, cities, services } = useStaticData();

  const [serviceName, setServiceName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [experience, setExperience] = useState('');
  const [workImages, setWorkImages] = useState<WorkImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      navigate('/auth/signin', { state: { from: '/add-skill' } });
    }
  }, [session, navigate]);

  const availableServices = services.filter((s) => s.category_id === categoryId);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 5 - workImages.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setWorkImages((prev) => [...prev, { url: ev.target?.result as string, file }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile) {
      setError('يجب تسجيل الدخول أولاً');
      return;
    }
    if (!serviceName || !categoryId || !city || !price) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSubmitting(true);
    const { data, error: insertError } = await supabase
      .from('listings')
      .insert({
        provider_id: profile.id,
        category_id: categoryId,
        service_name: serviceName,
        description,
        price: Number(price),
        experience,
        city,
        status: 'published',
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Save images (for demo, store as URLs — in production would upload to Supabase Storage)
    if (data && workImages.length > 0) {
      // We'd normally upload to storage, for now save URLs directly
      // Since these are data URLs they're too large for DB; skip if data URLs
      const validUrls = workImages.filter((img) => !img.url.startsWith('data:'));
      if (validUrls.length > 0) {
        await supabase.from('listing_images').insert(
          validUrls.map((img, i) => ({
            listing_id: data.id,
            image_url: img.url,
            sort_order: i,
          }))
        );
      }
    }

    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => {
      navigate('/services');
    }, 2000);
  };

  if (!session) return null;

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-md w-full">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-success-100 mb-4">
            <CheckCircle size={44} className="text-success-600" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">تم نشر خدمتك بنجاح!</h2>
          <p className="text-slate-500">سيتم تحويلك إلى صفحة الخدمات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-2xl font-black text-slate-800 mb-1">أضف مهارتك</h1>
        <p className="text-slate-500 mb-6">شارك مهارتك مع العملاء الذين يحتاجونها</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Service name */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">اسم الخدمة *</label>
              {availableServices.length > 0 ? (
                <select
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="">اختر الخدمة</option>
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  required
                  placeholder="اختر التصنيف أولاً"
                  className="input-field"
                  disabled={!categoryId}
                />
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">التصنيف *</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const color = getCategoryColor(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setCategoryId(cat.id); setServiceName(''); }}
                      className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-bold transition-all ${
                        categoryId === cat.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${color.gradient} text-white text-xs`}>
                        {cat.name === 'التقنية والرقمية' ? '💻' : cat.name === 'الأعمال والإدارة' ? '💼' : cat.name === 'المطاعم والضيافة' ? '🍔' : '💄'}
                      </span>
                      <span className="text-xs leading-tight text-right">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">المدينة *</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} required className="input-field">
                <option value="">اختر المدينة</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Details */}
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">الوصف</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اشرح خدمتك بالتفصيل..."
                rows={4}
                className="input-field resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">السعر (ر.ي) *</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="0"
                  className="input-field"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الخبرة</label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="مثال: 5 سنوات"
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="card p-5">
            <label className="block text-sm font-bold text-slate-700 mb-3">صور الأعمال (اختياري)</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {workImages.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={img.url} alt="عمل" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setWorkImages(workImages.filter((_, idx) => idx !== i))}
                    className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {workImages.length < 5 && (
                <label className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors">
                  <Camera size={24} className="text-slate-400 mb-1" />
                  <span className="text-xs text-slate-400">إضافة</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">يمكنك إضافة حتى 5 صور</p>
          </div>

          {error && (
            <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full !h-14 text-lg">
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                جاري النشر...
              </span>
            ) : (
              'نشر الخدمة'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
