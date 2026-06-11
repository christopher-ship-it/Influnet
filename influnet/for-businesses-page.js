/**
 * /for-businesses — replace legacy page content with updated copy.
 */
(function () {
  const PAGE_ID = "influnet-for-businesses-page";
  const ILLUSTRATION = "/Asset/for-businesses-illustration.svg";

  const FEATURES = [
    {
      title: "Access Creator Profiles",
      desc: "View professional creator profiles that include social media presence, content categories, audience information, portfolio details, and collaboration history.",
    },
    {
      title: "Connect Through Preferred Channels",
      desc: "Creators can share their preferred communication methods, allowing businesses to initiate conversations through the channels creators already use and trust.",
    },
    {
      title: "Manage Collaboration Discussions",
      desc: "Keep all collaboration notes, discussions, requirements, and follow-ups organized in one place.",
    },
    {
      title: "Track Campaign Progress",
      desc: "Monitor active collaborations, deliverables, campaign status, deadlines, and completion progress without relying on spreadsheets.",
    },
    {
      title: "Maintain Relationship History",
      desc: "Build a complete record of every creator interaction, making it easier to nurture long-term relationships and future opportunities.",
    },
    {
      title: "Scale Creator Partnerships",
      desc: "Move beyond one-time collaborations and build a reliable network of creators that can support your brand's growth over time.",
    },
  ];

  const WHY = [
    "Centralized Creator Management",
    "Organized Business Communication",
    "Simplified Campaign Tracking",
    "Better Relationship Management",
    "Reduced Administrative Work",
    "Professional Collaboration Workflow",
  ];

  function isPage() {
    return /^\/for-businesses\/?$/i.test(window.location.pathname);
  }

  function featuresHtml() {
    return FEATURES.map(
      (f) => `
        <div class="fb-feature">
          <h4>${f.title}</h4>
          <p>${f.desc}</p>
        </div>`
    ).join("");
  }

  function whyHtml() {
    return WHY.map((w) => `<li>${w}</li>`).join("");
  }

  function buildPage() {
    const el = document.createElement("div");
    el.id = PAGE_ID;
    el.setAttribute("data-testid", "for-businesses-page");
    el.innerHTML = `
      <div class="fb-wrap">
        <div class="fb-grid">
          <div class="fb-content">
            <div class="fb-badge">For Businesses</div>
            <h1 class="fb-title">Connect With Creators More Professionally</h1>
            <p class="fb-lead">Managing influencer partnerships shouldn't require juggling Instagram DMs, WhatsApp conversations, emails, spreadsheets, and manual follow-ups.</p>
            <p class="fb-text">Influnet provides businesses with a centralized workspace to organize creator relationships, manage communication, track collaborations, and build long-term partnerships.</p>
            <p class="fb-text">Whether you're a startup, agency, local business, or growing brand, Influnet helps streamline every stage of the collaboration process.</p>

            <h2 class="fb-section-title">What Businesses Can Do</h2>
            ${featuresHtml()}

            <h2 class="fb-section-title">Why Businesses Choose Influnet</h2>
            <ul class="fb-checks">${whyHtml()}</ul>

            <p class="fb-close">Stop managing influencer collaborations across multiple disconnected platforms. Bring creator discovery, communication, campaign tracking, and relationship management together in one professional workspace built for the modern creator economy.</p>

            <div class="fb-actions">
              <a href="/signup?role=brand" class="fb-btn fb-btn-primary" data-testid="fb-get-started">Get Started</a>
            </div>
          </div>
          <div class="fb-visual">
            <img src="${ILLUSTRATION}" alt="Business team managing creator collaborations from one Influnet dashboard" width="560" height="480" loading="lazy" data-testid="for-businesses-illustration" />
          </div>
        </div>
      </div>`;
    return el;
  }

  function hideLegacyContent(shell) {
    Array.from(shell.children).forEach((child) => {
      if (child.tagName === "NAV" || child.tagName === "FOOTER" || child.id === PAGE_ID) return;
      child.style.display = "none";
      child.setAttribute("aria-hidden", "true");
      child.dataset.influnetFbHidden = "1";
    });
  }

  function apply() {
    if (!isPage()) return;
    if (document.getElementById(PAGE_ID)) return;

    const shell = document.getElementById("root")?.querySelector(".min-h-screen");
    if (!shell) return;

    hideLegacyContent(shell);

    const nav = shell.querySelector("nav");
    const page = buildPage();
    if (nav) {
      nav.insertAdjacentElement("afterend", page);
    } else {
      shell.prepend(page);
    }

    document.title = "For Businesses — Influnet";
  }

  const obs = new MutationObserver(apply);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
