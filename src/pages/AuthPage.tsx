import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Briefcase, ShoppingBag, ArrowLeft, AlertCircle, KeyRound, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';

export default function AuthPage({ mode }: { mode: 'signin' | 'signup' | 'forgot' }) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  // جعلنا القيمة الافتراضية null لإجبار المستخدم على الاختيار
  const [accountType, setAccountType] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error === 'Invalid login credentials' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : error);
        setLoading(false);
      } else {
        const from = (location.state as { from?: string })?.from || '/';
        navigate(from);
      }
    } else if (mode === 'signup') {
      // التحقق من اختيار نوع الحساب
      if (!accountType) {
        setError('الرجاء اختيار نوع الحساب لإكمال التسجيل');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName, accountType);
      if (error) {
        setError(error === 'User already registered' ? 'هذا البريد مسجل بالفعل' : error);
        setLoading(false);
      } else {
        navigate('/profile');
      }
    } else if (mode === 'forgot') {
      // Simulate password reset
      setForgotSent(true);
      setLoading(false);
    }
  };

  const titles = {
    signin: { title: 'تسجيل الدخول', subtitle: 'أهلاً بعودتك! سجل دخولك للمتابعة' },
    signup: { title: 'إنشاء حساب', subtitle: 'انضم إلى مَهَرَة وابدأ رحلتك' },
    forgot: { title: 'نسيت كلمة المرور', subtitle: 'أدخل بريدك لاستعادة كلمة المرور' },
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-primary-50/30">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4">
        <Link to="/" className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary-600">
          <ArrowLeft size={18} className="rotate-180" />
          الرئيسية
        </Link>
        <Logo size="sm" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo + Title */}
          <div className="text-center mb-8">
            <Logo size="lg" showText={false} className="justify-center mb-4" />
            <h1 className="text-2xl font-black text-slate-800">{titles[mode].title}</h1>
            <p className="text-slate-500 mt-1">{titles[mode].subtitle}</p>
          </div>

          {mode === 'forgot' && forgotSent ? (
            <div className="card p-8 text-center">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-success-100 mb-4">
                <Mail size={32} className="text-success-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">تم إرسال الرابط</h3>
              <p className="text-sm text-slate-500 mb-6">تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور</p>
              <Link to="/auth/signin" className="btn-primary w-full">
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card p-6 space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">الاسم الكامل</label>
                  <div className="relative">
                    <UserIcon size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="أدخل اسمك الكامل"
                      className="input-field !pr-11"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="example@email.com"
                    className="input-field !pr-11"
                    dir="ltr"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
                  <div className="relative">
                    <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="input-field !pr-11 !pl-11"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">نوع الحساب <span className="text-red-500">*</span></label>
                  <div className="flex flex-col gap-3">
                    
                    {/* بطاقة مقدم خدمة */}
                    <button
                      type="button"
                      onClick={() => setAccountType('provider')}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 transition-all text-right ${
                        accountType === 'provider'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 transition-colors ${accountType === 'provider' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Briefcase size={22} />
                      </div>
                      <div>
                        <span className={`block text-sm font-bold mb-1 ${accountType === 'provider' ? 'text-primary-800' : 'text-slate-700'}`}>مقدم خدمة</span>
                        <span className="block text-xs text-slate-500 leading-relaxed">أضف خدماتك، استقبل الطلبات، وأدر أعمالك بشكل كامل.</span>
                      </div>
                    </button>

                    {/* بطاقة عميل */}
                    <button
                      type="button"
                      onClick={() => setAccountType('client')}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 transition-all text-right ${
                        accountType === 'client'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 transition-colors ${accountType === 'client' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}`}>
                        <ShoppingBag size={22} />
                      </div>
                      <div>
                        <span className={`block text-sm font-bold mb-1 ${accountType === 'client' ? 'text-primary-800' : 'text-slate-700'}`}>عميل</span>
                        <span className="block text-xs text-slate-500 leading-relaxed">تصفح الخدمات، اطلب ما تحتاجه، وتابع حالة طلباتك.</span>
                      </div>
                    </button>

                    {/* بطاقة الاثنين معاً */}
                    <button
                      type="button"
                      onClick={() => setAccountType('both')}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3 transition-all text-right ${
                        accountType === 'both'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 transition-colors ${accountType === 'both' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Users size={22} />
                      </div>
                      <div>
                        <span className={`block text-sm font-bold mb-1 ${accountType === 'both' ? 'text-primary-800' : 'text-slate-700'}`}>الاثنين معًا</span>
                        <span className="block text-xs text-slate-500 leading-relaxed">استفد من كافة ميزات البيع والشراء بحساب واحد متكامل.</span>
                      </div>
                    </button>

                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">
                  <AlertCircle size={18} className="shrink-0" />
                  {error}
                </div>
              )}

              {mode === 'signin' && (
                <div className="flex justify-end">
                  <Link to="/auth/forgot" className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                    <KeyRound size={14} />
                    نسيت كلمة المرور؟
                  </Link>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full !h-14">
                {loading ? 'جاري...' : titles[mode].title}
              </button>
            </form>
          )}

          {/* Switch links */}
          {mode !== 'forgot' && (
            <p className="text-center text-sm text-slate-500 mt-6">
              {mode === 'signin' ? (
                <>ليس لديك حساب؟ <Link to="/auth/signup" className="font-bold text-primary-600 hover:text-primary-700">إنشاء حساب</Link></>
              ) : (
                <>لديك حساب؟ <Link to="/auth/signin" className="font-bold text-primary-600 hover:text-primary-700">تسجيل الدخول</Link></>
              )}
            </p>
          )}
          {mode === 'forgot' && !forgotSent && (
            <p className="text-center text-sm text-slate-500 mt-6">
              <Link to="/auth/signin" className="font-bold text-primary-600 hover:text-primary-700">العودة لتسجيل الدخول</Link>
            </p>
          )}

          {/* Admin hint */}
          {mode === 'signin' && (
            <p className="text-center text-xs text-slate-300 mt-8">
              للوصول كأدمن، سجل دخول ثم استخدم صفحة ترقية الأدمن
            </p>
          )}
        </div>
      </div>
    </div>
  );
}