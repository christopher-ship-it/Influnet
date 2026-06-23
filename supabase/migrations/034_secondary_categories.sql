-- Complementary creator niches (multi-select during onboarding step 2).

ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS secondary_categories TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.influencer_profiles.secondary_categories IS
  'Complementary creator niches selected during onboarding (typically up to 3).';
