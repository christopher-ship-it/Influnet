/**
 * Influencer dashboard — unread messages & pending requests badges on sidebar icons.
 */
(function () {
  try {
    const POLL_MS = 12000;
    const BADGE_CLASS = "infl-nav-icon-badge";

    let counts = { messages: 0, requests: 0 };
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

    function normalizeNavText(text) {
      return String(text || "")
        .replace(/\d+/g, "")
        .replace(/\+/g, "")
        .trim()
        .toLowerCase();
    }

    function findNavButton(label) {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return null;
      const needle = label.toLowerCase();
      return (
        [...nav.querySelectorAll(":scope > button")].find(
          (btn) => normalizeNavText(btn.textContent) === needle
        ) || null
      );
    }

    function findMessagesButton() {
      return findNavButton("messages") || findNavButton("message");
    }

    function findRequestsButton() {
      return (
        findNavButton("requests") ||
        [...document.querySelectorAll(".flex.h-screen aside nav > button")][2] ||
        null
      );
    }

    function ensureBadgeHost(btn) {
      if (!btn) return null;
      let iconWrap =
        btn.querySelector("span.infl-sidebar-badge-host") ||
        btn.querySelector("span.relative.shrink-0") ||
        btn.querySelector("span.shrink-0");
      if (!iconWrap) {
        const svg = btn.querySelector("svg");
        if (svg?.parentElement) iconWrap = svg.parentElement;
      }
      if (!iconWrap) return null;
      iconWrap.classList.add("infl-sidebar-badge-host", "relative", "shrink-0");
      return iconWrap;
    }

    function applyIconBadge(btn, count, ariaLabel) {
      if (!btn) return;
      btn.querySelector(`.${BADGE_CLASS}`)?.remove();
      btn.querySelector(".infl-requests-nav-badge")?.remove();
      btn.querySelector(".infl-requests-nav-dot")?.remove();

      if (count <= 0) return;

      const host = ensureBadgeHost(btn);
      if (!host) return;

      const badge = document.createElement("span");
      badge.className = BADGE_CLASS;
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.setAttribute("aria-label", ariaLabel);
      host.appendChild(badge);
    }

    function paintBadges() {
      applyIconBadge(
        findMessagesButton(),
        counts.messages,
        `${counts.messages} unread message${counts.messages === 1 ? "" : "s"}`
      );
      applyIconBadge(
        findRequestsButton(),
        counts.requests,
        `${counts.requests} pending request${counts.requests === 1 ? "" : "s"}`
      );
    }

    async function fetchCounts() {
      const res = await fetch("/api/notifications/summary", { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { messages: 0, requests: 0 };
      return {
        messages: Number(data.unreadMessagesCount) || 0,
        requests: Number(data.pendingRequestsCount) || 0,
      };
    }

    async function refresh() {
      if (!isInfluencerDashboard()) {
        counts = { messages: 0, requests: 0 };
        return;
      }
      try {
        counts = await fetchCounts();
      } catch {
        return;
      }
      paintBadges();
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

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(paintBadges);
    });

    function boot() {
      if (!isInfluencerDashboard()) {
        stopPolling();
        return;
      }
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (nav && !nav.dataset.inflSidebarBadgesObserved) {
        nav.dataset.inflSidebarBadgesObserved = "1";
        observer.observe(nav, { childList: true, subtree: true, characterData: true });
      }
      startPolling();
      paintBadges();
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refresh();
    });
    window.addEventListener("focus", refresh);
    window.addEventListener("load", boot);
    window.addEventListener("popstate", boot);
    window.addEventListener("infl-sidebar-hover-change", paintBadges);
    window.addEventListener("influnet-notification", refresh);
    window.addEventListener("influnet-collab-accepted", refresh);
    window.addEventListener("influnet-dashboard-stale", refresh);

    boot();
    setInterval(boot, 3000);
  } catch (e) {
    console.warn("[influnet] influencer-sidebar-badges:", e);
  }
})();
