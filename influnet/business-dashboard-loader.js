/**

 * Load dashboard UI scripts only on /dashboard (avoids observers on landing/login).

 */

(function () {

  const HEADER = "/business-dashboard-header.js?v=44";

  const LAYOUT = "/business-dashboard-layout.js?v=46";

  const CLEANUP = "/business-dashboard-cleanup.js?v=26";

  const MESSAGES = "/business-messages-bridge.js?v=7";
  const MSG_GUARD = "/business-dashboard-messages-guard.js?v=9";
  const MSG_STANDALONE = "/business-messages-standalone.js?v=15";
  const REQ_MESSAGES = "/business-requests-messages-bridge.js?v=1";
  const COLLAB_FLOW = "/collab-flow-bridge.js?v=3";
  const PRESENCE = "/messages-presence-bridge.js?v=6";
  const PROJECTS = "/projects-workspace.js?v=12";



  function isBusinessDashboard() {

    const path = window.location.pathname.replace(/\/$/, "") || "/";

    return path === "/dashboard";

  }

  function syncDashboardFontClass() {
    const on = isBusinessDashboard();
    document.body.classList.toggle("infl-business-dashboard", on);
    if (!on) document.body.classList.remove("infl-business-dashboard");
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

    syncDashboardFontClass();
    if (!isBusinessDashboard()) return;

    loadOnce(CLEANUP);

    loadOnce(HEADER);

    loadOnce(LAYOUT);

    loadOnce(MESSAGES);
    loadOnce(MSG_GUARD);
    loadOnce(MSG_STANDALONE);
    loadOnce(REQ_MESSAGES);
    loadOnce(COLLAB_FLOW);
    loadOnce(PRESENCE);
    loadOnce(PROJECTS);

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

})();


