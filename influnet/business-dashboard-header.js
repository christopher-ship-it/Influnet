/**

 * Business dashboard home: greeting row + gradient hero search banner.

 */

(function () {

  try {
  const RUN_ID = `biz-header-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.__inflBizHeaderRunId = RUN_ID;
  function isLive() {
    return window.__inflBizHeaderRunId === RUN_ID;
  }

  const HERO_ID = "influnet-dashboard-hero";

  const HERO_MOUNT = "influnet-dashboard-hero-mount";

  const SEARCH_RESULTS_ID = "influnet-dashboard-search-results";

  const SEARCH_API = "/api/discover/influencers";

  const HERO_IMAGE = "/Asset/business-dashboard-hero.png?v=1";

  const GREETING_MOUNT = "influnet-dashboard-greeting-mount";

  let lastSearchQuery = "";
  let draftSearchQuery = "";

  function inputDisplayValue() {
    return draftSearchQuery || lastSearchQuery;
  }



  function getUser() {

    try {

      const raw = localStorage.getItem("influnet_user");

      return raw ? JSON.parse(raw) : null;

    } catch {

      return null;

    }

  }



  function isBusinessUser() {
    const role = String(getUser()?.role || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    return (
      role === "business_owner" ||
      role === "business" ||
      role === "brand" ||
      role === "businessowner"
    );
  }



  function normalizeNavText(text) {
    return String(text || "")
      .replace(/\d+/g, "")
      .replace(/\+/g, "")
      .trim();
  }

  function getActiveNavLabel() {
    const nav = document.querySelector(".flex.h-screen aside nav");
    if (!nav) return "Dashboard";
    const active = [...nav.querySelectorAll(":scope > button")].find(
      (b) =>
        b.classList.contains("bg-violet-100") ||
        /\bbg-violet-100\b/.test(b.className)
    );
    return active ? normalizeNavText(active.textContent) : "Dashboard";
  }

  function isDashboardHomeActive() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (path !== "/dashboard" || !isBusinessUser()) return false;
    if (document.getElementById("influnet-settings-mount")?.childElementCount) return false;
    if (typeof window.influnetBizIsDashboardHome === "function") {
      return window.influnetBizIsDashboardHome();
    }
    return getActiveNavLabel() === "Dashboard";
  }

  /** Home shell only on Dashboard tab while React home panel (hero mount) is mounted. */
  function shouldApplyHomeShell() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (path !== "/dashboard" || !isBusinessUser()) return false;
    if (document.getElementById("influnet-settings-mount")?.childElementCount) return false;
    if (window.influnetBizIsDefinitelyDashboard?.()) {
      return !!document.getElementById(HERO_MOUNT);
    }
    if (getActiveNavLabel() !== "Dashboard") return false;
    return !!document.getElementById(HERO_MOUNT);
  }

  function isMessagesTabActive() {
    if (typeof window.influnetBizIsMessagesTab === "function") {
      return window.influnetBizIsMessagesTab();
    }
    return getActiveNavLabel().toLowerCase() === "messages";
  }

  function syncMessagesBodyClass() {
    document.body.classList.toggle(
      "infl-business-messages-view",
      isMessagesTabActive()
    );
  }

  function isBusinessDashboardShell() {
    return shouldApplyHomeShell();
  }

  const VERIFY_BANNER_ID = "influnet-biz-verify-banner";

  function isBusinessVerificationPending(user) {
    if (!user) return false;
    const role = String(user.role || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (role !== "business_owner" && role !== "business") return false;
    const status = String(user.approvalStatus || "pending_review").toLowerCase();
    return status !== "approved" && status !== "rejected";
  }

  function syncVerificationBanner() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (!path.startsWith("/dashboard") || path.startsWith("/dashboard/influencer")) {
      document.getElementById(VERIFY_BANNER_ID)?.remove();
      return;
    }
    if (!isBusinessUser()) {
      document.getElementById(VERIFY_BANNER_ID)?.remove();
      return;
    }
    // Bento home shows verification in status pills — avoid duplicate full-width banner.
    if (isDashboardHomeActive()) {
      document.getElementById(VERIFY_BANNER_ID)?.remove();
      return;
    }
    if (
      document.querySelector(
        "[data-infl-biz-dashboard] .infl-bdash-verify-notice, [data-infl-biz-dashboard] .infl-bdash-status-pill--warn"
      )
    ) {
      document.getElementById(VERIFY_BANNER_ID)?.remove();
      return;
    }
    const pending = isBusinessVerificationPending(getUser());
    const scroll = getScrollMain();
    let banner = document.getElementById(VERIFY_BANNER_ID);
    if (!pending) {
      banner?.remove();
      return;
    }
    if (!scroll) return;
    if (!banner) {
      banner = document.createElement("div");
      banner.id = VERIFY_BANNER_ID;
      banner.className = "influnet-biz-verify-banner";
      banner.setAttribute("role", "status");
      scroll.insertBefore(banner, scroll.firstChild);
    }
    banner.innerHTML =
      "<p>Your account is being verified. We'll let you know once your business profile is approved.</p>";
  }

  function isDashboardHome() {
    return shouldApplyHomeShell();
  }

  function removeGreetingBanner() {
    document.getElementById(GREETING_MOUNT)?.remove();
    document.querySelectorAll("header .influnet-dash-greeting").forEach((el) => {
      el.remove();
    });
    document.querySelectorAll("header[data-influnet-dash-shell]").forEach((h) => {
      delete h.dataset.influnetDashShell;
      h.classList.remove("influnet-dash-shell-header");
    });
  }

  function mountGreetingBanner() {
    const heroMount = document.getElementById(HERO_MOUNT);
    if (!heroMount?.parentNode) return;

    const user = getUser();
    const firstName = (user?.name?.trim() || "there").split(" ")[0];

    let mount = document.getElementById(GREETING_MOUNT);
    if (!mount) {
      mount = document.createElement("div");
      mount.id = GREETING_MOUNT;
      mount.className = "influnet-dash-greeting-banner";
      heroMount.parentNode.insertBefore(mount, heroMount);
    }

    mount.innerHTML = `
      <div class="influnet-dash-greeting">
        <h1>${getGreeting()}, ${escapeHtml(firstName)}! 👋</h1>
        <p>Discover influential creators and build powerful brand collaborations.</p>
      </div>`;
  }

  function teardownHomeShell(scroll) {
    scroll?.classList.remove("influnet-dash-home-main");
    removeGreetingBanner();
    syncMessagesBodyClass();
  }



  function getGreeting() {

    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning";

    if (hour < 17) return "Good Afternoon";

    return "Good Evening";

  }



  function getMainColumn() {

    return (

      document.querySelector(".flex.h-screen .flex-1.flex.flex-col.min-w-0") ||

      document.querySelector("main.flex-1.overflow-y-auto")?.parentElement ||

      document.querySelector("#root main")?.parentElement

    );

  }



  function getScrollMain() {

    return (

      getMainColumn()?.querySelector("main.flex-1.overflow-y-auto") ||

      document.querySelector("main.flex-1.overflow-y-auto") ||

      document.querySelector("#root main")

    );

  }



  function buildSearchUrl(query) {

    const params = new URLSearchParams();

    const q = (query || "").trim();

    if (q) params.set("search", q);

    const qs = params.toString();

    return qs ? `${SEARCH_API}?${qs}` : SEARCH_API;

  }



  function escapeHtml(str) {

    return String(str)

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/"/g, "&quot;");

  }



  function searchIconSvg() {

    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;

  }



  function parseInflunetSlug(query) {

    const t = String(query || "").trim();

    if (!t) return null;

    const fromPath = t.match(/influnet[/\\]([a-z0-9._-]+)/i);

    if (fromPath) return fromPath[1].toLowerCase();

    if (/^[a-z0-9][a-z0-9._-]{2,29}$/i.test(t)) return t.toLowerCase();

    return null;

  }



  function buildHeroHtml() {
    return `
      <section id="${HERO_ID}" class="influnet-dash-hero-section influnet-dash-hero-compact" aria-label="Creator search">
        <div class="influnet-dash-search-anchor">
          <form class="influnet-dash-search-wrap influnet-dash-search-compact" data-influnet-search-form novalidate>
            <input type="search" name="search" autocomplete="off"
              placeholder="Search creators by name or URL..."
              value="${escapeHtml(inputDisplayValue())}" aria-label="Search creators" />
            <button type="button" class="influnet-dash-search-btn" data-influnet-search-submit aria-label="Search">${searchIconSvg()}</button>
          </form>
          <div id="${SEARCH_RESULTS_ID}" class="influnet-dash-search-results" hidden></div>
        </div>
      </section>`;
  }



  function tidyDashboardHeader(header) {
    if (!header) return;
    header.querySelectorAll("button").forEach((btn) => {
      if (/upgrade/i.test(btn.textContent || "")) btn.remove();
    });
  }

  function wireNavSync() {
    const nav = document.querySelector(".flex.h-screen aside nav");
    if (!nav || nav.dataset.inflDashNavSync) return;
    nav.dataset.inflDashNavSync = "1";
    nav.addEventListener("click", () => {
      [0, 80, 200, 450, 900].forEach((ms) => {
        window.setTimeout(() => window.influnetSyncBusinessDashboardShell?.(), ms);
        window.setTimeout(() => window.influnetGuardBusinessMessages?.(), ms);
      });
    });
  }



  function getSearchResultsMount() {

    return document.getElementById(SEARCH_RESULTS_ID);

  }



  function hideSearchDropdown() {

    const mount = getSearchResultsMount();

    if (!mount) return;

    mount.hidden = true;

    mount.classList.remove("influnet-dash-search-results--open");

    mount.innerHTML = "";

  }



  function showSearchDropdown(innerHtml) {

    const mount = getSearchResultsMount();

    if (!mount) return;

    mount.hidden = false;

    mount.classList.add("influnet-dash-search-results--open");

    mount.innerHTML = `<div class="influnet-dash-search-dropdown">${innerHtml}</div>`;

  }



  function renderSearchMessage(html) {

    showSearchDropdown(html);

  }



  function buildSearchResultRow({ name, username, slug, niche, href, avatarContent }) {

    const avatarInner =

      avatarContent ||

      escapeHtml((name || "C").trim().charAt(0).toUpperCase());

    return `

      <div class="influnet-dash-search-row">

        <div class="influnet-dash-search-row-profile">

          <div class="influnet-dash-search-card-avatar">${avatarInner}</div>

          <div class="influnet-dash-search-row-text">

            <p class="influnet-dash-search-card-name">${escapeHtml(name || "Creator")}</p>

            <p class="influnet-dash-search-card-username">@${escapeHtml(username || slug || "username")}</p>

            <p class="influnet-dash-search-card-niche">${escapeHtml(niche)}</p>

          </div>

        </div>

        <div class="influnet-dash-search-row-actions">

          <a class="influnet-dash-search-open-btn" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">View</a>

        </div>

      </div>`;

  }



  function nicheLabel(niche) {

    if (Array.isArray(niche)) return niche.filter(Boolean)[0] || "Creator";

    if (typeof niche === "string") {

      try {

        const parsed = JSON.parse(niche);

        if (Array.isArray(parsed) && parsed.length) return parsed[0];

      } catch {

        return niche;

      }

    }

    return "Creator";

  }

  function formatCount(n) {

    const num = Number(n) || 0;

    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;

    if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;

    return String(num);

  }

  function bioSnippet(bio, max) {

    const text = String(bio || "").trim();

    if (!text) return "";

    if (text.length <= max) return text;

    return `${text.slice(0, max).trim()}…`;

  }



  async function fetchPublicProfile(slug) {

    const res = await fetch(`/api/public/influencer/${encodeURIComponent(slug)}`, {

      credentials: "same-origin",

    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) return null;

    return data;

  }



  function renderPublicProfileResult(profile, slug) {

    const mount = getSearchResultsMount();

    if (!mount) return;

    const username = profile.username || slug;

    const href = `/influnet/${encodeURIComponent(slug)}`;

    const ini = (profile.name || "C").trim().charAt(0).toUpperCase();

    const avatarHtml = profile.avatarUrl

      ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="" />`

      : escapeHtml(ini);

    const bio = bioSnippet(profile.bio, 120);

    const stats = [];

    if (Number(profile.instagramFollowers) > 0) {

      stats.push(`Instagram <strong>${formatCount(profile.instagramFollowers)}</strong>`);

    }

    if (Number(profile.youtubeSubscribers) > 0) {

      stats.push(`YouTube <strong>${formatCount(profile.youtubeSubscribers)}</strong>`);

    }

    if (Number(profile.tiktokFollowers) > 0) {

      stats.push(`TikTok <strong>${formatCount(profile.tiktokFollowers)}</strong>`);

    }

    if (profile.instagramHandle) {

      stats.push(`@${escapeHtml(String(profile.instagramHandle).replace(/^@/, ""))}`);

    }

    showSearchDropdown(`

      <div class="influnet-dash-search-results-head">

        <h3>Creator found</h3>

        <span>@${escapeHtml(username || "username")}</span>

      </div>

      ${buildSearchResultRow({

        name: profile.name,

        username: profile.username || slug,

        slug,

        niche: nicheLabel(profile.niche),

        href,

        avatarContent: avatarHtml,

      })}

      ${profile.location || bio || stats.length ? `

      <div class="influnet-dash-search-public-details">

        ${profile.location ? `<p class="influnet-dash-search-card-loc">📍 ${escapeHtml(profile.location)}</p>` : ""}

        ${bio ? `<p class="influnet-dash-search-card-bio">${escapeHtml(bio)}</p>` : ""}

        ${stats.length ? `<div class="influnet-dash-search-card-stats">${stats.map((s) => `<span class="influnet-dash-search-card-stat">${s}</span>`).join("")}</div>` : ""}

      </div>` : ""}`);

  }



  async function runSearch(query) {

    lastSearchQuery = (query || "").trim();
    draftSearchQuery = lastSearchQuery;

    const slugQuery = parseInflunetSlug(lastSearchQuery);



    const params = new URLSearchParams();

    if (lastSearchQuery) params.set("search", lastSearchQuery);

    window.history.replaceState(

      {},

      "",

      params.toString() ? `?${params}` : window.location.pathname

    );



    if (!lastSearchQuery) {

      hideSearchDropdown();

      return;

    }



    renderSearchMessage('<p class="influnet-dash-search-status">Searching creators…</p>');



    try {

      if (slugQuery) {

        const profile = await fetchPublicProfile(slugQuery);

        if (profile) {

          renderPublicProfileResult(profile, slugQuery);

          return;

        }

        renderSearchMessage(`

          <div class="influnet-dash-search-empty">

            <h3>Profile not found</h3>

            <p>No creator at <strong>influnet/${escapeHtml(slugQuery)}</strong>. Check the link or ask them to complete their Influnet profile.</p>

          </div>`);

        return;

      }



      const res = await fetch(buildSearchUrl(lastSearchQuery), { credentials: "same-origin" });

      const data = await res.json().catch(() => []);

      const list = Array.isArray(data) ? data : [];



      if (!res.ok) {

        renderSearchMessage(

          '<p class="influnet-dash-search-status influnet-dash-search-error">Search failed. Please sign in again and retry.</p>'

        );

        return;

      }



      renderSearchResults(list);

    } catch (err) {

      console.warn("[influnet] search:", err);

      renderSearchMessage(

        '<p class="influnet-dash-search-status influnet-dash-search-error">Search failed. Check your connection and try again.</p>'

      );

    }

  }



  function renderSearchResults(list) {

    if (!getSearchResultsMount()) return;



    if (!list.length) {

      showSearchDropdown(`

        <div class="influnet-dash-search-empty">

          <h3>No creators found</h3>

          <p>Try <strong>influnet/creator-name</strong> or search by name.</p>

        </div>`);

      return;

    }



    showSearchDropdown(`

      <div class="influnet-dash-search-results-head">

        <h3>Search Results</h3>

        <span>${list.length} creator${list.length === 1 ? "" : "s"}</span>

      </div>

      <div class="influnet-dash-search-list">

        ${list

          .slice(0, 12)

          .map((item) => {

            const niche = Array.isArray(item.niche) ? item.niche[0] : item.niche || "Creator";

            const slug = item.username || item.profileSlug || parseInflunetSlug(item.publicPath) || "";

            const href = slug ? `/influnet/${encodeURIComponent(slug)}` : "#";

            return buildSearchResultRow({

              name: item.name,

              username: item.username,

              slug,

              niche,

              href,

            });

          })

          .join("")}

      </div>`);

  }



  function bindSearchForm(root) {

    const form = root?.querySelector?.("[data-influnet-search-form]");

    if (!form || form.dataset.influnetSearchBound === "1") return;

    form.dataset.influnetSearchBound = "1";



    const submit = () => runSearch(form.querySelector("input")?.value || "");



    form.addEventListener("submit", (e) => {

      e.preventDefault();

      e.stopImmediatePropagation();

      submit();

    });



    form.querySelector("[data-influnet-search-submit]")?.addEventListener("click", (e) => {

      e.preventDefault();

      e.stopImmediatePropagation();

      submit();

    });



    const input = form.querySelector('input[name="search"]');

    input?.addEventListener("input", () => {
      draftSearchQuery = input.value;
      if (!String(input.value || "").trim()) {
        runSearch("");
      }
    });

    input?.addEventListener("paste", () => {
      window.setTimeout(() => {
        draftSearchQuery = input.value;
        if (!String(input.value || "").trim()) {
          runSearch("");
        }
      }, 0);
    });

    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });

  }



  function wireHeroImage(slot) {

    if (!slot || slot.dataset.influnetHeroImageWired === "1") return;

    slot.dataset.influnetHeroImageWired = "1";

    const img = slot.querySelector("img");

    if (!img) return;



    const show = () => slot.classList.remove("is-empty");

    const hide = () => slot.classList.add("is-empty");



    img.addEventListener("load", () => {

      if (img.naturalWidth > 0) show();

      else hide();

    });

    img.addEventListener("error", hide);

    if (img.complete) {

      if (img.naturalWidth > 0) show();

      else hide();

    }

  }



  function dedupeHeroSections() {
    const heroes = document.querySelectorAll(`[id="${HERO_ID}"]`);
    for (let i = 1; i < heroes.length; i++) heroes[i].remove();
    return heroes[0] || document.getElementById(HERO_ID);
  }

  function mountHero() {
    const mount = document.getElementById(HERO_MOUNT);
    if (!mount) return;

    let hero = dedupeHeroSections();

    const input =
      hero?.querySelector('input[name="search"]') ||
      mount.querySelector('input[name="search"]');
    if (input && document.activeElement === input) {
      draftSearchQuery = input.value;
    } else if (input?.value) {
      draftSearchQuery = input.value;
    }

    if (!hero) {
      mount.innerHTML = buildHeroHtml();
      hero = document.getElementById(HERO_ID);
      if (lastSearchQuery) runSearch(lastSearchQuery);
    } else {
      mount.querySelector("[data-influnet-chips], .influnet-dash-chips")?.remove();
    }

    wireHeroImage(mount.querySelector("[data-influnet-hero-image]"));
    bindSearchForm(hero || mount);

    window.influnetPortalBizSearch?.();
  }



  function readUrlParams() {

    const params = new URLSearchParams(window.location.search);

    const fromUrl = params.get("search") || params.get("q") || "";
    if (fromUrl) {
      lastSearchQuery = fromUrl;
      draftSearchQuery = fromUrl;
    }

  }



  let applying = false;

  let enhanceTimer = null;

  let homeShellActive = false;



  function enhance() {
    if (!isLive()) return;

    if (applying) return;

    const header = getMainColumn()?.querySelector("header");
    const scroll = getScrollMain();

    wireNavSync();

    const applyHome = shouldApplyHomeShell();

    if (!applyHome) {
      if (homeShellActive) {
        teardownHomeShell(scroll);
        homeShellActive = false;
      } else {
        removeGreetingBanner();
        syncMessagesBodyClass();
      }
      syncVerificationBanner();
      window.influnetGuardBusinessMessages?.();
      return;
    }

    document.body.classList.remove("infl-business-messages-view");

    applying = true;
    homeShellActive = true;

    try {
      tidyDashboardHeader(header);
      readUrlParams();
      scroll?.classList.add("influnet-dash-home-main");
      mountHero();
      syncVerificationBanner();
    } finally {
      applying = false;
    }

  }



  function scheduleEnhance() {
    if (!isLive()) return;

    if (enhanceTimer) return;

    enhanceTimer = window.setTimeout(() => {
      if (!isLive()) return;

      enhanceTimer = null;

      enhance();

    }, 120);

  }



  window.addEventListener("load", scheduleEnhance);

  document.addEventListener("DOMContentLoaded", scheduleEnhance);

  window.addEventListener("influnet-user-updated", () => {
    syncVerificationBanner();
  });

  scheduleEnhance();

  if (window.__inflBizHeaderHeartbeat) {
    clearInterval(window.__inflBizHeaderHeartbeat);
  }
  window.__inflBizHeaderHeartbeat = window.setInterval(() => {
    if (!isLive()) return;
    if (window.location.pathname.replace(/\/$/, "") !== "/dashboard") return;
    if (isMessagesTabActive()) {
      syncMessagesBodyClass();
      window.influnetGuardBusinessMessages?.();
    }
  }, 5000);

  window.influnetSyncBusinessDashboardShell = function () {
    scheduleEnhance();
    window.influnetSyncBusinessDashboardLayout?.(true);
  };

  window.influnetEnsureBizHeroSearch = mountHero;

  window.influnetClearBusinessHomeGreeting = function () {
    removeGreetingBanner();
    syncMessagesBodyClass();
    window.influnetGuardBusinessMessages?.();
  };

  } catch (err) {

    console.warn("[influnet] dashboard header:", err);

  }

})();


