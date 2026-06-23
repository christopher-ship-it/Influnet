-- Fix get_public_influencer: avoid ambiguous ip.user_id from SELECT ip.* INTO RECORD + row assign

CREATE OR REPLACE FUNCTION public.get_public_influencer(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_name TEXT;
  v_location TEXT;
  ip public.influencer_profiles%ROWTYPE;
  needle TEXT;
  slug_custom TEXT;
  rec RECORD;
BEGIN
  needle := lower(trim(coalesce(p_slug, '')));
  IF needle = '' THEN
    RETURN NULL;
  END IF;

  -- Primary: dedicated username
  SELECT p.id, p.name, p.location
  INTO v_user_id, v_name, v_location
  FROM public.profiles p
  INNER JOIN public.influencer_profiles ip ON ip.user_id = p.id
  WHERE p.role = 'influencer'
    AND ip.username IS NOT NULL
    AND ip.username <> ''
    AND lower(ip.username) = needle
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    SELECT * INTO ip FROM public.influencer_profiles WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'userId', v_user_id,
      'name', v_name,
      'location', v_location,
      'city', ip.city,
      'state', ip.state,
      'username', ip.username,
      'profileSlug', ip.username,
      'headline', ip.headline,
      'bio', ip.bio,
      'niche', coalesce(ip.niche, '[]'::jsonb),
      'avatarUrl', ip.avatar_url,
      'coverImageUrl', ip.cover_image_url,
      'availabilityStatus', ip.availability_status,
      'audienceDemographics', coalesce(ip.audience_demographics, '{}'::jsonb),
      'pastCollaborations', coalesce(ip.past_collaborations, '[]'::jsonb),
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
      'facebookFollowers', coalesce(ip.facebook_followers, 0),
      'engagementRate', ip.engagement_rate,
      'mediaKitUrl', ip.media_kit_url,
      'portfolio', coalesce(ip.portfolio, '[]'::jsonb),
      'pricingMin', ip.pricing_min,
      'pricingMax', ip.pricing_max,
      'collabTypes', coalesce(ip.collab_types, '[]'::jsonb),
      'priceRange', ip.price_range,
      'languages', coalesce(ip.languages, '[]'::jsonb)
    );
  END IF;

  -- Legacy: custom profile_slug (hyphen slugs)
  FOR rec IN
    SELECT p.id, p.name, p.location
    FROM public.profiles p
    WHERE p.role = 'influencer'
  LOOP
    SELECT * INTO ip FROM public.influencer_profiles WHERE user_id = rec.id;
    slug_custom := lower(
      trim(
        both '-'
        from regexp_replace(lower(trim(coalesce(ip.profile_slug, ''))), '[^a-z0-9]+', '-', 'g')
      )
    );
    IF slug_custom <> '' AND slug_custom = lower(regexp_replace(needle, '[^a-z0-9]+', '-', 'g')) THEN
      RETURN jsonb_build_object(
        'userId', rec.id,
        'name', rec.name,
        'location', rec.location,
        'city', ip.city,
        'state', ip.state,
        'username', ip.username,
        'profileSlug', coalesce(ip.username, slug_custom),
        'headline', ip.headline,
        'bio', ip.bio,
        'niche', coalesce(ip.niche, '[]'::jsonb),
        'avatarUrl', ip.avatar_url,
        'coverImageUrl', ip.cover_image_url,
        'availabilityStatus', ip.availability_status,
        'audienceDemographics', coalesce(ip.audience_demographics, '{}'::jsonb),
        'pastCollaborations', coalesce(ip.past_collaborations, '[]'::jsonb),
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
        'facebookFollowers', coalesce(ip.facebook_followers, 0),
        'engagementRate', ip.engagement_rate,
        'mediaKitUrl', ip.media_kit_url,
        'portfolio', coalesce(ip.portfolio, '[]'::jsonb),
        'pricingMin', ip.pricing_min,
        'pricingMax', ip.pricing_max,
        'collabTypes', coalesce(ip.collab_types, '[]'::jsonb),
        'priceRange', ip.price_range,
        'languages', coalesce(ip.languages, '[]'::jsonb)
      );
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_influencer(TEXT) TO anon, authenticated;
