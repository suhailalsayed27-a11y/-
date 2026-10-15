-- Revoke EXECUTE on current_profile_id from anon/unauthenticated so only authenticated users can call it
REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;
