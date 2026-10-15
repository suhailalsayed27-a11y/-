/*
# Messages / Conversations

Adds a messaging system so clients and providers can chat with each other
directly on the platform instead of relying on external contact info.

## New Tables

1. **conversations** — A 1-to-1 chat between two users, optionally tied to a
   specific listing. Each conversation has exactly two participants
   (user1_id, user2_id) and an optional listing_id for context.

   Columns:
   - id (uuid PK)
   - listing_id (uuid, nullable, FK to listings)
   - user1_id (uuid NOT NULL, FK to profiles) — the initiating user
   - user2_id (uuid NOT NULL, FK to profiles) — the receiving user
   - created_at (timestamptz)
   - updated_at (timestamptz) — bumped on new message for sort ordering

2. **messages** — Individual chat messages within a conversation.

   Columns:
   - id (uuid PK)
   - conversation_id (uuid NOT NULL, FK to conversations ON DELETE CASCADE)
   - sender_id (uuid NOT NULL, FK to profiles)
   - body (text NOT NULL)
   - read_at (timestamptz, nullable) — null = unread
   - created_at (timestamptz)

## Security (RLS)

- **conversations**: SELECT/INSERT/UPDATE for authenticated participants only
  (user1_id or user2_id must match the current user's profile via auth_user_id).
  Admins can also read.
- **messages**: SELECT/INSERT for authenticated participants of the parent
  conversation. UPDATE (for marking read) allowed for the recipient.
  Admins can read.

## Indexes
- conversations: user1_id, user2_id, listing_id, updated_at
- messages: conversation_id, created_at
*/

-- ============ CONVERSATIONS ============
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  user1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, user1_id, user2_id)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- Helper: get current user's profile id
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid();
$$;

-- CONVERSATIONS policies
DROP POLICY IF EXISTS "conversations_read_participants" ON conversations;
CREATE POLICY "conversations_read_participants" ON conversations FOR SELECT
  TO authenticated
  USING (
    public.current_profile_id() IN (user1_id, user2_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "conversations_insert_participants" ON conversations;
CREATE POLICY "conversations_insert_participants" ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_profile_id() = user1_id
  );

DROP POLICY IF EXISTS "conversations_update_participants" ON conversations;
CREATE POLICY "conversations_update_participants" ON conversations FOR UPDATE
  TO authenticated
  USING (
    public.current_profile_id() IN (user1_id, user2_id)
  )
  WITH CHECK (
    public.current_profile_id() IN (user1_id, user2_id)
  );

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- MESSAGES policies
DROP POLICY IF EXISTS "messages_read_participants" ON messages;
CREATE POLICY "messages_read_participants" ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND public.current_profile_id() IN (c.user1_id, c.user2_id)
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "messages_insert_participants" ON messages;
CREATE POLICY "messages_insert_participants" ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_profile_id() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND public.current_profile_id() IN (c.user1_id, c.user2_id)
    )
  );

DROP POLICY IF EXISTS "messages_update_participants" ON messages;
CREATE POLICY "messages_update_participants" ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND public.current_profile_id() IN (c.user1_id, c.user2_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND public.current_profile_id() IN (c.user1_id, c.user2_id)
    )
  );
