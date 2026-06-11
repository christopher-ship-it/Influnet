/**
 * Remove /pricing: redirect to home and hide any remaining pricing links.
 */
(function () {
  function isPricingPage() {
    return /^\/pricing\/?$/i.test(window.location.pathname);
  }

  function redirect() {
    if (isPricingPage()) {
      window.location.replace("/");
    }
  }

  function hideLinks() {
    document.querySelectorAll('a[href="/pricing"], a[href="/pricing/"]').forEach((a) => {
      const wrap = a.closest("div") || a.parentElement;
      if (wrap && wrap.dataset.influnetPricingHidden !== "1") {
        wrap.style.display = "none";
        wrap.setAttribute("aria-hidden", "true");
        wrap.dataset.influnetPricingHidden = "1";
      } else if (a.dataset.influnetPricingHidden !== "1") {
        a.style.display = "none";
        a.dataset.influnetPricingHidden = "1";
      }
    });
  }

  redirect();
  hideLinks();

  const obs = new MutationObserver(() => {
    redirect();
    hideLinks();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
