/**
 * Signup wizard progress — show % completed steps, not current step position.
 * Step 1 = 0%, step 2 = 25%, step 3 = 50%, step 4 = 75%.
 */
(function () {
  try {
    function isSignupPage() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path === "/signup/business") return true;
      if (path === "/signup/influencer") {
        return new URLSearchParams(window.location.search).get("from") !== "landing";
      }
      return false;
    }

    function parseStep(block) {
      const spans = [...block.querySelectorAll("span")];
      const stepSpan = spans.find((s) => /STEP \d+ OF 4/i.test(s.textContent || ""));
      if (stepSpan) {
        const m = stepSpan.textContent.match(/STEP (\d+) OF 4/i);
        if (m) return Number(m[1]);
      }
      if (spans.some((s) => s.textContent?.trim() === "FINAL STEP")) return 4;
      return null;
    }

    function expectedPercent(step) {
      return Math.round(((step - 1) / 4) * 100);
    }

    function sync() {
      if (!isSignupPage()) return;
      document.querySelectorAll(".mb-8").forEach((block) => {
        const step = parseStep(block);
        if (!step) return;
        const pct = expectedPercent(step);
        const pctSpan = [...block.querySelectorAll("span")].find((s) =>
          /^\d+% Complete$/i.test((s.textContent || "").trim())
        );
        if (pctSpan && pctSpan.textContent !== `${pct}% Complete`) {
          pctSpan.textContent = `${pct}% Complete`;
        }
        const fill = block.querySelector(".overflow-hidden > div");
        if (fill && fill.style.width !== `${pct}%`) {
          fill.style.width = `${pct}%`;
        }
      });
    }

    sync();
    setInterval(sync, 400);
    window.addEventListener("load", sync);
  } catch (e) {
    console.warn("[influnet] signup progress:", e);
  }
})();
