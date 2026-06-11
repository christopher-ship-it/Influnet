-- Signup / edit-profile fields: city, state, languages, collaboration prefs

ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS collab_types JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_range TEXT;

CREATE OR REPLACE FUNCTION public.register_profile(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  r public.user_role;
  loc TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  r := (payload->>'role')::public.user_role;
  loc := COALESCE(
    NULLIF(trim(payload->>'location'), ''),
    CASE
      WHEN payload->>'city' IS NOT NULL AND payload->>'state' IS NOT NULL
        THEN trim(payload->>'city') || ', ' || trim(payload->>'state')
      ELSE payload->>'city'
    END
  );

  INSERT INTO public.profiles (id, role, email, name, phone, location)
  VALUES (
    uid,
    r,
    COALESCE(payload->>'email', (SELECT email FROM auth.users WHERE id = uid)),
    payload->>'name',
    payload->>'phone',
    loc
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    location = EXCLUDED.location,
    updated_at = now();

  IF r = 'business_owner' THEN
    INSERT INTO public.business_profiles (
      user_id, company_name, industry, gst_number, website, collab_preferences, approval_status
    ) VALUES (
      uid,
      payload->>'companyName',
      payload->>'industry',
      payload->>'gstNumber',
      payload->>'website',
      COALESCE(payload->'collabPreferences', '[]'::jsonb),
      COALESCE(payload->>'approvalStatus', 'pending_review')
    )
    ON CONFLICT (user_id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      industry = EXCLUDED.industry,
      gst_number = EXCLUDED.gst_number,
      website = EXCLUDED.website,
      collab_preferences = EXCLUDED.collab_preferences,
      approval_status = COALESCE(EXCLUDED.approval_status, business_profiles.approval_status),
      updated_at = now();
  ELSIF r = 'influencer' THEN
    INSERT INTO public.influencer_profiles (
      user_id, bio, niche, instagram_handle, youtube_handle, twitter_handle,
      gender, facebook_handle, linkedin_handle, extra_social_links,
      city, state, languages, collab_types, price_range,
      tiktok_handle, instagram_followers, facebook_followers, youtube_subscribers, tiktok_followers
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
      COALESCE(payload->'extraSocialLinks', '[]'::jsonb),
      payload->>'city',
      payload->>'state',
      COALESCE(payload->'languages', '[]'::jsonb),
      COALESCE(payload->'collabTypes', '[]'::jsonb),
      payload->>'priceRange',
      payload->>'tiktokHandle',
      COALESCE((payload->>'instagramFollowers')::integer, 0),
      COALESCE((payload->>'facebookFollowers')::integer, 0),
      COALESCE((payload->>'youtubeSubscribers')::integer, 0),
      COALESCE((payload->>'tiktokFollowers')::integer, 0)
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
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      languages = EXCLUDED.languages,
      collab_types = EXCLUDED.collab_types,
      price_range = EXCLUDED.price_range,
      tiktok_handle = COALESCE(EXCLUDED.tiktok_handle, influencer_profiles.tiktok_handle),
      instagram_followers = COALESCE(EXCLUDED.instagram_followers, influencer_profiles.instagram_followers),
      youtube_subscribers = COALESCE(EXCLUDED.youtube_subscribers, influencer_profiles.youtube_subscribers),
      tiktok_followers = COALESCE(EXCLUDED.tiktok_followers, influencer_profiles.tiktok_followers),
      updated_at = now();
  END IF;

  RETURN jsonb_build_object('id', uid, 'role', r, 'email', payload->>'email');
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_profile(JSONB) TO authenticated;
