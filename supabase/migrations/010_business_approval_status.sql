-- Business account review workflow (signup → pending → admin approval → login)

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending_review';

CREATE INDEX IF NOT EXISTS business_profiles_approval_idx
  ON public.business_profiles (approval_status);
