-- Professional network connections between users on Influnet.

CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  connected_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  favorite BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  projects_completed INTEGER NOT NULL DEFAULT 0,
  messages_count INTEGER NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  relationship_status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT connections_no_self CHECK (user_id <> connected_user_id),
  CONSTRAINT connections_status_check CHECK (status IN ('active', 'removed')),
  CONSTRAINT connections_relationship_check CHECK (
    relationship_status IN ('new', 'active', 'trusted', 'top')
  ),
  UNIQUE (user_id, connected_user_id)
);

CREATE INDEX IF NOT EXISTS connections_user_idx
  ON public.connections (user_id, status, favorite DESC, last_interaction_at DESC);

CREATE INDEX IF NOT EXISTS connections_connected_user_idx
  ON public.connections (connected_user_id, status);

DROP TRIGGER IF EXISTS connections_updated_at ON public.connections;
CREATE TRIGGER connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connections_owner_rw ON public.connections;
CREATE POLICY connections_owner_rw ON public.connections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
