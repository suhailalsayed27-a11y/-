import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
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

export default function App() {
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem('mahrah_onboarded');
    if (!onboarded) {
      setShowOnboarding(true);
    }
  }, []);

  const isAdmin = location.pathname.startsWith('/admin');
  const isAuth = location.pathname.startsWith('/auth');

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  const showChrome = !isAdmin && !isAuth;

  return (
    <div className="flex min-h-screen flex-col">
      {showChrome && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/add-skill" element={<AddSkillPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/auth/signin" element={<AuthPage mode="signin" />} />
          <Route path="/auth/signup" element={<AuthPage mode="signup" />} />
          <Route path="/auth/forgot" element={<AuthPage mode="forgot" />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/:section" element={<AdminPage />} />
        </Routes>
      </main>
      {showChrome && <Footer />}
      {showChrome && <BottomNav />}
    </div>
  );
}
