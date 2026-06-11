/**
 * Business Messages tab: body class + strip legacy header greeting only (no DOM style fights).
 */
(function () {
  try {
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

    function getActiveNavLabel() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return "";
      const active = [...nav.querySelectorAll(":scope > button")].find(
        (b) =>
          b.classList.contains("bg-violet-100") ||
          /\bbg-violet-100\b/.test(b.className)
      );
      if (!active) return "";
      return active.textContent.replace(/\d+/g, "").replace(/\+/g, "").trim();
    }

    function guard() {
      if (!isBusinessDashboard()) {
        document.body.classList.remove("infl-business-messages-view");
        return;
      }
      const onMessages = getActiveNavLabel().toLowerCase() === "messages";
      document.body.classList.toggle("infl-business-messages-view", onMessages);
      if (!onMessages) return;
      document.querySelectorAll("header .influnet-dash-greeting").forEach((el) => {
        el.remove();
      });
    }

    const nav = document.querySelector(".flex.h-screen aside nav");
    nav?.addEventListener("click", () => {
      [0, 100, 300].forEach((ms) => window.setTimeout(guard, ms));
    });

    guard();
    window.addEventListener("load", guard);
    window.influnetGuardBusinessMessages = guard;
  } catch (e) {
    console.warn("[influnet] messages guard:", e);
  }
})();
