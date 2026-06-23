-- Mobile OTP verification (2Factor) — profiles + sessions + audit

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_verified_by TEXT;

CREATE TABLE IF NOT EXISTS public.phone_otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL,
  provider_session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'verifying', 'verified', 'failed', 'expired')),
  purpose TEXT NOT NULL DEFAULT 'signup'
    CHECK (purpose IN ('signup', 'profile_update', 'login')),
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  verify_attempts INTEGER NOT NULL DEFAULT 0,
  send_attempt INTEGER NOT NULL DEFAULT 1,
  verification_token UUID,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_otp_sessions_phone_created_idx
  ON public.phone_otp_sessions (phone_e164, created_at DESC);

CREATE INDEX IF NOT EXISTS phone_otp_sessions_provider_session_idx
  ON public.phone_otp_sessions (provider_session_id);

CREATE INDEX IF NOT EXISTS phone_otp_sessions_verification_token_idx
  ON public.phone_otp_sessions (verification_token)
  WHERE verification_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.phone_otp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT,
  user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_otp_audit_phone_created_idx
  ON public.phone_otp_audit_log (phone_e164, created_at DESC);

ALTER TABLE public.phone_otp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_otp_audit_log ENABLE ROW LEVEL SECURITY;

-- No direct client access; service role / SECURITY DEFINER only
DROP POLICY IF EXISTS phone_otp_sessions_deny ON public.phone_otp_sessions;
CREATE POLICY phone_otp_sessions_deny ON public.phone_otp_sessions
  FOR ALL TO authenticated, anon USING (false);

DROP POLICY IF EXISTS phone_otp_audit_deny ON public.phone_otp_audit_log;
CREATE POLICY phone_otp_audit_deny ON public.phone_otp_audit_log
  FOR ALL TO authenticated, anon USING (false);

CREATE OR REPLACE FUNCTION public.normalize_indian_phone(p_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  digits := regexp_replace(coalesce(p_raw, ''), '[^0-9]', '', 'g');
  IF digits = '' THEN
    RETURN NULL;
  END IF;
  IF length(digits) = 10 THEN
    RETURN '91' || digits;
  END IF;
  IF length(digits) = 11 AND left(digits, 1) = '0' THEN
    RETURN '91' || substr(digits, 2);
  END IF;
  IF length(digits) = 12 AND left(digits, 2) = '91' THEN
    RETURN digits;
  END IF;
  IF length(digits) >= 10 AND length(digits) <= 15 THEN
    RETURN digits;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.phone_otp_log_audit(
  p_phone TEXT,
  p_user_id UUID,
  p_action TEXT,
  p_status TEXT,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.phone_otp_audit_log (phone_e164, user_id, action, status, meta)
  VALUES (public.normalize_indian_phone(p_phone), p_user_id, p_action, p_status, coalesce(p_meta, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.phone_otp_send_allowed(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
  send_count INTEGER;
BEGIN
  normalized := public.normalize_indian_phone(p_phone);
  IF normalized IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_phone');
  END IF;

  SELECT count(*)::integer INTO send_count
  FROM public.phone_otp_audit_log
  WHERE phone_e164 = normalized
    AND action = 'send'
    AND created_at > now() - interval '1 hour';

  IF send_count >= 5 THEN
    PERFORM public.phone_otp_log_audit(p_phone, NULL, 'send', 'rate_limited', '{}'::jsonb);
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'retryAfterSec', 3600);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'phoneE164', normalized);
END;
$$;

CREATE OR REPLACE FUNCTION public.phone_otp_create_session(
  p_phone TEXT,
  p_provider_session_id TEXT,
  p_purpose TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ttl_minutes INTEGER DEFAULT 10
)
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
  IF normalized IS NULL OR coalesce(p_provider_session_id, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  UPDATE public.phone_otp_sessions
  SET status = 'expired', updated_at = now()
  WHERE phone_e164 = normalized
    AND status IN ('sent', 'verifying', 'failed')
    AND expires_at > now();

  INSERT INTO public.phone_otp_sessions (
    phone_e164, provider_session_id, status, purpose, user_id, expires_at
  ) VALUES (
    normalized,
    p_provider_session_id,
    'sent',
    coalesce(nullif(trim(p_purpose), ''), 'signup'),
    p_user_id,
    now() + make_interval(mins => greatest(p_ttl_minutes, 5))
  )
  RETURNING * INTO row;

  PERFORM public.phone_otp_log_audit(
    p_phone, p_user_id, 'send', 'sent',
    jsonb_build_object('sessionId', row.id, 'providerSessionId', row.provider_session_id)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'sessionId', row.id,
    'providerSessionId', row.provider_session_id,
    'expiresAt', row.expires_at,
    'phoneE164', row.phone_e164
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.phone_otp_register_verify_attempt(
  p_provider_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.phone_otp_sessions%ROWTYPE;
BEGIN
  SELECT * INTO row
  FROM public.phone_otp_sessions
  WHERE provider_session_id = p_provider_session_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  IF row.status = 'verified' THEN
    RETURN jsonb_build_object('ok', true, 'alreadyVerified', true, 'session', row);
  END IF;

  IF row.expires_at <= now() THEN
    UPDATE public.phone_otp_sessions SET status = 'expired', updated_at = now() WHERE id = row.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF row.verify_attempts >= 5 THEN
    UPDATE public.phone_otp_sessions SET status = 'failed', updated_at = now() WHERE id = row.id;
    RETURN jsonb_build_object('ok', false, 'error', 'max_attempts');
  END IF;

  UPDATE public.phone_otp_sessions
  SET verify_attempts = row.verify_attempts + 1, status = 'verifying', updated_at = now()
  WHERE id = row.id
  RETURNING * INTO row;

  RETURN jsonb_build_object('ok', true, 'session', row);
END;
$$;

CREATE OR REPLACE FUNCTION public.phone_otp_mark_verified(
  p_provider_session_id TEXT,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.phone_otp_sessions%ROWTYPE;
  normalized TEXT;
  vtoken UUID := gen_random_uuid();
BEGIN
  normalized := public.normalize_indian_phone(p_phone);
  SELECT * INTO row
  FROM public.phone_otp_sessions
  WHERE provider_session_id = p_provider_session_id
    AND phone_e164 = normalized
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  UPDATE public.phone_otp_sessions
  SET
    status = 'verified',
    verified_at = now(),
    verification_token = vtoken,
    updated_at = now()
  WHERE id = row.id
  RETURNING * INTO row;

  PERFORM public.phone_otp_log_audit(
    p_phone, row.user_id, 'verify_success', 'verified',
    jsonb_build_object('sessionId', row.id, 'verificationToken', vtoken)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'verificationToken', vtoken,
    'phoneE164', row.phone_e164,
    'sessionId', row.id,
    'providerSessionId', row.provider_session_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.phone_otp_mark_failed(
  p_provider_session_id TEXT,
  p_phone TEXT,
  p_reason TEXT DEFAULT 'mismatch'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.phone_otp_sessions%ROWTYPE;
BEGIN
  SELECT * INTO row
  FROM public.phone_otp_sessions
  WHERE provider_session_id = p_provider_session_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.phone_otp_sessions
    SET status = CASE WHEN verify_attempts >= 5 THEN 'failed' ELSE 'sent' END,
        updated_at = now()
    WHERE id = row.id;
  END IF;

  PERFORM public.phone_otp_log_audit(
    p_phone, row.user_id, 'verify_fail', p_reason,
    jsonb_build_object('providerSessionId', p_provider_session_id)
  );

  RETURN jsonb_build_object('ok', false, 'error', p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_phone_verification_token(
  p_token UUID,
  p_phone TEXT
)
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
  IF p_token IS NULL OR normalized IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT * INTO row
  FROM public.phone_otp_sessions
  WHERE verification_token = p_token
    AND phone_e164 = normalized
    AND status = 'verified'
    AND verified_at > now() - interval '30 minutes'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'token_invalid_or_expired');
  END IF;

  RETURN jsonb_build_object('ok', true, 'phoneE164', normalized, 'sessionId', row.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_profile_phone_verified(
  p_user_id UUID,
  p_phone TEXT,
  p_provider TEXT DEFAULT '2factor'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
  display_phone TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;
  normalized := public.normalize_indian_phone(p_phone);
  IF normalized IS NULL THEN
    RETURN;
  END IF;
  IF length(normalized) = 12 AND left(normalized, 2) = '91' THEN
    display_phone := '+91 ' || substr(normalized, 3);
  ELSE
    display_phone := '+' || normalized;
  END IF;

  UPDATE public.profiles
  SET
    phone = display_phone,
    phone_verified = true,
    phone_verified_at = now(),
    otp_verified_by = coalesce(nullif(trim(p_provider), ''), '2factor'),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_profile_phone_verification(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;
  UPDATE public.profiles
  SET
    phone_verified = false,
    phone_verified_at = NULL,
    otp_verified_by = NULL,
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_indian_phone(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_phone_verification_token(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_profile_phone_verified(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_profile_phone_verification(UUID) TO authenticated;
