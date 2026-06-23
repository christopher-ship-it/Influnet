/**
 * Dashboard onboarding visibility gate — one-time progressive wizard.
 * Hydrates onboarding_completed from the API and blocks wizard re-mount when true.
 */
(function () {
  "use strict";

  const DASHBOARD_PATH = "/dashboard/influencer";
  const SETTINGS_PATHS = new Set(["/dashboard/settings", "/dashboard/profile"]);
  const OPEN_SETTINGS_KEY = "influnet_open_settings";
  const SUPPRESS_KEY = "influnet_progressive_onboarding_suppress_until";

  const state = { hydrated: false, completed: null, inflight: null };

  function normalizePath() {
    return window.location.pathname.replace(/\/$/, "") || "/";
  }

  function isInfluencerDashboardArea() {
    const path = normalizePath();
    return path === DASHBOARD_PATH || SETTINGS_PATHS.has(path);
  }

  function authHeaders() {
    const token = localStorage.getItem("influnet_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  function readStoredCompletion() {
    try {
      const user = JSON.parse(localStorage.getItem("influnet_user") || "null");
      return user?.onboardingCompleted === true;
    } catch (_) {
      return false;
    }
  }

  function applyGatePayload(data) {
    if (!data) return;
    const done =
      data.completion?.onboardingCompleted === true ||
      data.profile?.onboardingCompleted === true;
    state.completed = !!done;
    state.hydrated = true;
    if (done) {
      try {
        localStorage.removeItem("influnet_needs_progressive_setup");
      } catch (_) {}
    }
    try {
      const stored = JSON.parse(localStorage.getItem("influnet_user") || "{}");
      const profile = data.profile || {};
      localStorage.setItem(
        "influnet_user",
        JSON.stringify({
          ...stored,
          ...profile,
          onboardingCompleted: done,
        })
      );
    } catch (_) {}
    window.dispatchEvent(
      new CustomEvent("influnet-onboarding-gate-ready", {
        detail: { completed: state.completed },
      })
    );
  }

  async function hydrateGate() {
    if (!localStorage.getItem("influnet_token")) {
      state.hydrated = true;
      state.completed = false;
      return { completed: false };
    }
    if (state.completed === true) {
      state.hydrated = true;
      return { completed: true };
    }
    if (readStoredCompletion()) {
      state.completed = true;
      state.hydrated = true;
      return { completed: true };
    }
    if (state.inflight) return state.inflight;

    state.inflight = (async () => {
      try {
        const res = await fetch("/api/profile/completion", {
          credentials: "same-origin",
          headers: authHeaders(),
        });
        if (res.ok) {
          applyGatePayload(await res.json());
        } else {
          state.hydrated = true;
          state.completed = state.completed === true;
        }
      } catch (_) {
        state.hydrated = true;
      } finally {
        state.inflight = null;
      }
      return { completed: state.completed === true };
    })();

    return state.inflight;
  }

  async function markOnboardingCompleted() {
    state.completed = true;
    try {
      const res = await fetch("/api/profile/completion", {
        method: "PATCH",
        credentials: "same-origin",
        headers: authHeaders(),
        body: JSON.stringify({ markOnboardingCompleted: true }),
      });
      if (res.ok) {
        applyGatePayload(await res.json());
      }
    } catch (_) {}
    try {
      localStorage.removeItem("influnet_needs_progressive_setup");
    } catch (_) {}
    suppressWizardLocally();
    window.dispatchEvent(new CustomEvent("influnet-onboarding-completed"));
    return true;
  }

  function suppressWizardLocally() {
    const until = String(Date.now() + 1000 * 60 * 60 * 24 * 365);
    try {
      sessionStorage.setItem(SUPPRESS_KEY, until);
      localStorage.setItem(SUPPRESS_KEY, until);
    } catch (_) {}
    if (typeof window.influnetCloseProgressiveOnboarding === "function") {
      window.influnetCloseProgressiveOnboarding();
    }
  }

  function mountAccountSettings() {
    suppressWizardLocally();
    if (typeof window.influnetBeginInfluencerProfileNavigation === "function") {
      window.influnetBeginInfluencerProfileNavigation();
    }
    const settingsBtn = [...document.querySelectorAll("aside nav button")].find((b) => {
      const text = (b.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      return text === "settings";
    });
    if (settingsBtn) {
      settingsBtn.click();
      window.dispatchEvent(new CustomEvent("influnet-nav-changed"));
      window.influnetOnInfluencerSectionChange?.("settings");
    }
    if (typeof window.influnetMountInfluencerProfileEdit === "function") {
      window.influnetMountInfluencerProfileEdit();
      [60, 180, 400, 900].forEach((ms) => {
        window.setTimeout(() => window.influnetMountInfluencerProfileEdit?.(), ms);
      });
    } else if (typeof window.influnetNavigateToEditProfile === "function") {
      window.influnetNavigateToEditProfile();
    }
  }

  function routeToAccountSettings(preferredPath) {
    const target = preferredPath === "/dashboard/profile" ? "/dashboard/profile" : "/dashboard/settings";
    const path = normalizePath();
    if (path !== DASHBOARD_PATH && !SETTINGS_PATHS.has(path)) {
      try {
        sessionStorage.setItem(OPEN_SETTINGS_KEY, target);
      } catch (_) {}
      window.location.href = DASHBOARD_PATH;
      return;
    }
    if (path !== target) {
      history.pushState({ influnetSection: "settings" }, "", target);
    }
    mountAccountSettings();
  }

  function handleColdSettingsEntry() {
    const path = normalizePath();
    if (!SETTINGS_PATHS.has(path)) return false;
    try {
      const user = JSON.parse(localStorage.getItem("influnet_user") || "null");
      if (user?.role && user.role !== "influencer") return false;
    } catch (_) {}
    try {
      sessionStorage.setItem(OPEN_SETTINGS_KEY, path);
    } catch (_) {}
    window.location.replace(DASHBOARD_PATH);
    return true;
  }

  function consumeOpenSettingsIntent() {
    let target = "/dashboard/settings";
    try {
      const flag =
        sessionStorage.getItem(OPEN_SETTINGS_KEY) ||
        sessionStorage.getItem("influnet_open_edit_profile");
      if (!flag) return;
      sessionStorage.removeItem(OPEN_SETTINGS_KEY);
      sessionStorage.removeItem("influnet_open_edit_profile");
      if (SETTINGS_PATHS.has(flag)) target = flag;
    } catch (_) {
      return;
    }
    const open = () => routeToAccountSettings(target);
    open();
    [250, 700, 1400].forEach((ms) => window.setTimeout(open, ms));
  }

  async function boot() {
    if (handleColdSettingsEntry()) return;
    if (!isInfluencerDashboardArea()) return;
    await hydrateGate();
    if (state.completed === true) suppressWizardLocally();
    if (SETTINGS_PATHS.has(normalizePath())) {
      suppressWizardLocally();
      mountAccountSettings();
      return;
    }
    if (normalizePath() === DASHBOARD_PATH) {
      consumeOpenSettingsIntent();
    }
  }

  window.influnetEnsureOnboardingGate = hydrateGate;
  window.influnetIsOnboardingCompleted = () => state.completed === true;
  window.influnetMarkOnboardingCompleted = markOnboardingCompleted;
  window.influnetRouteToAccountSettings = routeToAccountSettings;

  boot();
  window.addEventListener("popstate", boot);
  window.addEventListener("load", boot);
  window.addEventListener("influnet-user-updated", () => hydrateGate());
  window.addEventListener("influnet-profile-updated", (ev) => {
    const detail = ev.detail || {};
    if (
      detail.onboardingCompleted === true ||
      detail.completion?.onboardingCompleted === true ||
      detail.isProfileComplete === true
    ) {
      if (detail.completion?.onboardingCompleted === true || detail.onboardingCompleted === true) {
        state.completed = true;
      }
      if (state.completed === true) suppressWizardLocally();
    }
  });
  window.addEventListener("influnet-onboarding-completed", () => {
    state.completed = true;
    suppressWizardLocally();
  });
})();
