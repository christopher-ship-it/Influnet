-- Derive pricing_min / pricing_max from price_range tier at signup

CREATE OR REPLACE FUNCTION public.influencer_pricing_from_tier(p_tier TEXT)
RETURNS TABLE(pricing_min NUMERIC, pricing_max NUMERIC)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t TEXT := lower(trim(coalesce(p_tier, '')));
BEGIN
  pricing_min := NULL;
  pricing_max := NULL;
  IF t IN ('entry', '₹1k – ₹5k', '₹1k - ₹5k') OR (t LIKE '%1k%' AND t LIKE '%5k%') THEN
    pricing_min := 1000;
    pricing_max := 5000;
  ELSIF t IN ('standard', '₹5k – ₹10k', '₹5k - ₹10k') OR (t LIKE '%5k%' AND t LIKE '%10k%') THEN
    pricing_min := 5000;
    pricing_max := 10000;
  ELSIF t IN ('premium', '₹10k – ₹25k', '₹10k - ₹25k') OR (t LIKE '%10k%' AND t LIKE '%25k%') THEN
    pricing_min := 10000;
    pricing_max := 25000;
  ELSIF t IN ('pro', '₹25k+', '25k+') OR t LIKE '%25k%' THEN
    pricing_min := 25000;
    pricing_max := NULL;
  END IF;
  RETURN NEXT;
END;
$$;
