-- Unique business profile views per creator (KPI + notifications)

CREATE TABLE IF NOT EXISTS public.creator_profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT creator_profile_views_no_self CHECK (creator_id <> business_id),
  CONSTRAINT creator_profile_views_unique UNIQUE (creator_id, business_id)
);

CREATE INDEX IF NOT EXISTS creator_profile_views_creator_idx
  ON public.creator_profile_views (creator_id, last_viewed_at DESC);

CREATE INDEX IF NOT EXISTS creator_profile_views_business_idx
  ON public.creator_profile_views (business_id);

ALTER TABLE public.creator_profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_profile_views_influencer_read ON public.creator_profile_views;
CREATE POLICY creator_profile_views_influencer_read ON public.creator_profile_views
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS creator_profile_views_business_insert ON public.creator_profile_views;
CREATE POLICY creator_profile_views_business_insert ON public.creator_profile_views
  FOR INSERT TO authenticated
  WITH CHECK (business_id = auth.uid());

DROP POLICY IF EXISTS creator_profile_views_business_update ON public.creator_profile_views;
CREATE POLICY creator_profile_views_business_update ON public.creator_profile_views
  FOR UPDATE TO authenticated
  USING (business_id = auth.uid())
  WITH CHECK (business_id = auth.uid());

-- Backfill from legacy per-event profile_views log (unique businesses only)
INSERT INTO public.creator_profile_views (
  creator_id,
  business_id,
  first_viewed_at,
  last_viewed_at,
  view_count
)
SELECT
  pv.influencer_user_id,
  pv.viewer_user_id,
  min(pv.viewed_at),
  max(pv.viewed_at),
  count(*)::integer
FROM public.profile_views pv
WHERE pv.viewer_user_id IS NOT NULL
  AND pv.influencer_user_id IS NOT NULL
  AND pv.viewer_user_id <> pv.influencer_user_id
GROUP BY pv.influencer_user_id, pv.viewer_user_id
ON CONFLICT (creator_id, business_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_creator_profile_view(
  p_creator_id UUID,
  p_business_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.creator_profile_views%ROWTYPE;
BEGIN
  IF p_creator_id IS NULL OR p_business_id IS NULL OR p_creator_id = p_business_id THEN
    RETURN jsonb_build_object('ok', false, 'is_first_view', false);
  END IF;

  SELECT * INTO row
  FROM public.creator_profile_views
  WHERE creator_id = p_creator_id AND business_id = p_business_id;

  IF FOUND THEN
    UPDATE public.creator_profile_views
    SET
      view_count = row.view_count + 1,
      last_viewed_at = now()
    WHERE id = row.id
    RETURNING * INTO row;

    RETURN jsonb_build_object(
      'ok', true,
      'is_first_view', false,
      'view_count', row.view_count
    );
  END IF;

  INSERT INTO public.creator_profile_views (
    creator_id,
    business_id,
    first_viewed_at,
    last_viewed_at,
    view_count
  ) VALUES (
    p_creator_id,
    p_business_id,
    now(),
    now(),
    1
  )
  RETURNING * INTO row;

  RETURN jsonb_build_object(
    'ok', true,
    'is_first_view', true,
    'view_count', row.view_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_creator_profile_view(UUID, UUID) TO authenticated;
