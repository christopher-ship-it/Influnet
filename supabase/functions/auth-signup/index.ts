import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();
    const token = String(body.phoneVerificationToken || "").trim();
    const role = body.role === "influencer" ? "influencer" : "business_owner";

    if (!isValidEmail(email)) {
      return json({ error: "Enter a valid email address." }, 400);
    }
    if (!password || password.length < 6) {
      return json({ error: "Password must be at least 6 characters." }, 400);
    }
    if (!token) {
      return json({ error: "Verify your mobile number before continuing." }, 400);
    }

    const { data: phoneCheck, error: phoneErr } = await sb.rpc(
      "validate_phone_verification_token",
      { p_token: token, p_phone: phone }
    );
    if (phoneErr) return json({ error: phoneErr.message }, 500);
    if (!phoneCheck?.ok) {
      return json(
        { error: "Mobile verification expired. Send and verify OTP again." },
        400
      );
    }

    const { email: _e, password: _p, phoneVerificationToken: _t, ...meta } = body;
    const userMetadata = {
      ...meta,
      role,
      emailVerified: false,
    };

    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createErr) {
      const msg = createErr.message || "Could not create account";
      if (/already|registered|exists/i.test(msg)) {
        return json({ error: msg, reason: "email_exists" }, 409);
      }
      return json({ error: msg }, 400);
    }

    const userId = created.user?.id;
    if (!userId) {
      return json({ error: "Account creation failed." }, 500);
    }

    return json({
      ok: true,
      userId,
      email,
      role,
      emailConfirmed: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Signup failed";
    return json({ error: message }, 500);
  }
});
