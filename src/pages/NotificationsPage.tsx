import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, MessageCircle, ShoppingCart, Megaphone, Info, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification, NotificationType } from '@/types';

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  message: MessageCircle,
  order: ShoppingCart,
  order_update: ShoppingCart,
  admin_broadcast: Megaphone,
  system: Info,
};

const TYPE_BG: Record<NotificationType, string> = {
  message: 'bg-primary-100 text-primary-600',
  order: 'bg-blue-100 text-blue-600',
  order_update: 'bg-accent-100 text-accent-600',
  admin_broadcast: 'bg-error-100 text-error-600',
  system: 'bg-slate-100 text-slate-500',
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
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationsPage() {
  const { profile, session, loading } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading: loadingNotifs, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/auth/signin', { state: { from: '/notifications' } });
    }
  }, [session, loading, navigate]);

  if (!session || !profile) return null;

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markAsRead(notif.id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div className="pb-20 md:pb-8">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
              <Bell size={22} className="text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">الإشعارات</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-primary-600 font-bold">{unreadCount} غير مقروء</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
            >
              <CheckCheck size={16} />
              تعليم الكل كمقروء
            </button>
          )}
        </div>

        {loadingNotifs ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="card p-12 text-center">
            <Bell size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 text-lg font-bold mb-1">لا توجد إشعارات</p>
            <p className="text-sm text-slate-400">ستظهر هنا إشعارات الرسائل والطلبات والإعلانات</p>
            <Link to="/" className="btn-primary mt-4 inline-flex">
              العودة للرئيسية
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const Icon = TYPE_ICON[notif.type] || Info;
              const iconBg = TYPE_BG[notif.type] || 'bg-slate-100 text-slate-500';
              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`card group cursor-pointer p-4 transition-all hover:shadow-md ${
                    !notif.is_read ? '!ring-primary-200 !bg-primary-50/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${notif.is_read ? 'text-slate-600' : 'font-bold text-slate-800'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                        )}
                      </div>
                      {notif.body && (
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{notif.body}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-400">{formatTimeAgo(notif.created_at)}</span>
                        <div className="flex items-center gap-2">
                          {notif.link && (
                            <span className="flex items-center gap-0.5 text-xs font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              فتح
                              <ArrowRight size={12} />
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                            className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-error-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
