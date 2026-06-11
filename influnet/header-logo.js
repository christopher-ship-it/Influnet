/**
 * Site header: ensure Influnet wordmark logo is used in nav and standalone pages.
 */
(function () {
  const LOGO_SRC = "/Asset/Influnet-LOGO/Logo.png";
  const OLD_SRCS = [
    "/app/assets/influnet-logo-BB9OG6CE.png",
    "/assets/influnet-logo-BB9OG6CE.png",
    "influnet-logo-BB9OG6CE.png",
  ];

  function applyLogo(img) {
    if (!img || img.dataset.influnetHeaderLogo === "1") return;
    const src = img.getAttribute("src") || "";
    const inNav = !!img.closest("nav");
    const isOld = OLD_SRCS.some((s) => src.includes(s));
    if (!inNav && src === LOGO_SRC) return;
    if (!inNav && !isOld && src && !src.includes("Logo.png")) return;

    img.src = LOGO_SRC;
    img.alt = "Influnet";
    img.className = (img.className || "").replace(/\bh-\d+\b/, "h-9") || "h-9 w-auto";
    if (!img.className.includes("w-auto")) img.className += " w-auto";
    img.style.height = img.style.height || "";
    img.dataset.influnetHeaderLogo = "1";
  }

  function patchNav() {
    document.querySelectorAll("nav a img[alt='Influnet'], nav a img[alt=\"Influnet\"]").forEach(applyLogo);
    document.querySelectorAll("nav a.flex.items-center img").forEach(applyLogo);
  }

  function patchSupportHeader() {
    if (!/^\/support\/?$/i.test(window.location.pathname)) return;
    const header = document.querySelector("#influnet-support-page header");
    if (!header || header.dataset.influnetLogoPatched === "1") return;
    const link = header.querySelector("a[href='/']");
    if (!link) return;
    link.innerHTML = `<img src="${LOGO_SRC}" alt="Influnet" style="height:36px;width:auto;display:block;" />`;
    header.dataset.influnetLogoPatched = "1";
  }

  function run() {
    patchNav();
    patchSupportHeader();
  }

  const obs = new MutationObserver(run);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
