import { Link, useNavigate } from 'react-router-dom';
import { Plus, LogOut, Shield, User as UserIcon, ChevronDown, MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Logo from './Logo';
import NotificationBell from './NotificationBell';

export default function Header() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/">
          <Logo size="sm" />
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {profile && (
              <>
                <NotificationBell />
                <Link to="/messages" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary-600">
                  <MessageCircle size={22} />
                </Link>
              </>
            )}
            <Link to="/add-skill" className="btn-primary hidden sm:inline-flex !px-4 !py-2.5 !text-sm">
              <Plus size={18} />
              أضف مهارتك
            </Link>
          </div>

          {profile ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-slate-100"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-9 w-9 rounded-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                  />
                ) : null}
                <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 ${profile.avatar_url ? 'hidden' : ''}`}>
                  {profile.full_name.charAt(0)}
                </div>
                <ChevronDown size={16} className="text-slate-400 hidden sm:block" />
              </button>

              {menuOpen && (
                <div className="absolute left-0 mt-2 w-56 animate-slide-down rounded-2xl border border-slate-100 bg-white p-2 shadow-xl shadow-slate-200/60">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{profile.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{profile.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <UserIcon size={18} className="text-slate-400" />
                    الملف الشخصي
                  </Link>
                  {profile.is_admin && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
                    >
                      <Shield size={18} />
                      لوحة التحكم
                    </Link>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); signOut(); navigate('/'); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-error-600 transition-colors hover:bg-error-50"
                  >
                    <LogOut size={18} />
                    تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth/signin" className="btn-ghost">
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
