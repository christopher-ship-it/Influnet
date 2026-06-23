/**
 * Premium signup → dashboard transition canvas (Step 1 complete → Step 2 gate).
 * Boots immediately when pending so the dashboard never flashes through.
 */
(function () {
  "use strict";

  const LOADER_ID = "onboarding-loader-screen";
  const STYLE_ID = "infl-onboarding-transition-style";
  const PENDING_KEY = "influnet_onboarding_transition_pending";
  const DEFAULT_DURATION_MS = 2000;
  const FADE_MS = 500;

  let transitionPromise = null;

  const TRANSITION_CSS = `
#${LOADER_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #090d16;
  opacity: 0;
  pointer-events: auto;
  transition: opacity ${FADE_MS}ms ease;
}
#${LOADER_ID}.is-visible { opacity: 1; }
#${LOADER_ID}.is-immediate { opacity: 1; }
#${LOADER_ID}.is-hiding { opacity: 0; pointer-events: none; }
.infl-obt-inner {
  text-align: center;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  transform: translateY(8px);
  opacity: 0;
  transition: opacity 600ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
}
#${LOADER_ID}.is-visible .infl-obt-inner,
#${LOADER_ID}.is-immediate .infl-obt-inner {
  opacity: 1;
  transform: translateY(0);
}
#${LOADER_ID}.is-hiding .infl-obt-inner {
  opacity: 0;
  transform: translateY(-6px);
}
.infl-obt-loader-wrap { display: flex; justify-content: center; }
.infl-obt-spinner {
  width: 3rem;
  height: 3rem;
  color: #ee3e96;
  animation: infl-obt-spin 0.85s linear infinite;
}
.infl-obt-ring {
  position: relative;
  width: 3.25rem;
  height: 3.25rem;
}
.infl-obt-ring::before {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 999px;
  border: 2px solid rgba(238, 62, 150, 0.18);
  animation: infl-obt-pulse 1.6s ease-in-out infinite;
}
@keyframes infl-obt-spin { to { transform: rotate(360deg); } }
@keyframes infl-obt-pulse {
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50% { transform: scale(1.08); opacity: 1; }
}
.infl-obt-title {
  margin: 0;
  font-family: "Inter", "Plus Jakarta Sans", system-ui, sans-serif;
  font-size: clamp(1.125rem, 2.5vw, 1.5rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.45;
  color: #fff;
}
.infl-obt-sub {
  margin: 0;
  font-family: "Inter", "Plus Jakarta Sans", system-ui, sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #94a3b8;
}
html.infl-obt-pending,
html.infl-obt-pending body,
body.infl-onboarding-transition-active {
  overflow: hidden !important;
  background: #090d16 !important;
}
html.infl-obt-pending #root,
html.infl-obt-pending .flex.h-screen,
body.infl-onboarding-transition-active #root,
body.infl-onboarding-transition-active .flex.h-screen {
  display: none !important;
}
`;

  const LOADER_HTML = `
<div class="infl-obt-inner">
  <div class="infl-obt-loader-wrap">
    <div class="infl-obt-ring" aria-hidden="true">
      <svg class="infl-obt-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle>
        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.85"></path>
      </svg>
    </div>
  </div>
  <h2 class="infl-obt-title">
    We need a few pieces of information to set up your profile
  </h2>
  <p class="infl-obt-sub">Preparing your dynamic Influnet creator workspace…</p>
</div>`;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = TRANSITION_CSS;
    document.head.appendChild(style);
  }

  function shouldShowOnboardingTransition() {
    try {
      return sessionStorage.getItem(PENDING_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function markOnboardingTransitionPending() {
    try {
      sessionStorage.setItem(PENDING_KEY, "1");
      document.documentElement.classList.add("infl-obt-pending");
    } catch (_) {}
  }

  function clearOnboardingTransitionPending() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {}
    document.documentElement.classList.remove("infl-obt-pending");
  }

  function isTransitionVisible() {
    const el = document.getElementById(LOADER_ID);
    return !!el && (el.classList.contains("is-visible") || el.classList.contains("is-immediate")) && !el.classList.contains("is-hiding");
  }

  function mountLoader(immediate) {
    if (!document.body) return null;
    ensureStyle();
    let el = document.getElementById(LOADER_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = LOADER_ID;
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.setAttribute("aria-label", "Setting up your creator profile");
      el.innerHTML = LOADER_HTML;
      document.body.appendChild(el);
    }
    el.classList.remove("is-hiding");
    document.documentElement.classList.add("infl-obt-pending");
    document.body?.classList.add("infl-onboarding-transition-active");
    if (immediate) {
      el.classList.add("is-immediate");
    }
    return el;
  }

  /**
   * @param {{ durationMs?: number, immediate?: boolean }} [options]
   * @returns {Promise<void>}
   */
  function showOnboardingTransition(options) {
    if (transitionPromise) return transitionPromise;

    const durationMs = Math.max(800, Number(options?.durationMs) || DEFAULT_DURATION_MS);
    const immediate = options?.immediate !== false;

    transitionPromise = new Promise((resolve) => {
      const run = () => {
        const el = mountLoader(immediate);
        if (!el) {
          document.addEventListener("DOMContentLoaded", run, { once: true });
          return;
        }

        const reveal = () => {
          if (!el.classList.contains("is-immediate")) {
            el.classList.add("is-visible");
          }
        };

        if (immediate) {
          requestAnimationFrame(reveal);
        } else {
          requestAnimationFrame(() => requestAnimationFrame(reveal));
        }

        window.setTimeout(() => {
          el.classList.add("is-hiding");
          el.classList.remove("is-visible", "is-immediate");
          window.setTimeout(() => {
            el.remove();
            document.body?.classList.remove("infl-onboarding-transition-active");
            clearOnboardingTransitionPending();
            transitionPromise = null;
            window.influnetOnboardingTransitionPromise = null;
            resolve();
          }, FADE_MS);
        }, durationMs);
      };
      run();
    });

    window.influnetOnboardingTransitionPromise = transitionPromise;
    return transitionPromise;
  }

  function bootEarlyIfPending() {
    if (!shouldShowOnboardingTransition()) return;
    if (transitionPromise) return;
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", bootEarlyIfPending, { once: true });
      return;
    }
    showOnboardingTransition({ durationMs: DEFAULT_DURATION_MS, immediate: true });
  }

  window.influnetShowOnboardingTransition = showOnboardingTransition;
  window.influnetShouldShowOnboardingTransition = shouldShowOnboardingTransition;
  window.influnetMarkOnboardingTransitionPending = markOnboardingTransitionPending;
  window.influnetClearOnboardingTransitionPending = clearOnboardingTransitionPending;
  window.influnetIsOnboardingTransitionVisible = isTransitionVisible;

  bootEarlyIfPending();
})();
