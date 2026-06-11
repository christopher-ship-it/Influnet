/**
 * Dashboard app shell: use Black wordmark in sidebar on every section.
 */
(function () {
  try {
    const LOGO = "/Asset/Influnet-LOGO/Black%20-Logo-.png";

    function patchSidebarLogo() {
      const shell = document.querySelector(".flex.h-screen");
      if (!shell) return;

      shell.querySelectorAll("aside img[alt='Influnet'], aside img[alt=\"Influnet\"]").forEach((img) => {
        if (img.dataset.influnetDashLogo === "1" && img.getAttribute("src") === LOGO) return;
        img.src = LOGO;
        img.alt = "Influnet";
        img.className = "h-8 w-auto max-w-[10rem] object-contain object-left";
        img.style.filter = "none";
        img.style.maxHeight = "2rem";
        img.dataset.influnetDashLogo = "1";
      });
    }

    function schedule() {
      patchSidebarLogo();
    }

    schedule();
    window.addEventListener("load", schedule);
    window.addEventListener("popstate", schedule);
    window.setInterval(schedule, 2000);

    const push = history.pushState.bind(history);
    history.pushState = function () {
      const r = push.apply(history, arguments);
      schedule();
      return r;
    };
    const replace = history.replaceState.bind(history);
    history.replaceState = function () {
      const r = replace.apply(history, arguments);
      schedule();
      return r;
    };
  } catch (err) {
    console.warn("[influnet] dashboard sidebar logo:", err);
  }
})();
