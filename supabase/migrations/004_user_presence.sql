-- Online / last seen for messaging (run after 002)
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS user_presence_updated_at ON public.user_presence;
CREATE TRIGGER user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_presence_select_authenticated" ON public.user_presence;
CREATE POLICY "user_presence_select_authenticated"
  ON public.user_presence FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "user_presence_insert_own" ON public.user_presence;
CREATE POLICY "user_presence_insert_own"
  ON public.user_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_presence_update_own" ON public.user_presence;
CREATE POLICY "user_presence_update_own"
  ON public.user_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
