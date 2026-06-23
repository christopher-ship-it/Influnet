/**

 * Dashboard sidebar — keep expanded with labels visible (no hover collapse).

 */

(function () {

  const DASHBOARD_PATHS = /^\/dashboard(\/influencer)?$/;

  const ANCHOR_CLASS = "infl-sidebar-hover-anchor";



  function isDashboardShell() {

    const path = window.location.pathname.replace(/\/$/, "") || "/";

    return DASHBOARD_PATHS.test(path);

  }



  function findSidebars() {

    const set = new Set();

    document.querySelectorAll("div.flex.h-screen > aside").forEach((el) => set.add(el));

    document.querySelectorAll(`.${ANCHOR_CLASS} > aside`).forEach((el) => set.add(el));

    document.querySelectorAll(".infl-sidebar-zone > aside").forEach((el) => set.add(el));

    document.querySelectorAll("aside.w-56, aside.w-16, aside.infl-sidebar-hover").forEach((el) =>

      set.add(el)

    );

    return [...set];

  }



  function findShell() {

    return document.querySelector("div.flex.h-screen");

  }



  function findHamburger(aside) {

    const header = aside.querySelector(":scope > div.flex.items-center.justify-between");

    if (!header) return null;

    return header.querySelector(":scope > button");

  }



  function markRolePill(aside) {

    const header = aside.querySelector(":scope > div.flex.items-center.justify-between");

    let next = header?.nextElementSibling;

    if (!next) return;

    const pill = next.querySelector("span.uppercase, span.tracking-widest");

    if (pill && /influencer|business/i.test(pill.textContent || "")) {

      next.setAttribute("data-infl-sidebar-role-pill", "");

    }

  }



  function tagNavLabels(aside) {

    aside.querySelectorAll("nav button, .border-t.border-gray-100 button").forEach((btn) => {

      [...btn.children].forEach((child) => {

        if (child.classList?.contains("relative")) return;

        if (child.querySelector?.("svg")) return;

        child.classList.add("infl-sidebar-nav-label");

      });

    });

  }



  function ensureReactExpanded(aside) {

    const btn = findHamburger(aside);

    if (!btn || aside.dataset.inflSidebarExpanded === "1") return;

    if (aside.classList.contains("w-16")) {

      btn.click();

    }

    aside.dataset.inflSidebarExpanded = "1";

  }



  function hideHamburger(btn) {

    if (!btn) return;

    btn.hidden = true;

    btn.setAttribute("aria-hidden", "true");

    btn.style.setProperty("display", "none", "important");

    btn.style.setProperty("pointer-events", "none", "important");

  }



  function unwrapLegacyZone(aside) {

    const zone = aside.parentElement;

    if (!zone?.classList.contains("infl-sidebar-zone")) return;

    const shell = zone.parentElement;

    if (shell) {

      shell.insertBefore(aside, zone);

      zone.remove();

    }

    findShell()?.querySelector(":scope > .infl-sidebar-spacer")?.remove();

  }



  function unwrapHoverAnchor(aside) {

    const parent = aside.parentElement;

    if (!parent?.classList.contains(ANCHOR_CLASS)) return;

    const shell = parent.parentElement;

    if (shell) {

      shell.insertBefore(aside, parent);

      parent.remove();

    }

  }



  function patchShellLayout() {

    const shell = findShell();

    if (!shell) return null;

    shell.classList.add("infl-app-shell");

    return shell;

  }



  function keepSidebarExpanded(aside) {

    aside.classList.remove("infl-sidebar-hover--compact");

    unwrapHoverAnchor(aside);

    aside.classList.add("infl-sidebar--expanded");

    aside.classList.remove("infl-sidebar--collapsed");

    window.dispatchEvent(new CustomEvent("infl-sidebar-hover-change"));

  }



  function patchSidebar(aside) {

    if (!aside) return;

    unwrapLegacyZone(aside);

    if (

      !aside.classList.contains("w-56") &&

      !aside.classList.contains("w-16") &&

      !aside.classList.contains("infl-sidebar-hover")

    ) {

      return;

    }



    const alreadyPatched = aside.dataset.inflSidebarHover === "1";



    if (!alreadyPatched) {

      ensureReactExpanded(aside);

      hideHamburger(findHamburger(aside));

      aside.classList.add("infl-sidebar-hover");

      aside.dataset.inflSidebarHover = "1";

      markRolePill(aside);

      tagNavLabels(aside);

    }



    keepSidebarExpanded(aside);

  }



  function patch() {

    if (!isDashboardShell()) return;

    patchShellLayout();

    findSidebars().forEach(patchSidebar);

  }



  function start() {

    if (!document.body) return;

    patch();

    const obs = new MutationObserver(() => {

      window.requestAnimationFrame(patch);

    });

    obs.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("load", patch);

    window.addEventListener("popstate", patch);

    window.addEventListener("influnet-nav-changed", () => window.setTimeout(patch, 0));



    const push = history.pushState.bind(history);

    history.pushState = function () {

      const r = push.apply(history, arguments);

      patch();

      return r;

    };

    const replace = history.replaceState.bind(history);

    history.replaceState = function () {

      const r = replace.apply(history, arguments);

      patch();

      return r;

    };

  }



  if (document.body) start();

  else document.addEventListener("DOMContentLoaded", start);

})();


