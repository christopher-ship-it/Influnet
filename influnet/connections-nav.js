/**
 * Inject "Connections" into dashboard sidebar between Requests and Collaborations.
 */
(function () {
  try {
    const NAV_ATTR = "data-infl-connections-nav";
    const LABEL_CLASS = "infl-conn-nav-label";

    function isDashboard() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      return path === "/dashboard" || path === "/dashboard/influencer";
    }

    function normalizeNavText(text) {
      return String(text || "")
        .replace(/\d+/g, "")
        .replace(/\+/g, "")
        .trim();
    }

    function findRequestsButton(nav) {
      return [...nav.querySelectorAll(":scope > button")].find((b) =>
        /requests/i.test(normalizeNavText(b.textContent))
      );
    }

    function setHeaderTitle(label) {
      const crumb = document.querySelector(
        ".flex.h-screen header span.text-sm.font-semibold.text-gray-800, .flex.h-screen header .text-gray-800.font-semibold"
      );
      if (crumb) crumb.textContent = label;
    }

    function deactivateNav(nav) {
      [...nav.querySelectorAll(":scope > button")].forEach((b) => {
        b.classList.remove("bg-violet-100", "text-violet-600");
        b.classList.add("text-gray-600");
        const icon = b.querySelector("svg, [class*='text-']");
        if (icon && icon.classList) {
          icon.classList.remove("text-violet-600");
          icon.classList.add("text-gray-400");
        }
      });
    }

    function activateBtn(btn) {
      btn.classList.add("bg-violet-100", "text-violet-600");
      btn.classList.remove("text-gray-600");
      const icon = btn.querySelector("svg");
      if (icon?.classList) {
        icon.classList.add("text-violet-600");
        icon.classList.remove("text-gray-400");
      }
    }

    function activateNonConnectionsBtn(nav, btn) {
      if (!nav || !btn) return;
      deactivateNav(nav);
      activateBtn(btn);
      const label = normalizeNavText(btn.textContent);
      if (label) setHeaderTitle(label);
    }

    function isSidebarCollapsed(btn) {
      const aside = btn?.closest("aside");
      if (!aside) return false;
      if (aside.classList.contains("infl-sidebar-hover")) {
        return aside.classList.contains("infl-sidebar-hover--compact");
      }
      return aside.classList.contains("w-16") || aside.offsetWidth < 100;
    }

    function syncCollapsedState(btn) {
      if (!btn) return;
      const label = btn.querySelector(`.${LABEL_CLASS}`);
      if (!label) return;
      const aside = btn.closest("aside");
      if (aside?.classList.contains("infl-sidebar-hover")) {
        label.hidden = false;
        btn.removeAttribute("aria-label");
        btn.removeAttribute("title");
        return;
      }
      const collapsed = isSidebarCollapsed(btn);
      label.hidden = collapsed;
      if (collapsed) {
        btn.setAttribute("aria-label", "Connections");
        btn.setAttribute("title", "Connections");
      } else {
        btn.removeAttribute("aria-label");
        btn.removeAttribute("title");
      }
    }

    function watchSidebarCollapse(nav, btn) {
      const aside = nav.closest("aside");
      if (!aside) return;
      syncCollapsedState(btn);
      if (aside.dataset.inflConnCollapseObs) return;
      aside.dataset.inflConnCollapseObs = "1";
      const collapseObs = new MutationObserver(() => syncCollapsedState(btn));
      collapseObs.observe(aside, { attributes: true, attributeFilter: ["class"] });
      window.addEventListener(
        "resize",
        () => syncCollapsedState(btn),
        { passive: true }
      );
      window.addEventListener("infl-sidebar-hover-change", () => syncCollapsedState(btn));
    }

    function buildConnectionsButton(templateBtn) {
      const btn = document.createElement("button");
      btn.setAttribute(NAV_ATTR, "1");
      btn.type = "button";
      btn.className = templateBtn.className
        .replace(/\bbg-violet-100\b/g, "")
        .replace(/\btext-violet-600\b/g, "text-gray-600")
        .replace(/\btext-violet-700\b/g, "text-gray-600");

      const iconWrap = document.createElement("span");
      iconWrap.className = "relative shrink-0";
      iconWrap.innerHTML = `
        <svg class="size-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>`;

      const label = document.createElement("span");
      label.className = `${LABEL_CLASS} flex-1 text-left`;
      label.textContent = "Connections";

      btn.appendChild(iconWrap);
      btn.appendChild(label);
      btn.style.width = "";
      btn.style.marginLeft = "";
      btn.style.marginRight = "";
      syncCollapsedState(btn);
      return btn;
    }

    function openConnections(nav, btn) {
      deactivateNav(nav);
      activateBtn(btn);
      setHeaderTitle("Connections");
      document.body.classList.remove("infl-projects-workspace-active");
      if (typeof window.influnetTeardownProjectsWorkspace === "function") {
        window.influnetTeardownProjectsWorkspace("connections-nav");
      }
      window.influnetOnInfluencerSectionChange?.("connections");
      window.influnetOnBusinessSectionChange?.("connections");
    }

    function inject() {
      if (!isDashboard()) return;
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return;

      let btn = nav.querySelector(`[${NAV_ATTR}]`);
      if (btn && !btn.querySelector(`.${LABEL_CLASS}`)) {
        btn.remove();
        btn = null;
      }
      if (!btn) {
        const requestsBtn = findRequestsButton(nav);
        if (!requestsBtn) return;
        btn = buildConnectionsButton(requestsBtn);
        requestsBtn.insertAdjacentElement("afterend", btn);
        btn.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            openConnections(nav, btn);
          },
          true
        );
      }

      watchSidebarCollapse(nav, btn);

      if (!nav.dataset.inflConnNavWired) {
        nav.dataset.inflConnNavWired = "1";
        nav.addEventListener(
          "click",
          (e) => {
            const clicked = e.target.closest("button");
            if (!clicked || !nav.contains(clicked)) return;
            if (clicked.getAttribute(NAV_ATTR)) return;
            // Keep nav highlight + breadcrumb in sync when moving away from Connections.
            // This avoids stale "Connections" active styles on Collaborations clicks.
            [0, 80, 180].forEach((ms) => {
              window.setTimeout(() => activateNonConnectionsBtn(nav, clicked), ms);
            });
            if (typeof window.influnetTeardownConnectionsWorkspace === "function") {
              window.influnetTeardownConnectionsWorkspace("other-nav");
            }
          },
          true
        );
      }
    }

    inject();
    const obs = new MutationObserver(inject);
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", inject);
    window.addEventListener("load", inject);
    setInterval(inject, 2500);
  } catch (e) {
    console.warn("[influnet] connections-nav:", e);
  }
})();
