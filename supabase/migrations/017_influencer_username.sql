-- Dedicated Influnet username (unique public profile identifier)

ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS influencer_profiles_username_lower_idx
  ON public.influencer_profiles (lower(username))
  WHERE username IS NOT NULL AND username <> '';

-- Backfill from profile_slug or legacy slug pattern (never required for new signups going forward)
UPDATE public.influencer_profiles ip
SET username = sub.candidate
FROM (
  SELECT
    ip2.user_id,
    lower(
      regexp_replace(
        regexp_replace(
          coalesce(
            nullif(trim(ip2.profile_slug), ''),
            regexp_replace(lower(trim(coalesce(p.name, ''))), '[^a-z0-9]+', '_', 'g')
          ),
          '-',
          '_',
          'g'
        ),
        '[^a-z0-9._]',
        '',
        'g'
      )
    ) AS candidate
  FROM public.influencer_profiles ip2
  JOIN public.profiles p ON p.id = ip2.user_id
  WHERE ip2.username IS NULL OR ip2.username = ''
) sub
WHERE ip.user_id = sub.user_id
  AND (ip.username IS NULL OR ip.username = '')
  AND sub.candidate ~ '^[a-z0-9][a-z0-9._]{2,29}$';

-- Resolve duplicate backfills (append numeric suffix; lowest user_id keeps the base username)
WITH ranked AS (
  SELECT
    user_id,
    username,
    row_number() OVER (PARTITION BY lower(username) ORDER BY user_id) AS rn
  FROM public.influencer_profiles
  WHERE username IS NOT NULL AND username <> ''
),
duplicates AS (
  SELECT
    user_id,
    left(username, 30 - length(rn::text)) || rn::text AS new_username
  FROM ranked
  WHERE rn > 1
)
UPDATE public.influencer_profiles ip
SET username = d.new_username
FROM duplicates d
WHERE ip.user_id = d.user_id;

CREATE OR REPLACE FUNCTION public.is_valid_influnet_username(u TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    u IS NOT NULL
    AND length(u) BETWEEN 3 AND 30
    AND u ~ '^[a-z0-9][a-z0-9._]{2,29}$'
    AND lower(u) NOT IN (
      'admin', 'api', 'help', 'influnet', 'support', 'www', 'mail', 'root', 'system', 'null', 'undefined'
    );
$$;
