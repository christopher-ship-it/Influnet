/**
 * Landing: hide "Creator Categories / Explore Creators Across Multiple Industries" section.
 */
(function () {
  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function hideSection() {
    if (!isHome()) return;

    const label = Array.from(document.querySelectorAll("div, span, p")).find(
      (el) => el.textContent.trim() === "Creator Categories"
    );
    if (!label) return;

    const section = label.closest("section");
    if (!section || section.dataset.influnetHiddenCategories === "1") return;

    section.style.display = "none";
    section.setAttribute("aria-hidden", "true");
    section.dataset.influnetHiddenCategories = "1";
  }

  const obs = new MutationObserver(hideSection);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideSection);
  } else {
    hideSection();
  }
})();
