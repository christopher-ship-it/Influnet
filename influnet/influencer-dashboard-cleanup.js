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

      document.querySelectorAll("header button, aside button").forEach((btn) => {
        if (/upgrade/i.test(btn.textContent)) btn.remove();
      });

      const styleId = "influnet-influencer-dash-brand";
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
          .flex.h-screen aside nav button.bg-violet-100 {
            background: rgba(238, 62, 150, 0.1) !important;
            color: #ee3e96 !important;
            border-radius: 12px !important;
            box-shadow: inset 0 0 0 1px rgba(238, 62, 150, 0.14) !important;
          }
          .flex.h-screen aside nav button.bg-violet-100 .text-violet-600 {
            color: #ee3e96 !important;
          }
          .flex.h-screen main.flex-1.overflow-y-auto {
            background: linear-gradient(165deg, #f3f0ff 0%, #f5f6fa 42%, #eef1f5 100%) !important;
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
