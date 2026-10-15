/*
# Lock internal wallet trigger helper

## Overview
Removes public RPC access from the internal profile-wallet trigger helper.

## Security
- `create_wallet_for_profile()` is only called by the database trigger after profile creation.
- Anonymous and authenticated clients cannot execute it directly.
*/

REVOKE ALL ON FUNCTION public.create_wallet_for_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_wallet_for_profile() TO service_role;
