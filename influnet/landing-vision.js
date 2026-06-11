/**
 * Landing: "Our Vision" section — injected before FAQ.
 */
(function () {
  const SECTION_ID = "influnet-our-vision";

  const FUTURES = [
    "A future where every creator manages their business professionally.",
    "A future where every collaboration begins with trust.",
  ];

  function isHome() {
    const p = window.location.pathname.replace(/\/$/, "") || "/";
    return p === "/";
  }

  function findFaqSection() {
    const faqHeading = Array.from(document.querySelectorAll("h2")).find(
      (el) => el.textContent.trim() === "FAQ"
    );
    return faqHeading ? faqHeading.closest("section") : null;
  }

  function futuresHtml() {
    return FUTURES.map(
      (line, i) =>
        `<p class="ov-future" data-testid="ov-future-${i + 1}">${line}</p>`
    ).join("");
  }

  function buildSection() {
    const section = document.createElement("section");
    section.id = SECTION_ID;
    section.setAttribute("data-testid", "our-vision-section");
    section.innerHTML = `
      <div class="ov-inner">
        <div class="ov-wrap">
          <div class="ov-badge">Our Vision</div>
          <p class="ov-mission">To become the most trusted business platform connecting influencers and brands globally.</p>
          <div class="ov-futures">${futuresHtml()}</div>
          <p class="ov-powered">A future powered by Influnet.</p>
        </div>
      </div>`;
    return section;
  }

  function observeAnimations(section) {
    const targets = section.querySelectorAll(
      ".ov-wrap, .ov-future, .ov-powered"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("ov-visible");
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

    const faq = findFaqSection();
    if (!faq || !faq.parentNode) return;

    const section = buildSection();
    faq.insertAdjacentElement("beforebegin", section);
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
