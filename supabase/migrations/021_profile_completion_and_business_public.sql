-- Profile completion fields, business public profile infrastructure, signup persistence fixes

-- ---------------------------------------------------------------------------
-- Influencer profile completion + public fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS availability_status TEXT,
  ADD COLUMN IF NOT EXISTS audience_demographics JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS past_collaborations JSONB DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- Business public profile + completion fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS company_description TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS preferred_creator_niches JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS past_campaigns JSONB DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS business_profiles_username_lower_idx
  ON public.business_profiles (lower(username))
  WHERE username IS NOT NULL AND username <> '';

-- Global username uniqueness (influencer + business public URLs share one namespace)
CREATE OR REPLACE FUNCTION public.is_username_globally_taken(p_username TEXT, p_exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.influencer_profiles ip
    WHERE lower(ip.username) = lower(trim(p_username))
      AND ip.username IS NOT NULL AND ip.username <> ''
      AND (p_exclude_user_id IS NULL OR ip.user_id <> p_exclude_user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.business_profiles bp
    WHERE lower(bp.username) = lower(trim(p_username))
      AND bp.username IS NOT NULL AND bp.username <> ''
      AND (p_exclude_user_id IS NULL OR bp.user_id <> p_exclude_user_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Business logo storage
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS business_logos_public_read ON storage.objects;
CREATE POLICY business_logos_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'business-logos');

DROP POLICY IF EXISTS business_logos_auth_insert ON storage.objects;
CREATE POLICY business_logos_auth_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS business_logos_auth_update ON storage.objects;
CREATE POLICY business_logos_auth_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS business_logos_auth_delete ON storage.objects;
CREATE POLICY business_logos_auth_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
