/**
 * Account Settings — two-column dashboard layout (influencer).
 * Isolated from progressive onboarding wizard.
 */
(function () {
  const ROOT_ID = "ias-app";

  const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
  const LANGUAGES = [
    "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
    "Marathi", "Bengali", "Gujarati", "Punjabi", "Urdu", "French", "Spanish",
  ];
  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
    "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
  ];

  const COLLAB_TYPES = [
    { id: "reel", label: "Reel" },
    { id: "story", label: "Story" },
    { id: "post", label: "Feed Post" },
    { id: "yt", label: "YouTube Video" },
    { id: "event", label: "Event Appearance" },
  ];

  const PRICE_RANGES = [
    { id: "under10k", label: "Starter", range: "Under ₹10K" },
    { id: "10kto50k", label: "Growth", range: "₹10K – ₹50K" },
    { id: "50kto2l", label: "Premium", range: "₹50K – ₹2L" },
    { id: "2lplus", label: "Elite", range: "₹2L+" },
  ];

  const PRICE_DISPLAY_MAP = {
    entry: "under10k",
    standard: "10kto50k",
    premium: "50kto2l",
    pro: "2lplus",
    under10k: "under10k",
    "10kto50k": "10kto50k",
    "50kto2l": "50kto2l",
    "2lplus": "2lplus",
  };

  const CORE_PLATFORMS = [
    {
      id: "ig",
      label: "Instagram",
      abbr: "IG",
      cls: "ig",
      prefix: "instagram.com/",
      handleKey: "instagramHandle",
      metricKey: "instagramFollowers",
      required: true,
    },
    {
      id: "fb",
      label: "Facebook",
      abbr: "FB",
      cls: "fb",
      prefix: "facebook.com/",
      handleKey: "facebookHandle",
      metricKey: "facebookFollowers",
      required: true,
    },
    {
      id: "yt",
      label: "YouTube",
      abbr: "YT",
      cls: "yt",
      prefix: "youtube.com/@",
      handleKey: "youtubeHandle",
      metricKey: "youtubeSubscribers",
      metricLabel: "Subscribers",
      required: true,
    },
    {
      id: "sc",
      label: "Snapchat",
      abbr: "SC",
      cls: "sc",
      prefix: "snapchat.com/add/",
      extraId: "snapchat",
      metricExtraId: "snapchat",
      required: false,
    },
    {
      id: "li",
      label: "LinkedIn",
      abbr: "IN",
      cls: "li",
      prefix: "linkedin.com/in/",
      handleKey: "linkedinHandle",
      metricExtraId: "linkedin",
      required: false,
    },
  ];

  const ADDABLE_PLATFORMS = [
    {
      id: "tt",
      label: "TikTok",
      abbr: "TT",
      cls: "tt",
      prefix: "tiktok.com/@",
      handleKey: "tiktokHandle",
      metricKey: "tiktokFollowers",
      required: false,
    },
    {
      id: "tw",
      label: "X (Twitter)",
      abbr: "X",
      cls: "tw",
      prefix: "x.com/",
      handleKey: "twitterHandle",
      metricExtraId: "twitter",
      required: false,
    },
    {
      id: "pin",
      label: "Pinterest",
      abbr: "P",
      cls: "pin",
      prefix: "pinterest.com/",
      extraId: "pinterest",
      metricExtraId: "pinterest",
      required: false,
    },
    {
      id: "web",
      label: "Website",
      abbr: "W",
      cls: "web",
      prefix: "https://",
      extraId: "website",
      metricExtraId: "website",
      isWebsite: true,
      required: false,
    },
  ];

  const ALL_PLATFORMS = [...CORE_PLATFORMS, ...ADDABLE_PLATFORMS];

  const NAV = [
    { id: "profile", label: "My Profile", icon: "user" },
    { id: "security", label: "Security Options", icon: "lock" },
    { id: "portfolio", label: "Portfolio", icon: "portfolio" },
    { id: "preferences", label: "Preferences", icon: "sliders" },
    { id: "notifications", label: "Notifications", icon: "bell" },
  ];

  const NOTIF_KEYS = [
    { id: "messages", label: "Messages", desc: "New direct messages and chat replies" },
    { id: "collab", label: "Collaboration Requests", desc: "Incoming brand partnership offers" },
    { id: "projects", label: "Project Updates", desc: "Milestones, deliverables, and deadlines" },
    { id: "marketing", label: "Marketing Emails", desc: "Product news and growth tips" },
    { id: "system", label: "System Notifications", desc: "Security alerts and account updates" },
  ];

  const ICONS = {
    user: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
    lock: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    portfolio:
      '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    sliders: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>',
    bell: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  };

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isEmailLike(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function isLinkedInPrefix(prefix) {
    return String(prefix || "").toLowerCase().includes("linkedin.com");
  }

  function authHeaders() {
    const token = localStorage.getItem("influnet_token");
    return token ? { Authorization: "Bearer " + token } : {};
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("influnet_user") || "null");
    } catch {
      return null;
    }
  }

  function applyUser(user, token) {
    if (user) localStorage.setItem("influnet_user", JSON.stringify(user));
    if (token) localStorage.setItem("influnet_token", token);
    window.dispatchEvent(new CustomEvent("influnet-user-updated", { detail: { user, token } }));
    syncDashboardHeaderName(user?.name);
  }

  function syncDashboardHeaderName(name) {
    const display = String(name || "").trim();
    if (!display) return;
    const userBlock =
      document.querySelector(
        ".flex.h-screen header .border-l.border-gray-100, .flex.h-screen header .pl-2.border-l"
      ) || document.querySelector(".flex.h-screen header .flex.items-center.gap-3 > div:last-child");
    if (!userBlock) return;
    const nameEl =
      userBlock.querySelector(".font-semibold.text-gray-800") ||
      userBlock.querySelector(".text-gray-800.font-semibold") ||
      userBlock.querySelector("p.font-semibold, span.font-semibold");
    if (nameEl) nameEl.textContent = display;
  }

  async function api(path, method, body) {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", ...authHeaders() },
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
    return data;
  }

  function splitName(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    return {
      first: parts[0] || "",
      last: parts.slice(1).join(" ") || "",
    };
  }

  function parseLocation(p) {
    if (p.city || p.state) return { city: p.city || "", state: p.state || "" };
    const loc = String(p.location || "").trim();
    if (!loc) return { city: "", state: "" };
    const parts = loc.split(",").map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2) return { city: parts[0], state: parts.slice(1).join(", ") };
    return { city: loc, state: "" };
  }

  function parseExtraLinks(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      const p = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }

  function getExtraLink(p, id) {
    return parseExtraLinks(p.extraSocialLinks).find((l) => l.id === id) || null;
  }

  function getPlatformMetricValue(p, pl) {
    if (pl.metricKey && p[pl.metricKey] != null && p[pl.metricKey] !== "") {
      return String(p[pl.metricKey]);
    }
    const extraId = pl.metricExtraId || pl.extraId;
    if (!extraId) return "";
    const hit = getExtraLink(p, extraId);
    return hit?.followers != null ? String(hit.followers) : "";
  }

  function platformMetricLabel(pl) {
    return pl.metricLabel || (pl.id === "yt" ? "Subscribers" : "Followers");
  }

  function detectVisibleAddable(p) {
    const set = new Set();
    ADDABLE_PLATFORMS.forEach((pl) => {
      if (pl.handleKey && String(p[pl.handleKey] || "").trim()) {
        set.add(pl.id);
        return;
      }
      if (pl.extraId) {
        const hit = getExtraLink(p, pl.extraId);
        if (hit?.url) set.add(pl.id);
      }
    });
    return set;
  }

  function getAvailableAddablePlatforms(visible) {
    return ADDABLE_PLATFORMS.filter((pl) => !visible.has(pl.id));
  }

  function normalizePriceDisplay(id) {
    const s = String(id || "").trim();
    return PRICE_DISPLAY_MAP[s] || s;
  }

  function normalizeCollabIds(types) {
    if (!Array.isArray(types)) return [];
    return types.map((id) => (id === "youtube" ? "yt" : id));
  }

  function parseMetricValue(raw) {
    const s = String(raw ?? "").trim().toLowerCase().replace(/,/g, "");
    if (!s) return null;
    const n = parseInt(s.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function displaySocialHandle(stored, prefix) {
    const s = String(stored || "").trim();
    if (!s) return "";
    if (!prefix) return s.replace(/^https?:\/\//i, "");
    const normalized = s
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/^@/, "");
    const p = prefix.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    let result;
    if (normalized.toLowerCase().startsWith(p.toLowerCase())) {
      result = normalized.slice(p.length).replace(/^\//, "");
    } else {
      result = normalized;
    }
    if (isLinkedInPrefix(prefix) && isEmailLike(result)) return "";
    return result;
  }

  function collectSocialHandle(raw, prefix) {
    const s = String(raw || "").trim();
    if (!s) return null;
    const slug = s.replace(/^@/, "");
    if (isLinkedInPrefix(prefix) && isEmailLike(slug)) return null;
    if (/^https?:\/\//i.test(s)) return s;
    const clean = s.replace(/^@/, "");
    if (!prefix) return clean.startsWith("http") ? clean : `https://${clean}`;
    const base = prefix.endsWith("/") ? prefix : `${prefix}/`;
    return base + clean;
  }

  function suppressOnboarding() {
    window.influnetCloseProgressiveOnboarding?.();
    try {
      const until = String(Date.now() + 1000 * 60 * 60 * 24);
      sessionStorage.setItem("influnet_progressive_onboarding_suppress_until", until);
      localStorage.setItem("influnet_progressive_onboarding_suppress_until", until);
      localStorage.removeItem("influnet_needs_progressive_setup");
      document.body.classList.add("infl-account-settings-active");
    } catch (_) {}
  }

  function skeletonHtml() {
    return `<div id="${ROOT_ID}" class="ias-layout ias-shell--loading" aria-busy="true">
      <div class="ias-sk ias-sk-side" aria-hidden="true"></div>
      <div class="ias-sk ias-sk-main" aria-hidden="true"></div>
    </div>`;
  }

  function renderSkeleton(root) {
    if (!root) return;
    root.innerHTML = skeletonHtml();
  }

  function optionHtml(list, value, emptyLabel) {
    return (
      `<option value="">${emptyLabel || "Select"}</option>` +
      list
        .map((o) => {
          const v = typeof o === "string" ? o : o.id || o.value;
          const l = typeof o === "string" ? o : o.label || o;
          return `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(l)}</option>`;
        })
        .join("")
    );
  }

  function citiesForState(state) {
    const data = window.INFLUNET_INDIA_LOCATIONS?.citiesByState;
    if (data && data[state]?.length) return data[state];
    const fallback = {
      Maharashtra: ["Mumbai", "Pune", "Nagpur"],
      Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"],
      Delhi: ["New Delhi", "South Delhi", "North Delhi"],
      "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
      Telangana: ["Hyderabad", "Warangal", "Nizamabad"],
    };
    return fallback[state] || [];
  }

  function wireIndiaLocations(root, loc) {
    const stateSel = root.querySelector("#ias-state");
    const citySel = root.querySelector("#ias-city");
    if (!stateSel || !citySel) return;

    const fillCities = (state, keep) => {
      const cities = citiesForState(state);
      const cur = keep || citySel.value;
      citySel.innerHTML = optionHtml(cities, "", "Select city");
      if (cur && ![...citySel.options].some((o) => o.value === cur)) {
        citySel.insertAdjacentHTML(
          "beforeend",
          `<option value="${esc(cur)}" selected>${esc(cur)}</option>`
        );
      } else if (cur) {
        citySel.value = cur;
      }
    };

    fillCities(loc.state, loc.city);
    stateSel.addEventListener("change", () => fillCities(stateSel.value, ""));
    window.addEventListener(
      "influnet-india-locations-ready",
      () => fillCities(stateSel.value, citySel.value),
      { once: true }
    );
  }

  function getPlatformHandleValue(p, pl) {
    if (pl.handleKey) return displaySocialHandle(p[pl.handleKey], pl.prefix);
    if (pl.extraId) {
      const hit = getExtraLink(p, pl.extraId);
      return displaySocialHandle(hit?.url, pl.prefix);
    }
    return "";
  }

  function renderSocialRow(p, pl) {
    const handleVal = getPlatformHandleValue(p, pl);
    const metricVal = getPlatformMetricValue(p, pl);
    const metricLabel = platformMetricLabel(pl);
    const metricPlaceholder = pl.required ? `${metricLabel} *` : metricLabel;
    const inputAttrs =
      pl.id === "li"
        ? 'name="infl-linkedin-username" autocomplete="off" data-lpignore="true" data-1p-ignore spellcheck="false"'
        : 'autocomplete="off" spellcheck="false"';
    const handlePlaceholder = pl.isWebsite ? "yoursite.com" : "username";

    return `<div class="ias-social-row" data-platform="${pl.id}">
      <div class="ias-social-label">
        <span class="ias-platform-icon ias-platform-icon--${pl.cls}" aria-hidden="true">${pl.abbr}</span>
        <span class="ias-social-label-text">${pl.label}</span>
      </div>
      <div class="ias-prefix-field">
        <span class="ias-prefix">${esc(pl.prefix)}</span>
        <input id="ias-handle-${pl.id}" type="text" class="ias-input ias-input--prefix"
          data-prefix="${esc(pl.prefix)}" data-handle-key="${pl.handleKey || ""}"
          data-extra-id="${pl.extraId || ""}" data-is-website="${pl.isWebsite ? "1" : "0"}"
          placeholder="${handlePlaceholder}"
          value="${esc(handleVal)}" ${inputAttrs} />
      </div>
      <input id="ias-metric-${pl.id}" type="number" min="0" inputmode="numeric"
        class="ias-input ias-social-metric" placeholder="${esc(metricPlaceholder)}"
        value="${esc(metricVal)}" data-metric="1" data-metric-extra="${pl.metricExtraId || pl.extraId || ""}" />
    </div>`;
  }

  function renderSocialPickerHtml(visible) {
    const available = getAvailableAddablePlatforms(visible);
    if (!available.length) return "";
    const chips = available
      .map(
        (pl) =>
          `<button type="button" class="ias-social-pick" data-add-platform="${pl.id}">
            <span class="ias-platform-icon ias-platform-icon--${pl.cls}" aria-hidden="true">${pl.abbr}</span>
            <span>${esc(pl.label)}</span>
          </button>`
      )
      .join("");
    return `
      <button type="button" id="ias-social-add" class="ias-btn-secondary ias-social-add">+ Add platform</button>
      <div id="ias-social-picker" class="ias-social-picker" hidden>
        <p class="ias-hint">Choose a platform to add</p>
        <div class="ias-social-picker-grid">${chips}</div>
      </div>`;
  }

  function renderSocialSection(p, visibleAddable) {
    const extrasHtml = [...visibleAddable]
      .map((id) => {
        const pl = ADDABLE_PLATFORMS.find((item) => item.id === id);
        return pl ? renderSocialRow(p, pl) : "";
      })
      .join("");
    return `
      <div class="ias-section">
        <h3 class="ias-section-title">Social Platforms &amp; Channels</h3>
        <div class="ias-social-table">
          ${CORE_PLATFORMS.map((pl) => renderSocialRow(p, pl)).join("")}
          <div id="ias-social-extras">${extrasHtml}</div>
        </div>
        ${renderSocialPickerHtml(visibleAddable)}
      </div>`;
  }

  function renderProfilePanel(
    p,
    user,
    loc,
    names,
    selectedCollabs,
    priceRange,
    selectedLanguages,
    visibleAddable
  ) {
    const avatarUrl = p.avatarUrl || user?.avatarUrl || "";
    const headline = p.headline || p.bio?.slice(0, 80) || "Add a headline for brands";
    const phoneLocal = String(p.phone || "").replace(/\D/g, "").slice(-10);

    return `
      <section class="ias-panel" data-ias-panel="profile">
        <div class="ias-panel-head">
          <h2 class="ias-panel-title">Profile Information</h2>
          <button type="button" id="ias-save-btn" class="ias-btn-primary">Save Changes</button>
        </div>

        <div class="ias-avatar-row">
          <div class="ias-avatar-wrap">
            <button type="button" id="ias-avatar-btn" class="ias-avatar-trigger" aria-label="Change profile photo">
              <div id="ias-avatar" class="ias-avatar">
                ${
                  avatarUrl
                    ? `<img src="${esc(avatarUrl)}" alt="" />`
                    : esc((names.first[0] || "C") + (names.last[0] || ""))
                }
              </div>
              <span class="ias-avatar-overlay" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </span>
            </button>
            <input type="file" id="ias-avatar-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden />
          </div>
          <div class="ias-avatar-actions">
            <button type="button" id="ias-avatar-change" class="ias-btn-change-image">+ Change Image</button>
            <p class="ias-avatar-hint">We support PNGs, JPEGs and GIFs under 5MB</p>
            <p class="ias-identity-name">${esc(p.name || user?.name || "Creator")}</p>
            <p class="ias-identity-headline">${esc(headline)}</p>
          </div>
        </div>

        <div class="ias-section ias-section--personal">
          <h3 class="ias-section-title">Personal Details</h3>
          <div class="ias-grid-2 ias-grid-2--compact">
            <div>
              <label class="ias-label" for="ias-first-name">First Name</label>
              <input id="ias-first-name" class="ias-input" value="${esc(names.first)}" />
            </div>
            <div>
              <label class="ias-label" for="ias-last-name">Last Name</label>
              <input id="ias-last-name" class="ias-input" value="${esc(names.last)}" />
            </div>
            <div>
              <label class="ias-label" for="ias-email">Email Address</label>
              <div class="ias-suffix-field">
                <input id="ias-email" type="email" class="ias-input" value="${esc(p.email || user?.email || "")}" disabled />
                <button type="button" class="ias-suffix-link" data-goto="security">Update</button>
              </div>
            </div>
            <div>
              <label class="ias-label" for="ias-phone">Phone Number</label>
              <div class="ias-suffix-field">
                <input id="ias-phone" type="tel" class="ias-input" value="${esc(phoneLocal)}" placeholder="9876543210" inputmode="numeric" />
                <button type="button" class="ias-suffix-link" id="ias-phone-otp">OTP</button>
              </div>
            </div>
            <div class="ias-span-2">
              <label class="ias-label" for="ias-bio">Bio</label>
              <textarea id="ias-bio" rows="2" class="ias-input ias-input--bio" placeholder="Tell brands about your creative journey…">${esc(p.bio || "")}</textarea>
            </div>
            <div>
              <label class="ias-label" for="ias-gender">Gender</label>
              <select id="ias-gender" class="ias-input">${optionHtml(GENDERS, p.gender || "", "Select gender")}</select>
            </div>
            <div class="ias-span-2">
              <label class="ias-label">Languages</label>
              <p class="ias-hint ias-hint--inline ias-lang-hint">Select all languages you create content in.</p>
              <div class="ias-chip-grid ias-lang-grid" id="ias-languages">
                ${LANGUAGES.map(
                  (lang) =>
                    `<button type="button" class="ias-chip${
                      selectedLanguages.includes(lang) ? " ias-chip--active" : ""
                    }" data-lang="${esc(lang)}">${esc(lang)}</button>`
                ).join("")}
              </div>
            </div>
          </div>
        </div>

        <div class="ias-section">
          <h3 class="ias-section-title">Address</h3>
          <div class="ias-grid-2">
            <div>
              <label class="ias-label" for="ias-state">State</label>
              <select id="ias-state" class="ias-input">${optionHtml(INDIAN_STATES, loc.state, "Select state")}</select>
            </div>
            <div>
              <label class="ias-label" for="ias-city">City</label>
              <select id="ias-city" class="ias-input">${optionHtml(citiesForState(loc.state), loc.city, "Select city")}</select>
            </div>
          </div>
        </div>

        ${renderSocialSection(p, visibleAddable)}

        <div class="ias-section">
          <h3 class="ias-section-title">Collaboration Preferences</h3>
          <p class="ias-hint">Deliverable formats you accept</p>
          <div class="ias-chip-grid" id="ias-collab-chips">
            ${COLLAB_TYPES.map(
              (c) =>
                `<button type="button" data-collab="${c.id}"
                  class="ias-chip${selectedCollabs.includes(c.id) ? " ias-chip--active" : ""}">${esc(c.label)}</button>`
            ).join("")}
          </div>
          <p class="ias-hint">Pricing per deliverable</p>
          <div class="ias-price-grid" id="ias-price-cards">
            ${PRICE_RANGES.map(
              (r) =>
                `<button type="button" data-price="${r.id}"
                  class="ias-price-card${priceRange === r.id ? " ias-price-card--active" : ""}">
                  <div class="ias-price-label">${esc(r.label)}</div>
                  <div class="ias-price-range">${esc(r.range)}</div>
                </button>`
            ).join("")}
          </div>
        </div>
      </section>`;
  }

  function renderSecurityPanel(p, user) {
    const phoneLocal = String(p.phone || user?.phone || "").replace(/\D/g, "").slice(-10);
    const email = p.email || user?.email || "";
    return `
      <section class="ias-panel" data-ias-panel="security" hidden>
        <div class="ias-panel-head">
          <h2 class="ias-panel-title">Security Options</h2>
        </div>
        <div class="ias-grid-2 ias-grid-2--compact ias-sec-grid" style="max-width:36rem">
          <div class="ias-span-2">
            <label class="ias-label" for="ias-sec-email">Email address</label>
            <div class="ias-suffix-field">
              <input id="ias-sec-email" type="email" class="ias-input" value="${esc(email)}" />
              <button type="button" class="ias-suffix-link" id="ias-email-update">Update</button>
            </div>
            <input id="ias-sec-email-pw" type="password" class="ias-input ias-sec-stack-field" hidden placeholder="Current password to confirm" autocomplete="current-password" />
          </div>
          <div class="ias-span-2 ias-sec-pw-block">
            <div class="ias-sec-pw-head">
              <label class="ias-label" for="ias-current-pw">Password</label>
              <button type="button" class="ias-text-link" id="ias-forgot-pw-toggle">Forgot password?</button>
            </div>
            <div id="ias-pw-known-mode">
              <input id="ias-current-pw" type="password" class="ias-input" placeholder="Current password" autocomplete="current-password" />
              <div id="ias-pw-fields" class="ias-sec-stack" hidden>
                <input id="ias-new-pw" type="password" class="ias-input ias-sec-stack-field" placeholder="New password (6+ chars)" autocomplete="new-password" />
                <input id="ias-confirm-pw" type="password" class="ias-input ias-sec-stack-field" placeholder="Confirm new password" autocomplete="new-password" />
                <button type="button" id="ias-change-pw" class="ias-btn-secondary ias-sec-action-btn">Change password</button>
              </div>
            </div>
            <div id="ias-pw-forgot-mode" hidden>
              <p class="ias-hint ias-hint--inline">Verify your registered mobile number with OTP to create a new password.</p>
              ${
                phoneLocal
                  ? `<div id="ias-sec-phone-host" class="ias-sec-phone-host">
                      <label class="ias-label" for="ias-sec-phone">Mobile number</label>
                      <input id="ias-sec-phone" type="tel" class="ias-input" value="${esc(phoneLocal)}" inputmode="numeric" maxlength="10" readonly />
                    </div>`
                  : `<p class="ias-hint ias-hint--warn">Add and verify a mobile number in My Profile before resetting your password with OTP.</p>`
              }
              <div id="ias-pw-reset-fields" class="ias-sec-stack" hidden>
                <input id="ias-reset-new-pw" type="password" class="ias-input ias-sec-stack-field" placeholder="New password (6+ chars)" autocomplete="new-password" />
                <input id="ias-reset-confirm-pw" type="password" class="ias-input ias-sec-stack-field" placeholder="Confirm new password" autocomplete="new-password" />
                <button type="button" id="ias-reset-pw-btn" class="ias-btn-secondary ias-sec-action-btn">Set new password</button>
              </div>
              <button type="button" class="ias-text-link ias-sec-back-link" id="ias-back-to-known-pw">Use current password instead</button>
            </div>
            <p class="ias-hint ias-hint--inline ias-sec-email-reset">
              Or
              <button type="button" class="ias-text-link" id="ias-forgot-email-link">send a reset link to your email</button>
            </p>
          </div>
        </div>
      </section>`;
  }

  function normalizePortfolioUrl(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s)) return s;
    return `https://${s}`;
  }

  function isValidPortfolioUrl(url) {
    try {
      const u = new URL(normalizePortfolioUrl(url));
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function portfolioItems(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (typeof item === "string") {
          const url = normalizePortfolioUrl(item);
          return url ? { title: "", url } : null;
        }
        if (item && typeof item === "object") {
          const url = normalizePortfolioUrl(item.url || item.link || item.src || "");
          if (!url) return null;
          const title = String(item.title || item.brand || item.brandName || "").trim();
          return { title, url };
        }
        return null;
      })
      .filter(Boolean);
  }

  function renderPortfolioRow(item, index) {
    return `
      <div class="ias-portfolio-row" data-portfolio-index="${index}">
        <div class="ias-grid-2">
          <div>
            <label class="ias-label">Collaboration / brand</label>
            <input type="text" class="ias-input" data-portfolio-title value="${esc(item.title || "")}" placeholder="e.g. Nike Summer Campaign" />
          </div>
          <div>
            <label class="ias-label">Drive or share link</label>
            <input type="url" class="ias-input" data-portfolio-url value="${esc(item.url || "")}" placeholder="https://drive.google.com/..." inputmode="url" />
          </div>
        </div>
        <button type="button" class="ias-portfolio-remove" data-portfolio-remove aria-label="Remove collaboration">Remove</button>
      </div>`;
  }

  function renderPortfolioPanel(p) {
    const items = portfolioItems(p.portfolio);
    const rows = items.length ? items : [{ title: "", url: "" }];
    return `
      <section class="ias-panel" data-ias-panel="portfolio" hidden>
        <div class="ias-panel-head">
          <h2 class="ias-panel-title">Portfolio</h2>
          <button type="button" id="ias-portfolio-save" class="ias-btn-primary">Save Portfolio</button>
        </div>
        <p class="ias-hint ias-portfolio-intro">
          Add Google Drive, Dropbox, or other share links to your previous collaborations.
          Brands can view these on your public profile.
        </p>
        <div id="ias-portfolio-list" class="ias-portfolio-list">
          ${rows.map((item, i) => renderPortfolioRow(item, i)).join("")}
        </div>
        <button type="button" id="ias-portfolio-add" class="ias-btn-secondary ias-portfolio-add">+ Add collaboration</button>
      </section>`;
  }

  function renderPreferencesPanel(p, langs) {
    const avail = p.availabilityStatus || "available";
    return `
      <section class="ias-panel" data-ias-panel="preferences" hidden>
        <div class="ias-panel-head">
          <h2 class="ias-panel-title">Preferences</h2>
        </div>
        <div class="ias-grid-2" style="max-width:36rem">
          <div>
            <label class="ias-label" for="ias-availability">Availability</label>
            <select id="ias-availability" class="ias-input">
              <option value="available"${avail === "available" ? " selected" : ""}>Available for collaborations</option>
              <option value="limited"${avail === "limited" ? " selected" : ""}>Limited availability</option>
              <option value="unavailable"${avail === "unavailable" ? " selected" : ""}>Unavailable</option>
            </select>
          </div>
          <div class="ias-span-2">
            <label class="ias-label" for="ias-headline">Headline</label>
            <input id="ias-headline" class="ias-input" value="${esc(p.headline || "")}" placeholder="e.g. Lifestyle creator · 500K+ reach" />
          </div>
        </div>
      </section>`;
  }

  function renderNotificationsPanel(userId, prefs) {
    return `
      <section class="ias-panel" data-ias-panel="notifications" hidden>
        <div class="ias-panel-head">
          <h2 class="ias-panel-title">Notifications</h2>
        </div>
        <div style="max-width:36rem">
          ${NOTIF_KEYS.map(
            (n) =>
              `<label class="ias-toggle-row">
                <span><strong style="font-size:0.875rem;color:#0f172a">${esc(n.label)}</strong><span style="display:block;font-size:0.75rem;color:#64748b">${esc(n.desc)}</span></span>
                <input type="checkbox" data-notif="${n.id}"${prefs[n.id] !== false ? " checked" : ""} />
              </label>`
          ).join("")}
        </div>
      </section>`;
  }

  function loadNotifPrefs(userId) {
    try {
      const raw = localStorage.getItem(`influnet_notif_prefs_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { messages: true, collab: true, projects: true, marketing: false, system: true };
  }

  function saveNotifPrefs(userId, prefs) {
    localStorage.setItem(`influnet_notif_prefs_${userId}`, JSON.stringify(prefs));
  }

  async function mount(root, profile, options) {
    if (!root) return;
    suppressOnboarding();
    document.getElementById("ips-savebar")?.remove();

    const user = getUser();
    let p = { ...profile };
    let activeSection = "profile";
    let selectedCollabs = normalizeCollabIds(p.collabTypes || []);
    let priceRange = normalizePriceDisplay(p.priceRange || "");
    let selectedLanguages = Array.isArray(p.languages) ? [...p.languages] : [];
    let visibleAddable = detectVisibleAddable(p);
    const prefs = loadNotifPrefs(p.id || user?.id || "anon");

    function showMsg(text, ok) {
      const el = root.querySelector("#ias-msg");
      if (!el) return;
      el.hidden = false;
      el.className = `ias-msg ${ok ? "ias-msg--ok" : "ias-msg--err"}`;
      el.textContent = text;
    }

    function setStatus(text, tone) {
      const el = root.querySelector("#ias-status");
      if (!el) return;
      el.textContent = text;
      el.className = "ias-status";
      if (tone === "ok") el.classList.add("ias-status--ok");
      else if (tone === "err") el.classList.add("ias-status--err");
      else if (tone === "busy") el.classList.add("ias-status--busy");
    }

    function render() {
      const currentNames = splitName(p.name || user?.name || "");
      const currentLoc = parseLocation(p);
      root.innerHTML = `
        <div id="${ROOT_ID}" class="ias-layout">
          <aside class="ias-sidebar" aria-label="Settings navigation">
            <h2 class="ias-sidebar-title">Settings</h2>
            <span class="ias-sidebar-subtitle">You can find all settings here.</span>
            <nav class="ias-nav-list">
              ${NAV.map(
                (n) =>
                  `<button type="button" data-nav="${n.id}"
                    class="ias-nav-btn${activeSection === n.id ? " ias-nav-btn--active" : ""}">
                    ${ICONS[n.icon] || ""}
                    <span>${esc(n.label)}</span>
                  </button>`
              ).join("")}
            </nav>
          </aside>

          <div class="ias-main">
            <div id="ias-msg" class="ias-msg" hidden></div>
            <p id="ias-status" class="ias-status"></p>
            ${renderProfilePanel(
              p,
              user,
              currentLoc,
              currentNames,
              selectedCollabs,
              priceRange,
              selectedLanguages,
              visibleAddable
            )}
            ${renderSecurityPanel(p, user)}
            ${renderPortfolioPanel(p)}
            ${renderPreferencesPanel(p)}
            ${renderNotificationsPanel(p.id || user?.id, prefs)}
          </div>
        </div>`;

      applyPanelVisibility();
      wireEvents();
      wireIndiaLocations(root, currentLoc);
    }

    function applyPanelVisibility() {
      root.querySelectorAll("[data-ias-panel]").forEach((panel) => {
        const on = panel.getAttribute("data-ias-panel") === activeSection;
        panel.hidden = !on;
      });
      root.querySelectorAll("[data-nav]").forEach((btn) => {
        btn.classList.toggle("ias-nav-btn--active", btn.getAttribute("data-nav") === activeSection);
      });
    }

    function switchSection(id) {
      activeSection = id;
      applyPanelVisibility();
    }

    function syncLangUi() {
      root.querySelectorAll("[data-lang]").forEach((btn) => {
        btn.classList.toggle("ias-chip--active", selectedLanguages.includes(btn.getAttribute("data-lang")));
      });
    }

    function syncCollabUi() {
      root.querySelectorAll("[data-collab]").forEach((btn) => {
        btn.classList.toggle("ias-chip--active", selectedCollabs.includes(btn.getAttribute("data-collab")));
      });
    }

    function syncPriceUi() {
      root.querySelectorAll("[data-price]").forEach((btn) => {
        btn.classList.toggle("ias-price-card--active", btn.getAttribute("data-price") === priceRange);
      });
    }

    function syncIdentityPreview() {
      const first = root.querySelector("#ias-first-name")?.value?.trim() || "";
      const last = root.querySelector("#ias-last-name")?.value?.trim() || "";
      const full = [first, last].filter(Boolean).join(" ") || "Creator";
      const nameEl = root.querySelector(".ias-identity-name");
      if (nameEl) nameEl.textContent = full;

      const bio = root.querySelector("#ias-bio")?.value?.trim() || "";
      const headlineEl = root.querySelector(".ias-identity-headline");
      if (headlineEl) {
        headlineEl.textContent = bio ? bio.slice(0, 80) : "Add a headline for brands";
      }

      const avatarEl = root.querySelector("#ias-avatar");
      if (avatarEl && !avatarEl.querySelector("img")) {
        avatarEl.textContent = ((first[0] || "C") + (last[0] || "")).toUpperCase();
      }
    }

    function validateSocial() {
      for (const pl of ALL_PLATFORMS.filter((x) => x.required)) {
        const handle = root.querySelector(`#ias-handle-${pl.id}`)?.value?.trim();
        if (!handle) continue;
        const metric = parseMetricValue(root.querySelector(`#ias-metric-${pl.id}`)?.value);
        if (metric == null || metric <= 0) {
          const kind = pl.id === "yt" ? "subscriber" : "follower";
          return `${pl.label}: ${kind} count is required.`;
        }
      }
      return null;
    }

    function collectHandleForPlatform(pl) {
      const raw = root.querySelector(`#ias-handle-${pl.id}`)?.value?.trim();
      if (!raw) return null;
      if (pl.isWebsite) {
        const clean = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
        return clean ? collectSocialHandle(clean, pl.prefix) : null;
      }
      return collectSocialHandle(raw, pl.prefix);
    }

    function collectExtraSocialLinksFromForm() {
      const byId = new Map();

      const setLink = (id, patch) => {
        const prev = byId.get(id) || { id };
        byId.set(id, { ...prev, ...patch, id });
      };

      CORE_PLATFORMS.forEach((pl) => {
        if (!pl.extraId && !pl.metricExtraId) return;
        const handle = collectHandleForPlatform(pl);
        const metric = parseMetricValue(root.querySelector(`#ias-metric-${pl.id}`)?.value);
        if (handle) setLink(pl.extraId || pl.metricExtraId, { url: handle });
        if (metric != null && metric > 0) {
          setLink(pl.metricExtraId || pl.extraId, { followers: metric });
        }
      });

      ADDABLE_PLATFORMS.forEach((pl) => {
        if (!visibleAddable.has(pl.id)) return;
        const handle = collectHandleForPlatform(pl);
        const metric = parseMetricValue(root.querySelector(`#ias-metric-${pl.id}`)?.value);
        if (handle && pl.extraId) setLink(pl.extraId, { url: handle });
        if (metric != null && metric > 0 && pl.metricExtraId) {
          setLink(pl.metricExtraId, { followers: metric });
        }
      });

      return Array.from(byId.values()).filter(
        (item) => item.url || (item.followers != null && item.followers > 0)
      );
    }

    function refreshSocialPicker() {
      const available = getAvailableAddablePlatforms(visibleAddable);
      const addBtn = root.querySelector("#ias-social-add");
      const picker = root.querySelector("#ias-social-picker");
      if (!available.length) {
        addBtn?.remove();
        picker?.remove();
        return;
      }
      if (picker) {
        picker.querySelector(".ias-social-picker-grid").innerHTML = available
          .map(
            (pl) =>
              `<button type="button" class="ias-social-pick" data-add-platform="${pl.id}">
                <span class="ias-platform-icon ias-platform-icon--${pl.cls}" aria-hidden="true">${pl.abbr}</span>
                <span>${esc(pl.label)}</span>
              </button>`
          )
          .join("");
      } else if (addBtn) {
        addBtn.insertAdjacentHTML(
          "afterend",
          `<div id="ias-social-picker" class="ias-social-picker" hidden>
            <p class="ias-hint">Choose a platform to add</p>
            <div class="ias-social-picker-grid">${available
              .map(
                (pl) =>
                  `<button type="button" class="ias-social-pick" data-add-platform="${pl.id}">
                    <span class="ias-platform-icon ias-platform-icon--${pl.cls}" aria-hidden="true">${pl.abbr}</span>
                    <span>${esc(pl.label)}</span>
                  </button>`
              )
              .join("")}</div>
          </div>`
        );
      } else {
        const table = root.querySelector(".ias-social-table");
        table?.insertAdjacentHTML("afterend", renderSocialPickerHtml(visibleAddable));
      }
    }

    function addSocialPlatform(platformId) {
      const pl = ADDABLE_PLATFORMS.find((item) => item.id === platformId);
      if (!pl || visibleAddable.has(platformId)) return;
      visibleAddable.add(platformId);
      root.querySelector("#ias-social-extras")?.insertAdjacentHTML("beforeend", renderSocialRow(p, pl));
      refreshSocialPicker();
      root.querySelector("#ias-social-picker")?.setAttribute("hidden", "");
      root.querySelector(`#ias-handle-${pl.id}`)?.focus();
    }

    function wireSocialPlatformEvents() {
      if (root.dataset.iasSocialWired === "1") return;
      root.dataset.iasSocialWired = "1";
      root.addEventListener("click", (e) => {
        if (e.target.closest("#ias-social-add")) {
          const picker = root.querySelector("#ias-social-picker");
          if (picker) picker.hidden = !picker.hidden;
          return;
        }
        const pick = e.target.closest("[data-add-platform]");
        if (pick) addSocialPlatform(pick.getAttribute("data-add-platform"));
      });
    }

    function collectPortfolioFromForm() {
      const rows = root.querySelectorAll(".ias-portfolio-row");
      const items = [];
      for (const row of rows) {
        const title = row.querySelector("[data-portfolio-title]")?.value?.trim() || "";
        const rawUrl = row.querySelector("[data-portfolio-url]")?.value?.trim() || "";
        if (!title && !rawUrl) continue;
        const url = normalizePortfolioUrl(rawUrl);
        if (!url) {
          if (title) throw new Error("Each collaboration needs a valid share link.");
          continue;
        }
        if (!isValidPortfolioUrl(url)) {
          throw new Error("Use a valid http(s) link for each collaboration.");
        }
        items.push({
          title: title || null,
          brand: title || null,
          url,
          type: "drive",
        });
      }
      return items;
    }

    async function savePortfolio() {
      const btn = root.querySelector("#ias-portfolio-save");
      let items;
      try {
        items = collectPortfolioFromForm();
      } catch (err) {
        showMsg(err.message, false);
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving…";
      }
      setStatus("Saving portfolio…", "busy");

      try {
        const data = await api("/api/influencer-profile/me", "PATCH", { portfolio: items });
        const next = data.profile || data;
        if (next) {
          Object.assign(p, next);
          options?.onSaved?.(next);
        }
        setStatus("Portfolio saved", "ok");
        showMsg("Portfolio updated. Links are visible on your public profile.", true);
        window.dispatchEvent(new CustomEvent("influnet-profile-updated", { detail: { soft: true } }));
      } catch (err) {
        setStatus("Could not save portfolio", "err");
        showMsg(err.message || "Save failed.", false);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Save Portfolio";
        }
      }
    }

    function addPortfolioRow() {
      const list = root.querySelector("#ias-portfolio-list");
      if (!list) return;
      const index = list.querySelectorAll(".ias-portfolio-row").length;
      list.insertAdjacentHTML("beforeend", renderPortfolioRow({ title: "", url: "" }, index));
      wirePortfolioRowEvents();
    }

    function wirePortfolioRowEvents() {
      root.querySelectorAll("[data-portfolio-remove]").forEach((btn) => {
        if (btn.dataset.inflWired === "1") return;
        btn.dataset.inflWired = "1";
        btn.addEventListener("click", () => {
          const row = btn.closest(".ias-portfolio-row");
          const list = root.querySelector("#ias-portfolio-list");
          const rows = list?.querySelectorAll(".ias-portfolio-row") || [];
          if (rows.length <= 1) {
            row.querySelector("[data-portfolio-title]").value = "";
            row.querySelector("[data-portfolio-url]").value = "";
            return;
          }
          row?.remove();
        });
      });
    }

    function collectPayload() {
      const first = root.querySelector("#ias-first-name")?.value?.trim() || "";
      const last = root.querySelector("#ias-last-name")?.value?.trim() || "";
      const phoneDigits = String(root.querySelector("#ias-phone")?.value || "")
        .replace(/\D/g, "")
        .slice(-10);

      const payload = {
        name: [first, last].filter(Boolean).join(" ") || null,
        phone: phoneDigits.length === 10 ? `+91 ${phoneDigits}` : null,
        gender: root.querySelector("#ias-gender")?.value || null,
        city: root.querySelector("#ias-city")?.value?.trim() || null,
        state: root.querySelector("#ias-state")?.value?.trim() || null,
        bio: root.querySelector("#ias-bio")?.value?.trim() || null,
        headline: root.querySelector("#ias-headline")?.value?.trim() || null,
        availabilityStatus: root.querySelector("#ias-availability")?.value || null,
        instagramHandle: collectHandleForPlatform(CORE_PLATFORMS.find((pl) => pl.id === "ig")),
        facebookHandle: collectHandleForPlatform(CORE_PLATFORMS.find((pl) => pl.id === "fb")),
        youtubeHandle: collectHandleForPlatform(CORE_PLATFORMS.find((pl) => pl.id === "yt")),
        linkedinHandle: collectHandleForPlatform(CORE_PLATFORMS.find((pl) => pl.id === "li")),
        instagramFollowers: parseMetricValue(root.querySelector("#ias-metric-ig")?.value) || 0,
        facebookFollowers: parseMetricValue(root.querySelector("#ias-metric-fb")?.value) || 0,
        youtubeSubscribers: parseMetricValue(root.querySelector("#ias-metric-yt")?.value) || 0,
        collabTypes: selectedCollabs,
        priceRange,
        languages: selectedLanguages,
        extraSocialLinks: collectExtraSocialLinksFromForm(),
      };

      if (visibleAddable.has("tt")) {
        payload.tiktokHandle =
          collectHandleForPlatform(ADDABLE_PLATFORMS.find((pl) => pl.id === "tt")) || "";
        payload.tiktokFollowers =
          parseMetricValue(root.querySelector("#ias-metric-tt")?.value) || 0;
      }
      if (visibleAddable.has("tw")) {
        payload.twitterHandle =
          collectHandleForPlatform(ADDABLE_PLATFORMS.find((pl) => pl.id === "tw")) || "";
      }
      return payload;
    }

    async function saveProfile() {
      const btn = root.querySelector("#ias-save-btn");
      const socialErr = validateSocial();
      if (socialErr) {
        showMsg(socialErr, false);
        return;
      }

      const prevDigits = String(p.phone || "").replace(/\D/g, "").slice(-10);
      const phoneDigits = String(root.querySelector("#ias-phone")?.value || "")
        .replace(/\D/g, "")
        .slice(-10);
      if (phoneDigits.length === 10 && phoneDigits !== prevDigits) {
        const otp = window.influnetPhoneOtpState?.();
        if (!otp?.verificationToken || otp.status !== "verified" || otp.phoneLocal !== phoneDigits) {
          showMsg("Verify your new mobile number with OTP before saving.", false);
          return;
        }
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving…";
      }
      setStatus("Saving changes…", "busy");

      try {
        const data = await api("/api/influencer-profile/me", "PATCH", collectPayload());
        const next = data.profile || data;
        if (next) {
          Object.assign(p, next);
          if (next.name) p.name = next.name;
          selectedLanguages = Array.isArray(next.languages) ? [...next.languages] : selectedLanguages;
          visibleAddable = detectVisibleAddable(p);
          const u = getUser();
          if (u && next.name) {
            applyUser({ ...u, name: next.name }, localStorage.getItem("influnet_token"));
          }
          syncIdentityPreview();
          options?.onSaved?.(next);
        }
        setStatus("All changes saved", "ok");
        showMsg("Profile saved successfully.", true);
        window.dispatchEvent(new CustomEvent("influnet-profile-updated", { detail: { soft: true } }));
      } catch (err) {
        setStatus("Could not save", "err");
        showMsg(err.message || "Save failed.", false);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Save Changes";
        }
      }
    }

    function wireEvents() {
      root.querySelectorAll("[data-nav]").forEach((btn) => {
        btn.addEventListener("click", () => switchSection(btn.getAttribute("data-nav")));
      });

      const liInput = root.querySelector("#ias-handle-li");
      if (liInput) {
        if (isEmailLike(liInput.value.trim())) liInput.value = "";
        liInput.setAttribute("readonly", "readonly");
        const unlockLinkedIn = () => {
          liInput.removeAttribute("readonly");
          liInput.removeEventListener("focus", unlockLinkedIn);
        };
        liInput.addEventListener("focus", unlockLinkedIn);
      }

      root.querySelectorAll("[data-goto]").forEach((btn) => {
        btn.addEventListener("click", () => switchSection(btn.getAttribute("data-goto")));
      });

      root.querySelector("#ias-save-btn")?.addEventListener("click", saveProfile);

      ["#ias-first-name", "#ias-last-name", "#ias-bio"].forEach((sel) => {
        root.querySelector(sel)?.addEventListener("input", syncIdentityPreview);
      });

      window.addEventListener("influnet-user-updated", (ev) => {
        const nextName = ev.detail?.user?.name;
        if (!nextName) return;
        p.name = nextName;
        syncIdentityPreview();
      });

      root.querySelector("#ias-collab-chips")?.addEventListener("click", (e) => {
        const chip = e.target.closest("[data-collab]");
        if (!chip) return;
        const id = chip.getAttribute("data-collab");
        const idx = selectedCollabs.indexOf(id);
        if (idx >= 0) selectedCollabs.splice(idx, 1);
        else selectedCollabs.push(id);
        syncCollabUi();
      });

      root.querySelector("#ias-languages")?.addEventListener("click", (e) => {
        const chip = e.target.closest("[data-lang]");
        if (!chip) return;
        const lang = chip.getAttribute("data-lang");
        const idx = selectedLanguages.indexOf(lang);
        if (idx >= 0) selectedLanguages.splice(idx, 1);
        else selectedLanguages.push(lang);
        syncLangUi();
      });

      root.querySelector("#ias-price-cards")?.addEventListener("click", (e) => {
        const card = e.target.closest("[data-price]");
        if (!card) return;
        priceRange = card.getAttribute("data-price");
        syncPriceUi();
      });

      root.querySelector("#ias-phone-otp")?.addEventListener("click", () => {
        window.influnetOpenPhoneOtp?.(root.querySelector("#ias-phone")?.value);
      });

      root.querySelector("#ias-portfolio-save")?.addEventListener("click", savePortfolio);
      root.querySelector("#ias-portfolio-add")?.addEventListener("click", addPortfolioRow);
      wirePortfolioRowEvents();
      wireSocialPlatformEvents();

      root.querySelector("#ias-current-pw")?.addEventListener("focus", () => {
        root.querySelector("#ias-pw-fields")?.classList.remove("hidden");
      });

      function setPasswordMode(mode) {
        const known = root.querySelector("#ias-pw-known-mode");
        const forgot = root.querySelector("#ias-pw-forgot-mode");
        const toggle = root.querySelector("#ias-forgot-pw-toggle");
        if (mode === "forgot") {
          known?.setAttribute("hidden", "");
          forgot?.removeAttribute("hidden");
          if (toggle) toggle.textContent = "Back to change password";
          window.influnetEnsureSecurityPhoneOtp?.();
          syncSecurityResetFields();
        } else {
          forgot?.setAttribute("hidden", "");
          known?.removeAttribute("hidden");
          if (toggle) toggle.textContent = "Forgot password?";
        }
      }

      function syncSecurityResetFields() {
        const resetFields = root.querySelector("#ias-pw-reset-fields");
        if (!resetFields) return;
        const verified =
          typeof window.influnetSecurityPhoneOtp?.isVerified === "function" &&
          window.influnetSecurityPhoneOtp.isVerified();
        resetFields.hidden = !verified;
      }

      root.querySelector("#ias-forgot-pw-toggle")?.addEventListener("click", () => {
        const forgot = root.querySelector("#ias-pw-forgot-mode");
        if (forgot && !forgot.hidden) setPasswordMode("known");
        else setPasswordMode("forgot");
      });

      root.querySelector("#ias-back-to-known-pw")?.addEventListener("click", () => {
        setPasswordMode("known");
      });

      window.addEventListener("influnet-security-otp-verified", syncSecurityResetFields);

      root.querySelector("#ias-forgot-email-link")?.addEventListener("click", async () => {
        const email = String(
          root.querySelector("#ias-sec-email")?.value ||
            p.email ||
            user?.email ||
            ""
        ).trim();
        if (!email) {
          showMsg("No email address on your account.", false);
          return;
        }
        try {
          await api("/api/auth/forgot-password", "POST", { email });
          showMsg("If an account exists for this email, a reset link has been sent.", true);
        } catch (err) {
          showMsg(err.message || "Could not send reset link.", false);
        }
      });

      root.querySelector("#ias-reset-pw-btn")?.addEventListener("click", async () => {
        const np = root.querySelector("#ias-reset-new-pw")?.value || "";
        const cp = root.querySelector("#ias-reset-confirm-pw")?.value || "";
        if (np.length < 6) {
          showMsg("New password must be at least 6 characters.", false);
          return;
        }
        if (np !== cp) {
          showMsg("Passwords do not match.", false);
          return;
        }
        const otp = window.influnetSecurityPhoneOtp;
        if (!otp?.isVerified?.()) {
          showMsg("Verify your mobile number with OTP first.", false);
          return;
        }
        const phone = otp.getPhone?.();
        const token = otp.getToken?.();
        if (!phone || !token) {
          showMsg("Phone verification expired. Send OTP again.", false);
          return;
        }
        const btn = root.querySelector("#ias-reset-pw-btn");
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Updating…";
        }
        try {
          await api("/api/auth/change-password", "POST", {
            newPassword: np,
            confirmPassword: cp,
            phone,
            phoneVerificationToken: token,
          });
          showMsg("Password updated successfully.", true);
          window.influnetSecurityPhoneOtp?.reset?.();
          root.querySelector("#ias-reset-new-pw").value = "";
          root.querySelector("#ias-reset-confirm-pw").value = "";
          root.querySelector("#ias-current-pw").value = "";
          root.querySelector("#ias-new-pw").value = "";
          root.querySelector("#ias-confirm-pw").value = "";
          root.querySelector("#ias-pw-fields")?.classList.add("hidden");
          setPasswordMode("known");
        } catch (err) {
          showMsg(err.message || "Could not update password.", false);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Set new password";
          }
        }
      });

      root.querySelector("#ias-email-update")?.addEventListener("click", async () => {
        const pwEl = root.querySelector("#ias-sec-email-pw");
        if (pwEl?.classList.contains("hidden")) {
          pwEl.classList.remove("hidden");
          pwEl.focus();
          return;
        }
        try {
          const data = await api("/api/auth/update-email", "POST", {
            email: root.querySelector("#ias-sec-email").value,
            password: pwEl.value,
          });
          if (data.user) applyUser(data.user, data.token);
          showMsg("Email update initiated. Check your inbox if confirmation is required.", true);
          pwEl.value = "";
          pwEl.classList.add("hidden");
        } catch (err) {
          showMsg(err.message, false);
        }
      });

      root.querySelector("#ias-change-pw")?.addEventListener("click", async () => {
        const np = root.querySelector("#ias-new-pw").value;
        const cp = root.querySelector("#ias-confirm-pw").value;
        if (np !== cp) {
          showMsg("Passwords do not match.", false);
          return;
        }
        if (np.length < 6) {
          showMsg("New password must be at least 6 characters.", false);
          return;
        }
        try {
          await api("/api/auth/change-password", "POST", {
            currentPassword: root.querySelector("#ias-current-pw").value,
            newPassword: np,
            confirmPassword: cp,
          });
          showMsg("Password changed successfully.", true);
          root.querySelector("#ias-current-pw").value = "";
          root.querySelector("#ias-new-pw").value = "";
          root.querySelector("#ias-confirm-pw").value = "";
          root.querySelector("#ias-pw-fields")?.classList.add("hidden");
        } catch (err) {
          showMsg(err.message, false);
        }
      });

      root.querySelectorAll("[data-notif]").forEach((inp) => {
        inp.addEventListener("change", () => {
          prefs[inp.getAttribute("data-notif")] = inp.checked;
          saveNotifPrefs(p.id || user?.id || "anon", prefs);
          showMsg("Notification preferences saved.", true);
        });
      });

      const avatarFile = root.querySelector("#ias-avatar-file");
      const openAvatarPicker = () => avatarFile?.click();
      root.querySelector("#ias-avatar-btn")?.addEventListener("click", openAvatarPicker);
      root.querySelector("#ias-avatar-change")?.addEventListener("click", openAvatarPicker);

      avatarFile?.addEventListener("change", async () => {
        const file = avatarFile.files?.[0];
        avatarFile.value = "";
        if (!file) return;

        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
          showMsg("Use a JPEG, PNG, WebP, or GIF image.", false);
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          showMsg("Image must be under 5 MB.", false);
          return;
        }

        const avatarBtn = root.querySelector("#ias-avatar-btn");
        avatarBtn?.classList.add("is-uploading");
        try {
          setStatus("Uploading photo…", "busy");
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Could not read image"));
            reader.readAsDataURL(file);
          });
          const res = await fetch("/api/influencer-profile/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            credentials: "same-origin",
            body: JSON.stringify({ dataUrl }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Upload failed");
          const url = data.avatarUrl || data.url;
          if (url) {
            p.avatarUrl = url;
            const av = root.querySelector("#ias-avatar");
            if (av) av.innerHTML = `<img src="${esc(url)}" alt="" />`;
            try {
              const stored = JSON.parse(localStorage.getItem("influnet_user") || "{}");
              localStorage.setItem(
                "influnet_user",
                JSON.stringify({ ...stored, avatarUrl: url })
              );
            } catch (_) {}
          }
          setStatus("Photo updated", "ok");
          showMsg("Profile photo updated.", true);
          window.dispatchEvent(
            new CustomEvent("influnet-profile-updated", { detail: { soft: true, avatarUrl: url } })
          );
        } catch (err) {
          setStatus("Upload failed", "err");
          showMsg(err.message || "Upload failed.", false);
        } finally {
          avatarBtn?.classList.remove("is-uploading");
        }
      });
    }

    render();
    suppressOnboarding();
  }

  window.InflAccountSettings = { mount, renderSkeleton, skeletonHtml };

  window.addEventListener("influnet-user-updated", (ev) => {
    syncDashboardHeaderName(ev.detail?.user?.name);
  });
})();
