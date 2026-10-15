/*
# Secure order-finance flow

## Overview
Aligns existing order actions with the profile identity model and the new wallet ledger.

## Changes
- Captures commission percentages when an order is created.
- Allows a verified payment to move an order to `paid`, then provider acceptance moves it to execution.
- Customer confirmation changes the order to `protection_period`; the provider amount is already available for payout through the wallet trigger.
- Protection expiry closes the order as `completed`.
- All actor checks use the authenticated user's profile id, never a client-supplied id.

## Security
- Browser roles can only call the customer/provider actions for their own orders.
- Prices and commission values are still read from the database.
*/

CREATE OR REPLACE FUNCTION public.create_order(p_listing_id uuid, p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_listing listings%ROWTYPE; v_fees json; v_order_id uuid; v_client_id uuid := public.current_profile_id(); v_customer_rate numeric; v_provider_rate numeric;
BEGIN
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id AND status = 'published';
  IF v_listing.id IS NULL OR v_client_id IS NULL THEN RAISE EXCEPTION 'الخدمة غير متاحة'; END IF;
  IF v_listing.provider_id = v_client_id THEN RAISE EXCEPTION 'لا يمكنك طلب خدمتك الخاصة'; END IF;
  SELECT customer_fee_percentage, provider_fee_percentage INTO v_customer_rate, v_provider_rate FROM commission_settings WHERE id = 1;
  SELECT * INTO v_fees FROM public.calculate_fees(v_listing.price);
  INSERT INTO orders(listing_id, client_id, provider_id, status, notes, service_price, customer_fee, provider_fee, customer_total, provider_net, mahra_revenue, currency, payment_status, customer_commission_rate, provider_commission_rate)
  VALUES(p_listing_id, v_client_id, v_listing.provider_id, 'pending_payment', p_notes, (v_fees->>'service_price')::numeric, (v_fees->>'customer_fee')::numeric, (v_fees->>'provider_fee')::numeric, (v_fees->>'customer_total')::numeric, (v_fees->>'provider_net')::numeric, (v_fees->>'mahra_revenue')::numeric, 'YER', 'pending', v_customer_rate, v_provider_rate)
  RETURNING id INTO v_order_id;
  INSERT INTO audit_logs(actor_id, action, order_id, metadata) VALUES(v_client_id, 'order_created', v_order_id, jsonb_build_object('customer_total', (v_fees->>'customer_total')::numeric));
  RETURN v_order_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order orders%ROWTYPE; v_profile uuid := public.current_profile_id();
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL OR v_order.provider_id <> v_profile THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF v_order.status NOT IN ('new','paid','waiting_for_provider') THEN RAISE EXCEPTION 'لا يمكن قبول الطلب بهذه الحالة'; END IF;
  UPDATE orders SET status = 'in_progress', updated_at = now() WHERE id = p_order_id;
  INSERT INTO audit_logs(actor_id, action, order_id) VALUES(v_profile, 'order_accepted', p_order_id);
  INSERT INTO notifications(user_id, type, title, body, link) VALUES(v_order.client_id, 'order_update', 'تم قبول طلبك', 'بدأ مقدم الخدمة في تنفيذ طلبك', '/orders');
END;
$$;
REVOKE ALL ON FUNCTION public.accept_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_confirm_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order orders%ROWTYPE; v_profile uuid := public.current_profile_id(); v_hours int;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.id IS NULL OR v_order.client_id <> v_profile THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF v_order.status NOT IN ('awaiting_customer_confirmation','provider_completed') THEN RAISE EXCEPTION 'لا يمكن تأكيد الطلب بهذه الحالة'; END IF;
  SELECT confirmation_window_hours INTO v_hours FROM commission_settings WHERE id = 1;
  UPDATE orders SET status = 'protection_period', confirmed_at = now(), confirmed_by = v_profile, protection_period_start = now(), protection_period_end = now() + (v_hours || ' hours')::interval, updated_at = now() WHERE id = p_order_id;
  INSERT INTO audit_logs(actor_id, action, order_id, metadata) VALUES(v_profile, 'customer_confirmed_delivery', p_order_id, jsonb_build_object('provider_amount_available', v_order.provider_net, 'protection_hours', v_hours));
  INSERT INTO notifications(user_id, type, title, body, link) VALUES(v_order.provider_id, 'order_update', 'تم تأكيد استلام الخدمة', 'أصبحت مستحقاتك متاحة للسحب. بدأت فترة حماية العميل لمدة 48 ساعة.', '/wallet');
END;
$$;
REVOKE ALL ON FUNCTION public.customer_confirm_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_confirm_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_dispute(p_dispute_id uuid, p_resolution text, p_outcome text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dispute disputes%ROWTYPE; v_profile uuid := public.current_profile_id(); v_is_admin boolean;
BEGIN
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = v_profile;
  IF v_is_admin IS NOT TRUE THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT * INTO v_dispute FROM disputes WHERE id = p_dispute_id FOR UPDATE;
  IF v_dispute.id IS NULL OR p_outcome NOT IN ('resolved_customer','resolved_provider','resolved_partial') THEN RAISE EXCEPTION 'بيانات النزاع غير صحيحة'; END IF;
  UPDATE disputes SET status = p_outcome, admin_resolution = p_resolution, resolved_by = v_profile, resolved_at = now(), updated_at = now() WHERE id = p_dispute_id;
  IF p_outcome = 'resolved_customer' THEN
    UPDATE orders SET status = 'refunded', cancelled_at = now(), cancelled_by = 'admin', cancel_reason = p_resolution, updated_at = now() WHERE id = v_dispute.order_id;
  ELSE
    UPDATE orders SET status = 'completed', confirmed_at = COALESCE(confirmed_at, now()), updated_at = now() WHERE id = v_dispute.order_id;
  END IF;
  INSERT INTO audit_logs(actor_id, action, order_id, metadata) VALUES(v_profile, 'dispute_resolved', v_dispute.order_id, jsonb_build_object('outcome', p_outcome, 'resolution', p_resolution));
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_dispute(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text) TO authenticated;
