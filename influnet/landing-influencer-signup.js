/**
 * Landing page — Step 1 influencer account creation (moved from 4-step wizard).
 */
(function () {
  try {
    const SECTION_ID = "infl-landing-creator-signup";
    const DRAFT_KEY = "influnet_influencer_signup_draft";

    function esc(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    }

    function isHome() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/";
    }

    function buildSection() {
      const section = document.createElement("section");
      section.id = SECTION_ID;
      section.className = "infl-landing-signup";
      section.innerHTML = `
        <div class="infl-landing-signup-inner">
          <div class="infl-landing-signup-copy">
            <p class="infl-landing-signup-eyebrow">For Creators</p>
            <h2>Create your Influnet account</h2>
            <p class="infl-landing-signup-lead">
              Start in under a minute. Complete your profile, socials, and collaboration preferences from your dashboard — on your schedule.
            </p>
          </div>
          <form class="infl-landing-signup-form" id="infl-landing-signup-form" novalidate>
            <div class="infl-landing-signup-row">
              <label><span>First name</span><input name="firstName" required autocomplete="given-name" /></label>
              <label><span>Last name</span><input name="lastName" required autocomplete="family-name" /></label>
            </div>
            <label><span>Email</span><input name="email" type="email" required autocomplete="email" placeholder="you@example.com" /></label>
            <label class="infl-landing-signup-phone"><span>Mobile</span><input name="phone" type="tel" required autocomplete="tel" placeholder="98765 43210" /></label>
            <label><span>Influnet username</span><input name="username" required autocomplete="username" placeholder="priya.creates" pattern="[a-z0-9._]{3,30}" /></label>
            <label><span>Password</span><input name="password" type="password" required autocomplete="new-password" minlength="6" placeholder="At least 6 characters" /></label>
            <p class="infl-landing-signup-note">Tap <strong>Send OTP</strong>, enter the code, then create your account.</p>
            <p class="infl-landing-signup-error" id="infl-landing-signup-error" hidden></p>
            <button type="submit" class="infl-landing-signup-submit">Create account &amp; open dashboard</button>
            <p class="infl-landing-signup-alt">Already have an account? <a href="/login?next=/dashboard/influencer">Sign in</a></p>
          </form>
        </div>`;
      return section;
    }

    function inject() {
      if (!isHome()) return;
      if (document.getElementById(SECTION_ID)) return;
      const cta = document.getElementById("influnet-landing-cta");
      const anchor = cta?.parentElement || document.querySelector("footer")?.parentElement;
      if (!anchor) return;
      const section = buildSection();
      if (cta) cta.before(section);
      else anchor.appendChild(section);
      wireForm(section);
      if (window.location.hash === "#creator-signup") {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    async function checkUsername(username) {
      const res = await fetch(
        `/api/influencer-profile/username/check?username=${encodeURIComponent(username)}`,
        { credentials: "same-origin" }
      );
      return res.json().catch(() => ({}));
    }

    function wireForm(section) {
      const form = section.querySelector("#infl-landing-signup-form");
      if (!form || form.dataset.inflWired) return;
      form.dataset.inflWired = "1";
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const errEl = section.querySelector("#infl-landing-signup-error");
        const btn = form.querySelector('button[type="submit"]');
        if (errEl) errEl.hidden = true;
        const fd = new FormData(form);
        const firstName = String(fd.get("firstName") || "").trim();
        const lastName = String(fd.get("lastName") || "").trim();
        const email = String(fd.get("email") || "").trim().toLowerCase();
        const phone = String(fd.get("phone") || "").trim();
        const username = String(fd.get("username") || "").trim().toLowerCase();
        const password = String(fd.get("password") || "");
        if (!firstName || !lastName || !email || !phone || !username || password.length < 6) {
          if (errEl) {
            errEl.hidden = false;
            errEl.textContent = "Please fill in all fields with a valid password.";
          }
          return;
        }
        if (!window.influnetPhoneOtp?.isSignupVerified?.()) {
          if (errEl) {
            errEl.hidden = false;
            errEl.textContent = "Verify your mobile number with OTP before continuing.";
          }
          document.querySelector("#infl-landing-creator-signup .infl-phone-otp-wrap")?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          return;
        }
        btn.disabled = true;
        try {
          const avail = await checkUsername(username);
          if (avail.available === false) {
            throw new Error(avail.error || "Username already taken.");
          }
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
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || "Could not create account.");
          }
          sessionStorage.removeItem(DRAFT_KEY);
          sessionStorage.removeItem("influnet_progressive_onboarding_dismissed");
          localStorage.setItem("influnet_needs_progressive_setup", "1");
          try {
            sessionStorage.setItem("influnet_onboarding_transition_pending", "1");
          } catch (_) {}
          window.location.href = "/dashboard/influencer";
        } catch (err) {
          if (errEl) {
            errEl.hidden = false;
            errEl.textContent = err.message || "Could not continue signup.";
          }
        } finally {
          btn.disabled = false;
        }
      });
    }

    inject();
    window.addEventListener("load", inject);
    const obs = new MutationObserver(inject);
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    console.warn("[influnet] landing influencer signup:", e);
  }
})();
