/*
# Mahra Finance Foundation

## Overview
Adds a secure, provider-neutral financial foundation to the existing marketplace without replacing current orders or users.

## New tables
- `wallet_accounts`: one balance account per profile. Available and pending balances are server-managed.
- `wallet_transactions`: append-only financial ledger for payments, holds, earnings, payouts, refunds, and adjustments.
- `payment_records`: verified payment attempts and provider references, with idempotency protection.
- `payment_methods`: future payout destinations such as Jaib or bank accounts; no provider is connected by this migration.
- `withdrawals`: payout requests and their lifecycle.
- `audit_logs`: immutable record of important financial and order events.

## Modified tables
- `orders`: stores the commission rates used at creation, protection-period timestamps, provider metadata, and payment references.
- `commission_settings`: remains the source for future orders; old orders keep their captured rates.

## Security
- Wallet balances and ledger rows cannot be written directly by browser roles.
- Financial mutations run through SECURITY DEFINER functions with fixed search paths and session-based ownership checks.
- Duplicate payment callbacks and withdrawal attempts are rejected atomically with unique idempotency keys.
- RLS limits wallet, payment, withdrawal, and audit reads to the owner or administrator.

## Important notes
1. This migration does not connect Jaib or any other payment provider.
2. A real provider webhook must call the restricted payment confirmation function after authenticating the provider signature.
3. A customer confirmation makes the provider amount available for payout immediately; the 48-hour period remains a customer protection window.
*/

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'new', 'pending_payment', 'paid', 'waiting_for_provider', 'accepted', 'in_progress',
  'provider_completed', 'awaiting_customer_confirmation', 'completed_by_customer',
  'protection_period', 'completed', 'cancelled', 'disputed', 'resolved',
  'confirmation_expired', 'refunded'
));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_commission_rate numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_commission_rate numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS protection_period_start timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS protection_period_end timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_payout_status text NOT NULL DEFAULT 'not_available';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES profiles(id);

UPDATE orders o
SET customer_commission_rate = cs.customer_fee_percentage,
    provider_commission_rate = cs.provider_fee_percentage
FROM commission_settings cs
WHERE o.customer_commission_rate IS NULL AND cs.id = 1;

CREATE TABLE IF NOT EXISTS wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  available_balance numeric NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance numeric NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  total_earnings numeric NOT NULL DEFAULT 0 CHECK (total_earnings >= 0),
  total_paid numeric NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
  total_withdrawn numeric NOT NULL DEFAULT 0 CHECK (total_withdrawn >= 0),
  total_fees numeric NOT NULL DEFAULT 0 CHECK (total_fees >= 0),
  currency text NOT NULL DEFAULT 'YER',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('PAYMENT','COMMISSION','EARNING','PAYOUT','REFUND','HOLD','RELEASE','DISPUTE_HOLD','ADJUSTMENT')),
  amount numeric NOT NULL CHECK (amount <> 0),
  currency text NOT NULL DEFAULT 'YER',
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('pending','posted','failed','reversed')),
  provider text,
  provider_reference text,
  idempotency_key text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'YER',
  provider text NOT NULL,
  payment_status text NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PROCESSING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED','DISPUTED','CANCELLED')),
  transaction_reference text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, transaction_reference)
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider text NOT NULL,
  display_name text NOT NULL,
  account_reference text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, provider, account_reference)
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'YER',
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  provider text,
  provider_reference text,
  idempotency_key text NOT NULL UNIQUE,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_owner_read" ON wallet_accounts;
CREATE POLICY "wallet_owner_read" ON wallet_accounts FOR SELECT TO authenticated
USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "wallet_owner_insert" ON wallet_accounts;
CREATE POLICY "wallet_owner_insert" ON wallet_accounts FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "wallet_owner_update" ON wallet_accounts;
CREATE POLICY "wallet_owner_update" ON wallet_accounts FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "wallet_owner_delete" ON wallet_accounts;
CREATE POLICY "wallet_owner_delete" ON wallet_accounts FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "ledger_owner_read" ON wallet_transactions;
CREATE POLICY "ledger_owner_read" ON wallet_transactions FOR SELECT TO authenticated
USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "ledger_no_insert" ON wallet_transactions;
CREATE POLICY "ledger_no_insert" ON wallet_transactions FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "ledger_no_update" ON wallet_transactions;
CREATE POLICY "ledger_no_update" ON wallet_transactions FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "ledger_no_delete" ON wallet_transactions;
CREATE POLICY "ledger_no_delete" ON wallet_transactions FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "payments_owner_read" ON payment_records;
CREATE POLICY "payments_owner_read" ON payment_records FOR SELECT TO authenticated
USING (user_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "payments_no_insert" ON payment_records;
CREATE POLICY "payments_no_insert" ON payment_records FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "payments_no_update" ON payment_records;
CREATE POLICY "payments_no_update" ON payment_records FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "payments_no_delete" ON payment_records;
CREATE POLICY "payments_no_delete" ON payment_records FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "methods_owner_select" ON payment_methods;
CREATE POLICY "methods_owner_select" ON payment_methods FOR SELECT TO authenticated USING (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS "methods_owner_insert" ON payment_methods;
CREATE POLICY "methods_owner_insert" ON payment_methods FOR INSERT TO authenticated WITH CHECK (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS "methods_owner_update" ON payment_methods;
CREATE POLICY "methods_owner_update" ON payment_methods FOR UPDATE TO authenticated USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS "methods_owner_delete" ON payment_methods;
CREATE POLICY "methods_owner_delete" ON payment_methods FOR DELETE TO authenticated USING (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS "withdrawals_owner_read" ON withdrawals;
CREATE POLICY "withdrawals_owner_read" ON withdrawals FOR SELECT TO authenticated USING (profile_id = public.current_profile_id() OR public.is_admin());
DROP POLICY IF EXISTS "withdrawals_no_insert" ON withdrawals;
CREATE POLICY "withdrawals_no_insert" ON withdrawals FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "withdrawals_no_update" ON withdrawals;
CREATE POLICY "withdrawals_no_update" ON withdrawals FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "withdrawals_no_delete" ON withdrawals;
CREATE POLICY "withdrawals_no_delete" ON withdrawals FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "audit_admin_read" ON audit_logs;
CREATE POLICY "audit_admin_read" ON audit_logs FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "audit_no_insert" ON audit_logs;
CREATE POLICY "audit_no_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "audit_no_update" ON audit_logs;
CREATE POLICY "audit_no_update" ON audit_logs FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "audit_no_delete" ON audit_logs;
CREATE POLICY "audit_no_delete" ON audit_logs FOR DELETE TO authenticated USING (false);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_profile_created ON wallet_transactions(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order ON wallet_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_order ON payment_records(order_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_profile_created ON withdrawals(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_order_created ON audit_logs(order_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ensure_wallet(p_profile_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO wallet_accounts(profile_id) VALUES (p_profile_id)
  ON CONFLICT(profile_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN SELECT id INTO v_id FROM wallet_accounts WHERE profile_id = p_profile_id; END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_wallet(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_wallet(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_payment_method_id uuid, p_idempotency_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_profile uuid := public.current_profile_id(); v_wallet wallet_accounts%ROWTYPE; v_id uuid; v_method payment_methods%ROWTYPE;
BEGIN
  IF v_profile IS NULL OR p_amount IS NULL OR p_amount <= 0 OR length(trim(p_idempotency_key)) < 8 THEN RAISE EXCEPTION 'بيانات السحب غير صحيحة'; END IF;
  SELECT id INTO v_id FROM withdrawals WHERE idempotency_key = p_idempotency_key AND profile_id = v_profile;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  SELECT * INTO v_method FROM payment_methods WHERE id = p_payment_method_id AND profile_id = v_profile AND is_active = true AND is_verified = true;
  IF v_method.id IS NULL THEN RAISE EXCEPTION 'وسيلة استلام موثقة غير موجودة'; END IF;
  PERFORM public.ensure_wallet(v_profile);
  SELECT * INTO v_wallet FROM wallet_accounts WHERE profile_id = v_profile FOR UPDATE;
  IF v_wallet.available_balance < p_amount THEN RAISE EXCEPTION 'الرصيد المتاح غير كاف'; END IF;
  UPDATE wallet_accounts SET available_balance = available_balance - p_amount, total_withdrawn = total_withdrawn + p_amount, updated_at = now() WHERE id = v_wallet.id;
  INSERT INTO withdrawals(profile_id, payment_method_id, amount, provider, idempotency_key) VALUES (v_profile, p_payment_method_id, p_amount, v_method.provider, p_idempotency_key) RETURNING id INTO v_id;
  INSERT INTO wallet_transactions(profile_id, type, amount, status, provider, idempotency_key, description) VALUES (v_profile, 'PAYOUT', -p_amount, 'pending', v_method.provider, 'withdrawal:' || p_idempotency_key, 'طلب سحب من المحفظة');
  INSERT INTO audit_logs(actor_id, action, metadata) VALUES (v_profile, 'withdrawal_requested', jsonb_build_object('withdrawal_id', v_id, 'amount', p_amount));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_wallet_for_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_wallet_id uuid; v_tx uuid; v_key text;
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status <> 'in_progress' THEN
    PERFORM public.ensure_wallet(NEW.provider_id);
    UPDATE wallet_accounts SET pending_balance = pending_balance + NEW.provider_net, updated_at = now() WHERE profile_id = NEW.provider_id;
    INSERT INTO wallet_transactions(profile_id, order_id, type, amount, status, idempotency_key, description) VALUES (NEW.provider_id, NEW.id, 'HOLD', NEW.provider_net, 'posted', 'order-hold:' || NEW.id, 'مبلغ معلق حتى تأكيد الاستلام') ON CONFLICT(idempotency_key) DO NOTHING;
  ELSIF NEW.status IN ('protection_period','completed','confirmation_expired') AND OLD.status NOT IN ('protection_period','completed','confirmation_expired') THEN
    PERFORM public.ensure_wallet(NEW.provider_id);
    UPDATE wallet_accounts SET pending_balance = GREATEST(0, pending_balance - NEW.provider_net), available_balance = available_balance + NEW.provider_net, total_earnings = total_earnings + NEW.provider_net, updated_at = now() WHERE profile_id = NEW.provider_id;
    INSERT INTO wallet_transactions(profile_id, order_id, type, amount, status, idempotency_key, description) VALUES (NEW.provider_id, NEW.id, 'EARNING', NEW.provider_net, 'posted', 'order-earning:' || NEW.id, 'إتاحة مستحقات تنفيذ الخدمة') ON CONFLICT(idempotency_key) DO NOTHING;
    UPDATE orders SET actual_payout_status = 'available' WHERE id = NEW.id;
  ELSIF NEW.status = 'cancelled' AND OLD.status = 'in_progress' THEN
    PERFORM public.ensure_wallet(NEW.provider_id);
    UPDATE wallet_accounts SET pending_balance = GREATEST(0, pending_balance - NEW.provider_net), updated_at = now() WHERE profile_id = NEW.provider_id;
    INSERT INTO wallet_transactions(profile_id, order_id, type, amount, status, idempotency_key, description) VALUES (NEW.provider_id, NEW.id, 'RELEASE', NEW.provider_net, 'posted', 'order-release:' || NEW.id, 'إلغاء المبلغ المعلق') ON CONFLICT(idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_order_wallet_sync ON orders;
CREATE TRIGGER on_order_wallet_sync AFTER UPDATE OF status ON orders FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_for_order();
REVOKE ALL ON FUNCTION public.sync_wallet_for_order() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.expire_protection_periods()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE orders SET status = 'completed', updated_at = now() WHERE status = 'protection_period' AND protection_period_end IS NOT NULL AND protection_period_end < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_protection_periods() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_protection_periods() TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_verified_payment(p_order_id uuid, p_provider text, p_reference text, p_idempotency_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order orders%ROWTYPE; v_payment uuid; v_profile uuid;
BEGIN
  IF p_provider IS NULL OR p_reference IS NULL OR length(trim(p_idempotency_key)) < 8 THEN RAISE EXCEPTION 'بيانات الدفع غير صحيحة'; END IF;
  SELECT id INTO v_payment FROM payment_records WHERE idempotency_key = p_idempotency_key OR (provider = p_provider AND transaction_reference = p_reference);
  IF v_payment IS NOT NULL THEN RETURN v_payment; END IF;
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF v_order.payment_status = 'paid' THEN RAISE EXCEPTION 'تم تسجيل الدفع مسبقًا'; END IF;
  INSERT INTO payment_records(order_id, user_id, amount, currency, provider, payment_status, transaction_reference, idempotency_key) VALUES (v_order.id, v_order.client_id, v_order.customer_total, v_order.currency, p_provider, 'PAID', p_reference, p_idempotency_key) RETURNING id INTO v_payment;
  UPDATE orders SET payment_status = 'paid', payment_id = v_payment::text, payment_provider = p_provider, payment_reference = p_reference, status = 'paid', updated_at = now() WHERE id = v_order.id;
  PERFORM public.ensure_wallet(v_order.client_id);
  UPDATE wallet_accounts SET total_paid = total_paid + v_order.customer_total, updated_at = now() WHERE profile_id = v_order.client_id;
  INSERT INTO wallet_transactions(profile_id, order_id, type, amount, status, provider, provider_reference, idempotency_key, description) VALUES (v_order.client_id, v_order.id, 'PAYMENT', -v_order.customer_total, 'posted', p_provider, p_reference, 'payment:' || p_idempotency_key, 'دفع موثق للطلب');
  INSERT INTO audit_logs(actor_id, action, order_id, metadata) VALUES (v_order.client_id, 'payment_verified', v_order.id, jsonb_build_object('provider', p_provider, 'reference', p_reference));
  RETURN v_payment;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_verified_payment(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_verified_payment(uuid, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.create_wallet_for_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.ensure_wallet(NEW.id); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS on_profile_wallet_created ON profiles;
CREATE TRIGGER on_profile_wallet_created AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_profile();

INSERT INTO wallet_accounts(profile_id) SELECT id FROM profiles ON CONFLICT(profile_id) DO NOTHING;
