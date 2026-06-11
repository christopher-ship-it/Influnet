/**
 * Business dashboard: hide Upgrade / extra widgets not in the target design.
 */
(function () {
  try {
    const HIDE_LABELS = [
      "Discover Creators",
      "Discover Influencers",
      "Creator Links",
      "Paste Creator Link",
    ];

    function isBusinessDashboard() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/dashboard";
    }

    function isMessagesTab() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return false;
      const active = [...nav.querySelectorAll(":scope > button")].find(
        (b) =>
          b.classList.contains("bg-violet-100") ||
          /\bbg-violet-100\b/.test(b.className)
      );
      if (!active) return false;
      const label = active.textContent.replace(/\d+/g, "").trim().toLowerCase();
      return label === "messages";
    }

    function hideExtras() {
      if (!isBusinessDashboard()) return;
      if (isMessagesTab()) return;

      document.querySelectorAll("aside button, aside a").forEach((el) => {
        const text = el.textContent.replace(/\d+/g, "").trim();
        if (HIDE_LABELS.some((l) => text.includes(l))) {
          el.style.display = "none";
        }
      });

      document.querySelectorAll("aside button, header button").forEach((btn) => {
        if (/upgrade/i.test(btn.textContent)) btn.remove();
      });

      document.querySelectorAll("aside div, aside section").forEach((el) => {
        const t = el.textContent || "";
        if (/paste creator link|upgrade to pro/i.test(t) && el.querySelector("input, button")) {
          el.style.display = "none";
        }
      });

      const rec = [...document.querySelectorAll("h2")].find(
        (h) => h.textContent.trim() === "Recommended For You"
      );
      if (rec) rec.closest("div")?.parentElement?.remove();

      const conv = [...document.querySelectorAll("h2")].find(
        (h) => h.textContent.trim() === "Recent Conversations"
      );
      if (conv) conv.closest(".bg-white.rounded-2xl")?.remove();

      const topPicks = [...document.querySelectorAll("h2")].find((h) =>
        /top picks|recommended for you/i.test(h.textContent.trim())
      );
      if (topPicks) topPicks.closest("div")?.parentElement?.remove();

      document.querySelectorAll("main section, main div").forEach((el) => {
        const t = el.textContent || "";
        if (/nike|boat|zomato|mivi/i.test(t) && t.length < 500) {
          el.style.display = "none";
        }
      });
    }

    window.setInterval(() => {
      if (isBusinessDashboard()) hideExtras();
    }, 2500);
    window.addEventListener("load", hideExtras);
  } catch (err) {
    console.warn("[influnet] dashboard cleanup:", err);
  }
})();
