/**
 * Load influencer dashboard scripts only on /dashboard/influencer.
 */
(function () {
  const HOME = "/influencer-dashboard-home.js?v=18";
  const CLEANUP = "/influencer-dashboard-cleanup.js?v=2";
  const MSG_GUARD = "/business-dashboard-messages-guard.js?v=5";
  const COLLAB_FLOW = "/collab-flow-bridge.js?v=2";
  const PRESENCE = "/messages-presence-bridge.js?v=2";

  function isInfluencerDashboard() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return path === "/dashboard/influencer";
  }

  function loadOnce(src) {
    const base = src.split("?")[0];
    const ver = (src.match(/\?v=(\d+)/) || [])[1] || "0";
    const existing = document.querySelector(`script[data-infl-src="${base}"]`);
    if (existing) {
      if (existing.getAttribute("data-infl-ver") === ver) return;
      existing.remove();
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.setAttribute("data-infl-src", base);
    el.setAttribute("data-infl-ver", ver);
    document.body.appendChild(el);
  }

  function boot() {
    if (!isInfluencerDashboard()) return;
    loadOnce(CLEANUP);
    loadOnce(MSG_GUARD);
    loadOnce(HOME);
    loadOnce(COLLAB_FLOW);
    loadOnce(PRESENCE);
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
