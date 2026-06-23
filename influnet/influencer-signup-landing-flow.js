/**
 * Influencer signup — hide 4-step wizard chrome on /signup/influencer?from=landing.
 */
(function () {
  try {
    const DRAFT_KEY = "influnet_influencer_signup_draft";

    function isInfluencerSignup() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/influencer";
    }

    function isLandingFinish() {
      return (
        isInfluencerSignup() &&
        new URLSearchParams(window.location.search).get("from") === "landing"
      );
    }

    function readDraft() {
      try {
        return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
      } catch {
        return {};
      }
    }

    function isAccountStep() {
      return [...document.querySelectorAll("h2")].some((h) =>
        /create your influencer account|complete your registration/i.test(h.textContent.trim())
      );
    }

    function findWizardHeader() {
      return [...document.querySelectorAll("div.mb-8")].find((block) =>
        /STEP \d+ OF 4|FINAL STEP/i.test(block.textContent || "")
      );
    }

    function simplifyWizardUI() {
      if (!isLandingFinish()) return;
      document.documentElement.classList.add("infl-landing-signup-flow");

      const header = findWizardHeader();
      if (header) {
        header.classList.add("infl-wizard-progress--hidden");
      }

      document.querySelectorAll("h2").forEach((h) => {
        if (/create your influencer account/i.test(h.textContent.trim())) {
          h.textContent = "Complete your registration";
        }
      });

      const sub = document.querySelector("h2 + p.text-sm");
      if (sub?.textContent?.includes("Start your journey")) {
        sub.textContent = "Verify your mobile number to finish creating your account.";
      }

      document.querySelectorAll("button").forEach((btn) => {
        const text = (btn.textContent || "").replace(/\s+/g, " ").trim();
        if (/^Next Step/i.test(text)) {
          btn.textContent = "Complete registration";
        }
      });
    }

    function showError(msg) {
      const card = document
        .querySelector("h2")
        ?.closest(".max-w-xl, .max-w-lg, .rounded-2xl, [class*='rounded-2xl']");
      let box = card?.querySelector(".infl-landing-reg-error");
      if (!box && card && msg) {
        box = document.createElement("div");
        box.className =
          "infl-landing-reg-error flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mt-4";
        box.innerHTML = '<p class="text-xs text-red-400"></p>';
        const nav = card.querySelector(".flex.gap-3.mt-4, .flex.gap-3");
        if (nav) card.insertBefore(box, nav);
        else card.appendChild(box);
      }
      const p = box?.querySelector("p");
      if (p) p.textContent = msg || "";
      if (box) box.hidden = !msg;
    }

    async function submitRegistration(btn) {
      window.influnetSignupStep1?.syncFieldsToReact?.();
      const fail = window.influnetSignupStep1?.validateStep1?.();
      if (fail) {
        showError(fail.err);
        if (fail.el) fail.el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      showError("");

      const draft = { ...readDraft(), role: "influencer" };
      const otp = window.influnetPhoneOtp;
      if (otp?.isSignupVerified?.()) {
        draft.phoneVerificationToken =
          otp.getVerificationToken?.() || draft.phoneVerificationToken;
        draft.phone = otp.getVerifiedPhone?.() || draft.phone;
        draft.phoneLocal = otp.getPhoneLocal?.() || draft.phoneLocal;
        draft.phoneVerified = true;
      }

      const username =
        window.influnetSignupUsername?.getValue?.() ||
        document.getElementById("infl-signup-username-input")?.value?.trim().toLowerCase();
      if (username) draft.username = username;

      const first = document.querySelector('input[placeholder="First name"]')?.value?.trim();
      const last = document.querySelector('input[placeholder="Last name"]')?.value?.trim();
      if (first || last) draft.name = `${first || ""} ${last || ""}`.trim();
      draft.email =
        document.querySelector('input[type="email"]')?.value?.trim().toLowerCase() ||
        draft.email;
      draft.password =
        document.querySelector('input[placeholder="Create a strong password"]')?.value ||
        draft.password;

      btn.disabled = true;
      btn.textContent = "Creating account…";
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(draft),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Registration failed. Try again.");
        }
      } catch (err) {
        showError(err.message || "Registration failed.");
        btn.disabled = false;
        btn.textContent = "Complete registration";
      }
    }

    function wireCompleteRegistration() {
      if (window.__inflLandingSignupCompleteWired) return;
      window.__inflLandingSignupCompleteWired = true;

      document.addEventListener(
        "click",
        (e) => {
          if (!isLandingFinish() || !isAccountStep()) return;
          const btn = e.target.closest("button");
          if (!btn) return;
          const text = (btn.textContent || "").replace(/\s+/g, " ").trim();
          if (!/^Complete registration/i.test(text) && !/^Next Step/i.test(text)) return;

          e.preventDefault();
          e.stopImmediatePropagation();
          submitRegistration(btn);
        },
        true
      );
    }

    function guardWizardSteps() {
      if (!isLandingFinish() || isAccountStep()) return;
      const titles = [...document.querySelectorAll("h2")].map((h) => h.textContent.trim());
      if (
        titles.some((t) => t === "Profile Details") ||
        titles.some((t) => /creator & social/i.test(t)) ||
        titles.some((t) => /collaboration preferences/i.test(t))
      ) {
        window.location.replace("/signup/influencer?from=landing&step=verify-phone");
      }
    }

    function tick() {
      if (!isInfluencerSignup()) return;
      if (isLandingFinish()) {
        simplifyWizardUI();
        guardWizardSteps();
      }
    }

    wireCompleteRegistration();
    tick();
    setInterval(tick, 300);
    window.addEventListener("load", tick);

    const obs = new MutationObserver(tick);
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    console.warn("[influnet] landing signup flow:", e);
  }
})();
