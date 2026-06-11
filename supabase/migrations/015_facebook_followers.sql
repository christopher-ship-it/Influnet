-- Manual Facebook follower count (creator-entered, no API)

ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS facebook_followers INTEGER DEFAULT 0;

-- Public profile RPC: include Facebook followers
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
        'facebookFollowers', coalesce(ip.facebook_followers, 0),
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
s