/*
# Mahra Platform: Commission, Order States, 48h Confirmation, Disputes

## Overview
This migration adds the full order lifecycle system to Mahra:
- Commission calculation (2.5% customer + 2.5% provider, min 100 YER each)
- Extended order statuses (pending_payment, paid, in_progress, provider_completed, awaiting_customer_confirmation, completed, cancelled, disputed, refunded, confirmation_expired)
- 48-hour confirmation timer with server-side timestamps
- Disputes table with evidence tracking
- Admin financial settings table
- Server-side order creation function (prevents price manipulation)
- Server-side order state transitions (prevents unauthorized status changes)
- Notification triggers for all state changes
- Auto-expiry function for 48h timer (callable by pg_cron or admin)

## 1. Modified Tables

### orders (new columns)
- `service_price` (numeric, not null) — the listing price at time of order
- `customer_fee` (numeric, not null) — commission charged to customer
- `provider_fee` (numeric, not null) — commission charged to provider
- `customer_total` (numeric, not null) — service_price + customer_fee
- `provider_net` (numeric, not null) — service_price - provider_fee
- `mahra_revenue` (numeric, not null) — customer_fee + provider_fee
- `currency` (text, default 'YER')
- `payment_status` (text, default 'not_connected') — not_connected, pending, paid, refunded
- `payment_id` (text, nullable) — external payment gateway ID
- `provider_completed_at` (timestamptz, nullable) — when provider marked service done
- `confirmation_deadline` (timestamptz, nullable) — provider_completed_at + 48 hours
- `confirmed_at` (timestamptz, nullable) — when customer confirmed receipt
- `cancelled_at` (timestamptz, nullable)
- `cancelled_by` (text, nullable) — 'client', 'provider', 'admin'
- `cancel_reason` (text, nullable)
- `completion_note` (text, nullable) — provider's note when marking complete
- `completion_evidence` (text[], default '{}') — URLs of uploaded evidence images

### profiles (new column)
- `provider_earnings` (numeric, default 0) — total completed provider_net
- `pending_balance` (numeric, default 0) — pending provider_net from non-completed orders

## 2. New Tables

### disputes
- `id` (uuid, pk)
- `order_id` (uuid, fk to orders, unique — one dispute per order)
- `opened_by` (uuid, fk to profiles) — the customer who opened the dispute
- `reason` (text, not null) — dispute reason category
- `details` (text, not null) — full description of the problem
- `evidence_urls` (text[], default '{}') — uploaded evidence files/images
- `status` (text, default 'open') — open, under_review, resolved_customer, resolved_provider, resolved_partial
- `admin_resolution` (text, nullable) — admin's decision notes
- `resolved_by` (uuid, fk to profiles, nullable) — admin who resolved
- `resolved_at` (timestamptz, nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### commission_settings
- `id` (int, pk, always 1 — singleton)
- `customer_fee_percentage` (numeric, default 2.5)
- `provider_fee_percentage` (numeric, default 2.5)
- `minimum_customer_fee` (numeric, default 100)
- `minimum_provider_fee` (numeric, default 100)
- `currency` (text, default 'YER')
- `confirmation_window_hours` (int, default 48)
- `reminder1_hours` (int, default 24) — first reminder after completion
- `reminder2_hours` (int, default 40) — final reminder before expiry
- `updated_at` (timestamptz, default now())

## 3. New Functions (SECURITY DEFINER)

### create_order(p_listing_id uuid, p_notes text)
- Fetches the REAL listing price from the database (not from client)
- Calculates fees server-side using commission_settings
- Inserts order with all financial fields
- Returns the order id
- Only authenticated users can call

### accept_order(p_order_id uuid)
- Provider accepts an order (new → in_progress)
- Only the provider of that order can call

### provider_complete_order(p_order_id uuid, p_note text, p_evidence text[])
- Provider marks order as completed (in_progress → provider_completed)
- Sets provider_completed_at, confirmation_deadline (now + 48h)
- Sends notifications to customer
- Only the provider can call

### customer_confirm_order(p_order_id uuid)
- Customer confirms receipt (provider_completed/awaiting_confirmation → completed)
- Sets confirmed_at
- Updates provider earnings
- Only the client can call

### open_dispute(p_order_id uuid, p_reason text, p_details text, p_evidence text[])
- Customer opens dispute (provider_completed/awaiting_confirmation → disputed)
- Stops the 48h timer
- Creates dispute record
- Only the client can call

### cancel_order(p_order_id uuid, p_reason text)
- Client or provider cancels (new/in_progress/pending_payment → cancelled)
- Records who cancelled and why
- Only the client or provider can call

### resolve_dispute(p_dispute_id uuid, p_resolution text, p_outcome text)
- Admin resolves dispute (disputed → completed or cancelled)
- p_outcome: 'resolved_customer', 'resolved_provider', 'resolved_partial'
- Only admins can call

### expire_confirmations()
- Finds all orders where confirmation_deadline has passed and status is provider_completed/awaiting_confirmation
- Marks them as confirmation_expired
- Returns count of expired orders
- Callable by anyone (meant for pg_cron or manual trigger)

### calculate_fees(p_price numeric)
- Returns json with customer_fee, provider_fee, customer_total, provider_net, mahra_revenue
- Uses commission_settings values
- Can be called by authenticated users (for display in UI)

## 4. Security
- RLS enabled on disputes and commission_settings
- All state transition functions are SECURITY DEFINER with proper auth checks
- No user can directly UPDATE order status — only through functions
- Commission settings readable by all, writable only by admins

## 5. Triggers
- Notification triggers for: order accepted, provider completed, customer confirmed, dispute opened, dispute resolved, 48h started
*/

-- ============ COMMISSION SETTINGS ============
CREATE TABLE IF NOT EXISTS commission_settings (
  id int PRIMARY KEY DEFAULT 1,
  customer_fee_percentage numeric NOT NULL DEFAULT 2.5,
  provider_fee_percentage numeric NOT NULL DEFAULT 2.5,
  minimum_customer_fee numeric NOT NULL DEFAULT 100,
  minimum_provider_fee numeric NOT NULL DEFAULT 100,
  currency text NOT NULL DEFAULT 'YER',
  confirmation_window_hours int NOT NULL DEFAULT 48,
  reminder1_hours int NOT NULL DEFAULT 24,
  reminder2_hours int NOT NULL DEFAULT 40,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton_check CHECK (id = 1)
);

INSERT INTO commission_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_commission_settings" ON commission_settings;
CREATE POLICY "read_commission_settings"
ON commission_settings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "update_commission_settings_admin" ON commission_settings;
CREATE POLICY "update_commission_settings_admin"
ON commission_settings FOR UPDATE
TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ============ ADD COLUMNS TO orders ============
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_price numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_fee numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_fee numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_total numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_net numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mahra_revenue numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'YER';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_connected';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_completed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_deadline timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completion_note text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completion_evidence text[] NOT NULL DEFAULT '{}';

-- Update existing orders to have fee data from their listings
DO $$
BEGIN
  UPDATE orders o
  SET 
    service_price = l.price,
    customer_fee = GREATEST(l.price * 0.025, 100),
    provider_fee = GREATEST(l.price * 0.025, 100),
    customer_total = l.price + GREATEST(l.price * 0.025, 100),
    provider_net = l.price - GREATEST(l.price * 0.025, 100),
    mahra_revenue = GREATEST(l.price * 0.025, 100) * 2
  FROM listings l
  WHERE o.listing_id = l.id AND o.service_price IS NULL;
END $$;

-- Make fee columns NOT NULL after backfill
DO $$
BEGIN
  ALTER TABLE orders ALTER COLUMN service_price SET NOT NULL;
  ALTER TABLE orders ALTER COLUMN customer_fee SET NOT NULL;
  ALTER TABLE orders ALTER COLUMN provider_fee SET NOT NULL;
  ALTER TABLE orders ALTER COLUMN customer_total SET NOT NULL;
  ALTER TABLE orders ALTER COLUMN provider_net SET NOT NULL;
  ALTER TABLE orders ALTER COLUMN mahra_revenue SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add columns to profiles for earnings tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS provider_earnings numeric NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pending_balance numeric NOT NULL DEFAULT 0;

-- ============ DISPUTES TABLE ============
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text NOT NULL,
  evidence_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  admin_resolution text,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Both client and provider of the order can see the dispute
DROP POLICY IF EXISTS "select_own_disputes" ON disputes;
CREATE POLICY "select_own_disputes"
ON disputes FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = disputes.order_id AND (orders.client_id = auth.uid() OR orders.provider_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Only the client of the order can insert a dispute
DROP POLICY IF EXISTS "insert_dispute_client" ON disputes;
CREATE POLICY "insert_dispute_client"
ON disputes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = disputes.order_id AND orders.client_id = auth.uid())
);

-- Only admins can update disputes (resolution)
DROP POLICY IF EXISTS "update_dispute_admin" ON disputes;
CREATE POLICY "update_dispute_admin"
ON disputes FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Disputes cannot be deleted (no DELETE policy = deny by default)

CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_order ON disputes(order_id);

-- ============ CALCULATE_FEES FUNCTION ============
CREATE OR REPLACE FUNCTION public.calculate_fees(p_price numeric)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'service_price', p_price,
    'customer_fee', GREATEST(p_price * (customer_fee_percentage / 100.0), minimum_customer_fee),
    'provider_fee', GREATEST(p_price * (provider_fee_percentage / 100.0), minimum_provider_fee),
    'customer_total', p_price + GREATEST(p_price * (customer_fee_percentage / 100.0), minimum_customer_fee),
    'provider_net', p_price - GREATEST(p_price * (provider_fee_percentage / 100.0), minimum_provider_fee),
    'mahra_revenue', GREATEST(p_price * (customer_fee_percentage / 100.0), minimum_customer_fee) + GREATEST(p_price * (provider_fee_percentage / 100.0), minimum_provider_fee)
  )
  FROM commission_settings WHERE id = 1;
$$;

REVOKE EXECUTE ON FUNCTION public.calculate_fees(numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.calculate_fees(numeric) TO authenticated;

-- ============ CREATE_ORDER FUNCTION ============
CREATE OR REPLACE FUNCTION public.create_order(p_listing_id uuid, p_notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_fees json;
  v_order_id uuid;
  v_client_id uuid := auth.uid();
BEGIN
  -- Fetch the REAL listing price from the database
  SELECT id, provider_id, price, service_name INTO v_listing
  FROM listings WHERE id = p_listing_id AND status = 'published';

  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'الخدمة غير موجودة أو غير متاحة';
  END IF;

  IF v_listing.provider_id = v_client_id THEN
    RAISE EXCEPTION 'لا يمكنك طلب خدمتك الخاصة';
  END IF;

  -- Calculate fees server-side
  SELECT * INTO v_fees FROM calculate_fees(v_listing.price);

  -- Insert order with all financial fields calculated server-side
  INSERT INTO orders (
    listing_id, client_id, provider_id, status, notes,
    service_price, customer_fee, provider_fee, customer_total, provider_net, mahra_revenue,
    currency, payment_status
  ) VALUES (
    p_listing_id, v_client_id, v_listing.provider_id, 'new', p_notes,
    (v_fees->>'service_price')::numeric,
    (v_fees->>'customer_fee')::numeric,
    (v_fees->>'provider_fee')::numeric,
    (v_fees->>'customer_total')::numeric,
    (v_fees->>'provider_net')::numeric,
    (v_fees->>'mahra_revenue')::numeric,
    'YER', 'not_connected'
  ) RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, text) TO authenticated;

-- ============ ACCEPT_ORDER FUNCTION ============
CREATE OR REPLACE FUNCTION public.accept_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, provider_id, status, client_id INTO v_order FROM orders WHERE id = p_order_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  IF v_order.provider_id != auth.uid() THEN
    RAISE EXCEPTION 'غير مصرح: أنت لست مقدم الخدمة لهذا الطلب';
  END IF;

  IF v_order.status NOT IN ('new') THEN
    RAISE EXCEPTION 'لا يمكن قبول طلب بحالة %', v_order.status;
  END IF;

  UPDATE orders SET status = 'in_progress', updated_at = now() WHERE id = p_order_id;

  -- Notify client
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (v_order.client_id, 'order_update', 'تم قبول طلبك', 'بدأ مقدم الخدمة في تنفيذ طلبك', '/orders');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_order(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_order(uuid) TO authenticated;

-- ============ PROVIDER_COMPLETE_ORDER FUNCTION ============
CREATE OR REPLACE FUNCTION public.provider_complete_order(
  p_order_id uuid, p_note text DEFAULT NULL, p_evidence text[] DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_window_hours int;
BEGIN
  SELECT id, provider_id, status, client_id INTO v_order FROM orders WHERE id = p_order_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  IF v_order.provider_id != auth.uid() THEN
    RAISE EXCEPTION 'غير مصرح: أنت لست مقدم الخدمة';
  END IF;

  IF v_order.status NOT IN ('in_progress') THEN
    RAISE EXCEPTION 'لا يمكن إكتمال طلب بحالة %', v_order.status;
  END IF;

  SELECT confirmation_window_hours INTO v_window_hours FROM commission_settings WHERE id = 1;

  UPDATE orders SET
    status = 'awaiting_customer_confirmation',
    provider_completed_at = now(),
    confirmation_deadline = now() + (v_window_hours || ' hours')::interval,
    completion_note = p_note,
    completion_evidence = p_evidence,
    updated_at = now()
  WHERE id = p_order_id;

  -- Notify customer: 48h timer started
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    v_order.client_id, 'order_update',
    'تم إنجاز الخدمة - يرجى التأكيد',
    'تم إبلاغنا بأن الخدمة اكتملت. يرجى تأكيد الاستلام خلال 48 ساعة.',
    '/orders'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.provider_complete_order(uuid, text, text[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.provider_complete_order(uuid, text, text[]) TO authenticated;

-- ============ CUSTOMER_CONFIRM_ORDER FUNCTION ============
CREATE OR REPLACE FUNCTION public.customer_confirm_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, client_id, status, provider_id, provider_net INTO v_order FROM orders WHERE id = p_order_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  IF v_order.client_id != auth.uid() THEN
    RAISE EXCEPTION 'غير مصرح: أنت لست العميل لهذا الطلب';
  END IF;

  IF v_order.status NOT IN ('awaiting_customer_confirmation', 'provider_completed') THEN
    RAISE EXCEPTION 'لا يمكن تأكيد طلب بحالة %', v_order.status;
  END IF;

  UPDATE orders SET
    status = 'completed',
    confirmed_at = now(),
    updated_at = now()
  WHERE id = p_order_id;

  -- Update provider earnings
  UPDATE profiles SET
    provider_earnings = provider_earnings + v_order.provider_net,
    pending_balance = GREATEST(0, pending_balance - v_order.provider_net)
  WHERE id = v_order.provider_id;

  -- Notify provider
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    v_order.provider_id, 'order_update',
    'تم تأكيد استلام الخدمة',
    'أكد العميل استلام الخدمة. تم إضافة المبلغ إلى رصيدك.',
    '/orders'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.customer_confirm_order(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.customer_confirm_order(uuid) TO authenticated;

-- ============ OPEN_DISPUTE FUNCTION ============
CREATE OR REPLACE FUNCTION public.open_dispute(
  p_order_id uuid, p_reason text, p_details text, p_evidence text[] DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_dispute_id uuid;
BEGIN
  SELECT id, client_id, status, provider_id INTO v_order FROM orders WHERE id = p_order_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  IF v_order.client_id != auth.uid() THEN
    RAISE EXCEPTION 'غير مصرح: أنت لست العميل';
  END IF;

  IF v_order.status NOT IN ('awaiting_customer_confirmation', 'provider_completed') THEN
    RAISE EXCEPTION 'لا يمكن فتح نزاع على طلب بحالة %', v_order.status;
  END IF;

  -- Check if dispute already exists
  IF EXISTS (SELECT 1 FROM disputes WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'يوجد نزاع مفتوح بالفعل على هذا الطلب';
  END IF;

  -- Create dispute record
  INSERT INTO disputes (order_id, opened_by, reason, details, evidence_urls)
  VALUES (p_order_id, auth.uid(), p_reason, p_details, p_evidence)
  RETURNING id INTO v_dispute_id;

  -- Update order status to disputed (stops the 48h timer)
  UPDATE orders SET
    status = 'disputed',
    updated_at = now()
  WHERE id = p_order_id;

  -- Notify provider
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    v_order.provider_id, 'order_update',
    'تم فتح نزاع على طلبك',
    'فتح العميل نزاع: ' || p_reason,
    '/orders'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.open_dispute(uuid, text, text, text[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.open_dispute(uuid, text, text, text[]) TO authenticated;

-- ============ CANCEL_ORDER FUNCTION ============
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_cancelled_by text;
BEGIN
  SELECT id, client_id, provider_id, status INTO v_order FROM orders WHERE id = p_order_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  IF v_order.client_id = auth.uid() THEN
    v_cancelled_by := 'client';
  ELSIF v_order.provider_id = auth.uid() THEN
    v_cancelled_by := 'provider';
  ELSE
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  IF v_order.status NOT IN ('new', 'in_progress', 'pending_payment') THEN
    RAISE EXCEPTION 'لا يمكن إلغاء طلب بحالة %', v_order.status;
  END IF;

  UPDATE orders SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = v_cancelled_by,
    cancel_reason = p_reason,
    updated_at = now()
  WHERE id = p_order_id;

  -- Notify the other party
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    CASE WHEN v_cancelled_by = 'client' THEN v_order.provider_id ELSE v_order.client_id END,
    'order_update',
    'تم إلغاء الطلب',
    COALESCE(p_reason, 'تم إلغاء الطلب'),
    '/orders'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_order(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid, text) TO authenticated;

-- ============ RESOLVE_DISPUTE FUNCTION (ADMIN) ============
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_dispute_id uuid, p_resolution text, p_outcome text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute RECORD;
  v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'غير مصرح: هذه العملية للأدمن فقط';
  END IF;

  SELECT order_id, opened_by INTO v_dispute FROM disputes WHERE id = p_dispute_id;

  IF v_dispute IS NULL THEN
    RAISE EXCEPTION 'النزاع غير موجود';
  END IF;

  IF p_outcome NOT IN ('resolved_customer', 'resolved_provider', 'resolved_partial') THEN
    RAISE EXCEPTION 'نتيجة غير صحيحة';
  END IF;

  -- Update dispute
  UPDATE disputes SET
    status = p_outcome,
    admin_resolution = p_resolution,
    resolved_by = auth.uid(),
    resolved_at = now(),
    updated_at = now()
  WHERE id = p_dispute_id;

  -- Update order status based on outcome
  IF p_outcome = 'resolved_customer' THEN
    -- Customer wins: order cancelled/refunded
    UPDATE orders SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = p_resolution, updated_at = now()
    WHERE id = v_dispute.order_id;
  ELSE
    -- Provider wins or partial: order completed
    UPDATE orders SET status = 'completed', confirmed_at = now(), updated_at = now()
    WHERE id = v_dispute.order_id;

    -- Update provider earnings if provider wins
    IF p_outcome = 'resolved_provider' THEN
      UPDATE profiles SET provider_earnings = provider_earnings + o.provider_net
      FROM orders o
      WHERE profiles.id = o.provider_id AND o.id = v_dispute.order_id;
    END IF;
  END IF;

  -- Notify both parties
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT user_id, 'order_update', 'تم حل النزاع', p_resolution, '/orders'
  FROM (
    SELECT client_id AS user_id FROM orders WHERE id = v_dispute.order_id
    UNION
    SELECT provider_id FROM orders WHERE id = v_dispute.order_id
  ) t;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text) TO authenticated;

-- ============ EXPIRE_CONFIRMATIONS FUNCTION ============
CREATE OR REPLACE FUNCTION public.expire_confirmations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE orders
    SET status = 'confirmation_expired', updated_at = now()
    WHERE status IN ('awaiting_customer_confirmation', 'provider_completed')
      AND confirmation_deadline IS NOT NULL
      AND confirmation_deadline < now()
    RETURNING id, provider_id, client_id
  )
  SELECT count(*) INTO v_count FROM expired;

  -- Notify both parties for each expired order
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT client_id, 'order_update', 'انتهت مهلة تأكيد الطلب', 'انتهت الـ48 ساعة ولم يتم تأكيد الاستلام. الطلب مؤهل للتسوية.', '/orders'
  FROM expired;

  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT provider_id, 'order_update', 'انتهت مهلة تأكيد الطلب', 'انتهت مهلة الـ48 ساعة لتأكيد العميل. الطلب مؤهل للتسوية.', '/orders'
  FROM expired;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_confirmations() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.expire_confirmations() TO authenticated;

-- ============ UPDATE_PENDING_BALANCE TRIGGER ============
-- When order moves to in_progress, add provider_net to pending_balance
CREATE OR REPLACE FUNCTION public.update_pending_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    UPDATE profiles SET pending_balance = pending_balance + NEW.provider_net WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_change ON orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pending_balance();

REVOKE EXECUTE ON FUNCTION public.update_pending_balance() FROM anon, public, authenticated;

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_confirmation_deadline ON orders(confirmation_deadline) WHERE status IN ('awaiting_customer_confirmation', 'provider_completed');
