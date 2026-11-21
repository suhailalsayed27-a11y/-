import { supabase } from '@/lib/supabase';

const VAPID_PUBLIC_KEY = 'BE2zQp9sdJ-8IxwTeNBZ3M5MoE4M4hmr_L8akyfgkKdB0ragbb0hovGns3Ex7j9pSkVSFESQICQmyOUqeusURAg';

function urlBase64ToUint8Array(base64String: string) {
  const cleanKey = base64String.trim();
  const padding = '='.repeat((4 - (cleanKey.length % 4)) % 4);
  const base64 = (cleanKey + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications(userId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { granted: false, error: 'المتصفح لا يدعم إشعارات Push.' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { granted: false, error: `تم رفض الإذن من المتصفح (${permission}).` };
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { granted: true, error: 'بيانات اشتراك الجهاز غير مكتملة.' };
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      return { granted: true, error: `خطأ قاعدة البيانات: ${error.message}` };
    }

    return { granted: true, error: null };
  } catch (err: any) {
    return { granted: false, error: err?.message || 'حدث خطأ غير متوقع أثناء التفعيل.' };
  }
}