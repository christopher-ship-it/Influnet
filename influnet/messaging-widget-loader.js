/**
 * Loads floating messaging widget on authenticated dashboard routes.
 */
(function () {
  const CSS = "/messaging/infl-messenger.css?v=3";
  const JS = "/messaging/infl-messenger.js?v=3";

  function isDashboard() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return path === "/dashboard" || path === "/dashboard/influencer";
  }

  function isLoggedIn() {
    try {
      const user = JSON.parse(localStorage.getItem("influnet_user") || "null");
      return !!user?.id;
    } catch {
      return false;
    }
  }

  function loadOnce(href, tag) {
    const base = href.split("?")[0];
    const ver = (href.match(/\?v=(\d+)/) || [])[1] || "0";
    const existing = document.querySelector(`${tag}[data-infl-src="${base}"]`);
    if (existing) {
      if (existing.getAttribute("data-infl-ver") === ver) return;
      existing.remove();
    }
    const el = document.createElement(tag);
    el.setAttribute("data-infl-src", base);
    el.setAttribute("data-infl-ver", ver);
    if (tag === "link") {
      el.rel = "stylesheet";
      el.href = href;
    } else {
      el.src = href;
      el.defer = true;
    }
    document.head.appendChild(el);
  }

  function boot() {
    if (!isDashboard() || !isLoggedIn()) return;
    loadOnce(CSS, "link");
    loadOnce(JS, "script");
  }

  boot();
  window.addEventListener("load", boot);
  window.addEventListener("popstate", boot);
  window.addEventListener("influnet-user-updated", boot);

  const push = history.pushState.bind(history);
  history.pushState = function () {
    const r = push.apply(history, arguments);
    boot();
    return r;
  };
})();
