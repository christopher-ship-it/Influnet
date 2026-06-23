-- Extra influencer profile fields used by the Edit Profile UI
ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS facebook_handle TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_handle TEXT,
  ADD COLUMN IF NOT EXISTS extra_social_links JSONB DEFAULT '[]'::jsonb;
