import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Briefcase, MessageCircle, ShoppingCart, ArrowRight, CheckCircle, X, Loader2, Wallet as WalletIcon, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getCategoryColor } from '@/types';
import { calculateFees, formatYER } from '@/lib/commission';
import type { Listing, Review, ListingImage } from '@/types';
import StarRating from '@/components/StarRating';

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Order & Wallet States
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderStatus, setOrderStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; msg?: string }>({ type: 'idle' });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const [listRes, revRes, imgRes] = await Promise.all([
        supabase
          .from('listings')
          .select('*, category:categories(*), provider:profiles(*)')
          .eq('id', id)
          .maybeSingle(),
        supabase.from('reviews').select('*').eq('listing_id', id).order('created_at', { ascending: false }),
        supabase.from('listing_images').select('*').eq('listing_id', id).order('sort_order'),
      ]);
      setListing(listRes.data as Listing | null);
      setReviews((revRes.data as Review[]) || []);
      setImages((imgRes.data as ListingImage[]) || []);
      setLoading(false);
    })();
  }, [id]);

  // جلب رصيد المحفظة عند فتح نافذة الطلب
  useEffect(() => {
    if (showOrderModal && profile) {
      supabase.from('wallets').select('balance').eq('user_id', profile.id).maybeSingle()
        .then(({ data }) => {
           setWalletBalance(data ? Number(data.balance) : 0);
        });
    }
  }, [showOrderModal, profile]);

  const handleContact = async () => {
    if (!profile) {
      navigate('/auth/signin');
      return;
    }
    if (!listing) return;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('user1_id', profile.id)
      .eq('user2_id', listing.provider_id)
      .maybeSingle();

    if (existing) {
      navigate(`/messages?conv=${existing.id}`);
      return;
    }

    // Create new conversation
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        listing_id: listing.id,
        user1_id: profile.id,
        user2_id: listing.provider_id,
      })
      .select('id')
      .single();

    if (newConv) {
      navigate(`/messages?conv=${newConv.id}`);
    }
  };

  const handleOrder = async () => {
    if (!profile) {
      navigate('/auth/signin');
      return;
    }
    if (!listing) return;

    const fees = calculateFees(Number(listing.price));
    if (walletBalance === null || walletBalance < fees.customer_total) {
      setOrderStatus({ type: 'error', msg: 'رصيد المحفظة غير كافٍ لإتمام الطلب' });
      return;
    }

    setOrderStatus({ type: 'loading' });
    const { error } = await supabase.rpc('create_order', {
      p_listing_id: listing.id,
      p_notes: orderNotes || null,
    });

    if (error) {
      setOrderStatus({ type: 'error', msg: error.message });
    } else {
      setOrderStatus({ type: 'success' });
      // نحدث الرصيد محلياً للواجهة
      setWalletBalance(prev => prev !== null ? prev - fees.customer_total : 0);
      
      setTimeout(() => {
        setShowOrderModal(false);
        setOrderStatus({ type: 'idle' });
        setOrderNotes('');
        navigate('/orders');
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-2xl bg-slate-200" />
          <div className="h-8 w-1/2 rounded bg-slate-200" />
          <div className="h-32 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-bold text-slate-700">الخدمة غير موجودة</h2>
        <Link to="/services" className="btn-primary mt-4">العودة للخدمات</Link>
      </div>
    );
  }

  const color = getCategoryColor(listing.category?.name || '');
  const providerAvatar = listing.provider?.avatar_url;
  const providerName = listing.provider?.full_name || 'مقدم خدمة';
  const galleryImages = images.length > 0 ? images : [];

  return (
    <div className="pb-20 md:pb-8">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Breadcrumb */}
        <Link to="/services" className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary-600 mb-4">
          <ArrowRight size={16} />
          العودة للخدمات
        </Link>

        {/* Hero card */}
        <div className="card overflow-hidden mb-6">
          <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${color.gradient}`}>
            {galleryImages[0]?.image_url ? (
              <img
                src={galleryImages[0].image_url}
                alt={listing.service_name}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-black text-white/20">{listing.category?.name?.charAt(0)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            {listing.featured && (
              <span className="absolute top-4 left-4 rounded-full bg-accent-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                خدمة مميزة
              </span>
            )}
          </div>

          <div className="relative z-10 bg-white px-6 pb-6">
            <h1 className="pt-5 text-2xl font-black leading-tight text-slate-800">{listing.service_name}</h1>
            <div className="mt-4 flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="relative shrink-0">
                {providerAvatar ? (
                  <img
                    src={providerAvatar}
                    alt={providerName}
                    className="h-20 w-20 rounded-2xl border-4 border-white bg-white object-cover shadow-lg"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                  />
                ) : null}
                <div className={`flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-primary-100 text-2xl font-black text-primary-700 shadow-lg ${providerAvatar ? 'hidden' : ''}`}>
                  {providerName.charAt(0)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-500">مقدم الخدمة: <span className="font-bold text-slate-700">{providerName}</span></p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className={`badge ${color.bg} ${color.text}`}>{listing.category?.name}</span>
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin size={14} className="text-primary-500" />
                    {listing.city}
                  </span>
                  <StarRating rating={listing.rating} size={14} showNumber count={listing.rating_count} />
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div>
                <span className="text-xs text-slate-400">السعر</span>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-black text-primary-600">{Number(listing.price).toLocaleString('ar-EG')}</span>
                  <span className="text-sm text-slate-400">ر.ي</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Briefcase size={16} className="text-slate-400" />
                <span>{listing.experience || 'غير محدد'}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex gap-3">
              <button onClick={handleContact} className="btn-secondary flex-1">
                <MessageCircle size={20} />
                تواصل مع مقدم الخدمة
              </button>
              <button onClick={() => setShowOrderModal(true)} className="btn-primary flex-1">
                <ShoppingCart size={20} />
                طلب الخدمة
              </button>
            </div>
            
            <div className="mt-6 mb-4 p-4 bg-yellow-50 border-r-4 border-yellow-500 rounded-lg shadow-sm">
              <p className="text-sm text-yellow-800 text-right font-cairo leading-relaxed">
                <span className="font-bold">🛡️ سلامتك وحقوقك تهمنا:</span> تجنّب الاتفاقات والمدفوعات خارج منصة مَهَرَة، لأن المنصة لن تتمكن من حماية حقوقك أو معالجة النزاعات المالية في حال تم الدفع خارجها.
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-3">وصف الخدمة</h2>
            <p className="text-slate-600 leading-relaxed">{listing.description}</p>
          </div>
        )}

        {/* Gallery */}
        {galleryImages.length > 0 && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">معرض الأعمال</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryImages.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.image_url)}
                  className="aspect-square overflow-hidden rounded-xl bg-slate-100 transition-transform hover:scale-[1.02]"
                >
                  <img src={img.image_url} alt="عمل" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            التقييمات ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">لا توجد تقييمات بعد</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="border-b border-slate-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700">{rev.client_name}</span>
                    <StarRating rating={rev.rating} size={14} />
                  </div>
                  {rev.comment && <p className="text-sm text-slate-600 leading-relaxed">{rev.comment}</p>}
                  <span className="text-xs text-slate-400 mt-1 block">
                    {new Date(rev.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 left-6 text-white" onClick={() => setSelectedImage(null)}>
            <X size={28} />
          </button>
          <img src={selectedImage} alt="عرض" className="max-h-[85vh] max-w-full rounded-2xl" />
        </div>
      )}

      {/* Order modal */}
      {showOrderModal && listing && (() => {
        const fees = calculateFees(Number(listing.price));
        const isBalanceSufficient = walletBalance !== null && walletBalance >= fees.customer_total;

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => orderStatus.type !== 'loading' && setShowOrderModal(false)}>
            <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              {orderStatus.type === 'success' ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-100 mb-4">
                    <CheckCircle size={36} className="text-success-600" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1">تم الدفع وإرسال طلبك بنجاح!</h3>
                  <p className="text-sm text-slate-500">تم خصم المبلغ من محفظتك بانتظار قبول مقدم الخدمة.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-black text-slate-800 mb-1">ملخص الدفع والطلب</h3>
                  <p className="text-sm text-slate-500 mb-4">{listing.service_name} • {providerName}</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">ملاحظات (اختياري)</label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="أضف تفاصيل عن ما تحتاجه..."
                        rows={3}
                        className="input-field resize-none"
                      />
                    </div>

                    {/* Fee breakdown */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">قيمة الخدمة</span>
                        <span className="font-bold text-slate-700">{formatYER(fees.service_price)} ريال</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">رسوم مَهَرَة</span>
                        <span className="font-bold text-accent-600">+ {formatYER(fees.customer_fee)} ريال</span>
                      </div>
                      <div className="h-px bg-slate-200" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-700">الإجمالي</span>
                        <span className="text-xl font-black text-primary-600">{formatYER(fees.customer_total)} ريال</span>
                      </div>
                    </div>

                    {/* Wallet Payment Selection */}
                    <div className="rounded-2xl border-2 border-primary-100 bg-primary-50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <WalletIcon size={20} className="text-primary-600" />
                        <span className="font-bold text-slate-700">الدفع عبر محفظة مَهَرَة</span>
                      </div>
                      
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 mb-2">
                        <span className="text-sm text-slate-500">رصيدك الحالي</span>
                        <span className="font-black text-primary-700">
                          {walletBalance !== null ? formatYER(walletBalance) : '...'} ريال
                        </span>
                      </div>

                      {!isBalanceSufficient && walletBalance !== null && (
                        <div className="flex items-start gap-2 text-xs text-error-600 bg-error-50 p-3 rounded-xl mt-2">
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <p>عفواً، رصيدك غير كافٍ. يرجى شحن المحفظة لإتمام الطلب.</p>
                        </div>
                      )}
                    </div>

                    {orderStatus.type === 'error' && (
                      <p className="text-sm text-error-600 bg-error-50 rounded-xl p-3">{orderStatus.msg}</p>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowOrderModal(false)}
                        disabled={orderStatus.type === 'loading'}
                        className="btn-ghost flex-1 !bg-slate-100"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleOrder}
                        disabled={orderStatus.type === 'loading' || !session || !isBalanceSufficient}
                        className={`flex-1 ${isBalanceSufficient ? 'btn-primary' : 'btn-primary opacity-50 cursor-not-allowed'}`}
                      >
                        {orderStatus.type === 'loading' ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            جاري الدفع...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <ShoppingCart size={18} />
                            تأكيد الطلب
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}