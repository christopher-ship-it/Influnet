-- One-time role fix for legacy accounts (influencer row but business_owner role)
UPDATE public.profiles p
SET role = 'influencer', updated_at = now()
WHERE p.role = 'business_owner'
  AND EXISTS (
    SELECT 1 FROM public.influencer_profiles ip WHERE ip.user_id = p.id
  );
