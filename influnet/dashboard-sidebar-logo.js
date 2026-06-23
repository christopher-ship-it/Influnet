/**
 * Dashboard sidebar logo — CSS-backed wordmark (expanded + collapsed).
 * React's <img src="/app/assets/..."> is always hidden; ::before shows the real asset.
 */
(function () {
  const LOGO_SRC = "/Asset/Influnet-LOGO/black-logo.png";
  const ICON_SRC = "/Asset/Influnet-LOGO/Black-Icon.png";

  function findSidebars() {
    const set = new Set();
    document.querySelectorAll("div.flex.h-screen > aside").forEach((el) => set.add(el));
    document.querySelectorAll("aside.w-56, aside.w-16, aside.infl-sidebar-hover").forEach((el) =>
      set.add(el)
    );
    return [...set];
  }

  function getHeaderRow(aside) {
    return (
      aside.querySelector(":scope > div.flex.items-center.justify-between") ||
      aside.querySelector("div.flex.items-center.justify-between")
    );
  }

  function isSidebarCollapsed(aside) {
    if (!aside) return false;
    if (aside.classList.contains("infl-sidebar-hover")) {
      return aside.classList.contains("infl-sidebar-hover--compact");
    }
    return aside.classList.contains("w-16") || aside.offsetWidth < 100;
  }

  function patchSidebarLogo() {
    findSidebars().forEach((aside) => {
      const headerRow = getHeaderRow(aside);
      if (!headerRow) return;

      const collapsed = isSidebarCollapsed(aside);
      aside.classList.toggle("infl-sidebar--expanded", !collapsed);
      aside.classList.toggle("infl-sidebar--collapsed", collapsed);

      headerRow.querySelectorAll('img[alt="Influnet"]').forEach((img) => {
        img.hidden = true;
        img.setAttribute("aria-hidden", "true");
      });

      headerRow.querySelector("[data-influnet-sidebar-brand]")?.remove();
    });
  }

  function preloadAssets() {
    [LOGO_SRC, ICON_SRC].forEach((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
  }

  function start() {
    if (!document.body) return;
    try {
      preloadAssets();
      patchSidebarLogo();

      const obs = new MutationObserver(() => {
        window.requestAnimationFrame(patchSidebarLogo);
      });
      obs.observe(document.body, { childList: true, subtree: true });

      window.addEventListener("load", patchSidebarLogo);
      window.addEventListener("popstate", patchSidebarLogo);
      window.addEventListener("infl-sidebar-hover-change", patchSidebarLogo);

      const push = history.pushState.bind(history);
      history.pushState = function () {
        const r = push.apply(history, arguments);
        patchSidebarLogo();
        return r;
      };
      const replace = history.replaceState.bind(history);
      history.replaceState = function () {
        const r = replace.apply(history, arguments);
        patchSidebarLogo();
        return r;
      };
    } catch (err) {
      console.warn("[influnet] dashboard sidebar logo:", err);
    }
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
