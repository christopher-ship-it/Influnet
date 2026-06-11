/**
 * Landing: "Built for the Modern Creator Economy" section (injected after hero).
 */
(function () {
  const SECTION_ID = "influnet-creator-economy";
  const ILLUSTRATION = "/Asset/creator-economy-illustration.svg";

  const CARDS = [
    {
      title: "Professional Collaboration",
      desc: "Manage creator-brand partnerships through a structured workflow.",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M12 11h4"/><path d="M14 9v4"/></svg>`,
    },
    {
      title: "Trusted Relationships",
      desc: "Connect with verified businesses and genuine creators.",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
    },
    {
      title: "Campaign Management",
      desc: "Track opportunities, deliverables, conversations, and results.",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h4"/><path d="M9 8h6"/></svg>`,
    },
    {
      title: "Sustainable Growth",
      desc: "Build long-term partnerships that drive business success.",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 4-4 4 4 5-6"/><circle cx="19" cy="5" r="2"/></svg>`,
    },
  ];

  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function findAnchor() {
    return (
      document.getElementById("influnet-why-exists") || findHeroSection()
    );
  }

  function findHeroSection() {
    const h1 = Array.from(document.querySelectorAll("h1")).find((el) =>
      el.textContent.includes("Business Operating System")
    );
    return h1 ? h1.closest("section") : null;
  }

  function cardsHtml() {
    return CARDS.map(
      (c) => `
        <article class="ce-card" data-testid="ce-card-${c.title.toLowerCase().replace(/\s+/g, "-")}">
          <div class="ce-icon" aria-hidden="true">${c.icon}</div>
          <h3 class="ce-card-title">${c.title}</h3>
          <p class="ce-card-desc">${c.desc}</p>
        </article>`
    ).join("");
  }

  function buildSection() {
    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.setAttribute("data-testid", "creator-economy-section");
    section.innerHTML = `
      <div class="ce-inner">
        <div class="ce-grid">
          <div class="ce-visual">
            <div class="ce-visual-inner">
              <div class="ce-visual-wrap">
                <div class="ce-visual-glow" aria-hidden="true"></div>
                <img src="${ILLUSTRATION}" alt="Creators and brands collaborating through Influnet — campaigns, messages, analytics, and verified partnerships" width="720" height="640" loading="lazy" data-testid="creator-economy-illustration" />
              </div>
            </div>
          </div>
          <div class="ce-content">
            <div class="ce-content-inner">
              <div class="ce-badge">Creator Economy</div>
              <h2 class="ce-heading">Built for the <span>Modern Creator Economy</span></h2>
              <p class="ce-desc">
                The creator economy is no longer a side hustle.<br><br>
                <strong>Creators are building businesses.</strong><br>
                <strong>Brands are building creator partnerships.</strong><br><br>
                Influnet provides the infrastructure that helps both sides collaborate professionally, efficiently, and with confidence.
              </p>
              <div class="ce-cards">${cardsHtml()}</div>
            </div>
          </div>
        </div>
      </div>`;
    return section;
  }

  function observeAnimations(section) {
    const targets = section.querySelectorAll(
      ".ce-content-inner, .ce-visual-inner, .ce-card"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("ce-visible");
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

    const anchor = findAnchor();
    if (!anchor || !anchor.parentNode) return;

    const section = buildSection();
    anchor.insertAdjacentElement("afterend", section);
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
