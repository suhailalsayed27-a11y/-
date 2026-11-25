import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, LogOut, Plus, ClipboardList, Star, Shield, ShieldCheck, Phone, Briefcase,
  Camera, X, CheckCircle, Loader2, AlertCircle, Wallet as WalletIcon,
  ArrowRightLeft, Edit3, Trash2, RefreshCw, IdCard, Upload, Clock,
  Building2, Users, MessageSquare, UserCheck, XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useStaticData } from '@/hooks/useStaticData';

import type { Listing, Order, Review } from '@/types';
import ListingCard from '@/components/ListingCard';

type Tab = 'services' | 'jobs' | 'orders' | 'reviews' | 'edit' | 'wallet';
type UserListing = Listing & { rejection_reason?: string | null };

const SHIFT_OPTIONS = [
  { id: 'morning', label: 'فترة صباحية' },
  { id: 'evening', label: 'فترة مسائية' },
  { id: 'full_day', label: 'دوام كامل' },
  { id: 'urgent', label: 'طوارئ / فوري' },
];

const DESIRED_ROLE_OPTIONS = [
  'باريستا ومشروبات',
  'كاشير ومحاسبة',
  'طباخ ومساعد مطبخ',
  'نادل وضيافة',
  'مبيعات وخدمة عملاء',
  'توصيل وسائقين',
  'إدارة وإشراف',
];

const BUSINESS_TYPES = [
  'مطعم',
  'كافيه / مقهى',
  'شركة',
  'مؤسسة',
  'متجر / معرض',
  'فندق / ضيافة',
  'أخرى',
];

const JOB_TYPE_LABELS: Record<string, string> = {
  part_time: 'دوام جزئي',
  full_time: 'دوام كامل',
  shift: 'نظام ورديات',
  temporary: 'عمل مؤقت',
};

// ضغط الصورة وتحويلها إلى ArrayBuffer بصيغة JPEG لتفادي خطأ Load failed في Safari iOS
async function prepareImageForUpload(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          file.arrayBuffer().then(resolve);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          async (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(await blob.arrayBuffer());
            } else {
              resolve(await file.arrayBuffer());
            }
          },
          'image/jpeg',
          0.8
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        file.arrayBuffer().then(resolve);
      }
    };

    img.onerror = async () => {
      URL.revokeObjectURL(objectUrl);
      resolve(await file.arrayBuffer());
    };

    img.src = objectUrl;
  });
}

export default function ProfilePage() {
  const { profile, session, loading, signOut, refreshProfile } = useAuth();
  const { cities, categories, services } = useStaticData();
  const navigate = useNavigate();

  const isBusiness = (profile?.account_type as string) === 'business';
  const [tab, setTab] = useState<Tab>('services');
  const [myListings, setMyListings] = useState<UserListing[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);

  // Jobs & Applications State
  const [businessJobs, setBusinessJobs] = useState<any[]>([]);
  const [selectedJobApplicants, setSelectedJobApplicants] = useState<{ jobTitle: string; list: any[] } | null>(null);
  const [myApplications, setMyApplications] = useState<any[]>([]);

  // Wallet State
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Edit Listing & Resubmit Modal State
  const [editingListing, setEditingListing] = useState<UserListing | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editServiceCity, setEditServiceCity] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [savingListing, setSavingListing] = useState(false);
  const [listingEditError, setListingEditError] = useState<string | null>(null);

  // Edit Profile, Business & Job-Seeker form state
  const [editName, setEditName] = useState('');
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editBusinessType, setEditBusinessType] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editExperienceYears, setEditExperienceYears] = useState<number>(0);
  const [isAvailableNow, setIsAvailableNow] = useState<boolean>(true);
  const [openToWork, setOpenToWork] = useState<boolean>(true);
  const [desiredRoles, setDesiredRoles] = useState<string[]>([]);
  const [availableShifts, setAvailableShifts] = useState<string[]>([]);
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Identity Verification State
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState(false);
  const [idMessage, setIdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin promote state
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
    if (profile && (profile.account_type as string) === 'business' && tab === 'services') {
      setTab('jobs');
    }
  }, [profile]);

  const fetchUserData = async () => {
    if (!profile) return;
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

    setMyListings((listRes.data as UserListing[]) || []);
    setMyOrders((orderRes.data as Order[]) || []);

    // جلب بيانات الوظائف للمنشآت أو طلبات التوظيف للأفراد
    if ((profile.account_type as string) === 'business') {
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*, applications:job_applications(*, applicant:profiles!job_applications_applicant_id_fkey(id, full_name, city, district, phone, experience_years, is_verified, avatar_url, bio))')
        .eq('business_id', profile.id)
        .order('created_at', { ascending: false });
      setBusinessJobs(jobsData || []);
    } else {
      const { data: appsData } = await supabase
        .from('job_applications')
        .select('*, job:jobs(id, title, job_type, city, business:profiles!jobs_business_id_fkey(business_name, full_name))')
        .eq('applicant_id', profile.id)
        .order('created_at', { ascending: false });
      setMyApplications(appsData || []);
    }

    const { data: wData } = await supabase.from('wallets').select('id, balance').eq('user_id', profile.id).maybeSingle();
    if (wData) {
      setWalletBalance(Number(wData.balance));
      const { data: tData } = await supabase.from('wallet_transactions').select('*').eq('wallet_id', wData.id).order('created_at', { ascending: false });
      setTransactions(tData || []);
    }

    if ((listRes.data as UserListing[])?.length > 0) {
      const listingIds = (listRes.data as UserListing[]).map((l) => l.id);
      const revRes = await supabase
        .from('reviews')
        .select('*')
        .in('listing_id', listingIds)
        .order('created_at', { ascending: false });
      setMyReviews((revRes.data as Review[]) || []);
    }
  };

  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    setEditName(profile.full_name);
    setEditBusinessName(p.business_name || '');
    setEditBusinessType(p.business_type || '');
    setEditPhone(profile.phone || '');
    setEditCity(profile.city || '');
    setEditDistrict(p.district || '');
    setEditExperienceYears(Number(p.experience_years || 0));
    setIsAvailableNow(p.is_available_now !== false);
    setOpenToWork(p.open_to_work !== false);
    setDesiredRoles(Array.isArray(p.desired_roles) ? p.desired_roles : []);
    setAvailableShifts(Array.isArray(p.available_shifts) ? p.available_shifts : []);
    setEditBio(profile.bio || '');
    setEditAvatar(profile.avatar_url);

    fetchUserData();
  }, [profile]);

  const toggleShift = (shiftId: string) => {
    setAvailableShifts((prev) =>
      prev.includes(shiftId) ? prev.filter((s) => s !== shiftId) : [...prev, shiftId]
    );
  };

  const toggleDesiredRole = (role: string) => {
    setDesiredRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleToggleJobStatus = async (jobId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'published' ? 'closed' : 'published';
    const { error } = await supabase
      .from('jobs')
      .update({ status: nextStatus })
      .eq('id', jobId);
    if (!error) {
      fetchUserData();
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('هل أنت متأكد من حذف إعلان الوظيفة؟')) return;
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    if (!error) {
      fetchUserData();
    }
  };

  const handleUpdateApplicantStatus = async (appId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from('job_applications')
      .update({ status })
      .eq('id', appId);
    if (!error) {
      setSelectedJobApplicants((prev) =>
        prev
          ? {
              ...prev,
              list: prev.list.map((a) => (a.id === appId ? { ...a, status } : a)),
            }
          : null
      );
      fetchUserData();
    }
  };

  const handleSelectIdImage = (side: 'front' | 'back', file?: File) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (side === 'front') {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      setFrontFile(file);
      setFrontPreview(previewUrl);
    } else {
      if (backPreview) URL.revokeObjectURL(backPreview);
      setBackFile(file);
      setBackPreview(previewUrl);
    }
    setIdMessage(null);
  };

  const handleUploadIdentityDocuments = async () => {
    if (!profile || !session?.user) return;
    if (!frontFile || !backFile) {
      setIdMessage({ type: 'error', text: 'يرجى تصوير أو اختيار الوجه الأمامي والوجه الخلفي للبطاقة الشخصية معاً.' });
      return;
    }

    setUploadingId(true);
    setIdMessage(null);

    try {
      const uid = session.user.id;
      const timestamp = Date.now();
      const frontPath = `${uid}/id-front-${timestamp}.jpg`;
      const backPath = `${uid}/id-back-${timestamp}.jpg`;

      const [frontBuffer, backBuffer] = await Promise.all([
        prepareImageForUpload(frontFile),
        prepareImageForUpload(backFile),
      ]);

      const { error: frontErr } = await supabase.storage
        .from('identity_documents')
        .upload(frontPath, frontBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (frontErr) throw frontErr;

      const { error: backErr } = await supabase.storage
        .from('identity_documents')
        .upload(backPath, backBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (backErr) throw backErr;

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          id_front_url: frontPath,
          id_back_url: backPath,
          verification_status: 'pending',
          is_verified: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateErr) throw updateErr;

      await refreshProfile();
      setFrontFile(null);
      setBackFile(null);
      setIdMessage({
        type: 'success',
        text: 'تم رفع صور البطاقة الشخصية بنجاح! جاري مراجعتها من إدارة المنصة لتفعيل شارة (موثق).',
      });
    } catch (err: any) {
      setIdMessage({
        type: 'error',
        text: err?.message || 'تعذر رفع صور البطاقة، يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setUploadingId(false);
    }
  };

  const openEditListing = (listing: UserListing) => {
    setEditingListing(listing);
    setEditServiceName(listing.service_name);
    setEditCategoryId(listing.category_id);
    setEditServiceCity(listing.city);
    setEditDescription(listing.description || '');
    setEditPrice(String(listing.price));
    setEditExperience(listing.experience || '');
    setListingEditError(null);
  };

  const handleUpdateAndResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing || !profile) return;

    if (!editServiceName.trim() || !editCategoryId || !editServiceCity || !editPrice) {
      setListingEditError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setSavingListing(true);
    setListingEditError(null);

    const nextStatus = profile.is_admin ? 'published' : 'pending';

    const { error } = await supabase
      .from('listings')
      .update({
        service_name: editServiceName.trim(),
        category_id: editCategoryId,
        city: editServiceCity,
        description: editDescription.trim(),
        price: Number(editPrice),
        experience: editExperience.trim(),
        status: nextStatus,
        rejection_reason: null,
      })
      .eq('id', editingListing.id)
      .eq('provider_id', profile.id);

    setSavingListing(false);

    if (error) {
      setListingEditError(error.message || 'حدث خطأ أثناء تحديث الخدمة');
      return;
    }

    setEditingListing(null);
    fetchUserData();
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    const { error } = await supabase.from('listings').delete().eq('id', id);
    if (!error) {
      setMyListings((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        ...(isBusiness
          ? {
              business_name: editBusinessName.trim() || null,
              business_type: editBusinessType || null,
            }
          : {
              open_to_work: openToWork,
              desired_roles: desiredRoles,
            }),
        phone: editPhone,
        city: editCity,
        district: editDistrict.trim() || null,
        experience_years: Number(editExperienceYears) || 0,
        is_available_now: isAvailableNow,
        available_shifts: availableShifts,
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

  const pExtra = profile as any;
  const isVerified = Boolean(pExtra.is_verified || profile.provider_verified);
  const verificationStatus: string = pExtra.verification_status || (isVerified ? 'verified' : 'unverified');
  const displayName = isBusiness ? (pExtra.business_name || profile.full_name) : profile.full_name;

  const tabs: { key: Tab; label: string; count?: number }[] = isBusiness
    ? [
        { key: 'jobs', label: 'وظائف المنشأة', count: businessJobs.length },
        { key: 'orders', label: 'طلبات الخدمات', count: myOrders.length },
        { key: 'wallet', label: 'المحفظة' },
        { key: 'edit', label: 'بيانات المنشأة' },
      ]
    : [
        { key: 'services', label: 'خدماتي', count: myListings.length },
        { key: 'jobs', label: 'طلبات التوظيف', count: myApplications.length },
        { key: 'orders', label: 'الطلبات', count: myOrders.length },
        { key: 'wallet', label: 'المحفظة' },
        { key: 'reviews', label: 'التقييمات', count: myReviews.length },
        { key: 'edit', label: 'الإعدادات والتوثيق' },
      ];

  const getTxTypeLabel = (type: string) => {
    const types: Record<string, string> = { deposit: 'إيداع', withdrawal: 'سحب', payment: 'دفع لخدمة', refund: 'استرداد', commission: 'عمولة منصة' };
    return types[type] || type;
  };

  const availableEditServices = services.filter((s) => s.category_id === editCategoryId);

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
                  alt={displayName}
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-slate-50 object-cover p-1 ring-4 ring-white shadow-lg"
                  onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                />
              ) : null}
              <div className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-100 text-3xl font-black text-primary-700 ring-4 ring-white shadow-lg ${profile.avatar_url ? 'hidden' : ''}`}>
                {displayName.charAt(0)}
              </div>
              <div className="flex-1 pb-1">
                <p className="mb-0.5 text-xs font-bold text-primary-600">
                  {isBusiness ? 'حساب منشأة / شركة' : 'حساب فرد'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-slate-800">
                    مرحبًا بك، {displayName}
                  </h1>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                      <ShieldCheck size={14} />
                      موثق
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
                  {profile.city && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-primary-500" />
                      {profile.city}{pExtra.district ? ` - ${pExtra.district}` : ''}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {isBusiness ? <Building2 size={14} className="text-primary-500" /> : <Briefcase size={14} className="text-primary-500" />}
                    {isBusiness ? (pExtra.business_type || 'منشأة تجارية') : 'فرد (خدمات وتوظيف)'}
                  </span>
                  {!isBusiness && (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${pExtra.is_available_now !== false ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className={`h-2 w-2 rounded-full ${pExtra.is_available_now !== false ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {pExtra.is_available_now !== false ? 'متاح للعمل' : 'غير متاح حالياً'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
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

            {!isBusiness && pExtra.desired_roles && pExtra.desired_roles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {pExtra.desired_roles.map((role: string, i: number) => (
                  <span key={i} className="badge bg-amber-50 text-amber-800">{role}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* تنبيه توثيق الهوية للأفراد غير الموثقين */}
        {!isBusiness && !isVerified && (
          <div
            onClick={() => setTab('edit')}
            className={`card mb-6 flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors ${
              verificationStatus === 'pending'
                ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-50'
                : 'border-blue-200 bg-blue-50/70 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                verificationStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <IdCard size={24} />
              </div>
              <div>
                <p className="font-bold text-slate-800">
                  {verificationStatus === 'pending'
                    ? 'طلب توثيق هويتك قيد المراجعة'
                    : verificationStatus === 'rejected'
                    ? 'تم رفض صورة البطاقة — يرجى إعادة الرفع'
                    : 'وثّق حسابك بالبطاقة الشخصية واحصل على شارة (موثق)'}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {verificationStatus === 'pending'
                    ? 'تقوم إدارة المنصة بمراجعة بطاقتك وسيتم تفعيل الشارة قريباً.'
                    : 'الحسابات الموثقة تظهر في مقدمة نتائج البحث وتكسب ثقة أصحاب المطاعم والشركات.'}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm">
              {verificationStatus === 'pending' ? 'عرض الحالة' : 'توثيق الآن'}
            </span>
          </div>
        )}

        {/* Real Wallet Banner */}
        <div
          onClick={() => setTab('wallet')}
          className="card mb-6 flex cursor-pointer items-center justify-between gap-4 border-emerald-100 bg-emerald-50/60 p-4 transition-colors hover:bg-emerald-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <WalletIcon size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-800">الرصيد الحالي بالمحفظة</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">
                {walletBalance.toLocaleString('ar-EG')} ر.ي
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-emerald-700 bg-emerald-100/50 px-4 py-2 rounded-xl hidden sm:block">
            عرض العمليات
          </span>
        </div>

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

        {/* JOBS TAB (للمنشآت والأفراد) */}
        {tab === 'jobs' && (
          <div>
            {isBusiness ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">الوظائف المنشورة والمتقدمون</h2>
                  <Link to="/post-job" className="btn-primary !px-4 !py-2 !text-sm">
                    <Plus size={18} />
                    نشر وظيفة جديدة
                  </Link>
                </div>

                {businessJobs.length === 0 ? (
                  <div className="card p-10 text-center">
                    <Briefcase size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-bold mb-1">لم تنشر أي فرصة عمل بعد</p>
                    <p className="text-xs text-slate-400 mb-4">انشر وظائفك الشاغرة (دوام كامل أو جزئي) واستقبل طلبات المتقدمين.</p>
                    <Link to="/post-job" className="btn-primary">
                      <Plus size={18} />
                      انشر أول وظيفة
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {businessJobs.map((job) => {
                      const appsCount = Array.isArray(job.applications) ? job.applications.length : 0;
                      return (
                        <div key={job.id} className="card p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-black text-slate-800">{job.title}</h3>
                                <span className={`badge ${job.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                  {job.status === 'published' ? 'نشط' : 'مغلق'}
                                </span>
                                <span className="badge bg-amber-50 text-amber-800">
                                  {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {job.city}{job.district ? ` - ${job.district}` : ''} • نُشر بتاريخ {new Date(job.created_at).toLocaleDateString('ar-EG')}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedJobApplicants({
                                    jobTitle: job.title,
                                    list: job.applications || [],
                                  })
                                }
                                className="btn-primary !px-3.5 !py-2 !text-xs"
                              >
                                <Users size={15} />
                                المتقدمون ({appsCount})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleJobStatus(job.id, job.status)}
                                className="btn-ghost !bg-slate-100 !px-3 !py-2 !text-xs"
                              >
                                {job.status === 'published' ? 'إغلاق الإعلان' : 'إعادة فتح'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteJob(job.id)}
                                className="rounded-xl bg-error-50 p-2 text-error-600 hover:bg-error-100"
                                title="حذف الوظيفة"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">طلبات التوظيف التي قدّمت عليها</h2>
                  <Link to="/jobs" className="btn-primary !px-4 !py-2 !text-sm">
                    <Briefcase size={16} />
                    تصفح الوظائف
                  </Link>
                </div>

                {myApplications.length === 0 ? (
                  <div className="card p-10 text-center">
                    <Briefcase size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-bold mb-4">لم تتقدم لأي وظيفة بعد</p>
                    <Link to="/jobs" className="btn-primary">
                      استكشف فرص العمل
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myApplications.map((app) => (
                      <div key={app.id} className="card p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-800">{app.job?.title || 'وظيفة'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {app.job?.business?.business_name || app.job?.business?.full_name || 'منشأة'} • {app.job?.city}
                          </p>
                        </div>
                        <span
                          className={`badge ${
                            app.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-700'
                              : app.status === 'rejected'
                              ? 'bg-error-100 text-error-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {app.status === 'accepted'
                            ? 'تم القبول للتواصل'
                            : app.status === 'rejected'
                            ? 'لم يتم الاختيار'
                            : 'قيد المراجعة'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SERVICES TAB */}
        {tab === 'services' && !isBusiness && (
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
                  <div key={l.id} className="flex flex-col">
                    <div className="relative">
                      <ListingCard listing={l} />
                      {l.status === 'pending' && (
                        <span className="absolute top-2 right-2 z-10 badge bg-accent-100 text-accent-700 shadow-sm">
                          بانتظار المراجعة
                        </span>
                      )}
                      {l.status === 'hidden' && (
                        <span className="absolute top-2 right-2 z-10 badge bg-slate-200 text-slate-600 shadow-sm">
                          مخفية
                        </span>
                      )}
                      {l.status === 'rejected' && (
                        <span className="absolute top-2 right-2 z-10 badge bg-error-100 text-error-700 shadow-sm">
                          مرفوضة
                        </span>
                      )}
                    </div>

                    {l.status === 'rejected' && (
                      <div className="mt-2 rounded-xl border border-error-200 bg-error-50 p-3 text-xs text-error-800">
                        <div className="flex items-center gap-1.5 font-bold text-error-700 mb-1">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>تم رفض هذه الخدمة من الإدارة</span>
                        </div>
                        {l.rejection_reason && (
                          <p className="leading-relaxed text-error-700">
                            <span className="font-bold">السبب:</span> {l.rejection_reason}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditListing(l)}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                          l.status === 'rejected'
                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {l.status === 'rejected' ? (
                          <>
                            <RefreshCw size={14} />
                            تعديل وإعادة إرسال
                          </>
                        ) : (
                          <>
                            <Edit3 size={14} />
                            تعديل الخدمة
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteListing(l.id)}
                        className="flex items-center justify-center rounded-xl bg-error-50 p-2 text-error-600 hover:bg-error-100 transition-colors"
                        title="حذف الخدمة"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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

        {/* WALLET TAB */}
        {tab === 'wallet' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-800">سجل العمليات المالية</h2>
            <div className="card overflow-hidden">
              {transactions.length === 0 ? (
                <div className="p-10 text-center">
                  <ArrowRightLeft size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-400">لا توجد عمليات مالية في محفظتك حتى الآن</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.map(tx => {
                    const isPositive = ['deposit', 'refund'].includes(tx.type);
                    return (
                      <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            <ArrowRightLeft size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{getTxTypeLabel(tx.type)}</p>
                            <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className={`font-black ${isPositive ? 'text-emerald-600' : 'text-slate-800'}`} dir="ltr">
                            {isPositive ? '+' : '-'}{Number(tx.amount).toLocaleString('ar-EG')} ر.ي
                          </p>
                          <p className={`text-xs mt-0.5 ${tx.status === 'completed' ? 'text-emerald-600' : tx.status === 'pending' ? 'text-accent-600' : 'text-rose-600'}`}>
                            {tx.status === 'completed' ? 'مكتمل' : tx.status === 'pending' ? 'بانتظار التأكيد' : 'مرفوض'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'reviews' && !isBusiness && (
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
          <div className="space-y-6">
            {/* قسم توثيق الهوية الشخصية للأفراد */}
            {!isBusiness && (
              <div className="card p-6 border-2 border-blue-100">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <IdCard size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">توثيق الهوية الشخصية</h2>
                      <p className="text-xs text-slate-500">ارفع صورة واضحة للبطاقة الشخصية (أمامي وخلفي) للحصول على شارة (موثق)</p>
                    </div>
                  </div>
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      <ShieldCheck size={15} /> حساب موثق
                    </span>
                  ) : verificationStatus === 'pending' ? (
                    <span className="badge bg-amber-100 text-amber-700">قيد المراجعة</span>
                  ) : null}
                </div>

                {isVerified ? (
                  <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800 flex items-center gap-2">
                    <ShieldCheck size={20} className="text-blue-600 shrink-0" />
                    <span>تم التحقق من هويتك وتفعيل شارة <strong>(موثق)</strong> بجانب اسمك في جميع نتائج البحث.</span>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center bg-slate-50/60">
                        <p className="text-xs font-bold text-slate-700 mb-2">1. الوجه الأمامي للبطاقة *</p>
                        {frontPreview ? (
                          <img src={frontPreview} alt="الوجه الأمامي" className="w-full h-36 object-contain rounded-xl bg-white mb-2 border" />
                        ) : (
                          <div className="h-36 flex flex-col items-center justify-center text-slate-400 text-xs mb-2">
                            <Camera size={28} className="mb-1 text-slate-300" />
                            <span>التقط صورة أو اختر ملفاً</span>
                          </div>
                        )}
                        <label className="btn-ghost !bg-white !border !border-slate-200 !text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                          <Camera size={15} />
                          {frontPreview ? 'تغيير الوجه الأمامي' : 'تصوير / رفع الأمامي'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSelectIdImage('front', e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-4 text-center bg-slate-50/60">
                        <p className="text-xs font-bold text-slate-700 mb-2">2. الوجه الخلفي للبطاقة *</p>
                        {backPreview ? (
                          <img src={backPreview} alt="الوجه الخلفي" className="w-full h-36 object-contain rounded-xl bg-white mb-2 border" />
                        ) : (
                          <div className="h-36 flex flex-col items-center justify-center text-slate-400 text-xs mb-2">
                            <Camera size={28} className="mb-1 text-slate-300" />
                            <span>التقط صورة أو اختر ملفاً</span>
                          </div>
                        )}
                        <label className="btn-ghost !bg-white !border !border-slate-200 !text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                          <Camera size={15} />
                          {backPreview ? 'تغيير الوجه الخلفي' : 'تصوير / رفع الخلفي'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSelectIdImage('back', e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {idMessage && (
                      <div className={`rounded-xl px-4 py-3 text-xs font-bold ${
                        idMessage.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700'
                      }`}>
                        {idMessage.text}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleUploadIdentityDocuments}
                      disabled={uploadingId || !frontFile || !backFile}
                      className="btn-primary w-full disabled:opacity-50"
                    >
                      {uploadingId ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={18} className="animate-spin" />
                          جاري ضغط ورفع البطاقة...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Upload size={18} />
                          إرسال البطاقة الشخصية للتوثيق
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* تعديل البيانات الشخصية أو بيانات المنشأة */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                {isBusiness ? 'تعديل بيانات المنشأة' : 'تعديل الملف الشخصي وتفضيلات العمل'}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {editAvatar ? (
                    <img src={editAvatar} alt="avatar" className="h-20 w-20 rounded-2xl bg-slate-50 object-contain p-1" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-100 text-2xl font-bold text-primary-700">
                      {displayName.charAt(0) || '?'}
                    </div>
                  )}
                  <label className="btn-ghost !bg-slate-100 cursor-pointer">
                    <Camera size={18} />
                    {isBusiness ? 'شعار المنشأة' : 'تغيير الصورة'}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>

                {isBusiness && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المنشأة / الشركة *</label>
                      <input
                        type="text"
                        value={editBusinessName}
                        onChange={(e) => setEditBusinessName(e.target.value)}
                        className="input-field !bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع النشاط</label>
                      <select
                        value={editBusinessType}
                        onChange={(e) => setEditBusinessType(e.target.value)}
                        className="input-field !bg-white"
                      >
                        <option value="">اختر نوع النشاط</option>
                        {BUSINESS_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    {isBusiness ? 'اسم المسؤول / المدير' : 'الاسم الكامل'}
                  </label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                {/* حقول التوفر والبحث عن عمل للأفراد */}
                {!isBusiness && (
                  <div className="rounded-2xl bg-slate-50 p-4 space-y-4 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">حالة التوفر للعمل الفوري</p>
                        <p className="text-xs text-slate-500">يمنحك أولوية في الظهور بدليل الكفاءات وللعملاء</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAvailableNow(!isAvailableNow)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          isAvailableNow ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            isAvailableNow ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <div>
                        <p className="text-sm font-bold text-slate-800">البحث عن فرص عمل (توظيف)</p>
                        <p className="text-xs text-slate-500">إظهار ملفك للمطاعم والكافيهات والشركات الباحثة عن موظفين</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenToWork(!openToWork)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          openToWork ? 'bg-primary-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            openToWork ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {openToWork && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          الوظائف التي ترغب بالعمل بها:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {DESIRED_ROLE_OPTIONS.map((role) => {
                            const selected = desiredRoles.includes(role);
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => toggleDesiredRole(role)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                                  selected
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {selected ? '✓ ' : ''}{role}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">الحي / المنطقة</label>
                        <input
                          type="text"
                          value={editDistrict}
                          onChange={(e) => setEditDistrict(e.target.value)}
                          placeholder="مثال: حدة، التحرير، كريتر..."
                          className="input-field !bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">سنوات الخبرة</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={editExperienceYears}
                          onChange={(e) => setEditExperienceYears(Number(e.target.value))}
                          className="input-field !bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                        <Clock size={14} className="text-primary-600" />
                        أوقات / ورديات العمل المتاحة لديك:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {SHIFT_OPTIONS.map((shift) => {
                          const selected = availableShifts.includes(shift.id);
                          return (
                            <button
                              key={shift.id}
                              type="button"
                              onClick={() => toggleShift(shift.id)}
                              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                                selected
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {selected ? '✓ ' : ''}{shift.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    {isBusiness ? 'نبذة عن المنشأة' : 'نبذة عنك'}
                  </label>
                  <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} className="input-field resize-none" placeholder={isBusiness ? 'اكتب تعريفاً مختصراً عن نشاط منشأتك...' : 'اكتب نبذة قصيرة عنك...'} />
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
          </div>
        )}
      </div>

      {/* نافذة استعراض المتقدمين لوظيفة المنشأة */}
      {selectedJobApplicants && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => setSelectedJobApplicants(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">المتقدمون للوظيفة</h3>
                <p className="text-xs text-slate-500">{selectedJobApplicants.jobTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobApplicants(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={22} />
              </button>
            </div>

            {selectedJobApplicants.list.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                لا يوجد متقدمون على هذه الوظيفة حتى الآن
              </div>
            ) : (
              <div className="space-y-3">
                {selectedJobApplicants.list.map((app: any) => (
                  <div key={app.id} className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-800">{app.applicant?.full_name || 'متقدم'}</span>
                          {app.applicant?.is_verified && <ShieldCheck size={15} className="text-blue-600" />}
                        </div>
                        <p className="text-xs text-slate-500">
                          {app.applicant?.city || 'غير محدد'}
                          {(app.applicant?.experience_years ?? 0) > 0 ? ` • خبرة ${app.applicant.experience_years} سنوات` : ''}
                        </p>
                      </div>
                      <span
                        className={`badge ${
                          app.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-700'
                            : app.status === 'rejected'
                            ? 'bg-error-100 text-error-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.status === 'accepted' ? 'مقبول' : app.status === 'rejected' ? 'مرفوض' : 'جديد'}
                      </span>
                    </div>

                    {app.cover_note && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 leading-relaxed">
                        {app.cover_note}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateApplicantStatus(app.id, 'accepted')}
                        className="btn-primary flex-1 !py-2 !text-xs"
                      >
                        <UserCheck size={14} />
                        قبول
                      </button>
                      <Link
                        to={`/messages?to=${app.applicant?.id}`}
                        className="btn-ghost !bg-slate-100 !px-3 !py-2 !text-xs"
                      >
                        <MessageSquare size={14} />
                        مراسلة
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleUpdateApplicantStatus(app.id, 'rejected')}
                        className="rounded-xl bg-error-50 p-2 text-error-600 hover:bg-error-100"
                        title="رفض"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة تعديل الخدمة وإعادة إرسالها للمراجعة */}
      {editingListing && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => !savingListing && setEditingListing(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800">
                {editingListing.status === 'rejected' ? 'تعديل الخدمة وإعادة إرسالها' : 'تعديل الخدمة'}
              </h3>
              <button
                type="button"
                onClick={() => !savingListing && setEditingListing(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={22} />
              </button>
            </div>

            {editingListing.status === 'rejected' && editingListing.rejection_reason && (
              <div className="mb-4 rounded-xl border border-error-200 bg-error-50 p-3 text-xs text-error-800">
                <p className="font-bold text-error-700 mb-0.5">ملاحظة الإدارة السابقة:</p>
                <p>{editingListing.rejection_reason}</p>
              </div>
            )}

            <form onSubmit={handleUpdateAndResubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">التصنيف *</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="">اختر التصنيف</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم الخدمة *</label>
                {availableEditServices.length > 0 ? (
                  <select
                    value={editServiceName}
                    onChange={(e) => setEditServiceName(e.target.value)}
                    required
                    className="input-field"
                  >
                    <option value="">اختر الخدمة</option>
                    {!availableEditServices.some((s) => s.name === editServiceName) && editServiceName && (
                      <option value={editServiceName}>{editServiceName}</option>
                    )}
                    {availableEditServices.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={editServiceName}
                    onChange={(e) => setEditServiceName(e.target.value)}
                    required
                    className="input-field"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">المدينة *</label>
                <select
                  value={editServiceCity}
                  onChange={(e) => setEditServiceCity(e.target.value)}
                  required
                  className="input-field"
                >
                  <option value="">اختر المدينة</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">السعر (ر.ي) *</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    required
                    min="0"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">الخبرة</label>
                  <input
                    type="text"
                    value={editExperience}
                    onChange={(e) => setEditExperience(e.target.value)}
                    placeholder="مثال: 5 سنوات"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">الوصف</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  placeholder="اشرح خدمتك بالتفصيل..."
                  className="input-field resize-none"
                />
              </div>

              {!profile.is_admin && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
                  ملاحظة: بعد حفظ التعديلات سيتم إرسال الخدمة تلقائياً إلى الإدارة لمراجعتها والموافقة عليها.
                </p>
              )}

              {listingEditError && (
                <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">
                  {listingEditError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  disabled={savingListing}
                  className="btn-ghost flex-1 !bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingListing}
                  className="btn-primary flex-1"
                >
                  {savingListing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      جاري الإرسال...
                    </span>
                  ) : (
                    'حفظ وإعادة إرسال للمراجعة'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}