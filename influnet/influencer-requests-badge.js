/**
 * Influencer dashboard — pending Requests tab notification badge.
 * Polls incoming collab requests so new connection requests show without refresh.
 */
(function () {
  try {
    const BADGE_CLASS = "infl-requests-nav-badge";
    const DOT_CLASS = "infl-requests-nav-dot";
    const POLL_MS = 12000;

    let pendingCount = 0;
    let pollTimer = null;

    function isInfluencerDashboard() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path !== "/dashboard/influencer") return false;
      try {
        const user = JSON.parse(localStorage.getItem("influnet_user") || "null");
        return user?.role === "influencer";
      } catch {
        return false;
      }
    }

    async function fetchPendingCount() {
      const res = await fetch("/api/collab-requests/incoming", {
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) return 0;
      const list = Array.isArray(data) ? data : [];
      return list.filter((r) => String(r.status).toLowerCase() === "pending").length;
    }

    function findRequestsButton() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return null;

      const buttons = [...nav.querySelectorAll(":scope > button")];
      const byLabel = buttons.find((btn) => {
        const text = btn.textContent.replace(/\d+/g, "").replace(/\+/g, "").trim().toLowerCase();
        return text === "requests";
      });
      if (byLabel) return byLabel;

      // home, messages, requests, …
      return buttons[2] || null;
    }

    function isSidebarCollapsed(btn) {
      const aside = btn?.closest("aside");
      if (!aside) return false;
      return aside.classList.contains("w-16") || aside.offsetWidth < 100;
    }

    function applyBadge(btn, count) {
      if (!btn) return;

      btn.querySelector(`.${BADGE_CLASS}`)?.remove();
      btn.querySelector(`.${DOT_CLASS}`)?.remove();

      if (count <= 0) return;

      const collapsed = isSidebarCollapsed(btn);
      const iconWrap = btn.querySelector("span.relative.shrink-0, span.shrink-0");

      if (collapsed && iconWrap) {
        const dot = document.createElement("span");
        dot.className = `${DOT_CLASS} absolute -top-1 -right-1 size-2 rounded-full bg-red-500`;
        dot.setAttribute("aria-label", `${count} pending requests`);
        if (!iconWrap.classList.contains("relative")) iconWrap.classList.add("relative");
        iconWrap.appendChild(dot);
        return;
      }

      const badge = document.createElement("span");
      badge.className = `${BADGE_CLASS} min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center px-1 shrink-0 ml-auto`;
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.setAttribute("aria-label", `${count} pending requests`);
      btn.appendChild(badge);
    }

    async function refresh() {
      if (!isInfluencerDashboard()) {
        pendingCount = 0;
        return;
      }
      try {
        pendingCount = await fetchPendingCount();
      } catch {
        return;
      }
      applyBadge(findRequestsButton(), pendingCount);
    }

    function startPolling() {
      if (pollTimer) return;
      refresh();
      pollTimer = window.setInterval(refresh, POLL_MS);
    }

    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function onNavMutate() {
      if (!isInfluencerDashboard()) return;
      applyBadge(findRequestsButton(), pendingCount);
    }

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(onNavMutate);
    });

    function boot() {
      if (!isInfluencerDashboard()) {
        stopPolling();
        return;
      }
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (nav && !nav.dataset.inflRequestsObserved) {
        nav.dataset.inflRequestsObserved = "1";
        observer.observe(nav, { childList: true, subtree: true, characterData: true });
      }
      startPolling();
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refresh();
    });
    window.addEventListener("focus", refresh);
    window.addEventListener("load", boot);
    window.addEventListener("popstate", boot);
    boot();
    setInterval(boot, 3000);
  } catch (e) {
    console.warn("[influnet] influencer-requests-badge:", e);
  }
})();

