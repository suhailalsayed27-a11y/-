import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, ClipboardList, MessageCircle, User } from 'lucide-react';

const navItems = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/services', label: 'الخدمات', icon: Search },
  { to: '/orders', label: 'الطلبات', icon: ClipboardList },
  { to: '/messages', label: 'الرسائل', icon: MessageCircle },
  { to: '/profile', label: 'الملف', icon: User },
];

export default function BottomNav() {
  const location = useLocation();

  // Hide bottom nav on admin pages and auth pages
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-lg md:hidden">
      <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                  isActive ? 'text-primary-600' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} className={isActive ? 'fill-primary-50' : ''} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[11px] font-bold ${isActive ? 'text-primary-600' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
