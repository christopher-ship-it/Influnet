/**
 * /for-influencers — replace legacy page content with updated copy.
 */
(function () {
  const PAGE_ID = "influnet-for-influencers-page";
  const ILLUSTRATION = "/Asset/for-influencers-illustration.svg";

  const CAPABILITIES = [
    "Build a Professional Creator Profile",
    "Showcase Social Media Accounts",
    "Display Portfolio & Previous Collaborations",
    "Highlight Categories & Content Niches",
    "Share Preferred Contact Information",
    "Increase Visibility to Businesses",
    "Build Long-Term Brand Relationships",
  ];

  function isPage() {
    return /^\/for-influencers\/?$/i.test(window.location.pathname);
  }

  function checksHtml() {
    return CAPABILITIES.map(
      (item, i) =>
        `<li class="fi-check-card" data-testid="fi-capability-${i + 1}" style="transition-delay:${0.05 + i * 0.05}s"><span class="fi-check-icon" aria-hidden="true">✓</span><span>${item}</span></li>`
    ).join("");
  }

  function buildPage() {
    const el = document.createElement("div");
    el.id = PAGE_ID;
    el.setAttribute("data-testid", "for-influencers-page");
    el.innerHTML = `
      <div class="fi-glow-top" aria-hidden="true"></div>
      <div class="fi-glow-bottom" aria-hidden="true"></div>
      <div class="fb-wrap">
        <div class="fb-grid">
          <div class="fb-content">
            <div class="fi-content-inner">
              <div class="fi-badge">For Influencers</div>
              <h1 class="fb-title">Turn Your <span>Creator Profile</span> Into a Professional Business Presence</h1>
              <p class="fb-lead">Influnet helps creators showcase their work, attract business opportunities, and build meaningful brand relationships.</p>
              <p class="fb-text">Create a professional profile that highlights your content, audience, niche, and collaboration experience.</p>
              <p class="fb-text">Businesses can easily discover your profile, understand your expertise, and connect with you through your preferred communication channels.</p>

              <h2 class="fi-section-title">What Creators Can Do</h2>
              <ul class="fi-check-grid">${checksHtml()}</ul>

              <div class="fi-focus-card">
                <h2 class="fi-section-title">Focus on Creating Content</h2>
                <p class="fb-text">Spend less time explaining who you are and what you do.</p>
                <p class="fb-text">Let your Influnet profile showcase your value while businesses discover and connect with you professionally.</p>
              </div>

              <p class="fb-close">Whether you're a micro creator, influencer, YouTuber, or content professional, Influnet helps you establish a stronger business presence and unlock new collaboration opportunities.</p>

              <div class="fb-actions">
                <a href="/?#creator-signup" class="fb-btn fb-btn-primary" data-testid="fi-get-started">Get Started</a>
                <a href="/login" class="fb-btn fb-btn-outline" data-testid="fi-login">Log In</a>
              </div>
            </div>
          </div>
          <div class="fb-visual">
            <div class="fi-visual-inner">
              <div class="fi-visual-frame">
                <div class="fi-visual-glow" aria-hidden="true"></div>
                <img src="${ILLUSTRATION}" alt="Professional creator profile with social accounts, portfolio, and brand visibility on Influnet" width="560" height="480" loading="lazy" data-testid="for-influencers-illustration" />
              </div>
            </div>
          </div>
        </div>
      </div>`;
    return el;
  }

  function observeAnimations(section) {
    const targets = section.querySelectorAll(
      ".fi-content-inner, .fi-visual-inner, .fi-check-card, .fi-focus-card, .fb-close"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("fi-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    targets.forEach((el) => io.observe(el));
  }

  function hideLegacyContent(shell) {
    Array.from(shell.children).forEach((child) => {
      if (child.tagName === "NAV" || child.tagName === "FOOTER" || child.id === PAGE_ID) return;
      child.style.display = "none";
      child.setAttribute("aria-hidden", "true");
      child.dataset.influnetFiHidden = "1";
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

    observeAnimations(page);
    document.title = "For Influencers — Influnet";
  }

  const obs = new MutationObserver(apply);
  obs.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
