/**
 * Landing section 4: Verified Businesses. Real Opportunities.
 */
(function () {
  const SECTION_ID = "influnet-verified-business";
  const ILLUSTRATION = "/Asset/verified-business-illustration.svg";

  const STEPS = [
    {
      title: "Business profiles enter verification",
      desc: "Companies submit profile details, website, and company information for review.",
    },
    {
      title: "Influnet validates the business",
      desc: "GST, registration, and platform checks help filter fake or suspicious accounts.",
    },
    {
      title: "Approved businesses earn a badge",
      desc: "Verified brands display a trust badge visible to every creator on the platform.",
    },
    {
      title: "Influencers collaborate with confidence",
      desc: "Creators connect with authentic brands through secure, professional partnerships.",
    },
  ];

  const LABELS = [
    "Verified Business",
    "Trusted Opportunity",
    "Secure Collaboration",
    "Authentic Brand",
  ];

  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function findAnchor() {
    return (
      document.getElementById("influnet-opportunities") ||
      document.getElementById("influnet-creator-economy") ||
      Array.from(document.querySelectorAll("h1"))
        .find((el) => el.textContent.includes("Business Operating System"))
        ?.closest("section")
    );
  }

  function stepsHtml() {
    return STEPS.map(
      (s, i) => `
        <div class="vb-step" data-testid="vb-step-${i + 1}">
          <div class="vb-step-num" aria-hidden="true">${i + 1}</div>
          <div>
            <div class="vb-step-title">${s.title}</div>
            <p class="vb-step-desc">${s.desc}</p>
          </div>
        </div>`
    ).join("");
  }

  function labelsHtml() {
    return LABELS.map(
      (l) =>
        `<span class="vb-label" data-testid="vb-label-${l.toLowerCase().replace(/\s+/g, "-")}">✓ ${l}</span>`
    ).join("");
  }

  function buildSection() {
    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.setAttribute("data-testid", "verified-business-section");
    section.innerHTML = `
      <div class="vb-inner">
        <div class="vb-grid">
          <div class="vb-visual">
            <div class="vb-visual-inner">
              <div class="vb-visual-wrap">
                <div class="vb-visual-glow" aria-hidden="true"></div>
                <img src="${ILLUSTRATION}" alt="Influnet business verification — profiles validated, badges awarded, and trusted creator-brand collaboration" width="760" height="640" loading="lazy" data-testid="verified-business-illustration" />
              </div>
            </div>
          </div>
          <div class="vb-content">
            <div class="vb-content-inner">
              <div class="vb-badge">Trust &amp; Safety</div>
              <h2 class="vb-heading"><span>Verified Businesses.</span> Real Opportunities.</h2>
              <p class="vb-tagline">Collaborate only with verified businesses and trusted opportunities.</p>
              <p class="vb-desc">
                Influnet verifies every business before they can reach creators — so influencers work with genuine brands, not spam or fake accounts.
              </p>
              <div class="vb-steps">${stepsHtml()}</div>
              <div class="vb-labels">${labelsHtml()}</div>
            </div>
          </div>
        </div>
      </div>`;
    return section;
  }

  function observeAnimations(section) {
    const targets = section.querySelectorAll(
      ".vb-content-inner, .vb-visual-inner, .vb-step, .vb-label"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("vb-visible");
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
