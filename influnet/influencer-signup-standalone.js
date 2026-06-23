/**
 * Standalone influencer signup — Step 1 (Account) at /signup/influencer.
 * Premium dark layout with progress stepper, username engine, and gated submit.
 */
(function () {
  try {
    const ROOT_ID = "infl-signup-standalone-root";
    const FORM_ID = "infl-signup-standalone-form";
    const DRAFT_KEY = "influnet_influencer_signup_draft";
    const USERNAME_CHECK_MS = 500;
    /** Letters only — no numbers or special characters (3–30). */
    const USERNAME_RE = /^[a-z]{3,30}$/;

    let checkTimer = 0;
    let checkSeq = 0;
    let isUsernameAvailable = false;
    let usernameState = "idle"; // idle | checking | ok | err | invalid

    function esc(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    }

    function isStandaloneRoute() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path !== "/signup/influencer") return false;
      if (new URLSearchParams(window.location.search).get("from") === "landing") {
        return false;
      }
      return true;
    }

    function sanitizeUsernameInput(raw) {
      let v = String(raw || "").trim().toLowerCase();
      v = v.replace(/^@+/, "");
      v = v.replace(/^https?:\/\/(www\.)?influnet\.io\/?/i, "");
      v = v.replace(/^https?:\/\/(www\.)?influnet\.com\/?/i, "");
      v = v.replace(/^influnet\.com\/?/i, "");
      v = v.replace(/^influnet\/?/i, "");
      v = v.replace(/[^a-z]/g, "");
      return v.slice(0, 30);
    }

    function eyeSvg() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }

    function eyeOffSvg() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    }

    function lockSvg() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    }

    function buildPage() {
      const root = document.createElement("div");
      root.id = ROOT_ID;
      root.className = "infl-signup-standalone";
      root.innerHTML = `
        <div class="infl-signup-standalone-shell">
          <div class="infl-signup-standalone-step-nav" aria-label="Signup progress">
            <span class="infl-signup-standalone-step-name">Account</span>
            <span class="infl-signup-standalone-step-line" aria-hidden="true"></span>
          </div>
          <div class="infl-signup-standalone-card">
            <header class="infl-signup-standalone-head">
              <h1>Create your Influencer Account</h1>
              <p>Start your journey on Influnet</p>
            </header>
            <form id="${FORM_ID}" class="infl-signup-standalone-form" novalidate>
              <div class="infl-signup-standalone-grid">
                <label class="infl-signup-standalone-field">
                  <span>First name</span>
                  <input name="firstName" required autocomplete="given-name" />
                </label>
                <label class="infl-signup-standalone-field">
                  <span>Last name</span>
                  <input name="lastName" required autocomplete="family-name" />
                </label>
              </div>
              <div class="infl-signup-standalone-field">
                <span>Choose your Influnet name</span>
                <div class="infl-signup-standalone-handle-wrap">
                  <span class="infl-signup-standalone-handle-prefix" aria-hidden="true">influnet/</span>
                  <input
                    id="infl-signup-standalone-username"
                    name="username"
                    required
                    autocomplete="username"
                    placeholder="priya"
                    autocapitalize="none"
                    spellcheck="false"
                    inputmode="text"
                  />
                </div>
                <p id="username-status-feedback" hidden></p>
              </div>
              <div class="infl-signup-standalone-field">
                <span>Email address</span>
                <input
                  id="infl-signup-standalone-email"
                  name="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="you@example.com"
                  spellcheck="false"
                />
                <p id="email-status-feedback" hidden></p>
              </div>
              <label class="infl-signup-standalone-field infl-signup-standalone-phone">
                <span>Phone number</span>
                <input name="phone" type="tel" required autocomplete="tel" placeholder="+91 98765 43210" />
              </label>
              <label class="infl-signup-standalone-field infl-signup-standalone-password">
                <span>Password</span>
                <input
                  id="infl-signup-standalone-password"
                  name="password"
                  type="password"
                  required
                  autocomplete="new-password"
                  minlength="6"
                  placeholder="Create a strong password"
                />
                <button type="button" class="infl-signup-standalone-password-toggle" id="infl-signup-standalone-password-toggle" aria-label="Show password">
                  ${eyeSvg()}
                </button>
              </label>
              <p class="infl-signup-standalone-note">
                ${lockSvg()}
                Your data is encrypted and never shared without consent.
              </p>
              <div class="infl-signup-standalone-legal">
                <label class="infl-signup-standalone-check">
                  <input type="checkbox" id="infl-signup-terms" name="termsAccepted" />
                  <span class="infl-signup-standalone-check-box" aria-hidden="true"></span>
                  <span class="infl-signup-standalone-check-text">
                    I agree to the Influnet <a href="/support" target="_blank" rel="noopener noreferrer">Terms and Conditions</a>
                  </span>
                </label>
                <label class="infl-signup-standalone-check">
                  <input type="checkbox" id="infl-signup-privacy" name="privacyAccepted" />
                  <span class="infl-signup-standalone-check-box" aria-hidden="true"></span>
                  <span class="infl-signup-standalone-check-text">
                    I agree to the <a href="/support" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                  </span>
                </label>
              </div>
              <p class="infl-signup-standalone-error" id="infl-signup-standalone-error" hidden></p>
              <div class="infl-signup-standalone-actions">
                <button type="submit" id="btn-submit" disabled>Complete Signup &gt;</button>
              </div>
            </form>
          </div>
        </div>`;
      return root;
    }

    function setUsernameStatus(kind, text) {
      const el = document.getElementById("username-status-feedback");
      if (!el) return;
      el.hidden = !text;
      el.className = "";
      if (kind === "checking") el.classList.add("is-checking");
      if (kind === "ok") el.classList.add("is-ok");
      if (kind === "err" || kind === "invalid") el.classList.add("is-err");
      el.textContent = text || "";
    }

    function phoneLocal(raw) {
      return String(raw || "").replace(/\D/g, "").slice(-10);
    }

    function sanitizeEmailInput(value) {
      return String(value || "").replace(/\s/g, "");
    }

    function setEmailStatus(kind, text) {
      const el = document.getElementById("email-status-feedback");
      if (!el) return;
      el.hidden = !text;
      el.className = "";
      if (kind === "ok") el.classList.add("is-ok");
      if (kind === "err" || kind === "invalid") el.classList.add("is-err");
      el.textContent = text || "";
    }

    function getEmailValidationMessage(value) {
      const raw = String(value || "");
      if (/\s/.test(raw)) {
        return "Email cannot contain spaces.";
      }

      const email = sanitizeEmailInput(raw).trim().toLowerCase();
      if (!email) return "";

      const parts = email.split("@");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return "Use a valid email format (name@domain.com).";
      }

      const local = parts[0];
      const domain = parts[1];
      if (!/^[a-z0-9._%+-]+$/.test(local)) {
        return "Use a valid email format (name@domain.com).";
      }

      if (
        !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) ||
        domain.startsWith(".") ||
        domain.endsWith(".") ||
        domain.includes("..")
      ) {
        return "Enter a valid domain (e.g. gmail.com).";
      }

      const tld = domain.split(".").pop() || "";
      if (!/^[a-z]{2,}$/.test(tld)) {
        return "Enter a valid domain extension (e.g. .com, .net).";
      }

      return "";
    }

    function isEmailValid(value) {
      const email = sanitizeEmailInput(value).trim();
      return !!email && !getEmailValidationMessage(value);
    }

    function refreshEmailStatus(value, { showWhenEmpty = false } = {}) {
      const email = sanitizeEmailInput(value).trim();
      if (!email && !showWhenEmpty) {
        setEmailStatus("", "");
        return;
      }
      const msg = getEmailValidationMessage(value);
      if (msg) {
        setEmailStatus("invalid", msg);
        return;
      }
      setEmailStatus("", "");
    }

    function checkFormValidity() {
      const form = document.getElementById(FORM_ID);
      const btn = document.getElementById("btn-submit");
      if (!form || !btn) return false;

      const firstName = String(form.firstName?.value || "").trim();
      const lastName = String(form.lastName?.value || "").trim();
      const email = String(form.email?.value || "").trim();
      const phone = String(form.phone?.value || "").trim();
      const password = String(form.password?.value || "");
      const termsOk = form.querySelector("#infl-signup-terms")?.checked === true;
      const privacyOk = form.querySelector("#infl-signup-privacy")?.checked === true;
      const phoneOk = phoneLocal(phone).length === 10;
      const otpOk =
        typeof window.influnetPhoneOtp?.isSignupVerified === "function"
          ? window.influnetPhoneOtp.isSignupVerified()
          : false;

      const valid =
        !!firstName &&
        !!lastName &&
        isEmailValid(email) &&
        phoneOk &&
        password.length >= 6 &&
        isUsernameAvailable &&
        usernameState !== "checking" &&
        termsOk &&
        privacyOk &&
        otpOk;

      btn.disabled = !valid;
      return valid;
    }

    async function checkUsernameAvailability(raw) {
      const u = sanitizeUsernameInput(raw);
      if (!u) {
        usernameState = "idle";
        isUsernameAvailable = false;
        setUsernameStatus("", "");
        checkFormValidity();
        return;
      }
      if (!USERNAME_RE.test(u)) {
        usernameState = "invalid";
        isUsernameAvailable = false;
        setUsernameStatus("invalid", "Use 3–30 lowercase letters only (no numbers or symbols).");
        checkFormValidity();
        return;
      }

      const seq = ++checkSeq;
      usernameState = "checking";
      isUsernameAvailable = false;
      setUsernameStatus("checking", "Checking availability…");
      checkFormValidity();

      try {
        const res = await fetch(
          `/api/influencer-profile/username/check?username=${encodeURIComponent(u)}`,
          { credentials: "same-origin" }
        );
        const data = await res.json().catch(() => ({}));
        if (seq !== checkSeq) return;

        if (data.available) {
          usernameState = "ok";
          isUsernameAvailable = true;
          setUsernameStatus("ok", "✓ This Influnet name is available");
        } else {
          usernameState = "err";
          isUsernameAvailable = false;
          setUsernameStatus("err", "✕ Name already taken. Try another");
        }
      } catch {
        if (seq !== checkSeq) return;
        usernameState = "err";
        isUsernameAvailable = false;
        setUsernameStatus("err", "Could not check availability. Try again.");
      }
      checkFormValidity();
    }

    function scheduleUsernameCheck(raw) {
      clearTimeout(checkTimer);
      checkTimer = window.setTimeout(() => checkUsernameAvailability(raw), USERNAME_CHECK_MS);
    }

    function saveDraft(payload) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch (_) {}
    }

    function showError(msg) {
      const el = document.getElementById("infl-signup-standalone-error");
      if (!el) return;
      el.hidden = !msg;
      el.textContent = msg || "";
    }

    function wireForm(root) {
      const form = root.querySelector(`#${FORM_ID}`);
      const usernameInput = root.querySelector("#infl-signup-standalone-username");
      const emailInput = root.querySelector("#infl-signup-standalone-email");
      const passwordInput = root.querySelector("#infl-signup-standalone-password");
      const toggleBtn = root.querySelector("#infl-signup-standalone-password-toggle");
      const submitBtn = root.querySelector("#btn-submit");

      const onFieldChange = () => checkFormValidity();

      form?.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", onFieldChange);
        input.addEventListener("change", onFieldChange);
      });

      usernameInput?.addEventListener("input", (e) => {
        const v = sanitizeUsernameInput(e.target.value);
        if (e.target.value !== v) e.target.value = v;
        scheduleUsernameCheck(v);
      });

      usernameInput?.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData)?.getData("text") || "";
        const v = sanitizeUsernameInput(pasted);
        usernameInput.value = v;
        scheduleUsernameCheck(v);
      });

      usernameInput?.addEventListener("blur", () => {
        checkUsernameAvailability(usernameInput.value);
      });

      emailInput?.addEventListener("input", (e) => {
        const v = sanitizeEmailInput(e.target.value);
        if (e.target.value !== v) e.target.value = v;
        refreshEmailStatus(v);
        checkFormValidity();
      });

      emailInput?.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData)?.getData("text") || "";
        const v = sanitizeEmailInput(pasted);
        emailInput.value = v;
        refreshEmailStatus(v);
        checkFormValidity();
      });

      emailInput?.addEventListener("blur", () => {
        refreshEmailStatus(emailInput.value, { showWhenEmpty: false });
      });

      toggleBtn?.addEventListener("click", () => {
        const show = passwordInput.type === "password";
        passwordInput.type = show ? "text" : "password";
        toggleBtn.innerHTML = show ? eyeOffSvg() : eyeSvg();
        toggleBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      });

      const otpPoll = window.setInterval(() => {
        if (!document.getElementById(ROOT_ID)) {
          window.clearInterval(otpPoll);
          return;
        }
        checkFormValidity();
      }, 700);

      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        showError("");

        if (!checkFormValidity()) {
          const emailMsg = getEmailValidationMessage(form.email?.value || "");
          if (emailMsg) {
            refreshEmailStatus(form.email?.value || "", { showWhenEmpty: true });
            showError(emailMsg);
            form.email?.focus();
            return;
          }
          showError("Please complete all fields and accept the terms to continue.");
          return;
        }

        const fd = new FormData(form);
        const firstName = String(fd.get("firstName") || "").trim();
        const lastName = String(fd.get("lastName") || "").trim();
        const email = sanitizeEmailInput(fd.get("email")).trim().toLowerCase();
        const emailMsg = getEmailValidationMessage(email);
        if (emailMsg) {
          refreshEmailStatus(email, { showWhenEmpty: true });
          showError(emailMsg);
          form.email?.focus();
          return;
        }
        const phone = String(fd.get("phone") || "").trim();
        const username = sanitizeUsernameInput(fd.get("username"));
        const password = String(fd.get("password") || "");

        if (!window.influnetPhoneOtp?.isSignupVerified?.()) {
          showError("Verify your mobile number with OTP before continuing.");
          root.querySelector(".infl-phone-otp-wrap")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          return;
        }

        submitBtn.disabled = true;
        try {
          const payload = {
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            email,
            phone: window.influnetPhoneOtp.getVerifiedPhone?.() || phone,
            phoneVerificationToken: window.influnetPhoneOtp.getVerificationToken?.(),
            username,
            password,
            role: "influencer",
          };

          saveDraft({
            ...payload,
            phoneVerified: true,
            phoneLocal: phoneLocal(phone),
            step1Complete: true,
          });

          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || "Could not create your account.");
          }

          sessionStorage.removeItem(DRAFT_KEY);
          sessionStorage.removeItem("influnet_progressive_onboarding_dismissed");
          localStorage.setItem("influnet_needs_progressive_setup", "1");
          if (typeof window.influnetMarkOnboardingTransitionPending === "function") {
            window.influnetMarkOnboardingTransitionPending();
          } else {
            try {
              sessionStorage.setItem("influnet_onboarding_transition_pending", "1");
            } catch (_) {}
          }
          window.location.href = "/dashboard/influencer";
        } catch (err) {
          showError(err.message || "Something went wrong. Please try again.");
        } finally {
          checkFormValidity();
        }
      });

      checkFormValidity();
    }

    function restoreDraft(root) {
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
        const form = root.querySelector(`#${FORM_ID}`);
        if (!form) return;
        if (draft.firstName) form.firstName.value = draft.firstName;
        if (draft.lastName) form.lastName.value = draft.lastName;
        if (draft.email) {
          form.email.value = sanitizeEmailInput(draft.email);
          refreshEmailStatus(form.email.value);
        }
        if (draft.username) {
          form.username.value = sanitizeUsernameInput(draft.username);
          scheduleUsernameCheck(form.username.value);
        }
        if (draft.phoneLocal) form.phone.value = draft.phoneLocal;
        else if (draft.phone) form.phone.value = draft.phone;
        checkFormValidity();
      } catch {
        /* ignore */
      }
    }

    function mount() {
      if (!isStandaloneRoute()) {
        document.documentElement.classList.remove("infl-signup-standalone-active");
        document.getElementById(ROOT_ID)?.remove();
        return;
      }

      if (!document.body) return;

      if (document.getElementById(ROOT_ID)) return;

      const root = buildPage();
      document.body.appendChild(root);
      document.documentElement.classList.add("infl-signup-standalone-active");
      document.title = "Create Influencer Account — Influnet";
      wireForm(root);
      restoreDraft(root);

      window.influnetSignupStandalone = {
        isActive: () => !!document.getElementById(ROOT_ID),
        checkFormValidity,
        recheckUsername: () => {
          const input = document.getElementById("infl-signup-standalone-username");
          if (input) checkUsernameAvailability(input.value);
        },
      };
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount);
    } else {
      mount();
    }
    window.addEventListener("load", mount);
    window.addEventListener("popstate", mount);

    const obs = new MutationObserver(() => {
      if (!document.body) return;
      window.requestAnimationFrame(mount);
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    console.warn("[influnet] signup standalone:", e);
  }
})();
