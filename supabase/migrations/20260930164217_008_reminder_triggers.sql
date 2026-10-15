/*
# Add 48h reminder notification triggers

1. New Functions
- send_confirmation_reminders() — checks for orders in awaiting_customer_confirmation
  where 24h or 40h have passed since provider_completed_at, and sends reminder notifications.
  Also calls expire_confirmations() to auto-expire past-deadline orders.
  Returns json with counts.

2. Notes
- This function is meant to be called periodically (via pg_cron if available, or a scheduled edge function).
- It is idempotent: it won't send duplicate reminders because it checks if a notification
  with the same type+link+user already exists for that time window.
- The expire_confirmations() function from migration 007 handles the actual expiry.
*/

CREATE OR REPLACE FUNCTION public.send_confirmation_reminders()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminder1_count int := 0;
  v_reminder2_count int := 0;
  v_expired_count int;
  v_reminder1_hours int;
  v_reminder2_hours int;
BEGIN
  SELECT reminder1_hours, reminder2_hours INTO v_reminder1_hours, v_reminder2_hours
  FROM commission_settings WHERE id = 1;

  -- First reminder (24h after completion)
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT o.client_id, 'order_update', 'تذكير: يرجى تأكيد استلام الخدمة',
    'مرت 24 ساعة منذ إنجاز الخدمة. يرجى تأكيد الاستلام قبل انتهاء المهلة.',
    '/orders'
  FROM orders o
  WHERE o.status = 'awaiting_customer_confirmation'
    AND o.provider_completed_at IS NOT NULL
    AND o.provider_completed_at + (v_reminder1_hours || ' hours')::interval < now()
    AND o.provider_completed_at + (v_reminder1_hours + 1 || ' hours')::interval > now()
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = o.client_id
        AND n.type = 'order_update'
        AND n.title = 'تذكير: يرجى تأكيد استلام الخدمة'
        AND n.link = '/orders'
        AND n.created_at > o.provider_completed_at
    );
  GET DIAGNOSTICS v_reminder1_count = ROW_COUNT;

  -- Second reminder (40h after completion - final warning)
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT o.client_id, 'order_update', 'تذكير أخير: مهلة التأكيد تنتهي قريباً',
    'بقي وقت قليل لانتهاء مهلة الـ48 ساعة. يرجى تأكيد الاستلام أو فتح نزاع فوراً.',
    '/orders'
  FROM orders o
  WHERE o.status = 'awaiting_customer_confirmation'
    AND o.provider_completed_at IS NOT NULL
    AND o.provider_completed_at + (v_reminder2_hours || ' hours')::interval < now()
    AND o.provider_completed_at + (v_reminder2_hours + 1 || ' hours')::interval > now()
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = o.client_id
        AND n.type = 'order_update'
        AND n.title = 'تذكير أخير: مهلة التأكيد تنتهي قريباً'
        AND n.link = '/orders'
        AND n.created_at > o.provider_completed_at
    );
  GET DIAGNOSTICS v_reminder2_count = ROW_COUNT;

  -- Auto-expire past-deadline orders
  SELECT * INTO v_expired_count FROM expire_confirmations();

  RETURN json_build_object(
    'reminder1_sent', v_reminder1_count,
    'reminder2_sent', v_reminder2_count,
    'expired', v_expired_count
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_confirmation_reminders() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.send_confirmation_reminders() TO authenticated;
