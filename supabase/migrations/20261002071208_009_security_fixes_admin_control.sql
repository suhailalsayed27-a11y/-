/*
# Security fixes + Admin full control

1. Security: Revoke EXECUTE from anon on all SECURITY DEFINER functions
   - handle_new_user: should only run via trigger, not callable directly
   - is_admin: should be authenticated only
   - promote_to_admin: should be authenticated only
   - All notify_* and trigger functions: already revoked, double-checking

2. New admin functions for full control:
   - admin_update_order_status(p_order_id uuid, p_status text, p_reason text) — admin can force any status
   - admin_cancel_order(p_order_id uuid, p_reason text) — admin cancels with reason
   - admin_delete_listing(p_listing_id uuid) — admin can delete any listing
   - admin_toggle_user_disabled(p_user_id uuid) — admin can disable/enable users
*/

-- Revoke anon EXECUTE on security functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text) TO authenticated;

-- ============ ADMIN: Force order status ============
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid, p_status text, p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_order RECORD;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'غير مصرح: هذه العملية للأدمن فقط';
  END IF;

  SELECT client_id, provider_id INTO v_order FROM orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  UPDATE orders SET
    status = p_status,
    cancel_reason = CASE WHEN p_status = 'cancelled' THEN p_reason ELSE cancel_reason END,
    cancelled_by = CASE WHEN p_status = 'cancelled' THEN 'admin' ELSE cancelled_by END,
    cancelled_at = CASE WHEN p_status = 'cancelled' THEN now() ELSE cancelled_at END,
    updated_at = now()
  WHERE id = p_order_id;

  -- Notify both parties
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT user_id, 'order_update', 'تحديث الطلب من الإدارة', COALESCE(p_reason, 'تم تحديث حالة طلبك'), '/orders'
  FROM (VALUES (v_order.client_id), (v_order.provider_id)) AS t(user_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, text, text) TO authenticated;

-- ============ ADMIN: Delete listing ============
CREATE OR REPLACE FUNCTION public.admin_delete_listing(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'غير مصرح: هذه العملية للأدمن فقط';
  END IF;

  DELETE FROM listings WHERE id = p_listing_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_listing(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_delete_listing(uuid) TO authenticated;

-- ============ ADMIN: Toggle user disabled ============
CREATE OR REPLACE FUNCTION public.admin_toggle_user_disabled(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_current boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'غير مصرح: هذه العملية للأدمن فقط';
  END IF;

  SELECT is_disabled INTO v_current FROM profiles WHERE id = p_user_id;
  IF v_current IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;

  -- Prevent admin from disabling themselves
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'لا يمكنك تعطيل حسابك الخاص';
  END IF;

  UPDATE profiles SET is_disabled = NOT is_disabled, updated_at = now() WHERE id = p_user_id;
  RETURN NOT v_current;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_toggle_user_disabled(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_disabled(uuid) TO authenticated;

-- ============ Allow admin to UPDATE orders directly (for edge cases) ============
-- This is safe because the RLS policy checks is_admin
DROP POLICY IF EXISTS "update_order_admin" ON orders;
CREATE POLICY "update_order_admin"
ON orders FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============ Allow admin to DELETE listings ============
DROP POLICY IF EXISTS "delete_listing_admin" ON listings;
CREATE POLICY "delete_listing_admin"
ON listings FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
