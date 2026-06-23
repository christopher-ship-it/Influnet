/**
 * Hides legacy React / standalone messaging UI only when the new
 * #infl-msgs-workspace-root workspace is mounted — NOT when the normal
 * dashboard Messages tab sets infl-influencer-messages-view.
 */
(function () {
  const HIDDEN_ATTR = "data-infl-ws-guard-hidden";

  function isNewWorkspaceActive() {
    return (
      document.body.classList.contains("infl-msgs-workspace-active") ||
      !!document.getElementById("infl-msgs-workspace-root")
    );
  }

  function markHidden(el) {
    if (!el || el.hasAttribute(HIDDEN_ATTR)) return;
    el.setAttribute(HIDDEN_ATTR, "1");
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
  }

  function restoreHidden() {
    document.querySelectorAll(`[${HIDDEN_ATTR}]`).forEach((el) => {
      el.removeAttribute(HIDDEN_ATTR);
      el.style.removeProperty("display");
      el.style.removeProperty("visibility");
      el.removeAttribute("aria-hidden");
    });

    /* Undo styles from older guard versions that lacked HIDDEN_ATTR */
    document.querySelectorAll(".influnet-react-messages-root").forEach((el) => {
      if (el.id === "infl-msgs-workspace-root") return;
      el.style.removeProperty("display");
      el.style.removeProperty("visibility");
      el.removeAttribute("aria-hidden");
    });
    const standalone = document.getElementById("influnet-biz-msgs-standalone");
    if (standalone) {
      standalone.style.removeProperty("display");
      standalone.style.removeProperty("visibility");
    }
  }

  function hideLegacy() {
    if (!isNewWorkspaceActive()) {
      restoreHidden();
      return;
    }

    document.querySelectorAll(".influnet-react-messages-root").forEach((el) => {
      if (el.id === "infl-msgs-workspace-root") return;
      markHidden(el);
      el.setAttribute("aria-hidden", "true");
    });

    const standalone = document.getElementById("influnet-biz-msgs-standalone");
    if (standalone) markHidden(standalone);

    const main = document.querySelector("main.flex-1") || document.querySelector("main");
    if (main) {
      for (const child of main.children) {
        if (child.id === "infl-msgs-workspace-root") continue;
        markHidden(child);
      }
    }

    document.querySelectorAll("[data-infl-legacy-messages]").forEach((el) => {
      markHidden(el);
    });
  }

  function tick() {
    hideLegacy();
  }

  tick();
  window.addEventListener("load", tick);
  window.addEventListener("popstate", tick);
  const obs = new MutationObserver(tick);
  obs.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  setInterval(tick, 2000);
})();
