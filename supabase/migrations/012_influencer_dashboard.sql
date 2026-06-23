-- Influencer dashboard: manual social stats, profile extras, and platform metrics.

ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS profile_slug TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_handle TEXT,
  ADD COLUMN IF NOT EXISTS instagram_followers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS youtube_subscribers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_followers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS media_kit_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_min NUMERIC,
  ADD COLUMN IF NOT EXISTS pricing_max NUMERIC,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS influencer_profiles_profile_slug_idx
  ON public.influencer_profiles (profile_slug)
  WHERE profile_slug IS NOT NULL AND profile_slug <> '';

-- Businesses viewing influencer public profiles
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  viewer_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  viewer_name TEXT,
  viewer_industry TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_views_influencer_idx
  ON public.profile_views (influencer_user_id, viewed_at DESC);

-- Clicks on public profile links / social buttons
CREATE TABLE IF NOT EXISTS public.profile_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'profile',
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_link_clicks_influencer_idx
  ON public.profile_link_clicks (influencer_user_id, clicked_at DESC);

-- Saved creators (business shortlists in DB)
CREATE TABLE IF NOT EXISTS public.influencer_shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  influencer_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_user_id, influencer_user_id)
);

CREATE INDEX IF NOT EXISTS influencer_shortlists_influencer_idx
  ON public.influencer_shortlists (influencer_user_id, created_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_shortlists ENABLE ROW LEVEL SECURITY;

-- Influencers can read their own views and clicks
DROP POLICY IF EXISTS profile_views_influencer_read ON public.profile_views;
CREATE POLICY profile_views_influencer_read ON public.profile_views
  FOR SELECT TO authenticated
  USING (influencer_user_id = auth.uid());

DROP POLICY IF EXISTS profile_link_clicks_influencer_read ON public.profile_link_clicks;
CREATE POLICY profile_link_clicks_influencer_read ON public.profile_link_clicks
  FOR SELECT TO authenticated
  USING (influencer_user_id = auth.uid());

DROP POLICY IF EXISTS influencer_shortlists_influencer_read ON public.influencer_shortlists;
CREATE POLICY influencer_shortlists_influencer_read ON public.influencer_shortlists
  FOR SELECT TO authenticated
  USING (influencer_user_id = auth.uid());

DROP POLICY IF EXISTS influencer_shortlists_business_rw ON public.influencer_shortlists;
CREATE POLICY influencer_shortlists_business_rw ON public.influencer_shortlists
  FOR ALL TO authenticated
  USING (business_user_id = auth.uid())
  WITH CHECK (business_user_id = auth.uid());

-- Anyone authenticated can record a profile view (business viewing a creator)
DROP POLICY IF EXISTS profile_views_insert ON public.profile_views;
CREATE POLICY profile_views_insert ON public.profile_views
  FOR INSERT TO authenticated
  WITH CHECK (viewer_user_id = auth.uid() OR viewer_user_id IS NULL);

DROP POLICY IF EXISTS profile_link_clicks_insert ON public.profile_link_clicks;
CREATE POLICY profile_link_clicks_insert ON public.profile_link_clicks
  FOR INSERT TO authenticated
  WITH CHECK (true);
