import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import Onboarding from '@/components/Onboarding';
import HomePage from '@/pages/HomePage';
import ServicesPage from '@/pages/ServicesPage';
import ListingDetailPage from '@/pages/ListingDetailPage';
import AddSkillPage from '@/pages/AddSkillPage';
import OrdersPage from '@/pages/OrdersPage';
import MessagesPage from '@/pages/MessagesPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ProfilePage from '@/pages/ProfilePage';
import AuthPage from '@/pages/AuthPage';
import AdminPage from '@/pages/AdminPage';
import WalletPage from '@/pages/WalletPage';
import { useAuth } from '@/contexts/AuthContext'; // استدعاء حالة المصادقة

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // سحب حالة المستخدم من الـ Context (للتحقق إذا كان مسجل دخول)
  const auth = useAuth() as any;
  const user = auth?.user || auth?.session?.user;
  const loading = auth?.loading ?? false; 
  const isAuthenticated = !!user;

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // 1. فحص حالة الـ Onboarding وحالة الدخول
  useEffect(() => {
    if (loading) return; // انتظار تحميل حالة المصادقة من Supabase

    const onboarded = localStorage.getItem('mahrah_onboarded');

    if (!onboarded && !isAuthenticated) {
      // زائر جديد تماماً وغير مسجل
      setShowOnboarding(true);
    } else if (!onboarded && isAuthenticated) {
      // حالة نادرة: مسجل دخول مسبقاً ولكن لا يوجد لديه ملف الترحيب، نتخطاه فوراً
      localStorage.setItem('mahrah_onboarded', 'true');
      setShowOnboarding(false);
    }
    
    setIsChecking(false);
  }, [loading, isAuthenticated]);

  // 2. منطق الحماية والتوجيه (Protected Routes)
  useEffect(() => {
    if (isChecking || showOnboarding || loading) return;

    const isAuthRoute = location.pathname.startsWith('/auth');

    if (!isAuthenticated && !isAuthRoute) {
      // غير مسجل دخول ويحاول فتح صفحة داخلية -> طرده لصفحة تسجيل الدخول
      navigate('/auth/signin', { replace: true });
    } else if (isAuthenticated && isAuthRoute) {
      // مسجل دخول ويحاول فتح صفحة التسجيل -> إدخاله للصفحة الرئيسية مباشرة
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, location.pathname, isChecking, showOnboarding, loading, navigate]);

  // دالة إكمال الترحيب
  const handleOnboardingComplete = () => {
    localStorage.setItem('mahrah_onboarded', 'true');
    setShowOnboarding(false);
    // التوجيه فوراً لصفحة التسجيل بدلاً من الرئيسية (كما طلبت)
    navigate('/auth/signup', { replace: true });
  };

  // إخفاء الشاشة لحظياً ريثما يتم التحقق من بيانات الدخول لمنع "الوميض" أو ظهور صفحات بالخطأ
  if (isChecking || loading) {
    return null; 
  }

  // عرض صفحات الترحيب للزوار الجدد فقط
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const isAdmin = location.pathname.startsWith('/admin');
  const isAuth = location.pathname.startsWith('/auth');

  // عرض القوائم السفلية والعلوية للمستخدمين المسجلين فقط (وخارج صفحات الإدارة والتسجيل)
  const showChrome = !isAdmin && !isAuth && isAuthenticated;

  return (
    <div className="flex min-h-screen flex-col">
      {showChrome && <Header />}
      <main className="flex-1">
        <Routes>
          {/* مسارات التسجيل والدخول (متاحة لغير المسجلين) */}
          <Route path="/auth/signin" element={<AuthPage mode="signin" />} />
          <Route path="/auth/signup" element={<AuthPage mode="signup" />} />
          <Route path="/auth/forgot" element={<AuthPage mode="forgot" />} />

          {/* المسارات الداخلية (محمية بواسطة منطق التوجيه في الأعلى) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/add-skill" element={<AddSkillPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/:section" element={<AdminPage />} />
        </Routes>
      </main>
      {showChrome && <Footer />}
      {showChrome && <BottomNav />}
    </div>
  );
}