/**
 * Load Connections module on business + influencer dashboards.
 */
(function () {
  const CSS = "/connections-workspace.css?v=2";
  const NAV = "/connections-nav.js?v=6";
  const JS = "/connections-workspace.js?v=2";

  function isDashboard() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return path === "/dashboard" || path === "/dashboard/influencer";
  }

  function loadOnce(src, tag) {
    const base = src.split("?")[0];
    const ver = (src.match(/\?v=(\d+)/) || [])[1] || "0";
    const attr = tag === "link" ? "data-infl-href" : "data-infl-src";
    const existing = document.querySelector(`${tag}[${attr}="${base}"]`);
    if (existing?.getAttribute("data-infl-ver") === ver) return;
    existing?.remove();
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
    loadOnce(NAV, "script");
    loadOnce(JS, "script");
  }

  boot();
  window.addEventListener("popstate", boot);
  window.addEventListener("load", boot);
  setInterval(boot, 3000);
})();
