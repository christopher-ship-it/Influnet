/**
 * Disable influencer dashboard "Quick tour" welcome modal.
 */
(function () {
  try {
    if (window.__inflTourDisabled) return;
    window.__inflTourDisabled = true;

    const TOUR_PREFIX = "influnet_tour_done_";

    function tourUserId() {
      try {
        const user = JSON.parse(localStorage.getItem("influnet_user") || "null");
        return user?.id || "guest";
      } catch {
        return "guest";
      }
    }

    function markTourDone() {
      try {
        localStorage.setItem(TOUR_PREFIX + tourUserId(), "1");
      } catch (_) {}
    }

    const origGetItem = localStorage.getItem.bind(localStorage);
    localStorage.getItem = function (key) {
      if (typeof key === "string" && key.startsWith(TOUR_PREFIX)) {
        return "1";
      }
      return origGetItem(key);
    };

    markTourDone();
    window.addEventListener("influnet-user-updated", markTourDone);

    function isInfluencerDashboard() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/dashboard/influencer";
    }

    function removeTourModal() {
      if (!isInfluencerDashboard()) return;

      document.querySelectorAll("button").forEach((btn) => {
        const label = (btn.textContent || "").replace(/\s+/g, " ").trim();
        if (!/^Start tour/i.test(label)) return;
        let node = btn;
        for (let i = 0; i < 8 && node; i += 1) {
          if (node.classList?.contains("fixed") || getComputedStyle(node).position === "fixed") {
            node.remove();
            return;
          }
          node = node.parentElement;
        }
      });

      document.querySelectorAll("div").forEach((el) => {
        const text = (el.textContent || "").replace(/\s+/g, " ");
        if (
          text.includes("Quick tour") &&
          text.includes("Welcome to Influnet") &&
          text.includes("Start tour")
        ) {
          const host =
            el.closest('[class*="fixed"]') ||
            (el.className && String(el.className).includes("fixed") ? el : null);
          if (host && host !== document.body) {
            host.remove();
          }
        }
      });
    }

    const obs = new MutationObserver(removeTourModal);
    obs.observe(document.documentElement, { childList: true, subtree: true });
    removeTourModal();
    window.setInterval(removeTourModal, 1000);
  } catch (e) {
    console.warn("[influnet] disable influencer tour:", e);
  }
})();
