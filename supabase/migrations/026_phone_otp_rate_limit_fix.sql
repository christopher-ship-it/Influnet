-- Fix OTP rate limiting: don't count denied attempts; add 30s cooldown; reuse active sessions.

CREATE OR REPLACE FUNCTION public.phone_otp_send_allowed(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
  send_count INTEGER;
  last_sent_at TIMESTAMPTZ;
  cooldown_sec INTEGER;
BEGIN
  normalized := public.normalize_indian_phone(p_phone);
  IF normalized IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_phone');
  END IF;

  SELECT created_at INTO last_sent_at
  FROM public.phone_otp_audit_log
  WHERE phone_e164 = normalized
    AND action = 'send'
    AND status = 'sent'
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_sent_at IS NOT NULL AND last_sent_at > now() - interval '30 seconds' THEN
    cooldown_sec := GREATEST(
      1,
      ceil(extract(epoch FROM (last_sent_at + interval '30 seconds' - now())))::integer
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'cooldown',
      'retryAfterSec', cooldown_sec
    );
  END IF;

  SELECT count(*)::integer INTO send_count
  FROM public.phone_otp_audit_log
  WHERE phone_e164 = normalized
    AND action = 'send'
    AND status = 'sent'
    AND created_at > now() - interval '1 hour';

  IF send_count >= 10 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'retryAfterSec', 3600
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'phoneE164', normalized);
END;
$$;

-- Return an active OTP session so "Send OTP" can resend without hitting 2Factor again within TTL.
CREATE OR REPLACE FUNCTION public.phone_otp_get_active_session(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
  row public.phone_otp_sessions%ROWTYPE;
BEGIN
  normalized := public.normalize_indian_phone(p_phone);
  IF normalized IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  SELECT * INTO row
  FROM public.phone_otp_sessions
  WHERE phone_e164 = normalized
    AND status IN ('sent', 'verifying')
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'providerSessionId', row.provider_session_id,
    'sessionId', row.id,
    'expiresAt', row.expires_at,
    'phoneE164', row.phone_e164
  );
END;
$$;

-- Remove rate-limit audit noise that inflated counters (legacy bug).
DELETE FROM public.phone_otp_audit_log
WHERE action = 'send' AND status = 'rate_limited';

GRANT EXECUTE ON FUNCTION public.phone_otp_get_active_session(TEXT) TO anon, authenticated;
