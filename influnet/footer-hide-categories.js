/**
 * Footer: hide the Categories column (Fashion, Food, Tech, etc.).
 */
(function () {
  function hideCategoriesColumn() {
    const headings = Array.from(document.querySelectorAll("footer div, footer span"));
    const label = headings.find((el) => el.textContent.trim() === "Categories");
    if (!label) return;

    const column = label.closest("footer > div > div") || label.parentElement?.parentElement;
    if (!column || column.dataset.influnetFooterCategoriesHidden === "1") return;

    column.style.display = "none";
    column.setAttribute("aria-hidden", "true");
    column.dataset.influnetFooterCategoriesHidden = "1";
  }

  const obs = new MutationObserver(hideCategoriesColumn);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideCategoriesColumn);
  } else {
    hideCategoriesColumn();
  }
})();
