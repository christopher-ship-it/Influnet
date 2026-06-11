/**
 * Landing section 3: Trusted Business Opportunities + unified dashboard illustration.
 */
(function () {
  const SECTION_ID = "influnet-opportunities";
  const ILLUSTRATION = "/Asset/opportunities-dashboard-illustration.svg";

  const CHANNELS = [
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
      label: "Brand Requests",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>`,
    },
  ];

  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function findAnchor() {
    return (
      document.getElementById("influnet-creator-economy") ||
      Array.from(document.querySelectorAll("h1"))
        .find((el) => el.textContent.includes("Business Operating System"))
        ?.closest("section")
    );
  }

  function channelsHtml() {
    return CHANNELS.map(
      (c) => `
        <span class="op-channel" data-testid="op-channel-${c.label.toLowerCase().replace(/\s+/g, "-")}">
          <span class="op-channel-icon" aria-hidden="true">${c.icon}</span>
          ${c.label}
        </span>`
    ).join("");
  }

  function buildSection() {
    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.setAttribute("data-testid", "opportunities-section");
    section.innerHTML = `
      <div class="op-inner">
        <div class="op-grid">
          <div class="op-content">
            <div class="op-content-inner">
              <div class="op-badge">Unified Inbox</div>
              <h2 class="op-heading">Trusted <span>Business Opportunities</span></h2>
              <p class="op-desc">
                Creators receive collaboration requests from everywhere — Instagram DMs, WhatsApp, email, and direct brand outreach.
                Influnet brings every opportunity into one professional dashboard so nothing gets lost.
              </p>
              <div class="op-compare">
                <div class="op-compare-card op-before" data-testid="op-before-influnet">
                  <div class="op-compare-label">Before Influnet</div>
                  <p class="op-compare-text">Scattered notifications across multiple platforms, missed messages, and no single view of your pipeline.</p>
                </div>
                <div class="op-compare-card op-after" data-testid="op-after-influnet">
                  <div class="op-compare-label">With Influnet</div>
                  <p class="op-compare-text">Every opportunity organized in one dashboard — requests, campaigns, conversations, and verified brand partnerships.</p>
                </div>
              </div>
              <div class="op-channels">${channelsHtml()}</div>
            </div>
          </div>
          <div class="op-visual">
            <div class="op-visual-inner">
              <div class="op-visual-wrap">
                <div class="op-visual-glow" aria-hidden="true"></div>
                <img src="${ILLUSTRATION}" alt="Instagram, WhatsApp, and email opportunities flowing into the Influnet dashboard" width="760" height="620" loading="lazy" data-testid="opportunities-illustration" />
              </div>
            </div>
          </div>
        </div>
      </div>`;
    return section;
  }

  function observeAnimations(section) {
    const targets = section.querySelectorAll(
      ".op-content-inner, .op-visual-inner, .op-compare-card, .op-channel"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("op-visible");
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
