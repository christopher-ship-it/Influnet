-- Definitive one-time onboarding gate for influencer progressive signup wizard.

ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.influencer_profiles.onboarding_completed IS
  'True after the user finishes or dismisses the dashboard onboarding wizard; prevents re-opening.';

-- Backfill users who already finished or skipped via prior flags.
UPDATE public.influencer_profiles
SET onboarding_completed = true
WHERE
  onboarding_completed = false
  AND (
    onboarding_step >= 5
    OR is_profile_complete = true
  );
