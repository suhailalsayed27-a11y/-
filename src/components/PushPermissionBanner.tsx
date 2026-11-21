import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToPushNotifications } from '@/lib/pushNotifications';

export function PushPermissionBanner() {
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  useEffect(() => {
    if (!session?.user) {
      setVisible(false);
      return;
    }

    // في الآيفون يظهر التنبيه إذا لم يكن مضافاً للشاشة الرئيسية أو لم تُمنح الصلاحية
    if (isIOS && !isStandalone) {
      setVisible(true);
      return;
    }

    if ('Notification' in window && Notification.permission !== 'granted') {
      setVisible(true);
    }
  }, [session, isIOS, isStandalone]);

  if (!visible || !session?.user) return null;

  async function handleEnable() {
    if (!session?.user) return;

    if (isIOS && !isStandalone) {
      setStatusMsg('في الآيفون: اضغط زر المشاركة في المتصفح ثم اختر "إضافة إلى الشاشة الرئيسية" لتفعيل الإشعارات.');
      return;
    }

    if (!('Notification' in window)) {
      setStatusMsg('هذا المتصفح لا يدعم إشعارات الويب.');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatusMsg('الإشعارات محظورة من إعدادات المتصفح. اضغط على أيقونة القفل بجانب رابط الموقع وفعّل الإشعارات.');
      return;
    }

    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await subscribeToPushNotifications(session.user.id);
      if (res?.granted && !res?.error) {
        setVisible(false);
      } else {
        setStatusMsg('تعذر التفعيل، تأكد من السماح بالإشعارات في إعدادات المتصفح.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-emerald-200 bg-white p-4 shadow-xl"
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
            {statusMsg && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                {statusMsg}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'جاري التفعيل...' : 'تفعيل الإشعارات الآن'}
              </button>
              <button
                onClick={() => setVisible(false)}
                className="rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
              >
                إغلاق
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