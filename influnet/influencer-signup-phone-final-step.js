/**
 * Influencer signup final step — reflect OTP verification state on Complete Signup.
 */
(function () {
  try {
    const OTP_WARN =
      "Verify your mobile number with OTP before completing signup.";

    function isSignupPage() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/influencer";
    }

    function isFinalStep() {
      if (!isSignupPage()) return false;
      const h2s = [...document.querySelectorAll("h2")].map((h) => h.textContent.trim());
      if (h2s.some((t) => /collaboration|preferences/i.test(t))) return true;
      return !!document.querySelector("p.text-\\[10px\\].font-bold.uppercase")?.textContent
        ?.includes("Typical Price Range");
    }

    function isVerified() {
      return !!window.influnetPhoneOtp?.isSignupVerified?.();
    }

    function findCompleteBtn() {
      return [...document.querySelectorAll("button")].find((b) =>
        (b.textContent || "").includes("Complete Signup")
      );
    }

    function findBtnRow() {
      const btn = findCompleteBtn();
      return btn?.closest(".flex.gap-3") || btn?.parentElement;
    }

    function hideStaleOtpErrors() {
      document.querySelectorAll("p.text-xs.text-red-400, p.text-red-400").forEach((p) => {
        const text = (p.textContent || "").trim();
        if (!text.includes("Verify your mobile number with OTP")) return;
        const box = p.closest("div")?.parentElement?.closest("div") || p.parentElement;
        if (!box) return;
        if (isVerified()) {
          box.style.display = "none";
          box.setAttribute("data-infl-otp-stale-hidden", "1");
        } else if (box.getAttribute("data-infl-otp-stale-hidden") === "1") {
          box.style.display = "";
          box.removeAttribute("data-infl-otp-stale-hidden");
        }
      });
    }

    function ensureVerifiedBanner(row) {
      let el = document.getElementById("infl-signup-phone-verified-final");
      if (!el) {
        el = document.createElement("div");
        el.id = "infl-signup-phone-verified-final";
        el.className = "infl-signup-phone-verified-final";
        el.innerHTML = `
          <span class="infl-signup-phone-verified-final__icon" aria-hidden="true">✓</span>
          <div>
            <p class="infl-signup-phone-verified-final__title">Mobile verified</p>
            <p class="infl-signup-phone-verified-final__sub">This number has been successfully verified.</p>
          </div>`;
        row.parentNode.insertBefore(el, row);
      }
      document.getElementById("infl-signup-phone-warn-final")?.remove();
    }

    function ensureWarnBanner(row) {
      let el = document.getElementById("infl-signup-phone-warn-final");
      if (!el) {
        el = document.createElement("div");
        el.id = "infl-signup-phone-warn-final";
        el.className = "infl-signup-phone-warn-final";
        el.innerHTML = `<span aria-hidden="true">⚠</span><p class="infl-signup-phone-warn-final__text">${OTP_WARN}</p>`;
        row.parentNode.insertBefore(el, row);
      }
      document.getElementById("infl-signup-phone-verified-final")?.remove();
    }

    function syncCompleteButton(verified) {
      const btn = findCompleteBtn();
      if (!btn) return;
      if (verified) {
        btn.disabled = false;
        btn.removeAttribute("aria-disabled");
        btn.classList.remove("infl-signup-complete--blocked");
      } else {
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
        btn.classList.add("infl-signup-complete--blocked");
      }
    }

    function sync() {
      if (!isFinalStep()) {
        document.getElementById("infl-signup-phone-verified-final")?.remove();
        document.getElementById("infl-signup-phone-warn-final")?.remove();
        return;
      }

      const verified = isVerified();
      const row = findBtnRow();
      if (!row) return;

      hideStaleOtpErrors();

      if (verified) {
        ensureVerifiedBanner(row);
      } else {
        ensureWarnBanner(row);
      }
      syncCompleteButton(verified);
    }

    window.addEventListener("influnet-phone-otp-updated", sync);
    setInterval(sync, 500);
    window.addEventListener("load", sync);
    sync();
  } catch (e) {
    console.warn("[influnet] signup phone final step:", e);
  }
})();
