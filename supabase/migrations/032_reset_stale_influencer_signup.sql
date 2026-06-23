-- Clear stale influencer profile fields when re-registering via progressive signup (landing step 1).

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
  uname TEXT;
  biz_uname TEXT;
  pmin NUMERIC;
  pmax NUMERIC;
  progressive BOOLEAN := COALESCE((payload->>'progressiveSignup')::boolean, false);
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
  uname := lower(trim(coalesce(payload->>'username', '')));
  biz_uname := lower(trim(coalesce(payload->>'businessUsername', payload->>'username', '')));

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
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    location = CASE WHEN progressive THEN EXCLUDED.location ELSE COALESCE(EXCLUDED.location, profiles.location) END,
    updated_at = now();

  IF r = 'business_owner' THEN
    IF biz_uname <> '' THEN
      IF NOT public.is_valid_influnet_username(biz_uname) THEN
        RAISE EXCEPTION 'Invalid business username';
      END IF;
      IF public.is_username_globally_taken(biz_uname, uid) THEN
        RAISE EXCEPTION 'Username already taken';
      END IF;
    END IF;

    INSERT INTO public.business_profiles (
      user_id, company_name, industry, business_type, gst_number, website,
      collab_preferences, approval_status, marketing_budget, registered_address,
      city, state, instagram_handle, facebook_handle, linkedin_handle, username
    ) VALUES (
      uid,
      payload->>'companyName',
      payload->>'industry',
      payload->>'businessType',
      payload->>'gstNumber',
      payload->>'website',
      COALESCE(payload->'collabPreferences', '[]'::jsonb),
      COALESCE(payload->>'approvalStatus', 'pending_review'),
      payload->>'marketingBudget',
      payload->>'registeredAddress',
      payload->>'city',
      payload->>'state',
      payload->>'instagramHandle',
      payload->>'facebookHandle',
      payload->>'linkedinHandle',
      NULLIF(biz_uname, '')
    )
    ON CONFLICT (user_id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      industry = EXCLUDED.industry,
      business_type = COALESCE(EXCLUDED.business_type, business_profiles.business_type),
      gst_number = EXCLUDED.gst_number,
      website = EXCLUDED.website,
      collab_preferences = EXCLUDED.collab_preferences,
      approval_status = COALESCE(EXCLUDED.approval_status, business_profiles.approval_status),
      marketing_budget = COALESCE(EXCLUDED.marketing_budget, business_profiles.marketing_budget),
      registered_address = COALESCE(EXCLUDED.registered_address, business_profiles.registered_address),
      city = COALESCE(EXCLUDED.city, business_profiles.city),
      state = COALESCE(EXCLUDED.state, business_profiles.state),
      instagram_handle = COALESCE(EXCLUDED.instagram_handle, business_profiles.instagram_handle),
      facebook_handle = COALESCE(EXCLUDED.facebook_handle, business_profiles.facebook_handle),
      linkedin_handle = COALESCE(EXCLUDED.linkedin_handle, business_profiles.linkedin_handle),
      username = COALESCE(EXCLUDED.username, business_profiles.username),
      updated_at = now();
  ELSIF r = 'influencer' THEN
    IF uname = '' OR NOT public.is_valid_influnet_username(uname) THEN
      RAISE EXCEPTION 'Invalid Influnet username';
    END IF;
    IF public.is_username_globally_taken(uname, uid) THEN
      RAISE EXCEPTION 'Username already taken';
    END IF;

    SELECT ip.pricing_min, ip.pricing_max INTO pmin, pmax
    FROM public.influencer_pricing_from_tier(payload->>'priceRange') ip;

    INSERT INTO public.influencer_profiles (
      user_id, username, bio, niche, instagram_handle, youtube_handle, twitter_handle,
      gender, facebook_handle, linkedin_handle, extra_social_links,
      city, state, languages, collab_types, price_range,
      tiktok_handle, instagram_followers, facebook_followers, youtube_subscribers, tiktok_followers,
      pricing_min, pricing_max, onboarding_step, is_profile_complete
    ) VALUES (
      uid,
      uname,
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
      COALESCE((payload->>'instagramFollowers')::int, 0),
      COALESCE((payload->>'facebookFollowers')::int, 0),
      COALESCE((payload->>'youtubeSubscribers')::int, 0),
      COALESCE((payload->>'tiktokFollowers')::int, 0),
      pmin,
      pmax,
      2,
      false
    )
    ON CONFLICT (user_id) DO UPDATE SET
      username = COALESCE(EXCLUDED.username, influencer_profiles.username),
      onboarding_step = 2,
      is_profile_complete = false,
      avatar_url = CASE WHEN progressive THEN NULL ELSE influencer_profiles.avatar_url END,
      bio = CASE WHEN progressive THEN EXCLUDED.bio ELSE COALESCE(EXCLUDED.bio, influencer_profiles.bio) END,
      niche = CASE WHEN progressive THEN EXCLUDED.niche ELSE COALESCE(EXCLUDED.niche, influencer_profiles.niche) END,
      instagram_handle = CASE WHEN progressive THEN EXCLUDED.instagram_handle ELSE COALESCE(EXCLUDED.instagram_handle, influencer_profiles.instagram_handle) END,
      youtube_handle = CASE WHEN progressive THEN EXCLUDED.youtube_handle ELSE COALESCE(EXCLUDED.youtube_handle, influencer_profiles.youtube_handle) END,
      twitter_handle = CASE WHEN progressive THEN EXCLUDED.twitter_handle ELSE COALESCE(EXCLUDED.twitter_handle, influencer_profiles.twitter_handle) END,
      gender = CASE WHEN progressive THEN EXCLUDED.gender ELSE COALESCE(EXCLUDED.gender, influencer_profiles.gender) END,
      facebook_handle = CASE WHEN progressive THEN EXCLUDED.facebook_handle ELSE COALESCE(EXCLUDED.facebook_handle, influencer_profiles.facebook_handle) END,
      linkedin_handle = CASE WHEN progressive THEN EXCLUDED.linkedin_handle ELSE COALESCE(EXCLUDED.linkedin_handle, influencer_profiles.linkedin_handle) END,
      extra_social_links = CASE WHEN progressive THEN EXCLUDED.extra_social_links ELSE COALESCE(EXCLUDED.extra_social_links, influencer_profiles.extra_social_links) END,
      city = CASE WHEN progressive THEN EXCLUDED.city ELSE COALESCE(EXCLUDED.city, influencer_profiles.city) END,
      state = CASE WHEN progressive THEN EXCLUDED.state ELSE COALESCE(EXCLUDED.state, influencer_profiles.state) END,
      languages = CASE WHEN progressive THEN EXCLUDED.languages ELSE COALESCE(EXCLUDED.languages, influencer_profiles.languages) END,
      collab_types = CASE WHEN progressive THEN EXCLUDED.collab_types ELSE COALESCE(EXCLUDED.collab_types, influencer_profiles.collab_types) END,
      price_range = CASE WHEN progressive THEN EXCLUDED.price_range ELSE COALESCE(EXCLUDED.price_range, influencer_profiles.price_range) END,
      tiktok_handle = CASE WHEN progressive THEN EXCLUDED.tiktok_handle ELSE COALESCE(EXCLUDED.tiktok_handle, influencer_profiles.tiktok_handle) END,
      instagram_followers = CASE WHEN progressive THEN EXCLUDED.instagram_followers ELSE COALESCE(EXCLUDED.instagram_followers, influencer_profiles.instagram_followers) END,
      facebook_followers = CASE WHEN progressive THEN EXCLUDED.facebook_followers ELSE COALESCE(EXCLUDED.facebook_followers, influencer_profiles.facebook_followers) END,
      youtube_subscribers = CASE WHEN progressive THEN EXCLUDED.youtube_subscribers ELSE COALESCE(EXCLUDED.youtube_subscribers, influencer_profiles.youtube_subscribers) END,
      tiktok_followers = CASE WHEN progressive THEN EXCLUDED.tiktok_followers ELSE COALESCE(EXCLUDED.tiktok_followers, influencer_profiles.tiktok_followers) END,
      pricing_min = CASE WHEN progressive THEN EXCLUDED.pricing_min ELSE COALESCE(EXCLUDED.pricing_min, influencer_profiles.pricing_min) END,
      pricing_max = CASE WHEN progressive THEN EXCLUDED.pricing_max ELSE COALESCE(EXCLUDED.pricing_max, influencer_profiles.pricing_max) END,
      updated_at = now();
  END IF;

  RETURN jsonb_build_object('ok', true, 'user_id', uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_profile(JSONB) TO authenticated;
