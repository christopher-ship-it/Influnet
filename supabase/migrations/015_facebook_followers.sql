-- Manual Facebook follower count (creator-entered, no API)

ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS facebook_followers INTEGER DEFAULT 0;
