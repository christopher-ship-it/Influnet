/**
 * Business dashboard: hide Discover Influencers nav (fallback if bundle patch not applied).
 */
(function () {
  function isBusinessDashboard() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (path !== "/dashboard") return false;
    try {
      const raw = localStorage.getItem("influnet_user");
      const user = raw ? JSON.parse(raw) : null;
      if (user?.role === "influencer") return false;
    } catch {
      /* ignore */
    }
    return true;
  }

  function hideDiscover() {
    if (!isBusinessDashboard()) return;

    document.querySelectorAll("nav button, aside button").forEach((btn) => {
      const label = btn.textContent.replace(/\d+/g, "").trim();
      if (label === "Discover Influencers" && btn.dataset.influnetHiddenDiscover !== "1") {
        btn.style.display = "none";
        btn.setAttribute("aria-hidden", "true");
        btn.dataset.influnetHiddenDiscover = "1";
      }
    });

    document.querySelectorAll("button").forEach((btn) => {
      const text = btn.textContent.trim();
      if (
        (text === "Discover influencers" || text === "View all") &&
        btn.closest("main, [class*='flex-1']") &&
        btn.dataset.influnetHiddenDiscoverCta !== "1"
      ) {
        const section = btn.closest("div");
        const heading = section?.querySelector("h1, h2");
        if (
          heading &&
          /discover|recommended|saved|conversation/i.test(
            heading.textContent + (section?.textContent || "")
          )
        ) {
          btn.style.display = "none";
          btn.dataset.influnetHiddenDiscoverCta = "1";
        }
      }
    });
  }

  const obs = new MutationObserver(hideDiscover);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideDiscover);
  } else {
    hideDiscover();
  }
})();
