/**
 * 2Factor mobile OTP — signup + profile phone verification UI.
 */
(function () {
  try {
    const STATE_KEY = "influnet_phone_otp_state";
    const INFLUENCER_DRAFT_KEY = "influnet_influencer_signup_draft";
    const RESEND_SEC = 30;
    const OTP_MSG_COMPLETE =
      "Verify your mobile number with OTP before completing signup.";
    const OTP_MSG_CONTINUE =
      "Verify your mobile number with OTP before continuing.";

    let state = loadState();
    let resendTimer = 0;
    let resendLeft = 0;
    let sendCooldownUntil = 0;

    function loadState() {
      try {
        return JSON.parse(sessionStorage.getItem(STATE_KEY) || "{}");
      } catch {
        return {};
      }
    }

    function saveState() {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
      syncInfluencerDraftPhone();
      window.dispatchEvent(new CustomEvent("influnet-phone-otp-updated", { detail: state }));
    }

    function isLandingCreatorSignup() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      return path === "/" && !!document.getElementById("infl-landing-creator-signup");
    }

    function isBusinessSignup() {
      return window.location.pathname.replace(/\/$/, "") === "/signup/business";
    }

    function isInfluencerSignup() {
      return window.location.pathname.replace(/\/$/, "") === "/signup/influencer";
    }

    function getInfluencerSignupStep() {
      if (document.getElementById("infl-signup-standalone-root")) return 1;
      const titles = [...document.querySelectorAll("h1, h2")].map((h) => h.textContent.trim());
      if (
        titles.some((t) =>
          /create your influencer account|complete your registration/i.test(t)
        )
      ) {
        return 1;
      }
      if (titles.some((t) => t === "Profile Details")) return 2;
      if (titles.some((t) => /creator & social/i.test(t))) return 3;
      if (titles.some((t) => /collaboration preferences/i.test(t))) return 4;
      return 0;
    }

    function isBusinessAccountStep() {
      return (
        isBusinessSignup() &&
        [...document.querySelectorAll("h2")].some((h) =>
          /basic account details/i.test(h.textContent.trim())
        )
      );
    }

    function shouldEnforcePhoneOnNextStep() {
      if (isBusinessSignup()) return isBusinessAccountStep();
      if (isInfluencerSignup()) return getInfluencerSignupStep() === 1;
      return false;
    }

    function loadInfluencerDraft() {
      try {
        return JSON.parse(sessionStorage.getItem(INFLUENCER_DRAFT_KEY) || "{}");
      } catch {
        return {};
      }
    }

    function syncInfluencerDraftPhone() {
      if (!isInfluencerSignup()) return;
      try {
        const draft = loadInfluencerDraft();
        if (
          state.status === "verified" &&
          state.verificationToken &&
          state.phoneLocal
        ) {
          draft.phoneVerified = true;
          draft.phone = state.phone;
          draft.phoneLocal = state.phoneLocal;
          draft.phoneVerificationToken = state.verificationToken;
          draft.phoneVerifiedAt = state.verifiedAt || Date.now();
        } else if (state.status === "not_verified" || state.status === "failed") {
          draft.phoneVerified = false;
          delete draft.phoneVerificationToken;
        }
        sessionStorage.setItem(INFLUENCER_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* ignore */
      }
    }

    function restoreStateFromDraft() {
      if (!isInfluencerSignup()) return;
      if (state.status === "verified" && state.verificationToken) return;
      const draft = loadInfluencerDraft();
      if (!draft.phoneVerified || !draft.phoneVerificationToken || !draft.phoneLocal) {
        return;
      }
      state = {
        status: "verified",
        phone: draft.phone || fullPhone(draft.phoneLocal),
        phoneLocal: draft.phoneLocal,
        verificationToken: draft.phoneVerificationToken,
        verifiedAt: draft.phoneVerifiedAt || Date.now(),
      };
      sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    }

    function isSignupPhoneVerified() {
      restoreStateFromDraft();
      if (state.status === "verified" && state.verificationToken && state.phoneLocal) {
        return true;
      }
      const draft = loadInfluencerDraft();
      return !!(
        draft.phoneVerified &&
        draft.phoneVerificationToken &&
        draft.phoneLocal
      );
    }

    function getSignupVerificationToken() {
      restoreStateFromDraft();
      return state.verificationToken || loadInfluencerDraft().phoneVerificationToken || null;
    }

    function getSignupPhoneLocal() {
      restoreStateFromDraft();
      const fromState = normalizeLocal(state.phoneLocal);
      if (fromState.length === 10) return fromState;
      const fromDraft = normalizeLocal(loadInfluencerDraft().phoneLocal);
      if (fromDraft.length === 10) return fromDraft;
      return normalizeLocal(findMobileInput()?.value);
    }

    function getVerifiedSignupPhone() {
      const local = getSignupPhoneLocal();
      return local.length === 10 ? fullPhone(local) : "";
    }

    function isSignupPage() {
      const p = window.location.pathname.replace(/\/$/, "") || "/";
      return p === "/signup/influencer" || p === "/signup/business";
    }

    function isPhoneOtpContext() {
      return isSignupPage() || isProfileContext() || isLandingCreatorSignup();
    }

    function isProfileContext() {
      const p = window.location.pathname.replace(/\/$/, "") || "/";
      if (p === "/dashboard/influencer") return true;
      if (document.getElementById("influnet-settings-mount")) return true;
      if (document.getElementById("infl-phone")) return true;
      return false;
    }

    function findMobileInput() {
      const standalone = document.querySelector(
        "#infl-signup-standalone-root input[name='phone'], #infl-signup-standalone-root input[type='tel']"
      );
      if (standalone) return standalone;
      const landing = document.querySelector(
        "#infl-landing-creator-signup input[name='phone'], #infl-landing-creator-signup input[type='tel']"
      );
      if (landing) return landing;
      if (document.getElementById("infl-phone")) return document.getElementById("infl-phone");
      const telInputs = [...document.querySelectorAll('input[type="tel"]')].filter(
        (el) => el.id !== "ias-sec-phone"
      );
      return (
        telInputs.find((el) => el.placeholder?.includes("98765")) ||
        telInputs[0] ||
        document.querySelector('input[placeholder="+91 98765 43210"]') ||
        null
      );
    }

    function findPhoneHost(input) {
      if (!input) return null;
      if (input.closest("#infl-signup-standalone-root")) {
        return input.closest(".infl-signup-standalone-phone") || input.parentElement;
      }
      if (input.closest("#infl-landing-creator-signup")) {
        return input.closest("label") || input.parentElement;
      }
      return (
        input.closest(".space-y-1\\.5") ||
        input.closest(".space-y-2") ||
        input.closest(".space-y-1") ||
        input.closest(".infl-edit-field") ||
        input.parentElement
      );
    }

    function getStoredUser() {
      try {
        const raw = localStorage.getItem("influnet_user");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function normalizeLocal(raw) {
      return String(raw || "").replace(/\D/g, "").slice(-10);
    }

    function fullPhone(local) {
      const d = normalizeLocal(local);
      return d.length === 10 ? `+91 ${d}` : "";
    }

    function setStatus(el, text, kind) {
      if (!el) return;
      el.className = `infl-phone-otp-status ${kind || ""}`;
      el.textContent = text || "";
    }

    function clearOtpDigits(codeHost) {
      codeHost?.querySelectorAll(".infl-phone-otp-digit").forEach((inp) => {
        inp.value = "";
      });
      codeHost?.querySelector(".infl-phone-otp-digit")?.focus();
    }

    function renderDigits(container, onComplete) {
      container.innerHTML = `
        <div class="infl-phone-otp-code-label">Enter Verification Code</div>
        <div class="infl-phone-otp-digits" role="group" aria-label="6-digit verification code">
          ${[0, 1, 2, 3, 4, 5]
            .map(
              (i) =>
                `<input type="text" inputmode="numeric" maxlength="1" class="infl-phone-otp-digit" data-idx="${i}" aria-label="Digit ${i + 1}" />`
            )
            .join("")}
        </div>
        <p class="infl-phone-otp-resend" data-resend></p>`;

      const inputs = [...container.querySelectorAll(".infl-phone-otp-digit")];
      inputs.forEach((inp, idx) => {
        inp.addEventListener("input", () => {
          inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
          if (inp.value && idx < 5) inputs[idx + 1].focus();
          const code = inputs.map((x) => x.value).join("");
          if (code.length === 6) onComplete(code);
        });
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && !inp.value && idx > 0) {
            inputs[idx - 1].focus();
          }
        });
        inp.addEventListener("paste", (e) => {
          const text = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
          if (!text) return;
          e.preventDefault();
          text.split("").forEach((ch, i) => {
            if (inputs[i]) inputs[i].value = ch;
          });
          if (text.length === 6) onComplete(text);
          else inputs[Math.min(text.length, 5)].focus();
        });
      });
      inputs[0]?.focus();
      return container.querySelector("[data-resend]");
    }

    function startResendCountdown(resendEl, sendBtn) {
      clearInterval(resendTimer);
      resendLeft = RESEND_SEC;
      if (sendBtn) sendBtn.disabled = true;
      const tick = () => {
        if (resendLeft <= 0) {
          clearInterval(resendTimer);
          if (resendEl) resendEl.innerHTML = `<button type="button" data-resend-btn>Resend OTP</button>`;
          resendEl?.querySelector("[data-resend-btn]")?.addEventListener("click", () => {
            sendOtp(sendBtn, document.querySelector("[data-otp-status]"), document.querySelector("[data-otp-code]"));
          });
          if (sendBtn) sendBtn.disabled = state.status === "verified";
          return;
        }
        if (resendEl) resendEl.textContent = `Resend OTP in ${resendLeft}s`;
        resendLeft -= 1;
      };
      tick();
      resendTimer = window.setInterval(tick, 1000);
    }

    async function sendOtp(sendBtn, statusEl, codeHost) {
      const input = findMobileInput();
      const local = normalizeLocal(input?.value);
      if (local.length !== 10) {
        setStatus(statusEl, "Enter a valid 10-digit mobile number.", "failed");
        return;
      }
      if (Date.now() < sendCooldownUntil) {
        const wait = Math.ceil((sendCooldownUntil - Date.now()) / 1000);
        setStatus(statusEl, `Please wait ${wait}s before requesting another OTP.`, "failed");
        return;
      }
      const phone = fullPhone(local);
      sendBtn.disabled = true;
      setStatus(statusEl, "Sending OTP…", "verifying");
      state.status = "verifying";
      saveState();

      try {
        const res = await fetch("/api/phone-otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            phone,
            purpose: isSignupPage() || isLandingCreatorSignup() ? "signup" : "profile_update",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const retrySec = Number(data.retryAfterSec) || (res.status === 429 ? 30 : 0);
          if (retrySec > 0) {
            sendCooldownUntil = Date.now() + retrySec * 1000;
          }
          const msg =
            data.reason === "cooldown"
              ? `Please wait ${retrySec || 30} seconds before requesting another code.`
              : data.reason === "rate_limited"
                ? data.error ||
                  "Too many OTP requests this hour. Please wait before trying again."
                : data.error || "Could not send OTP";
          throw new Error(msg);
        }

        sendCooldownUntil = Date.now() + (Number(data.resendAfterSec) || RESEND_SEC) * 1000;

        state = {
          phone,
          phoneLocal: local,
          providerSessionId: data.providerSessionId,
          status: "otp_sent",
          verificationToken: null,
        };
        saveState();
        setStatus(statusEl, "OTP sent to your mobile.", "sent");

        if (codeHost) {
          codeHost.style.display = "";
          const resendEl = renderDigits(codeHost, (otp) => verifyOtp(otp, statusEl, sendBtn, codeHost));
          startResendCountdown(resendEl, sendBtn);
        }
      } catch (err) {
        state.status = "failed";
        saveState();
        const msg = err.message || "Failed to send OTP";
        setStatus(statusEl, msg, "failed");
        if (/too many|rate|hour|wait|seconds|cooldown/i.test(msg)) {
          const match = msg.match(/(\d+)\s*second/i);
          const sec = match ? Number(match[1]) : msg.includes("hour") ? 3600 : 30;
          sendCooldownUntil = Date.now() + sec * 1000;
          sendBtn.disabled = true;
          startSendCooldownCountdown(sendBtn, statusEl, sec);
        } else {
          sendBtn.disabled = false;
        }
      }
    }

    function startSendCooldownCountdown(sendBtn, statusEl, seconds) {
      let left = Math.max(1, seconds);
      const tick = () => {
        if (Date.now() >= sendCooldownUntil) {
          if (sendBtn) sendBtn.disabled = state.status === "verified";
          return;
        }
        if (statusEl && left > 0) {
          setStatus(
            statusEl,
            left >= 60
              ? `Please wait ${Math.ceil(left / 60)} min before requesting another code.`
              : `Please wait ${left}s before requesting another code.`,
            "failed"
          );
        }
        left -= 1;
        if (Date.now() < sendCooldownUntil) {
          window.setTimeout(tick, 1000);
        } else if (sendBtn) {
          sendBtn.disabled = state.status === "verified";
        }
      };
      tick();
    }

    async function verifyOtp(otp, statusEl, sendBtn, codeHost) {
      if (!state.providerSessionId || !state.phone) return;
      setStatus(statusEl, "Verifying…", "verifying");
      state.status = "verifying";
      saveState();
      try {
        const res = await fetch("/api/phone-otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            phone: state.phone,
            otp,
            providerSessionId: state.providerSessionId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");

        state.status = "verified";
        state.verificationToken = data.verificationToken;
        state.verifiedAt = Date.now();
        saveState();
        setStatus(statusEl, "", "verified");
        if (codeHost) {
          codeHost.innerHTML = `<div class="infl-phone-otp-verified-badge">✓ Mobile Number Verified</div>`;
        }
        if (sendBtn) sendBtn.disabled = true;
        const input = findMobileInput();
        if (input) input.readOnly = true;
      } catch (err) {
        state.status = "failed";
        saveState();
        clearOtpDigits(codeHost);
        setStatus(statusEl, err.message || "Incorrect code", "failed");
      }
    }

    function initVerifiedFromProfile(input) {
      if (state.status === "verified" && state.verificationToken) return;
      const user = getStoredUser();
      if (!user?.phoneVerified) return;
      const local = normalizeLocal(input?.value || user.phone);
      if (local.length !== 10) return;
      state = {
        status: "verified",
        phoneLocal: local,
        phone: fullPhone(local),
        verificationToken: null,
        fromProfile: true,
      };
      saveState();
    }

    function removeLegacySendOtpButtons(host) {
      if (!host) return;
      host.querySelectorAll("button").forEach((btn) => {
        const label = String(btn.textContent || "").trim().toLowerCase();
        if (label !== "send otp") return;
        if (btn.closest(".infl-phone-otp-wrap")) return;
        btn.remove();
      });
    }

    function ensureUi() {
      ensureSecurityPhoneOtp();
      restoreStateFromDraft();
      const input = findMobileInput();
      if (!input || input.dataset.inflPhoneOtpWired === "1") return;
      if (!isPhoneOtpContext()) return;

      const host = findPhoneHost(input);
      if (!host || host.querySelector(".infl-phone-otp-wrap")) return;

      input.dataset.inflPhoneOtpWired = "1";
      input.classList.add("infl-phone-local");
      input.setAttribute("inputmode", "numeric");
      input.setAttribute("maxlength", "10");
      input.placeholder = "98765 43210";
      const localDigits = normalizeLocal(input.value);
      if (localDigits) input.value = localDigits;
      if (!isSignupPage()) initVerifiedFromProfile(input);
      removeLegacySendOtpButtons(host);

      const wrap = document.createElement("div");
      wrap.className = "infl-phone-otp-wrap";
      wrap.innerHTML = `
        <div class="infl-phone-otp-row">
          <span class="infl-phone-otp-prefix">+91</span>
        </div>
        <p data-otp-status class="infl-phone-otp-status"></p>
        <div data-otp-code class="infl-phone-otp-code-wrap" style="display:none"></div>`;

      const row = wrap.querySelector(".infl-phone-otp-row");
      row.appendChild(input);
      const sendBtn = document.createElement("button");
      sendBtn.type = "button";
      sendBtn.className = "infl-phone-otp-send";
      sendBtn.textContent = "Send OTP";
      row.appendChild(sendBtn);

      host.appendChild(wrap);

      const statusEl = wrap.querySelector("[data-otp-status]");
      const codeHost = wrap.querySelector("[data-otp-code]");

      sendBtn.addEventListener("click", () => sendOtp(sendBtn, statusEl, codeHost));

      input.addEventListener("input", () => {
        const local = normalizeLocal(input.value);
        if (input.value !== local) input.value = local;
        const prevLocal =
          state.phoneLocal ||
          (state.fromProfile ? normalizeLocal(getStoredUser()?.phone) : "");
        const hadVerifiedPhone =
          state.status === "verified" &&
          (state.verificationToken || state.fromProfile) &&
          normalizeLocal(prevLocal).length === 10;
        const replacedVerifiedPhone =
          hadVerifiedPhone &&
          normalizeLocal(local).length === 10 &&
          normalizeLocal(prevLocal) !== normalizeLocal(local);

        if (replacedVerifiedPhone) {
          state = { status: "not_verified" };
          saveState();
          syncInfluencerDraftPhone();
          const draft = loadInfluencerDraft();
          draft.phoneVerified = false;
          delete draft.phoneVerificationToken;
          sessionStorage.setItem(INFLUENCER_DRAFT_KEY, JSON.stringify(draft));
          codeHost.style.display = "none";
          codeHost.innerHTML = "";
          sendBtn.disabled = false;
          input.readOnly = false;
          setStatus(statusEl, "Phone changed — verify again.", "failed");
        }
      });

      if (
        state.status === "verified" &&
        state.phoneLocal === normalizeLocal(input.value) &&
        (state.verificationToken || state.fromProfile)
      ) {
        codeHost.style.display = "";
        codeHost.innerHTML = `<div class="infl-phone-otp-verified-badge">✓ Mobile Number Verified</div>`;
        sendBtn.disabled = true;
        if (state.fromProfile && !state.verificationToken) input.readOnly = false;
        else input.readOnly = true;
      }
    }

    const PW_STATE_KEY = "influnet_phone_otp_state_pw";
    let pwState = loadPwState();

    function loadPwState() {
      try {
        return JSON.parse(sessionStorage.getItem(PW_STATE_KEY) || "{}");
      } catch {
        return {};
      }
    }

    function savePwState() {
      sessionStorage.setItem(PW_STATE_KEY, JSON.stringify(pwState));
      window.dispatchEvent(new CustomEvent("influnet-security-otp-verified", { detail: pwState }));
    }

    function isSecurityForgotVisible() {
      const mode = document.getElementById("ias-pw-forgot-mode");
      return mode && !mode.hasAttribute("hidden");
    }

    async function sendSecurityOtp(sendBtn, statusEl, codeHost, input) {
      const local = normalizeLocal(input?.value);
      if (local.length !== 10) {
        setStatus(statusEl, "Enter a valid 10-digit mobile number.", "failed");
        return;
      }
      const phone = fullPhone(local);
      sendBtn.disabled = true;
      setStatus(statusEl, "Sending OTP…", "verifying");
      pwState = { status: "verifying", phoneLocal: local, phone };
      savePwState();
      try {
        const res = await fetch("/api/phone-otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ phone, purpose: "password_reset" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not send OTP");
        pwState = {
          phone,
          phoneLocal: local,
          providerSessionId: data.providerSessionId,
          status: "otp_sent",
          verificationToken: null,
        };
        savePwState();
        setStatus(statusEl, "OTP sent to your mobile.", "sent");
        if (codeHost) {
          codeHost.style.display = "";
          renderDigits(codeHost, (otp) =>
            verifySecurityOtp(otp, statusEl, sendBtn, codeHost, input)
          );
        }
      } catch (err) {
        pwState = { status: "failed" };
        savePwState();
        setStatus(statusEl, err.message || "Failed to send OTP", "failed");
        sendBtn.disabled = false;
      }
    }

    async function verifySecurityOtp(otp, statusEl, sendBtn, codeHost, input) {
      if (!pwState.providerSessionId || !pwState.phone) return;
      setStatus(statusEl, "Verifying…", "verifying");
      try {
        const res = await fetch("/api/phone-otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            phone: pwState.phone,
            otp,
            providerSessionId: pwState.providerSessionId,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");
        pwState.status = "verified";
        pwState.verificationToken = data.verificationToken;
        savePwState();
        setStatus(statusEl, "", "verified");
        if (codeHost) {
          codeHost.innerHTML = `<div class="infl-phone-otp-verified-badge">✓ Mobile Number Verified</div>`;
        }
        if (sendBtn) sendBtn.disabled = true;
        if (input) input.readOnly = true;
      } catch (err) {
        pwState.status = "failed";
        savePwState();
        clearOtpDigits(codeHost);
        setStatus(statusEl, err.message || "Incorrect code", "failed");
      }
    }

    function ensureSecurityPhoneOtp() {
      if (!isSecurityForgotVisible()) return;
      const input = document.getElementById("ias-sec-phone");
      const host = document.getElementById("ias-sec-phone-host");
      if (!input || !host || input.dataset.inflSecPhoneOtpWired === "1") return;
      if (host.querySelector(".infl-phone-otp-wrap")) return;

      input.dataset.inflSecPhoneOtpWired = "1";
      input.classList.add("infl-phone-local");
      const localDigits = normalizeLocal(input.value);
      if (localDigits) input.value = localDigits;

      const wrap = document.createElement("div");
      wrap.className = "infl-phone-otp-wrap infl-phone-otp-wrap--security";
      wrap.innerHTML = `
        <div class="infl-phone-otp-row">
          <span class="infl-phone-otp-prefix">+91</span>
        </div>
        <p data-otp-status class="infl-phone-otp-status"></p>
        <div data-otp-code class="infl-phone-otp-code-wrap" style="display:none"></div>`;

      const row = wrap.querySelector(".infl-phone-otp-row");
      row.appendChild(input);
      const sendBtn = document.createElement("button");
      sendBtn.type = "button";
      sendBtn.className = "infl-phone-otp-send";
      sendBtn.textContent = "Send OTP";
      row.appendChild(sendBtn);
      host.appendChild(wrap);

      const statusEl = wrap.querySelector("[data-otp-status]");
      const codeHost = wrap.querySelector("[data-otp-code]");
      sendBtn.addEventListener("click", () =>
        sendSecurityOtp(sendBtn, statusEl, codeHost, input)
      );

      if (pwState.status === "verified" && pwState.verificationToken) {
        codeHost.style.display = "";
        codeHost.innerHTML = `<div class="infl-phone-otp-verified-badge">✓ Mobile Number Verified</div>`;
        sendBtn.disabled = true;
        input.readOnly = true;
      }
    }

    function hookRegister() {
      if (window.__inflPhoneOtpRegisterHooked) return;
      window.__inflPhoneOtpRegisterHooked = true;
      const prev = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        const url = typeof input === "string" ? input : input?.url || "";
        let newInit = init;
        if (url.includes("/api/auth/register") && init?.body && typeof init.body === "string") {
          try {
            const body = JSON.parse(init.body);
            if (!isSignupPhoneVerified()) {
              return Promise.resolve(
                new Response(JSON.stringify({ error: OTP_MSG_COMPLETE }), {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                })
              );
            }
            const phone = getVerifiedSignupPhone();
            const token = getSignupVerificationToken();
            if (!phone || !token) {
              return Promise.resolve(
                new Response(JSON.stringify({ error: OTP_MSG_COMPLETE }), {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                })
              );
            }
            body.phone = phone;
            body.phoneVerificationToken = token;
            newInit = { ...init, body: JSON.stringify(body) };
            sessionStorage.removeItem(STATE_KEY);
            try {
              const draft = loadInfluencerDraft();
              delete draft.phoneVerificationToken;
              sessionStorage.setItem(INFLUENCER_DRAFT_KEY, JSON.stringify(draft));
            } catch {
              /* ignore */
            }
          } catch {
            /* keep */
          }
        }
        if (
          (url.includes("/api/influencer-profile/me") ||
            url.includes("/api/business-profile/me") ||
            url.includes("/api/auth/me")) &&
          init?.method === "PATCH" &&
          init?.body &&
          typeof init.body === "string"
        ) {
          try {
            const body = JSON.parse(init.body);
            if (
              body.phone != null &&
              state.verificationToken &&
              state.status === "verified" &&
              !state.fromProfile
            ) {
              body.phoneVerificationToken = state.verificationToken;
              newInit = { ...init, body: JSON.stringify(body) };
            }
          } catch {
            /* keep */
          }
        }
        return prev(input, newInit);
      };
    }

    function blockSignupWithoutVerify() {
      if (!isSignupPage() && !isLandingCreatorSignup()) return;
      document.addEventListener(
        "click",
        (e) => {
          const btn = e.target.closest("button");
          if (!btn) return;
          const label = (btn.textContent || "").trim().toLowerCase();
          const isComplete =
            label.includes("complete signup") ||
            label.includes("creating account") ||
            label.includes("complete registration") ||
            label.includes("create account");
          const isNext = label.includes("next step");
          if (!isComplete && !isNext) return;

          if (isComplete) {
            if (!isSignupPhoneVerified()) {
              e.preventDefault();
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("influnet-phone-otp-updated"));
            }
            return;
          }

          if (!shouldEnforcePhoneOnNextStep()) return;

          const input = findMobileInput();
          const phoneFieldVisible = input && input.offsetParent !== null;
          if (!phoneFieldVisible) return;

          const local = getSignupPhoneLocal();
          if (local.length === 10 && !isSignupPhoneVerified()) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const statusEl = document.querySelector("[data-otp-status]");
            setStatus(statusEl, OTP_MSG_CONTINUE, "failed");
            const card = document.querySelector("h2")?.closest(".max-w-lg");
            let box = card?.querySelector(".isd-form-error");
            if (!box && card) {
              const nav = card.querySelector(".flex.gap-3.mt-4");
              box = document.createElement("div");
              box.className =
                "isd-form-error flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mt-4";
              box.innerHTML = '<p class="text-xs text-red-400"></p>';
              if (nav) card.insertBefore(box, nav);
              else card.appendChild(box);
            }
            const p = box?.querySelector("p");
            if (p) p.textContent = "Tap Send OTP, enter the code, then continue.";
            if (box) box.hidden = false;
            document.querySelector(".infl-phone-otp-wrap")?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        },
        true
      );
    }

    restoreStateFromDraft();
    hookRegister();
    blockSignupWithoutVerify();
    setInterval(ensureUi, 800);
    window.addEventListener("load", () => {
      restoreStateFromDraft();
      ensureUi();
    });
    window.influnetEnsureSecurityPhoneOtp = ensureSecurityPhoneOtp;
    window.influnetSecurityPhoneOtp = {
      isVerified: () =>
        pwState.status === "verified" && !!pwState.verificationToken,
      getToken: () => pwState.verificationToken || null,
      getPhone: () => pwState.phone || null,
      reset: () => {
        pwState = {};
        sessionStorage.removeItem(PW_STATE_KEY);
      },
    };
    window.influnetPhoneOtpState = () => ({ ...state });
    window.influnetPhoneOtp = {
      isSignupVerified: isSignupPhoneVerified,
      getVerifiedPhone: getVerifiedSignupPhone,
      getVerificationToken: getSignupVerificationToken,
      getPhoneLocal: getSignupPhoneLocal,
    };
  } catch (e) {
    console.warn("[influnet] phone-otp-verification:", e);
  }
})();
