/**
 * Pre-footer CTA: Join the Creator Business Revolution.
 */
(function () {
  const SECTION_ID = "influnet-landing-cta";

  const PILLARS = [
    "Manage Opportunities.",
    "Build Relationships.",
    "Run Campaigns.",
    "Grow Your Influence.",
  ];

  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function findFooter() {
    const copy = Array.from(document.querySelectorAll("p")).find((el) =>
      el.textContent.includes("Influnet. All rights reserved")
    );
    return copy ? copy.closest("footer") : document.querySelector("footer");
  }

  function pillarsHtml() {
    return PILLARS.map(
      (text, i) =>
        `<div class="cta-pillar" data-testid="cta-pillar-${i + 1}"><span class="cta-pillar-dot" aria-hidden="true"></span>${text}</div>`
    ).join("");
  }

  function buildSection() {
    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.setAttribute("data-testid", "landing-cta-section");
    section.innerHTML = `
      <div class="cta-inner">
        <div class="cta-wrap">
          <div class="cta-eyebrow">Get Started Today</div>
          <h2 class="cta-heading">Join the <span>Creator Business Revolution</span></h2>
          <div class="cta-pillars">${pillarsHtml()}</div>
          <p class="cta-welcome">Welcome to Influnet.</p>
          <p class="cta-sub">
            <strong>The Business Operating System for Influencers and Brands.</strong>
          </p>
          <div class="cta-actions">
            <a href="/?#creator-signup" class="cta-btn cta-btn-primary" data-testid="cta-get-started">Get Started</a>
            <a href="/support" class="cta-btn cta-btn-outline" data-testid="cta-book-demo">Book a Demo</a>
          </div>
        </div>
      </div>`;
    return section;
  }

  function observeAnimations(section) {
    const targets = section.querySelectorAll(
      ".cta-wrap, .cta-pillar, .cta-welcome, .cta-sub, .cta-actions"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("cta-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach((el) => io.observe(el));
  }

  function inject() {
    if (!isHome()) return;
    if (document.getElementById(SECTION_ID)) return;

    const footer = findFooter();
    if (!footer || !footer.parentNode) return;

    const section = buildSection();
    footer.insertAdjacentElement("beforebegin", section);
    hideLegacyCta(section);
    observeAnimations(section);
  }

  function hideLegacyCta(newSection) {
    const legacy = newSection.previousElementSibling;
    if (!legacy || legacy.tagName !== "SECTION") return;
    if (
      legacy.querySelector('[data-testid="button-cta-influencer"]') ||
      legacy.querySelector('[data-testid="button-cta-brand"]') ||
      /Join As (Influencer|Brand)/i.test(legacy.textContent)
    ) {
      legacy.style.display = "none";
      legacy.setAttribute("aria-hidden", "true");
    }
  }

  const obs = new MutationObserver(inject);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
