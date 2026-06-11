/**
 * Landing: hide "Campaign Request / Book Collaborations In Minutes" section.
 */
(function () {
  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function hideSection() {
    if (!isHome()) return;

    const heading = Array.from(document.querySelectorAll("h3, div")).find(
      (el) =>
        el.textContent.trim() === "Campaign Request" ||
        el.textContent.trim() === "Book Collaborations In Minutes"
    );
    if (!heading) return;

    const section = heading.closest("section");
    if (!section || section.dataset.influnetHiddenBookCollab === "1") return;

    section.style.display = "none";
    section.setAttribute("aria-hidden", "true");
    section.dataset.influnetHiddenBookCollab = "1";
  }

  const obs = new MutationObserver(hideSection);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideSection);
  } else {
    hideSection();
  }
})();
