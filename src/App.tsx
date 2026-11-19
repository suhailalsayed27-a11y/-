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
import OrderDetailPage from '@/pages/OrderDetailPage';
import MessagesPage from '@/pages/MessagesPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ProfilePage from '@/pages/ProfilePage';
import AuthPage from '@/pages/AuthPage';
import AdminPage from '@/pages/AdminPage';
import WalletPage from '@/pages/WalletPage';
import { useAuth } from '@/contexts/AuthContext';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const auth = useAuth() as any;
  const user = auth?.user || auth?.session?.user;
  const loading = auth?.loading ?? false;
  const isAuthenticated = !!user;

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // اكتشاف روبوتات محركات البحث (مثل Googlebot) حتى لا تحجبها شاشة الترحيب
  const isSearchBot =
    typeof navigator !== 'undefined' &&
    /googlebot|bingbot|yandex|baiduspider|duckduckbot/i.test(navigator.userAgent);

  // 1. فحص حالة الـ Onboarding وحالة الدخول
  useEffect(() => {
    if (loading) return;

    const onboarded = localStorage.getItem('mahrah_onboarded');

    if (!onboarded && !isAuthenticated && !isSearchBot) {
      setShowOnboarding(true);
    } else if (!onboarded && (isAuthenticated || isSearchBot)) {
      localStorage.setItem('mahrah_onboarded', 'true');
      setShowOnboarding(false);
    }

    setIsChecking(false);
  }, [loading, isAuthenticated, isSearchBot]);

  // 2. منطق الحماية والتوجيه (السماح بتصفح الصفحات العامة للجميع)
  useEffect(() => {
    if (isChecking || showOnboarding || loading) return;

    const isAuthRoute = location.pathname.startsWith('/auth');
    const isPublicRoute =
      location.pathname === '/' ||
      location.pathname === '/services' ||
      location.pathname.startsWith('/listings/');

    if (!isAuthenticated && !isAuthRoute && !isPublicRoute) {
      // غير مسجل ويحاول فتح صفحة خاصة (مثل الطلبات أو المحفظة) -> توجيه لتسجيل الدخول
      navigate('/auth/signin', { replace: true });
    } else if (isAuthenticated && isAuthRoute) {
      // مسجل دخول ويحاول فتح صفحة التسجيل -> توجيه للرئيسية
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, location.pathname, isChecking, showOnboarding, loading, navigate]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('mahrah_onboarded', 'true');
    setShowOnboarding(false);
    navigate('/auth/signup', { replace: true });
  };

  if (isChecking || loading) {
    return null;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const isAdmin = location.pathname.startsWith('/admin');
  const isAuth = location.pathname.startsWith('/auth');

  // إظهار الهيدر والفوتر في الصفحات العامة أو للمستخدمين المسجلين
  const showChrome = !isAdmin && !isAuth;

  return (
    <div className="flex min-h-screen flex-col">
      {showChrome && <Header />}
      <main className="flex-1">
        <Routes>
          {/* مسارات التسجيل والدخول */}
          <Route path="/auth/signin" element={<AuthPage mode="signin" />} />
          <Route path="/auth/signup" element={<AuthPage mode="signup" />} />
          <Route path="/auth/forgot" element={<AuthPage mode="forgot" />} />

          {/* المسارات العامة (متاحة للزوار ولجوجل بدون تسجيل دخول) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />

          {/* المسارات المحمية (تتطلب تسجيل الدخول) */}
          <Route path="/add-skill" element={<AddSkillPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/:section" element={<AdminPage />} />
        </Routes>
      </main>
      {showChrome && <Footer />}
      {showChrome && isAuthenticated && <BottomNav />}
    </div>
  );
}