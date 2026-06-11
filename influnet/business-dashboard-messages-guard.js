/**
 * Business dashboard: nav/header section truth + Messages body class.
 * Never use main h1 — standalone Messages injects its own h1 and causes stale tab detection.
 */
(function () {
  try {
    let pendingNavSection = "";
    let pendingNavUntil = 0;

    function normalizeNavText(text) {
      return String(text || "")
        .replace(/\d+/g, "")
        .replace(/\+/g, "")
        .trim();
    }

    function isBusinessDashboard() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path !== "/dashboard") return false;
      try {
        const user = JSON.parse(localStorage.getItem("influnet_user") || "null");
        return user?.role !== "influencer";
      } catch {
        return false;
      }
    }

    function isInfluencerDashboard() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/dashboard/influencer";
    }

    function getNav() {
      return document.querySelector(".flex.h-screen aside nav");
    }

    function getActiveNavLabel() {
      const nav = getNav();
      if (nav) {
        const active = [...nav.querySelectorAll(":scope > button")].find(
          (b) =>
            b.classList.contains("bg-violet-100") ||
            /\bbg-violet-100\b/.test(b.className)
        );
        if (active) {
          const label = normalizeNavText(active.textContent);
          if (label) return label;
        }
      }
      const crumb = document.querySelector(
        ".flex.h-screen header span.text-sm.font-semibold.text-gray-800, .flex.h-screen header .text-gray-800.font-semibold, .flex.h-screen header .text-gray-800.font-medium"
      );
      return crumb ? normalizeNavText(crumb.textContent) : "";
    }

    function getHeaderSectionLabel() {
      const crumb = document.querySelector(
        ".flex.h-screen header span.text-sm.font-semibold.text-gray-800, .flex.h-screen header .text-gray-800.font-semibold, .flex.h-screen header .text-gray-800.font-medium"
      );
      return crumb ? normalizeNavText(crumb.textContent) : "";
    }

    function rememberNavSection(label) {
      if (!label) return;
      pendingNavSection = label;
      pendingNavUntil = Date.now() + 3500;
    }

    function labelFromNavButton(btn) {
      if (!btn) return "";
      const label = normalizeNavText(btn.textContent);
      if (label) return label;
      const nav = btn.closest("aside nav");
      if (!nav) return "";
      const buttons = [...nav.querySelectorAll(":scope > button")];
      const idx = buttons.indexOf(btn);
      const labels = [
        "Dashboard",
        "Messages",
        "Requests",
        "Collaborations",
        "Saved Creators",
        "Analytics",
        "Invoices",
      ];
      return idx >= 0 ? labels[idx] || "" : "";
    }

    /** Nav + header both say Dashboard — beats stale Messages DOM during tab switches. */
    function isDefinitelyDashboard() {
      if (pendingNavSection === "Dashboard" && Date.now() < pendingNavUntil) {
        return true;
      }
      const header = getHeaderSectionLabel();
      const nav = getActiveNavLabel();
      return header === "Dashboard" && nav === "Dashboard";
    }

    function isDefinitelyMessages() {
      if (isDefinitelyDashboard()) return false;
      if (pendingNavSection === "Messages" && Date.now() < pendingNavUntil) {
        return true;
      }
      const header = getHeaderSectionLabel().toLowerCase();
      const nav = getActiveNavLabel().toLowerCase();
      return header === "messages" || nav === "messages";
    }

    function isMessagesTab() {
      if (isDefinitelyDashboard()) return false;
      return isDefinitelyMessages();
    }

    function isDashboardHomeTab() {
      if (!isBusinessDashboard()) return false;
      return isDefinitelyDashboard() || getActiveNavLabel() === "Dashboard";
    }

    function guard() {
      if (isInfluencerDashboard()) {
        document.body.classList.remove("infl-business-messages-view");
        const onMessages =
          getActiveNavLabel().toLowerCase() === "messages" ||
          !!document.querySelector(".influnet-react-messages-root");
        document.body.classList.toggle("infl-influencer-messages-view", onMessages);
        if (onMessages) window.influnetSyncInfluencerMainPanel?.();
        return;
      }
      if (!isBusinessDashboard()) {
        document.body.classList.remove("infl-business-messages-view");
        document.body.classList.remove("infl-influencer-messages-view");
        return;
      }
      document.body.classList.remove("infl-influencer-messages-view");
      const onMessages = isMessagesTab();
      document.body.classList.toggle("infl-business-messages-view", onMessages);
      if (onMessages) {
        document.querySelectorAll("header .influnet-dash-greeting").forEach((el) => {
          el.remove();
        });
        window.influnetSyncBusinessMessagesStandalone?.();
      } else {
        window.influnetHideBusinessMessagesStandalone?.();
        window.influnetSyncBusinessDashboardShell?.();
      }
    }

    const SECTION_LABELS = {
      home: "Dashboard",
      messages: "Messages",
      requests: "Requests",
      projects: "Collaborations",
      saved: "Saved Creators",
      analytics: "Analytics",
      subscription: "Invoices",
      settings: "Settings",
      support: "Support",
    };

    function onBusinessSectionChange(sectionId) {
      if (!isBusinessDashboard()) return;
      const label = SECTION_LABELS[sectionId] || sectionId;
      rememberNavSection(label);
      if (sectionId === "home") {
        document.body.classList.remove("infl-business-messages-view");
        window.influnetHideBusinessMessagesStandalone?.();
        [0, 50, 150, 350, 600].forEach((ms) => {
          window.setTimeout(() => window.influnetSyncBusinessDashboardShell?.(), ms);
        });
      } else if (sectionId === "messages") {
        [0, 50, 150, 350].forEach((ms) => {
          window.setTimeout(() => window.influnetSyncBusinessMessagesStandalone?.(), ms);
        });
      }
      [0, 80, 200, 450].forEach((ms) => window.setTimeout(guard, ms));
    }

    function wireNav() {
      const nav = getNav();
      if (!nav || nav.dataset.inflBizNavGuard) return;
      nav.dataset.inflBizNavGuard = "1";
      const onNavClick = (e) => {
        const btn = e.target.closest?.("button");
        const label = labelFromNavButton(btn);
        if (!label) return;
        rememberNavSection(label);
        [0, 80, 200, 450, 900].forEach((ms) => window.setTimeout(guard, ms));
        if (label === "Dashboard") {
          window.influnetHideBusinessMessagesStandalone?.();
          [0, 50, 150, 350].forEach((ms) => {
            window.setTimeout(() => window.influnetSyncBusinessDashboardShell?.(), ms);
          });
        } else if (label === "Messages") {
          [0, 50, 150, 350].forEach((ms) => {
            window.setTimeout(() => window.influnetSyncBusinessMessagesStandalone?.(), ms);
          });
        }
      };
      nav.addEventListener("click", onNavClick, true);
      nav.parentElement
        ?.querySelector(":scope > div:last-of-type")
        ?.addEventListener("click", onNavClick, true);
    }

    window.influnetBizIsDefinitelyDashboard = isDefinitelyDashboard;
    window.influnetBizIsMessagesTab = isMessagesTab;
    window.influnetBizIsDashboardHome = isDashboardHomeTab;
    window.influnetOnBusinessSectionChange = onBusinessSectionChange;
    window.influnetGuardBusinessMessages = guard;

    wireNav();
    guard();
    window.addEventListener("load", guard);
    setInterval(guard, 3000);
  } catch (e) {
    console.warn("[influnet] messages guard:", e);
  }
})();
