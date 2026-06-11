/**
 * Business signup: pending-review confirmation after registration.
 * Hooks register API + shows overlay on /signup/business?review=pending
 */
(function () {
  const OVERLAY_ID = "influnet-business-review-complete";
  const PENDING_KEY = "influnet_business_pending_review";
  const MESSAGE =
    "Your account information has been saved. We will review your account and send you a confirmation.";

  function clearAuth() {
    localStorage.removeItem("influnet_token");
    localStorage.removeItem("influnet_refresh_token");
    localStorage.removeItem("influnet_user");
  }

  function goToReviewScreen() {
    clearAuth();
    try {
      sessionStorage.setItem(PENDING_KEY, "1");
    } catch {
      /* ignore */
    }
    const target = "/signup/business?review=pending";
    if (window.location.pathname.replace(/\/$/, "") === "/signup/business") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("review") === "pending") {
        render();
        return;
      }
    }
    window.location.replace(target);
  }

  function hookRegisterResponse() {
    if (window.__inflBusinessReviewFetchHook) return;
    window.__inflBusinessReviewFetchHook = true;
    const prev = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      const res = await prev(input, init);
      const url = typeof input === "string" ? input : input?.url || "";
      const method = (init?.method || "GET").toUpperCase();
      if (url.includes("/api/auth/register") && method === "POST") {
        try {
          const data = await res.clone().json();
          if (data?.pendingReview) {
            goToReviewScreen();
          }
        } catch {
          /* ignore */
        }
      }
      return res;
    };
  }

  function isReviewComplete() {
    const path = window.location.pathname.replace(/\/$/, "");
    const params = new URLSearchParams(window.location.search);
    return path === "/signup/business" && params.get("review") === "pending";
  }

  function iconSvg() {
    return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
  }

  function render() {
    if (!isReviewComplete()) return;
    if (document.getElementById(OVERLAY_ID)) return;

    clearAuth();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "brc-title");
    overlay.innerHTML = `
      <div class="brc-card">
        <div class="brc-icon">${iconSvg()}</div>
        <h2 class="brc-title" id="brc-title">Application Submitted</h2>
        <p class="brc-message">${MESSAGE}</p>
        <div class="brc-actions">
          <a href="/login" class="brc-btn brc-btn-primary" data-testid="business-review-login">Sign in with email &amp; password</a>
          <a href="/" class="brc-btn brc-btn-outline" data-testid="business-review-home">Back to home</a>
        </div>
        <p class="brc-note">You can sign in anytime with the email and password you registered.</p>
      </div>`;

    document.body.appendChild(overlay);
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      /* ignore */
    }
  }

  function blockDashboardAfterPendingSignup() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (path !== "/dashboard") return;
    try {
      if (sessionStorage.getItem(PENDING_KEY) === "1") {
        goToReviewScreen();
      }
    } catch {
      /* ignore */
    }
  }

  hookRegisterResponse();
  blockDashboardAfterPendingSignup();

  const obs = new MutationObserver(() => {
    render();
    blockDashboardAfterPendingSignup();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      render();
      blockDashboardAfterPendingSignup();
    });
  } else {
    render();
    blockDashboardAfterPendingSignup();
  }
})();