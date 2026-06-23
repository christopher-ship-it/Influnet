/**
 * Load influencer dashboard scripts only on /dashboard/influencer.
 */
(function () {
  const HOME = "/influencer-dashboard-home.js?v=48";
  const CLEANUP = "/influencer-dashboard-cleanup.js?v=6";
  const SIDEBAR_BADGES = "/influencer-sidebar-badges.js?v=1";
  const MSG_GUARD = "/business-dashboard-messages-guard.js?v=7";
  const COLLAB_FLOW = "/collab-flow-bridge.js?v=3";
  const PRESENCE = "/messages-presence-bridge.js?v=6";
  const PROJECTS = "/projects-workspace.js?v=12";
  const PROGRESSIVE_ONBOARDING = "/influencer-progressive-onboarding.js?v=50";
  const ONBOARDING_TRANSITION = "/influnet-onboarding-transition.js?v=2";
  const ONBOARDING_GATE = "/influnet-onboarding-gate.js?v=1";

  function isInfluencerDashboard() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return (
      path === "/dashboard/influencer" ||
      path === "/dashboard/settings" ||
      path === "/dashboard/profile"
    );
  }

  function isTransitionPending() {
    try {
      return sessionStorage.getItem("influnet_onboarding_transition_pending") === "1";
    } catch (_) {
      return false;
    }
  }

  function syncDashboardFontClass() {
    const on = isInfluencerDashboard();
    document.body.classList.toggle("infl-influencer-dashboard", on);
    if (on) document.body.classList.remove("infl-business-dashboard");
    if (!on) document.body.classList.remove("infl-influencer-dashboard");
  }

  function loadOnce(src, onReady) {
    const base = src.split("?")[0];
    const ver = (src.match(/\?v=(\d+)/) || [])[1] || "0";
    const existing = document.querySelector(`script[data-infl-src="${base}"]`);
    if (existing) {
      if (existing.getAttribute("data-infl-ver") === ver) {
        if (onReady) onReady();
        return;
      }
      existing.remove();
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.setAttribute("data-infl-src", base);
    el.setAttribute("data-infl-ver", ver);
    if (onReady) {
      el.addEventListener("load", onReady, { once: true });
    }
    document.body.appendChild(el);
  }

  function loadTransitionThen(onReady) {
    if (window.influnetShowOnboardingTransition) {
      onReady();
      return;
    }
    loadOnce(ONBOARDING_TRANSITION, onReady);
  }

  function bootDashboardScripts() {
    loadOnce(CLEANUP);
    loadOnce(SIDEBAR_BADGES);
    loadOnce(MSG_GUARD);
    loadOnce(HOME);
    loadOnce(COLLAB_FLOW);
    loadOnce(PRESENCE);
    loadOnce(PROJECTS);
    loadOnce(ONBOARDING_GATE);
    loadOnce(PROGRESSIVE_ONBOARDING, () => {
      const tryOpen = async () => {
        if (typeof window.influnetEnsureOnboardingGate === "function") {
          await window.influnetEnsureOnboardingGate();
        }
        if (window.influnetIsOnboardingCompleted?.()) return;
        window.influnetOpenProgressiveOnboarding?.();
      };
      if (window.influnetOnboardingTransitionPromise) {
        window.influnetOnboardingTransitionPromise.finally(() => tryOpen());
      } else {
        tryOpen();
      }
    });
  }

  function boot() {
    syncDashboardFontClass();
    if (!isInfluencerDashboard()) return;

    if (isTransitionPending()) {
      loadTransitionThen(bootDashboardScripts);
      return;
    }

    loadOnce(ONBOARDING_TRANSITION);
    bootDashboardScripts();
  }

  boot();
  window.addEventListener("popstate", boot);
  window.addEventListener("load", boot);

  const push = history.pushState.bind(history);
  history.pushState = function () {
    const r = push.apply(history, arguments);
    boot();
    return r;
  };
  const replace = history.replaceState.bind(history);
  history.replaceState = function () {
    const r = replace.apply(history, arguments);
    boot();
    return r;
  };

  setInterval(boot, 2000);
})();
