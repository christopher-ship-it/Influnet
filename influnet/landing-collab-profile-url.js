/**
 * Style step-1 collaboration card profile URL on landing / how-it-works.
 */
(function () {
  const URL_TEXT = "influnet.com/tim";
  const OLD_STEP1_LABELS = ["Discover Creators"];
  const NEW_STEP1_FOOT = "View Profile";

  function isTargetPage() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/" || p === "/how-it-works";
  }

  function styleUrl(el) {
    if (!el || el.dataset.influnetUrlStyled === "1") return;
    if (el.textContent.trim() !== URL_TEXT) return;

    el.dataset.influnetUrlStyled = "1";
    el.innerHTML =
      '<span style="color:#9ca3af;font-weight:600;">influnet.com/</span><span style="color:#ee3e96;font-weight:800;">tim</span>';
    el.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    el.style.fontSize = "1.05rem";
    el.style.letterSpacing = "-0.02em";

    const sub = el.nextElementSibling;
    if (sub && sub.textContent.trim() === "") {
      sub.style.display = "none";
    }

    const card = el.closest('[class*="rounded"]');
    if (card) {
      card.style.borderColor = "rgba(238, 62, 150, 0.25)";
    }
  }

  function patchStep1Labels() {
    const section = Array.from(document.querySelectorAll("h1, h2, h3")).find((el) =>
      el.textContent.includes("How Collaborations Work")
    );
    if (!section) return;
    const root = section.closest("section")?.parentElement || document;
    const stepBlocks = root.querySelectorAll(".grid.lg\\:grid-cols-2, [class*='grid-cols-2']");
    stepBlocks.forEach((block) => {
      const num = block.querySelector(".text-5xl, [class*='text-5xl']");
      if (!num || num.textContent.trim() !== "1") return;
      block.querySelectorAll("span.text-sm, span[class*='text-sm']").forEach((span) => {
        if (OLD_STEP1_LABELS.includes(span.textContent.trim())) {
          span.textContent = NEW_STEP1_FOOT;
        }
      });
    });
  }

  function apply() {
    if (!isTargetPage()) return;
    document.querySelectorAll("div").forEach((el) => {
      if (el.children.length === 0 && el.textContent.trim() === URL_TEXT) {
        styleUrl(el);
      }
    });
    patchStep1Labels();
  }

  const obs = new MutationObserver(apply);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
