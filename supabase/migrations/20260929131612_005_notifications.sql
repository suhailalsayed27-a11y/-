/*
# Create notifications table

1. New Tables
- `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null — the recipient user)
  - `type` (text: 'message' | 'order' | 'order_update' | 'admin_broadcast' | 'system')
  - `title` (text, not null — notification title in Arabic)
  - `body` (text — notification body/description)
  - `link` (text — optional URL path to navigate to when clicked, e.g. '/messages?conv=xxx')
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz, default now())

2. Security — RLS enabled
- SELECT: authenticated users can only see their own notifications (user_id = auth.uid())
- INSERT: authenticated users can insert notifications for themselves; admin broadcasts handled via SECURITY DEFINER function
- UPDATE: users can mark their own notifications as read
- DELETE: users can delete their own notifications

3. New Functions
- `send_notification_to_all(p_title text, p_body text, p_link text)` — SECURITY DEFINER
  Creates a notification row for every profile in the system. Only callable by admins.

4. Indexes
- Index on user_id for fast lookup
- Index on is_read + user_id for unread count queries
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: users can only see their own notifications
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: users can create notifications for themselves only
DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: users can mark their own notifications as read
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: users can delete their own notifications
DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications"
ON notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Function for admin to send a notification to ALL users
CREATE OR REPLACE FUNCTION public.send_notification_to_all(p_title text, p_body text, p_link text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
  is_user_admin boolean;
BEGIN
  -- Check if caller is admin
  SELECT is_admin INTO is_user_admin FROM profiles WHERE id = auth.uid();
  
  IF is_user_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'غير مصرح: هذه العملية للأدمن فقط';
  END IF;

  -- Insert a notification for every profile
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT id, 'admin_broadcast', p_title, p_body, p_link FROM profiles WHERE is_disabled = false;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- Only authenticated users can call the admin broadcast function
REVOKE EXECUTE ON FUNCTION public.send_notification_to_all(text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.send_notification_to_all(text, text, text) TO authenticated;
