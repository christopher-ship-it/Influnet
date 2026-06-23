/**
 * Site header: Influnet logo in nav — Logo.png on index, black-logo elsewhere.
 */
(function () {
  const HOME_LOGO_SRC = "/Asset/Influnet-LOGO/Logo.png";
  const DEFAULT_LOGO_SRC = "/Asset/Influnet-LOGO/black-logo.png";
  const OLD_SRCS = [
    "/app/assets/influnet-logo-BB9OG6CE.png",
    "/assets/influnet-logo-BB9OG6CE.png",
    "influnet-logo-BB9OG6CE.png",
  ];

  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function logoSrcForPage() {
    return isHome() ? HOME_LOGO_SRC : DEFAULT_LOGO_SRC;
  }

  function applyLogo(img) {
    if (!img) return;
    const targetSrc = logoSrcForPage();
    const src = img.getAttribute("src") || "";
    const inNav = !!img.closest("nav");
    const isOld = OLD_SRCS.some((s) => src.includes(s));
    const alreadyApplied =
      img.dataset.influnetHeaderLogo === "1" && img.dataset.influnetHeaderLogoSrc === targetSrc;

    if (alreadyApplied) return;
    if (!inNav && src === targetSrc) return;
    if (
      !inNav &&
      !isOld &&
      src &&
      !src.includes("black-logo.png") &&
      !src.includes("Black -Logo-.png") &&
      !src.includes("Logo.png")
    ) {
      return;
    }

    img.src = targetSrc;
    img.alt = "Influnet";
    img.className = (img.className || "").replace(/\bh-\d+\b/, "h-9") || "h-9 w-auto";
    if (!img.className.includes("w-auto")) img.className += " w-auto";
    img.style.height = img.style.height || "";
    img.dataset.influnetHeaderLogo = "1";
    img.dataset.influnetHeaderLogoSrc = targetSrc;
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
    link.innerHTML = `<img src="${HOME_LOGO_SRC}" alt="Influnet" style="height:36px;width:auto;display:block;" />`;
    header.dataset.influnetLogoPatched = "1";
  }

  function run() {
    patchNav();
    patchSupportHeader();
  }

  const obs = new MutationObserver(run);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", run);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
