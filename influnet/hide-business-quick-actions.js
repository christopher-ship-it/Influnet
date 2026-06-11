/**
 * Business dashboard: hide Quick Actions card (fallback if bundle patch not applied).
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

  function hideQuickActions() {
    if (!isBusinessDashboard()) return;

    const heading = Array.from(document.querySelectorAll("h2")).find(
      (el) => el.textContent.trim() === "Quick Actions"
    );
    if (!heading) return;

    const card = heading.closest(".rounded-2xl");
    if (!card || card.dataset.influnetHiddenQuickActions === "1") return;

    card.remove();
    card.dataset.influnetHiddenQuickActions = "1";
  }

  const obs = new MutationObserver(hideQuickActions);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideQuickActions);
  } else {
    hideQuickActions();
  }
})();
