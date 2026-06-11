/**
 * Landing: hide "Search Collaborators / Smart Match Engine" section.
 */
(function () {
  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function hideSection() {
    if (!isHome()) return;

    const heading = Array.from(document.querySelectorAll("h3, h2, div")).find(
      (el) =>
        el.textContent.trim() === "Search Collaborators" ||
        el.textContent.trim() === "Smart Match Engine"
    );
    if (!heading) return;

    const section = heading.closest("section");
    if (!section || section.dataset.influnetHiddenSearchCollab === "1") return;

    section.style.display = "none";
    section.setAttribute("aria-hidden", "true");
    section.dataset.influnetHiddenSearchCollab = "1";
  }

  const obs = new MutationObserver(hideSection);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideSection);
  } else {
    hideSection();
  }
})();
