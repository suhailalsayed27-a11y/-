import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  Home, Sparkles, Briefcase, Users, MessageSquare, User, LogIn
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';
import NotificationBell from '@/components/NotificationBell';
import HomePage from '@/pages/HomePage';
import ServicesPage from '@/pages/ServicesPage';
import ListingDetailPage from '@/pages/ListingDetailPage';
import AddSkillPage from '@/pages/AddSkillPage';
import JobsPage from '@/pages/JobsPage';
import PostJobPage from '@/pages/PostJobPage';
import TalentsPage from '@/pages/TalentsPage';
import OrdersPage from '@/pages/OrdersPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import MessagesPage from '@/pages/MessagesPage';
import NotificationsPage from '@/pages/NotificationsPage';
import WalletPage from '@/pages/WalletPage';
import ProfilePage from '@/pages/ProfilePage';
import AuthPage from '@/pages/AuthPage';
import AdminPage from '@/pages/AdminPage';

export default function App() {
  const { profile } = useAuth();
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Logo />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                isActive('/') ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              الرئيسية
            </Link>
            <Link
              to="/services"
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                isActive('/services') ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              سوق الخدمات
            </Link>
            <Link
              to="/jobs"
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                isActive('/jobs') ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              فرص العمل
            </Link>
            <Link
              to="/talents"
              className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                isActive('/talents') ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              دليل الكفاءات
            </Link>
            {profile && (
              <Link
                to="/orders"
                className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-colors ${
                  isActive('/orders') ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                طلباتي
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {profile ? (
              <>
                <Link to="/messages" className="p-2 rounded-xl text-slate-600 hover:bg-slate-100">
                  <MessageSquare size={20} />
                </Link>
                <NotificationBell />
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs sm:text-sm font-bold text-slate-800"
                >
                  <User size={17} className="text-primary-600" />
                  <span className="max-w-[100px] truncate">{profile.full_name}</span>
                </Link>
              </>
            ) : (
              <Link to="/auth" className="btn-primary !px-4 !py-2 !text-xs sm:!text-sm">
                <LogIn size={16} />
                <span>دخول / تسجيل</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/add-skill" element={<AddSkillPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/post-job" element={<PostJobPage />} />
          <Route path="/talents" element={<TalentsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth" element={<AuthPage mode="signin" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around">
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            isActive('/') ? 'text-primary-600' : 'text-slate-500'
          }`}
        >
          <Home size={20} />
          <span>الرئيسية</span>
        </Link>
        <Link
          to="/services"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            isActive('/services') ? 'text-primary-600' : 'text-slate-500'
          }`}
        >
          <Sparkles size={20} />
          <span>الخدمات</span>
        </Link>
        <Link
          to="/jobs"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            isActive('/jobs') ? 'text-primary-600' : 'text-slate-500'
          }`}
        >
          <Briefcase size={20} />
          <span>الوظائف</span>
        </Link>
        <Link
          to="/talents"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            isActive('/talents') ? 'text-primary-600' : 'text-slate-500'
          }`}
        >
          <Users size={20} />
          <span>الكفاءات</span>
        </Link>
        <Link
          to={profile ? '/profile' : '/auth'}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-bold ${
            isActive('/profile') || isActive('/auth') ? 'text-primary-600' : 'text-slate-500'
          }`}
        >
          <User size={20} />
          <span>{profile ? 'حسابي' : 'دخول'}</span>
        </Link>
      </nav>
    </div>
  );
}