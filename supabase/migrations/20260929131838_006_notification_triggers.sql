/*
# Add notification triggers for messages and orders

1. New Functions
- `notify_message_recipient()` — trigger function that fires AFTER INSERT on messages table.
  Creates a notification for the conversation participant who is NOT the sender.
  Uses the conversation's user1_id/user2_id to find the recipient.
  
- `notify_order_provider()` — trigger function that fires AFTER INSERT on orders table.
  Creates a notification for the service provider when a new order is placed.

2. New Triggers
- `on_message_insert` — AFTER INSERT ON messages, calls notify_message_recipient()
- `on_order_insert` — AFTER INSERT ON orders, calls notify_order_provider()

3. Notes
- These triggers run with SECURITY DEFINER so they can insert into notifications
  table on behalf of the user (the RLS policy would block cross-user inserts).
- The notification includes a link to the relevant conversation or listing.
*/

-- Function to create a notification when a new message is sent
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
  sender_name text;
  conv_listing_id uuid;
  conv_listing_name text;
BEGIN
  -- Find who the recipient is (the other person in the conversation)
  SELECT 
    CASE WHEN c.user1_id = NEW.sender_id THEN c.user2_id ELSE c.user1_id END,
    c.listing_id
  INTO recipient_id, conv_listing_id
  FROM conversations c WHERE c.id = NEW.conversation_id;

  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get sender's name
  SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  -- Get listing name if available
  IF conv_listing_id IS NOT NULL THEN
    SELECT service_name INTO conv_listing_name FROM listings WHERE id = conv_listing_id;
  END IF;

  -- Insert notification for recipient
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    recipient_id,
    'message',
    COALESCE(sender_name, 'مستخدم') || ' أرسل لك رسالة',
    LEFT(NEW.body, 100),
    '/messages?conv=' || NEW.conversation_id
  );

  RETURN NEW;
END;
$$;

-- Function to create a notification when a new order is placed
CREATE OR REPLACE FUNCTION public.notify_order_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_name text;
  listing_name text;
BEGIN
  -- Get client name
  SELECT full_name INTO client_name FROM profiles WHERE id = NEW.client_id;
  
  -- Get listing name
  SELECT service_name INTO listing_name FROM listings WHERE id = NEW.listing_id;

  -- Insert notification for the provider
  INSERT INTO notifications (user_id, type, title, body, link)
  VALUES (
    NEW.provider_id,
    'order',
    'طلب جديد على خدمتك',
    COALESCE(client_name, 'عميل') || ' طلب "' || COALESCE(listing_name, 'خدمة') || '"',
    '/orders'
  );

  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS on_message_insert ON messages;
DROP TRIGGER IF EXISTS on_order_insert ON orders;

-- Create triggers
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_message_recipient();

CREATE TRIGGER on_order_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_provider();

-- Revoke access to trigger functions from anon (they run via triggers, not RPC)
REVOKE EXECUTE ON FUNCTION public.notify_message_recipient() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_provider() FROM anon, public, authenticated;
