/**
 * Load projects collaboration hub on business + influencer dashboards.
 */
(function () {
  const CSS = "/projects-workspace.css?v=8";
  const JS = "/projects-workspace.js?v=12";

  function isDashboard() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return path === "/dashboard" || path === "/dashboard/influencer";
  }

  function loadOnce(src, tag) {
    const base = src.split("?")[0];
    const ver = (src.match(/\?v=(\d+)/) || [])[1] || "0";
    const attr = tag === "link" ? "data-infl-href" : "data-infl-src";
    const existing = document.querySelector(`${tag}[${attr}="${base}"]`);
    if (existing) {
      if (existing.getAttribute(tag === "link" ? "data-infl-ver" : "data-infl-ver") === ver) return;
      existing.remove();
    }
    const el = document.createElement(tag);
    if (tag === "link") {
      el.rel = "stylesheet";
      el.href = src;
    } else {
      el.src = src;
      el.async = true;
    }
    el.setAttribute(attr, base);
    el.setAttribute("data-infl-ver", ver);
    (tag === "link" ? document.head : document.body).appendChild(el);
  }

  function boot() {
    if (!isDashboard()) return;
    loadOnce(CSS, "link");
    loadOnce(JS, "script");
  }

  boot();
  window.addEventListener("popstate", boot);
  window.addEventListener("load", boot);
  setInterval(boot, 3000);
})();
