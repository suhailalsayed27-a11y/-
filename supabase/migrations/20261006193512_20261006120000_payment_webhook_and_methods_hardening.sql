/*
# Harden provider-neutral payment callbacks and payout methods

## Overview
Adds the durable foundation needed for a future Jaib or alternative payment provider without pretending that a provider is connected today.

## New tables
- `payment_webhook_events`: one row per provider event, used to make webhook processing idempotent across retries and Edge Function instances.
- `payment_webhook_events.event_id`: provider-issued event identifier, unique per provider.
- `payment_webhook_events.provider`: provider name.
- `payment_webhook_events.payload_hash`: optional integrity fingerprint recorded by the trusted server.
- `payment_webhook_events.status`: received, processed, or failed.
- `payment_webhook_events.processed_at`: time the event was applied.
- `payment_webhook_events.created_at`: time the event was received.

## Modified access
- Browser roles cannot insert, update, or delete webhook records.
- Browser roles cannot directly set verification flags or provider references on payment methods.
- A server-owned function can add a user's payout method, always starting unverified.

## Security
- Webhook event uniqueness is enforced by the database, not by a frontend check.
- The new table has RLS enabled with no browser write path.
- `add_payment_method` derives ownership from `auth.uid()` through the existing profile identity helper and fixes `is_verified` to false.
- No payment provider, API key, webhook signature, or real money movement is enabled by this migration.

## Important notes
1. A future provider webhook must authenticate its signature before inserting an event or calling the verified-payment function.
2. The provider adapter remains replaceable; Jaib can be added without changing order or wallet rules.
3. Existing users, orders, balances, and payment records are preserved.
*/

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  payload_hash text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','failed')),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_events_no_select" ON public.payment_webhook_events;
CREATE POLICY "webhook_events_no_select" ON public.payment_webhook_events FOR SELECT TO authenticated USING (false);
DROP POLICY IF EXISTS "webhook_events_no_insert" ON public.payment_webhook_events;
CREATE POLICY "webhook_events_no_insert" ON public.payment_webhook_events FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "webhook_events_no_update" ON public.payment_webhook_events;
CREATE POLICY "webhook_events_no_update" ON public.payment_webhook_events FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "webhook_events_no_delete" ON public.payment_webhook_events;
CREATE POLICY "webhook_events_no_delete" ON public.payment_webhook_events FOR DELETE TO authenticated USING (false);

REVOKE ALL ON public.payment_webhook_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.add_payment_method(
  p_provider text,
  p_display_name text,
  p_account_reference text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_id uuid;
BEGIN
  IF v_profile IS NULL
     OR length(trim(coalesce(p_provider, ''))) < 2
     OR length(trim(coalesce(p_display_name, ''))) < 2
     OR length(trim(coalesce(p_account_reference, ''))) < 3 THEN
    RAISE EXCEPTION 'بيانات وسيلة الاستلام غير صحيحة';
  END IF;

  INSERT INTO public.payment_methods (profile_id, provider, display_name, account_reference, is_verified, is_active)
  VALUES (v_profile, trim(p_provider), trim(p_display_name), trim(p_account_reference), false, true)
  ON CONFLICT (profile_id, provider, account_reference)
  DO UPDATE SET display_name = EXCLUDED.display_name, is_active = true, updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_payment_method(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_payment_method(text, text, text) TO authenticated;

REVOKE INSERT, UPDATE ON public.payment_methods FROM authenticated;
GRANT INSERT (profile_id, provider, display_name, account_reference) ON public.payment_methods TO authenticated;
REVOKE UPDATE (is_verified, is_active, profile_id, provider, account_reference) ON public.payment_methods FROM authenticated;

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created
  ON public.payment_webhook_events (created_at DESC);
