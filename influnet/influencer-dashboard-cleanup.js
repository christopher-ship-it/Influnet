/**
 * Influencer dashboard: hide Upgrade Plan and brand-tune active nav accents.
 */
(function () {
  try {
    function isInfluencerDashboard() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/dashboard/influencer";
    }

    function cleanup() {
      if (!isInfluencerDashboard()) return;

      // React already shows request counts on nav; drop legacy duplicate badges.
      document
        .querySelectorAll(".infl-requests-nav-badge, .infl-requests-nav-dot")
        .forEach((el) => el.remove());

      document.querySelectorAll("header button, aside button").forEach((btn) => {
        if (/upgrade/i.test(btn.textContent)) btn.remove();
      });

      const styleId = "influnet-influencer-dash-brand";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          .flex.h-screen aside nav button.bg-violet-100 {
            background: rgba(238, 62, 150, 0.12) !important;
            color: #ee3e96 !important;
          }
          .flex.h-screen aside nav button .text-violet-600 {
            color: #ee3e96 !important;
          }
          .flex.h-screen main.flex-1.overflow-y-auto {
            background: #f5f6fa !important;
          }
        `;
        document.head.appendChild(style);
      }
    }

    cleanup();
    setInterval(cleanup, 2000);
  } catch (e) {
    console.warn("[influnet] influencer-dashboard-cleanup:", e);
  }
})();
