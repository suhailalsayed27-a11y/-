import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToPushNotifications } from '@/lib/pushNotifications';

export function PushPermissionBanner() {
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user) {
      setVisible(false);
      return;
    }
    if ('Notification' in window && Notification.permission === 'default') {
      setVisible(true);
    }
  }, [session]);

  if (!visible || !session?.user) return null;

  async function handleEnable() {
    if (!session?.user) return;
    setLoading(true);
    try {
      await subscribeToPushNotifications(session.user.id);
    } finally {
      setLoading(false);
      setVisible(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-emerald-200 bg-white p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">تفعيل إشعارات منصة مهرة</p>
            <p className="mt-0.5 text-xs text-gray-600">
              استقبل تنبيهات الطلبات والرسائل الجديدة فوراً حتى خارج الموقع.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'جاري التفعيل...' : 'تفعيل الإشعارات'}
              </button>
              <button
                onClick={() => setVisible(false)}
                className="rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
              >
                لاحقاً
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}