/**
 * Supabase email OTPs are 8 digits; bundled login UI uses 6 single-digit boxes.
 * Replaces the 6-box row with one 8-digit field and handles verify directly.
 */
(function () {
  const OTP_LEN = 8;
  const STORE_KEY = "__influnetOtpOverride";
  const EMAIL_KEY = "influnet_pending_otp_email";

  function onlyDigits(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function setOverride(v) {
    const d = onlyDigits(v).slice(0, OTP_LEN);
    window[STORE_KEY] = d;
    return d;
  }

  function getVerifyEmail() {
    const stored = sessionStorage.getItem(EMAIL_KEY);
    if (stored) return stored;
    const match = document.body.innerText.match(
      /\(([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/
    );
    return match ? match[1].trim().toLowerCase() : "";
  }

  function showVerifyError(message) {
    const form = document.querySelector('form button[data-testid="button-verify-otp"]')?.closest("form");
    if (!form) return;
    let box = form.querySelector("[data-influnet-otp-error]");
    if (!box) {
      box = document.createElement("div");
      box.dataset.influnetOtpError = "1";
      box.className =
        "flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5";
      box.innerHTML =
        '<svg class="size-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p class="text-xs text-red-400"></p>';
      const btn = form.querySelector('[data-testid="button-verify-otp"]');
      form.insertBefore(box, btn);
    }
    box.querySelector("p").textContent = message;
    box.style.display = message ? "flex" : "none";
  }

  function setVerifyBusy(busy) {
    const btn = document.querySelector('[data-testid="button-verify-otp"]');
    if (!btn) return;
    btn.disabled = busy;
    if (busy) {
      btn.dataset.influnetPrevLabel = btn.textContent.trim();
      btn.textContent = "Verifying…";
    } else if (btn.dataset.influnetPrevLabel) {
      btn.textContent = btn.dataset.influnetPrevLabel;
    }
  }

  async function handleVerifySubmit(e) {
    const input = document.getElementById("influnet-otp8-input");
    if (!input) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const code = setOverride(input.value);
    if (code.length < OTP_LEN) {
      showVerifyError("Please enter the 8-digit code.");
      return;
    }

    const email = getVerifyEmail();
    if (!email) {
      showVerifyError("Email not found. Go back and try again.");
      return;
    }

    showVerifyError("");
    setVerifyBusy(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");

      sessionStorage.removeItem(EMAIL_KEY);
      const next = new URLSearchParams(window.location.search).get("next");
      const role = data.user?.role;
      const fallback =
        role === "influencer" ? "/dashboard/influencer" : "/dashboard";
      const dest =
        next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
      window.location.href = dest;
    } catch (err) {
      showVerifyError(err.message || "Invalid code. Please try again.");
      setVerifyBusy(false);
    }
  }

  function replaceLoginOtpUi() {
    const boxes = Array.from(document.querySelectorAll('input[data-testid^="input-otp-"]'));
    if (boxes.length < 6) return;

    const row = boxes[0].closest(".flex.gap-2") || boxes[0].parentElement;
    if (!row || row.dataset.influnetOtpReplaced === "1") return;
    row.dataset.influnetOtpReplaced = "1";
    row.style.display = "none";

    const form = row.closest("form");
    if (!form || document.getElementById("influnet-otp8-input")) return;

    document.querySelectorAll("p").forEach((p) => {
      const t = p.textContent || "";
      if (t.includes("6-digit code")) {
        p.textContent = t.replace(/6-digit/g, "8-digit");
      }
    });

    const holder = document.createElement("div");
    holder.style.marginBottom = "4px";
    const input = document.createElement("input");
    input.id = "influnet-otp8-input";
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = OTP_LEN;
    input.autocomplete = "one-time-code";
    input.placeholder = "Enter 8-digit verification code";
    input.style.width = "100%";
    input.style.height = "48px";
    input.style.padding = "0 14px";
    input.style.borderRadius = "12px";
    input.style.background = "#111116";
    input.style.border = "1px solid rgba(255,255,255,.12)";
    input.style.color = "#fff";
    input.style.fontSize = "18px";
    input.style.fontWeight = "700";
    input.style.letterSpacing = "0.15em";
    input.style.textAlign = "center";
    input.addEventListener("input", () => {
      input.value = setOverride(input.value);
      showVerifyError("");
    });
    holder.appendChild(input);
    row.parentElement.insertBefore(holder, row);

    if (form.dataset.influnetOtpHook !== "1") {
      form.dataset.influnetOtpHook = "1";
      form.addEventListener("submit", handleVerifySubmit, true);
    }
  }

  function patchBusinessOtpInput() {
    const otpInputs = Array.from(
      document.querySelectorAll('input[placeholder*="digit code"], input[placeholder*="OTP"]')
    );
    for (const el of otpInputs) {
      if (!(el instanceof HTMLInputElement)) continue;
      if (el.id === "influnet-otp8-input") continue;
      if (el.maxLength && el.maxLength < OTP_LEN) el.maxLength = OTP_LEN;
      el.addEventListener("input", () => setOverride(el.value));
    }
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    try {
      const url = typeof input === "string" ? input : input?.url || "";
      if (url.includes("/api/auth/send-otp") && init?.body) {
        const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
        if (body?.email) {
          sessionStorage.setItem(EMAIL_KEY, String(body.email).trim().toLowerCase());
        }
        if (body?.email && !body?.password) {
          const pw =
            document.querySelector('input[type="password"]')?.value ||
            document.querySelector('input[name="password"]')?.value ||
            "";
          if (pw) {
            init = { ...init, body: JSON.stringify({ ...body, password: pw }) };
          }
        }
      }

      if (url.includes("/api/auth/verify-otp") && init?.body) {
        const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
        const token = onlyDigits(body?.token || "");
        const override = onlyDigits(window[STORE_KEY] || "");
        if (token.length < OTP_LEN && override.length === OTP_LEN) {
          init = { ...init, body: JSON.stringify({ ...body, token: override }) };
        }
      }
    } catch (_) {
      // ignore parse failures
    }
    return nativeFetch(input, init);
  };

  function tick() {
    replaceLoginOtpUi();
    patchBusinessOtpInput();
  }

  const obs = new MutationObserver(tick);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tick);
  } else {
    tick();
  }
})();
