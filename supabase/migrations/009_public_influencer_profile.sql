-- Public influencer profile lookup for shareable /influencer/:slug URLs (no email exposed).

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
BEGIN
  norm := lower(trim(both '-' from regexp_replace(lower(trim(coalesce(p_slug, ''))), '[^a-z0-9]+', '-', 'g')));
  IF norm = '' OR norm IS NULL THEN
    RETURN NULL;
  END IF;

  FOR rec IN
    SELECT p.id, p.name, p.location
    FROM public.profiles p
    WHERE p.role = 'influencer'
  LOOP
    slug_from_name := lower(trim(both '-' from regexp_replace(lower(trim(coalesce(rec.name, ''))), '[^a-z0-9]+', '-', 'g')));
    IF slug_from_name = norm THEN
      SELECT * INTO ip FROM public.influencer_profiles WHERE user_id = rec.id;
      RETURN jsonb_build_object(
        'userId', rec.id,
        'name', rec.name,
        'location', rec.location,
        'profileSlug', norm,
        'bio', ip.bio,
        'niche', coalesce(ip.niche, '[]'::jsonb),
        'instagramHandle', ip.instagram_handle,
        'youtubeHandle', ip.youtube_handle,
        'twitterHandle', ip.twitter_handle,
        'facebookHandle', ip.facebook_handle,
        'linkedinHandle', ip.linkedin_handle
      );
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_influencer(TEXT) TO anon, authenticated;
