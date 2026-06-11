/**
 * Landing hero: show Asset landing logo on the right instead of the inline login card.
 */
(function () {
  const LOGO_SRC = "/Asset/Influnet-LOGO/landing-page.png";
  const LOGO_FALLBACK = "/Asset/Influnet-LOGO/Landing%20page.png";

  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function apply() {
    if (!isHome()) return;

    const headings = Array.from(document.querySelectorAll("h2"));
    const welcome = headings.find((h) => h.textContent.trim() === "Welcome Back");
    if (!welcome) return;

    const card = welcome.closest(".max-w-sm") || welcome.closest('[class*="rounded-2xl"]');
    if (!card || card.dataset.influnetLogoReplaced === "1") return;

    const column = card.parentElement;
    if (!column) return;

    card.dataset.influnetLogoReplaced = "1";
    card.style.display = "none";

    let holder = column.querySelector("#influnet-hero-landing-logo");
    if (!holder) {
      holder = document.createElement("div");
      holder.id = "influnet-hero-landing-logo";
      column.appendChild(holder);
    }
    holder.className = "w-full max-w-lg px-2 sm:px-4 flex items-center justify-center";

    let img = holder.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      img.alt = "Influnet platform for influencers and brands";
      img.className = "w-full h-auto object-contain";
      img.style.filter = "drop-shadow(0 20px 60px rgba(124, 58, 237, 0.25))";
      img.loading = "eager";
      img.setAttribute("data-testid", "hero-landing-logo");
      img.onerror = function () {
        if (img.src.indexOf("landing-page") !== -1) img.src = LOGO_FALLBACK;
      };
      holder.appendChild(img);
    }

    if (img.dataset.influnetLandingSrc !== LOGO_SRC) {
      img.src = LOGO_SRC;
      img.dataset.influnetLandingSrc = LOGO_SRC;
    }
  }

  const obs = new MutationObserver(apply);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
