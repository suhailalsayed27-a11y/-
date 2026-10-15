/*
# Fix remaining anon EXECUTE grants on security functions

The `public` role grants EXECUTE by default. We need to explicitly
revoke from both anon AND public, then grant only to authenticated.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text) TO authenticated;

-- Also revoke on trigger functions that should never be called via RPC
REVOKE EXECUTE ON FUNCTION public.notify_message_recipient() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_order_provider() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_pending_balance() FROM anon, public;
