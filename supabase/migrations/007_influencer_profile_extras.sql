-- Extra influencer profile fields used by the Edit Profile UI
ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS facebook_handle TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_handle TEXT,
  ADD COLUMN IF NOT EXISTS extra_social_links JSONB DEFAULT '[]'::jsonb;

-- Keep register_profile in sync with signup + profile edits
CREATE OR REPLACE FUNCTION public.register_profile(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  r public.user_role;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  r := (payload->>'role')::public.user_role;

  INSERT INTO public.profiles (id, role, email, name, phone, location)
  VALUES (
    uid,
    r,
    COALESCE(payload->>'email', (SELECT email FROM auth.users WHERE id = uid)),
    payload->>'name',
    payload->>'phone',
    payload->>'location'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    location = EXCLUDED.location,
    updated_at = now();

  IF r = 'business_owner' THEN
    INSERT INTO public.business_profiles (
      user_id, company_name, industry, gst_number, website, collab_preferences
    ) VALUES (
      uid,
      payload->>'companyName',
      payload->>'industry',
      payload->>'gstNumber',
      payload->>'website',
      COALESCE(payload->'collabPreferences', '[]'::jsonb)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      industry = EXCLUDED.industry,
      gst_number = EXCLUDED.gst_number,
      website = EXCLUDED.website,
      collab_preferences = EXCLUDED.collab_preferences,
      updated_at = now();
  ELSIF r = 'influencer' THEN
    INSERT INTO public.influencer_profiles (
      user_id, bio, niche, instagram_handle, youtube_handle, twitter_handle,
      gender, facebook_handle, linkedin_handle, extra_social_links
    ) VALUES (
      uid,
      payload->>'bio',
      COALESCE(payload->'niche', '[]'::jsonb),
      payload->>'instagramHandle',
      payload->>'youtubeHandle',
      payload->>'twitterHandle',
      payload->>'gender',
      payload->>'facebookHandle',
      payload->>'linkedinHandle',
      COALESCE(payload->'extraSocialLinks', '[]'::jsonb)
    )
    ON CONFLICT (user_id) DO UPDATE SET
      bio = EXCLUDED.bio,
      niche = EXCLUDED.niche,
      instagram_handle = EXCLUDED.instagram_handle,
      youtube_handle = EXCLUDED.youtube_handle,
      twitter_handle = EXCLUDED.twitter_handle,
      gender = EXCLUDED.gender,
      facebook_handle = EXCLUDED.facebook_handle,
      linkedin_handle = EXCLUDED.linkedin_handle,
      extra_social_links = EXCLUDED.extra_social_links,
      updated_at = now();
  END IF;

  RETURN jsonb_build_object(
    'id', uid,
    'role', r,
    'email', payload->>'email'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_profile(JSONB) TO authenticated;
