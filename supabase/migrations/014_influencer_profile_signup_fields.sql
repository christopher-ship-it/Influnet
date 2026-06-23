-- Signup / edit-profile fields: city, state, languages, collaboration prefs

ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS collab_types JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_range TEXT;
