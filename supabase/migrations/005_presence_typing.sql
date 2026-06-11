-- Typing indicator across users (run after 004_user_presence.sql)
ALTER TABLE public.user_presence
  ADD COLUMN IF NOT EXISTS typing_conversation_id UUID
    REFERENCES public.conversations (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS typing_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS user_presence_typing_idx
  ON public.user_presence (typing_conversation_id)
  WHERE typing_expires_at IS NOT NULL;
