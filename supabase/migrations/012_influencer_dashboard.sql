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

-- Public profile RPC: include manual stats and portfolio
CREATE OR REPLACE FUNCTION public.get_public_influencer(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  ip public.influencer_profiles%ROWTYPE;
  norm TEXT;
  slug_from_name TEXT;
  slug_custom TEXT;
BEGIN
  norm := lower(trim(both '-' from regexp_replace(lower(trim(coalesce(p_slug, ''))), '[^a-z0-9]+', '-', 'g')));
  IF norm = '' OR norm IS NULL THEN
    RETURN NULL;
  END IF;

  FOR rec IN
    SELECT p.id, p.name, p.location, p.phone
    FROM public.profiles p
    WHERE p.role = 'influencer'
  LOOP
    SELECT * INTO ip FROM public.influencer_profiles WHERE user_id = rec.id;
    slug_from_name := lower(trim(both '-' from regexp_replace(lower(trim(coalesce(rec.name, ''))), '[^a-z0-9]+', '-', 'g')));
    slug_custom := lower(trim(both '-' from regexp_replace(lower(trim(coalesce(ip.profile_slug, ''))), '[^a-z0-9]+', '-', 'g')));

    IF slug_from_name = norm OR (slug_custom <> '' AND slug_custom = norm) THEN
      RETURN jsonb_build_object(
        'userId', rec.id,
        'name', rec.name,
        'location', rec.location,
        'phone', rec.phone,
        'profileSlug', coalesce(nullif(slug_custom, ''), slug_from_name),
        'bio', ip.bio,
        'niche', coalesce(ip.niche, '[]'::jsonb),
        'avatarUrl', ip.avatar_url,
        'isVerified', coalesce(ip.is_verified, false),
        'instagramHandle', ip.instagram_handle,
        'youtubeHandle', ip.youtube_handle,
        'twitterHandle', ip.twitter_handle,
        'facebookHandle', ip.facebook_handle,
        'linkedinHandle', ip.linkedin_handle,
        'tiktokHandle', ip.tiktok_handle,
        'instagramFollowers', coalesce(ip.instagram_followers, 0),
        'youtubeSubscribers', coalesce(ip.youtube_subscribers, 0),
        'tiktokFollowers', coalesce(ip.tiktok_followers, 0),
        'engagementRate', ip.engagement_rate,
        'mediaKitUrl', ip.media_kit_url,
        'portfolio', coalesce(ip.portfolio, '[]'::jsonb),
        'pricingMin', ip.pricing_min,
        'pricingMax', ip.pricing_max
      );
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_influencer(TEXT) TO anon, authenticated;
