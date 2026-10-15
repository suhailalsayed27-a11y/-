import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, MessageCircle, ShoppingCart, Megaphone, Info } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification, NotificationType } from '@/types';

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  message: MessageCircle,
  order: ShoppingCart,
  order_update: ShoppingCart,
  admin_broadcast: Megaphone,
  system: Info,
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `قبل ${diffMin} دقيقة`;
  if (diffHr < 24) return `قبل ${diffHr} ساعة`;
  if (diffDay < 7) return `قبل ${diffDay} يوم`;
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markAsRead(notif.id);
    setOpen(false);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary-600"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-slide-down rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-black text-slate-800">الإشعارات</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700"
              >
                <CheckCheck size={14} />
                تعليم الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell size={32} className="text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => {
                const Icon = TYPE_ICON[notif.type] || Info;
                return (
                  <div
                    key={notif.id}
                    className={`group flex items-start gap-3 border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50 cursor-pointer ${
                      !notif.is_read ? 'bg-primary-50/40' : ''
                    }`}
                    onClick={() => handleClick(notif)}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${notif.is_read ? 'bg-slate-100 text-slate-400' : 'bg-primary-100 text-primary-600'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${notif.is_read ? 'text-slate-600' : 'font-bold text-slate-800'}`}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body}</p>
                      )}
                      <span className="text-[10px] text-slate-400 mt-1 block">{formatTimeAgo(notif.created_at)}</span>
                    </div>
                    {!notif.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                      className="mt-0.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-error-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-slate-100 py-2.5 text-center text-sm font-bold text-primary-600 hover:bg-primary-50 transition-colors"
            >
              عرض كل الإشعارات
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
