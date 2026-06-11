/**
 * Landing: "Why Influnet Exists" — injected immediately after hero.
 */
(function () {
  const SECTION_ID = "influnet-why-exists";

  const PAIN_POINTS = [
    {
      label: "Instagram DMs",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`,
    },
    {
      label: "WhatsApp Messages",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21a8 8 0 0 0 8-8c0-4.4-3.6-8-8-8S4 8.6 4 13a8 8 0 0 0 1.2 4.2L4 21l3.8-1.2A8 8 0 0 0 12 21z"/></svg>`,
    },
    {
      label: "Emails",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
    },
    {
      label: "Spreadsheets",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>`,
    },
    {
      label: "Manual Follow-ups",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    },
  ];

  const BELIEFS = [
    "We believe creators deserve professional business infrastructure.",
    "We believe businesses deserve a better way to collaborate with creators.",
  ];

  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function findHeroSection() {
    const h1 = Array.from(document.querySelectorAll("h1")).find((el) =>
      el.textContent.includes("Business Operating System")
    );
    return h1 ? h1.closest("section") : null;
  }

  function painPointsHtml() {
    return PAIN_POINTS.map(
      (item) => `
        <li class="we-pain" data-testid="we-pain-${item.label.toLowerCase().replace(/\s+/g, "-")}">
          <span class="we-pain-icon" aria-hidden="true">${item.icon}</span>
          <span>${item.label}</span>
        </li>`
    ).join("");
  }

  function beliefsHtml() {
    return BELIEFS.map(
      (line, i) =>
        `<p class="we-belief" data-testid="we-belief-${i + 1}">${line}</p>`
    ).join("");
  }

  function buildSection() {
    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.setAttribute("data-testid", "why-exists-section");
    section.innerHTML = `
      <div class="we-inner">
        <div class="we-grid">
          <div class="we-content">
            <div class="we-content-inner">
              <div class="we-badge">Our Purpose</div>
              <h2 class="we-heading">Why <span>Influnet Exists</span></h2>
              <p class="we-lead">The creator economy has grown rapidly.</p>
              <p class="we-lead">But the tools available to manage creator-business relationships haven&rsquo;t evolved at the same pace.</p>
              <p class="we-sub">Most collaborations still happen through:</p>
            </div>
          </div>
          <div class="we-panel">
            <div class="we-panel-inner">
              <ul class="we-pains">${painPointsHtml()}</ul>
              <p class="we-change">Influnet was built to change that.</p>
              <div class="we-beliefs">${beliefsHtml()}</div>
              <p class="we-close">Influnet provides that infrastructure.</p>
            </div>
          </div>
        </div>
      </div>`;
    return section;
  }

  function observeAnimations(section) {
    const targets = section.querySelectorAll(
      ".we-content-inner, .we-panel-inner, .we-pain, .we-belief, .we-change, .we-close"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("we-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    targets.forEach((el) => io.observe(el));
  }

  function inject() {
    if (!isHome()) return;
    if (document.getElementById(SECTION_ID)) return;

    const hero = findHeroSection();
    if (!hero || !hero.parentNode) return;

    const section = buildSection();
    hero.insertAdjacentElement("afterend", section);
    observeAnimations(section);
  }

  const obs = new MutationObserver(inject);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inject);
  } else {
    inject();
  }
})();
