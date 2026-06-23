/**
 * Influnet Profile Settings — premium SaaS layout (influencer + business).
 */
(function () {
  const NICHES = [
    "Fashion & Beauty", "Tech & Gadgets", "Food & Cooking", "Travel",
    "Fitness & Health", "Gaming", "Finance", "Lifestyle", "Education",
    "Entertainment", "Sports", "Parenting", "Home Decor", "Art & Design",
    "Music", "Comedy", "Business", "Environment",
  ];
  const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
  const LANGUAGES = [
    "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
    "Marathi", "Bengali", "Gujarati", "Punjabi",
  ];
  const COLLAB_TYPES = [
    { id: "reel", label: "Reel", desc: "Short-form vertical video" },
    { id: "story", label: "Story", desc: "24-hour audience update" },
    { id: "post", label: "Post", desc: "Static image/grid content" },
    { id: "yt", label: "YouTube Video", desc: "In-depth dedicated video" },
    { id: "event", label: "Event Appearance", desc: "In-person brand representation" },
  ];
  const PRICE_RANGES = [
    { id: "entry", label: "Entry", range: "₹1k – ₹5k" },
    { id: "standard", label: "Standard", range: "₹5k – ₹10k" },
    { id: "premium", label: "Premium", range: "₹10k – ₹25k" },
    { id: "pro", label: "Pro", range: "₹25k+" },
  ];
  const AVAILABILITY = [
    { id: "available", label: "Available for Collaborations" },
    { id: "limited", label: "Limited Availability" },
    { id: "unavailable", label: "Unavailable" },
  ];
  const BUSINESS_TYPES = [
    "Startup", "SME", "Enterprise", "Agency", "D2C Brand", "E-commerce",
    "NGO / Non-profit", "Freelancer / Solo", "Other",
  ];
  const INDUSTRIES = [
    "Fashion & Apparel", "Beauty & Personal Care", "Food & Beverage", "Technology",
    "Healthcare & Wellness", "Finance", "Education", "Travel & Hospitality",
    "Home & Lifestyle", "Automotive", "Entertainment & Media", "Sports & Fitness",
    "Real Estate", "Other",
  ];
  const BUDGET_RANGES = [
    "< ₹25k / month", "₹25k – ₹50k", "₹50k – ₹1L", "₹1L – ₹5L",
    "₹5L – ₹10L", "₹10L+", "Other",
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
  const NOTIF_KEYS = [
    { id: "messages", label: "Messages", desc: "New direct messages and chat replies" },
    { id: "collab", label: "Collaboration Requests", desc: "Incoming brand partnership offers" },
    { id: "projects", label: "Project Updates", desc: "Milestones, deliverables, and deadlines" },
    { id: "marketing", label: "Marketing Emails", desc: "Product news and growth tips" },
    { id: "system", label: "System Notifications", desc: "Security alerts and account updates" },
  ];

  const NAV_ICONS = {
    profile: '<svg class="ips-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
    social: '<svg class="ips-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    portfolio: '<svg class="ips-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
    collab: '<svg class="ips-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    verify: '<svg class="ips-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>',
    notif: '<svg class="ips-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    security: '<svg class="ips-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    sub: '<svg class="ips-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    danger: '<svg class="ips-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  };

  function skeletonHtml() {
    return `<div class="ips-shell ips-shell--loading" aria-busy="true" aria-label="Loading settings">
      <div class="ips-sk-block ips-sk-header"></div>
      <div class="ips-sk-block ips-sk-strip"></div>
      <div class="ips-sk-block ips-sk-hero"></div>
      <div class="ips-sk-block ips-sk-tabs"></div>
      <div class="ips-sk-block ips-sk-panel"></div>
      <div class="ips-sk-block ips-sk-panel ips-sk-panel--short"></div>
    </div>`;
  }

  function renderSkeleton(root) {
    if (!root) return;
    root.innerHTML = skeletonHtml();
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    window.dispatchEvent(
      new CustomEvent("influnet-user-updated", { detail: { user, token } })
    );
  }

  async function api(path, method, body) {
    const headers = { "Content-Type": "application/json", ...authHeaders() };
    const res = await fetch(path, {
      method,
      headers,
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
    return data;
  }

  function initials(name) {
    const p = String(name || "?").trim().split(/\s+/);
    return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
  }

  function parseLocation(location, city, state) {
    if (city || state) return { city: city || "", state: state || "" };
    const loc = String(location || "").trim();
    if (!loc) return { city: "", state: "" };
    const parts = loc.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return { city: parts[0], state: parts.slice(1).join(", ") };
    return { city: loc, state: "" };
  }

  function nicheArray(niche) {
    if (Array.isArray(niche)) return niche.filter(Boolean);
    return [];
  }

  function optionHtml(list, value, emptyLabel) {
    return (
      `<option value="">${emptyLabel || "Select"}</option>` +
      list
        .map((o) => {
          const v = typeof o === "string" ? o : o.id;
          const l = typeof o === "string" ? o : o.label || o;
          return `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(l)}</option>`;
        })
        .join("")
    );
  }

  function cardHead(icon, title, subtitle) {
    return `<div class="ips-card-head">
      <div class="ips-card-icon">${icon}</div>
      <div><h3>${title}</h3><p>${subtitle}</p></div>
    </div>`;
  }

  function field(label, inner, full, optional) {
    const opt = optional ? ' <span style="font-weight:400">(optional)</span>' : "";
    return `<div class="ips-field${full ? " ips-field--full" : ""}">
      <label>${label}${opt}</label>${inner}</div>`;
  }

  function denseCell(span, label, inner, extraClass) {
    const cls = `ips-dense-cell ips-col-${span}${extraClass ? ` ${extraClass}` : ""}`;
    const lbl = label
      ? `<label class="ips-dense-label">${label}</label>`
      : `<span class="ips-dense-label ips-dense-label--sr">${extraClass || "field"}</span>`;
    return `<div class="${cls}">${lbl}${inner}</div>`;
  }

  function denseRow(cells) {
    return `<div class="ips-dense-row">${cells}</div>`;
  }

  function renderLanguageCondensed(langs) {
    const active = Array.isArray(langs) ? langs.filter(Boolean) : [];
    const visible = active.slice(0, 3);
    const extra = Math.max(0, active.length - visible.length);
    return `
      <div class="ips-lang-compact">
        <div class="ips-lang-compact-chips" id="ips-languages-compact" aria-live="polite">
          ${
            active.length
              ? `${visible.map((l) => `<span class="ips-lang-pill">${esc(l)}</span>`).join("")}
                 ${extra ? `<span class="ips-lang-more">+${extra} other${extra > 1 ? "s" : ""}</span>` : ""}`
              : `<span class="ips-lang-empty">No languages</span>`
          }
        </div>
        <button type="button" class="ips-lang-manage" id="ips-lang-manage">Manage</button>
      </div>
      <div class="ips-lang-drawer" id="ips-lang-drawer" hidden>
        <div class="ips-chips ips-chips--dense" id="ips-languages">${LANGUAGES.map(
          (lang) =>
            `<button type="button" class="ips-chip${active.includes(lang) ? " active" : ""}" data-lang="${lang}">${lang}</button>`
        ).join("")}</div>
      </div>`;
  }

  function socialStatusBadge(stored) {
    const ok = !!(stored && String(stored).trim());
    return `<span class="ips-social-status${ok ? " ips-social-status--ok" : ""}" title="${ok ? "Linked" : "Not linked"}">
      <span class="ips-social-status-dot" aria-hidden="true"></span>
      <span class="ips-social-status-text">${ok ? "Linked" : "—"}</span>
    </span>`;
  }

  function syncLanguageCompact(root, langs) {
    const compact = root.querySelector("#ips-languages-compact");
    if (!compact) return;
    const active = langs.filter(Boolean);
    const visible = active.slice(0, 3);
    const extra = Math.max(0, active.length - visible.length);
    compact.innerHTML = active.length
      ? `${visible.map((l) => `<span class="ips-lang-pill">${esc(l)}</span>`).join("")}
         ${extra ? `<span class="ips-lang-more">+${extra} other${extra > 1 ? "s" : ""}</span>` : ""}`
      : `<span class="ips-lang-empty">No languages</span>`;
  }

  function wireDenseProfileControls(root) {
    root.querySelector("#ips-lang-manage")?.addEventListener("click", () => {
      const drawer = root.querySelector("#ips-lang-drawer");
      const btn = root.querySelector("#ips-lang-manage");
      if (!drawer || !btn) return;
      const open = drawer.hidden;
      drawer.hidden = !open;
      btn.textContent = open ? "Done" : "Manage";
    });

    const currentPw = root.querySelector("#ips-current-pw");
    const pwAccordion = root.querySelector("#ips-pw-accordion");
    currentPw?.addEventListener("focus", () => {
      pwAccordion?.classList.add("is-open");
      pwAccordion?.setAttribute("aria-hidden", "false");
    });
  }

  function roleLabel(role, profile) {
    if (role === "business") {
      const approved = profile?.approvalStatus === "approved";
      return approved ? "Verified Business" : "Business Owner";
    }
    return "Influencer";
  }

  function verifyBadge(verified, pending) {
    if (verified) return '<span class="ips-badge ips-badge--verified">● Verified</span>';
    if (pending) return '<span class="ips-badge ips-badge--pending">● Pending</span>';
    return '<span class="ips-badge ips-badge--muted">Not Verified</span>';
  }

  function extractHandle(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    try {
      const u = new URL(s.startsWith("http") ? s : `https://${s}`);
      const parts = u.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || u.hostname;
    } catch {
      return s.replace(/^@/, "");
    }
  }

  function isEmailLike(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function isLinkedInPrefix(prefix) {
    return String(prefix || "").toLowerCase().includes("linkedin.com");
  }

  function parseMetricValue(raw) {
    const s = String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/,/g, "");
    if (!s) return null;
    const scaled = s.match(/^([\d.]+)\s*([kmb])$/i);
    if (scaled) {
      let n = parseFloat(scaled[1]);
      const suffix = scaled[2].toLowerCase();
      if (suffix === "k") n *= 1000;
      else if (suffix === "m") n *= 1000000;
      else if (suffix === "b") n *= 1000000000;
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
    }
    const digits = s.replace(/[^\d]/g, "");
    if (!digits) return null;
    const n = parseInt(digits, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function displaySocialHandle(stored, prefix) {
    const s = String(stored || "").trim();
    if (!s) return "";
    if (!prefix) {
      return s.replace(/^https?:\/\//i, "");
    }
    const normalized = s
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/^@/, "");
    const p = prefix.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    let result;
    if (normalized.toLowerCase().startsWith(p.toLowerCase())) {
      result = normalized.slice(p.length).replace(/^\//, "");
    } else {
      result = extractHandle(s).replace(/^@/, "");
    }
    if (isLinkedInPrefix(prefix) && isEmailLike(result)) return "";
    return result;
  }

  function collectSocialHandleFromRoot(root, selector, prefix) {
    const raw = String(root.querySelector(selector)?.value || "").trim();
    if (!raw) return null;
    const slug = raw.replace(/^@/, "");
    if (isLinkedInPrefix(prefix) && isEmailLike(slug)) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const clean = raw.replace(/^@/, "");
    if (!prefix) {
      return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    }
    const base = prefix.endsWith("/") ? prefix : `${prefix}/`;
    if (clean.includes(".") && clean.includes("/")) {
      return clean.startsWith("http") ? clean : `https://${clean}`;
    }
    return base + clean;
  }

  function wireSocialPlatformInputs(root) {
    root.querySelectorAll("[data-social-metric]").forEach((input) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^\d.kmb,]/gi, "");
      });
      input.addEventListener("blur", () => {
        const parsed = parseMetricValue(input.value);
        if (parsed != null) input.value = String(parsed);
      });
    });

    root.querySelectorAll("[data-social-handle]").forEach((input) => {
      input.addEventListener("input", () => {
        const prefix = input.getAttribute("data-prefix") || "";
        if (!prefix) return;
        input.value = input.value.replace(/^@+/, "");
      });
    });

    const liInput = root.querySelector("#ips-li");
    if (liInput) {
      if (isEmailLike(liInput.value.trim())) liInput.value = "";
      liInput.setAttribute("readonly", "readonly");
      const unlockLinkedIn = () => {
        liInput.removeAttribute("readonly");
        liInput.removeEventListener("focus", unlockLinkedIn);
      };
      liInput.addEventListener("focus", unlockLinkedIn);
    }
  }

  function validateInfluencerSocialMetrics(root) {
    const rules = [
      { handle: "#ips-ig", metric: "#ips-instagramFollowers", label: "Instagram" },
      { handle: "#ips-fb", metric: "#ips-facebookFollowers", label: "Facebook" },
      { handle: "#ips-yt", metric: "#ips-youtubeSubscribers", label: "YouTube" },
    ];
    for (const rule of rules) {
      const handle = root.querySelector(rule.handle)?.value?.trim();
      if (!handle) continue;
      const parsed = parseMetricValue(root.querySelector(rule.metric)?.value);
      if (parsed == null || parsed <= 0) {
        const kind = rule.label === "YouTube" ? "subscriber" : "follower";
        return `${rule.label}: ${kind} count is required.`;
      }
    }
    return null;
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

  const PANEL_STORAGE_KEY = "infl_ips_active_panel";

  function loadSavedPanel() {
    try {
      const v = sessionStorage.getItem(PANEL_STORAGE_KEY);
      return v && typeof v === "string" ? v : "profile";
    } catch {
      return "profile";
    }
  }

  function saveActivePanel(id) {
    try {
      sessionStorage.setItem(PANEL_STORAGE_KEY, id);
    } catch (_) {}
  }

  function mergeSavedUser(prev, next) {
    if (!next || typeof next !== "object") return prev;
    const merged = { ...(prev || {}), ...next };
    if (!merged.id && next.userId) merged.id = next.userId;
    return merged;
  }

  function resolveSelectOther(options, value) {
    if (!value) return { select: "", custom: "" };
    if (options.includes(value)) return { select: value, custom: "" };
    return { select: "Other", custom: value };
  }

  function buildNav(role) {
    const items = [
      { id: "profile", label: "Profile" },
      { id: "social", label: "Social Accounts" },
    ];
    if (role === "influencer") {
      items.push({ id: "portfolio", label: "Portfolio" });
    }
    items.push(
      { id: "collaboration", label: "Collaboration Preferences" },
      { id: "verification", label: "Verification" },
      { id: "notifications", label: "Notifications" },
      { id: "security", label: "Security" },
      { id: "subscription", label: "Subscription" },
      { id: "danger", label: "Account management", danger: true }
    );
    return items;
  }

  function renderInfluencerProfile(p, loc, niches, langs) {
    const phoneLocal = String(p.phone || "").replace(/\D/g, "").slice(-10);
    return `
      <div class="ips-card ips-card--dense" data-section="profile">
        ${cardHead("👤", "Personal Information", "Identity and contact details for brands.")}
        <div class="ips-dense-grid">
          ${denseRow(
            denseCell(5, "Full name", `<input id="ips-name" class="ips-compact-input" value="${esc(p.name || "")}" disabled />`) +
              denseCell(
                5,
                "Influnet username",
                `<input id="ips-username" class="ips-compact-input" value="${esc(p.username || "")}" maxlength="30" spellcheck="false" />
                 <p id="ips-username-status" class="ips-dense-hint"></p>`
              ) +
              denseCell(
                2,
                "Public URL",
                `<p class="ips-url-hint">influnet/<span id="ips-username-preview">${esc(p.username || "username")}</span></p>`,
                "ips-dense-cell--hint"
              )
          )}
          ${denseRow(
            denseCell(
              6,
              "Email",
              `<input type="email" class="ips-compact-input" value="${esc(p.email || "")}" disabled />`
            ) +
              denseCell(
                6,
                "Phone",
                `<div class="ips-input-suffix-wrap">
                  <input id="ips-phone" class="ips-compact-input" type="tel" value="${esc(phoneLocal)}" placeholder="9876543210" inputmode="numeric" />
                  <button type="button" class="ips-suffix-btn" id="ips-phone-verify" title="Verify mobile">OTP</button>
                </div>`
              )
          )}
          ${denseRow(
            denseCell(6, "State", `<select id="ips-state" class="ips-compact-input">${optionHtml(INDIAN_STATES, loc.state, "State")}</select>`) +
              denseCell(6, "City", `<input id="ips-city" class="ips-compact-input" value="${esc(loc.city)}" placeholder="City" />`)
          )}
          ${denseRow(
            denseCell(3, "Gender", `<select id="ips-gender" class="ips-compact-input">${optionHtml(GENDERS, p.gender || "", "Gender")}</select>`) +
              denseCell(
                9,
                "Availability",
                `<select id="ips-availability" class="ips-compact-input">${optionHtml(
                  AVAILABILITY.map((a) => ({ id: a.id, label: a.label })),
                  p.availabilityStatus || "",
                  "Availability"
                )}</select>`
              )
          )}
          ${denseRow(
            denseCell(12, "Languages", renderLanguageCondensed(langs), "ips-dense-cell--langs")
          )}
          ${denseRow(
            `<div class="ips-dense-cell ips-col-12 ips-copy-stack">
              <label class="ips-dense-label">Headline &amp; bio</label>
              <input id="ips-headline" class="ips-compact-input" value="${esc(p.headline || "")}" placeholder="e.g. Lifestyle creator · 500K+ reach" />
              <textarea id="ips-bio" class="ips-compact-input ips-compact-textarea" rows="2" placeholder="Tell brands about your creative journey…">${esc(p.bio || "")}</textarea>
            </div>`
          )}
        </div>
      </div>
      <div class="ips-card ips-card--dense">
        ${cardHead("✦", "Creator Profile", "Categories and content formats.")}
        <div class="ips-dense-grid">
          ${denseRow(
            denseCell(6, "Primary category", `<select id="ips-niche1" class="ips-compact-input">${optionHtml(NICHES, niches[0] || "", "Category")}</select>`) +
              denseCell(6, "Secondary category", `<select id="ips-niche2" class="ips-compact-input">${optionHtml(NICHES, niches[1] || "", "Optional")}</select>`)
          )}
          ${denseRow(
            denseCell(
              12,
              "Content types",
              `<div class="ips-chips ips-chips--dense" id="ips-collab-types">${COLLAB_TYPES.map(
                (c) =>
                  `<button type="button" class="ips-chip${(p.collabTypes || []).includes(c.id) ? " active" : ""}" data-collab="${c.id}">${c.label}</button>`
              ).join("")}</div>`
            )
          )}
        </div>
      </div>
      <div class="ips-card ips-card--dense">
        ${cardHead("📊", "Audience", "Reach and demographics.")}
        <div class="ips-dense-grid">
          ${denseRow(
            denseCell(
              12,
              "Primary locations",
              `<input id="ips-audience-locations" class="ips-compact-input" value="${esc((p.audienceDemographics?.topCities || []).join(", "))}" placeholder="Mumbai, Delhi, Bangalore" />`
            )
          )}
          ${denseRow(
            denseCell(
              12,
              "Audience notes",
              `<textarea id="ips-audience-demo" class="ips-compact-input ips-compact-textarea" rows="2" placeholder="Age ranges, interests, gender split…">${esc(p.audienceDemographics?.notes || "")}</textarea>`
            )
          )}
        </div>
      </div>`;
  }

  function renderBusinessProfile(p, loc, typeVals, indVals) {
    const ta = p.targetAudience && typeof p.targetAudience === "object" ? p.targetAudience : {};
    return `
      <div class="ips-card" data-section="profile">
        ${cardHead("🏢", "Company Information", "Your business identity on Influnet.")}
        <div class="ips-grid">
          ${field("Company Name", `<input id="ips-company" value="${esc(p.companyName || "")}" />`)}
          ${field("Business Username", `<input id="ips-biz-username" value="${esc(p.businessUsername || p.username || "")}" maxlength="30" />`)}
          ${field("Contact Name", `<input id="ips-name" value="${esc(p.name || "")}" />`)}
          ${field("Phone Number", `<input id="ips-phone" type="tel" value="${esc(String(p.phone || "").replace(/\D/g, "").slice(-10))}" placeholder="9876543210" />`)}
          ${field("Email", `<input type="email" value="${esc(p.email || "")}" disabled />`)}
          ${field("Tagline", `<input id="ips-tagline" value="${esc(p.tagline || "")}" placeholder="Your brand in one line" />`)}
          ${field("Industry", `<select id="ips-industry">${optionHtml(INDUSTRIES, indVals.select, "Select industry")}</select>`)}
          ${field("Business Type", `<select id="ips-biz-type">${optionHtml(BUSINESS_TYPES, typeVals.select, "Select type")}</select>`)}
          ${field("Industry (custom)", `<input id="ips-industry-custom" value="${esc(indVals.custom)}" style="${indVals.select === "Other" ? "" : "display:none"}" />`)}
          ${field("Business Type (custom)", `<input id="ips-biz-type-custom" value="${esc(typeVals.custom)}" style="${typeVals.select === "Other" ? "" : "display:none"}" />`)}
          ${field("Website", `<input id="ips-website" value="${esc(p.website || "")}" placeholder="https://…" />`)}
          ${field("Founded Year", `<input id="ips-founded" value="${esc(ta.foundedYear || "")}" placeholder="e.g. 2018" />`, false, true)}
          ${field("Company Size", `<input id="ips-company-size" value="${esc(ta.companySize || "")}" placeholder="e.g. 11–50 employees" />`, false, true)}
          ${field("State", `<input id="ips-state" value="${esc(loc.state)}" />`)}
          ${field("City", `<input id="ips-city" value="${esc(loc.city)}" />`)}
          ${field("Business Description", `<textarea id="ips-description" rows="4">${esc(p.companyDescription || "")}</textarea>`, true)}
          ${field("Target Audience", `<textarea id="ips-target-audience" rows="3" placeholder="Who you want to reach…">${esc(ta.description || ta.notes || "")}</textarea>`, true, true)}
          ${field(
            "Preferred Creator Categories",
            `<div class="ips-chips" id="ips-pref-niches">${NICHES.map(
              (n) =>
                `<button type="button" class="ips-chip${(p.preferredCreatorNiches || []).includes(n) ? " active" : ""}" data-niche="${n}">${n}</button>`
            ).join("")}</div>`,
            true
          )}
        </div>
      </div>`;
  }

  function renderSocial(p, role) {
    const platforms =
      role === "business"
        ? [
            { id: "ig", key: "instagramHandle", label: "Instagram", cls: "ig", abbr: "IG", prefix: "instagram.com/", handlePh: "username" },
            { id: "fb", key: "facebookHandle", label: "Facebook", cls: "fb", abbr: "FB", prefix: "facebook.com/", handlePh: "username" },
            { id: "li", key: "linkedinHandle", label: "LinkedIn", cls: "li", abbr: "IN", prefix: "linkedin.com/in/", handlePh: "your-name" },
            { id: "web", key: "website", label: "Website", cls: "web", abbr: "WWW", prefix: "", handlePh: "yoursite.com" },
          ]
        : [
            {
              id: "ig",
              key: "instagramHandle",
              label: "Instagram",
              cls: "ig",
              abbr: "IG",
              prefix: "instagram.com/",
              handlePh: "username",
              metric: "instagramFollowers",
              metricPh: "Followers *",
            },
            {
              id: "fb",
              key: "facebookHandle",
              label: "Facebook",
              cls: "fb",
              abbr: "FB",
              prefix: "facebook.com/",
              handlePh: "username",
              metric: "facebookFollowers",
              metricPh: "Followers *",
            },
            {
              id: "yt",
              key: "youtubeHandle",
              label: "YouTube",
              cls: "yt",
              abbr: "YT",
              prefix: "youtube.com/@",
              handlePh: "channel",
              metric: "youtubeSubscribers",
              metricPh: "Subscribers *",
            },
            {
              id: "li",
              key: "linkedinHandle",
              label: "LinkedIn",
              cls: "li",
              abbr: "IN",
              prefix: "linkedin.com/in/",
              handlePh: "your-name",
            },
            {
              id: "web",
              key: "website",
              label: "Website",
              cls: "web",
              abbr: "WWW",
              prefix: "",
              handlePh: "yoursite.com",
            },
          ];

    const rows = platforms
      .map((pl) => {
        const stored = p[pl.key] || "";
        const handleVal = displaySocialHandle(stored, pl.prefix);
        const metricVal = pl.metric && p[pl.metric] ? String(p[pl.metric]) : "";
        const metricCol = pl.metric
          ? `<div class="ips-social-row-metric ips-col-3">
              <input
                id="ips-${pl.metric}"
                class="ips-social-metric-input ips-compact-input"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                data-social-metric="1"
                data-metric-for="ips-${pl.id}"
                placeholder="${pl.metricPh.includes("Subscriber") ? "Subscribers" : "Followers"}"
                value="${esc(metricVal)}"
              />
            </div>`
          : "";

        const urlPlaceholder = pl.prefix
          ? `${pl.prefix}${pl.handlePh}`
          : `https://${pl.handlePh}`;
        const inputAttrs =
          pl.id === "li"
            ? 'name="infl-linkedin-username" autocomplete="off" data-lpignore="true" data-1p-ignore spellcheck="false"'
            : 'autocomplete="off" spellcheck="false"';

        return `<div class="ips-social-row ips-social-row--dense${pl.metric ? "" : " ips-social-row--no-metric"}" data-platform="${pl.id}">
          <div class="ips-social-row-icon ips-col-1">
            <div class="ips-social-icon ips-social-icon--${pl.cls}" aria-hidden="true">${pl.abbr}</div>
          </div>
          <div class="ips-social-row-brand ips-col-2">
            <strong class="ips-social-row-name">${pl.label}</strong>
          </div>
          <div class="ips-social-row-url ips-col-5">
            <input
              id="ips-${pl.id}"
              class="ips-social-handle-input ips-compact-input"
              type="text"
              data-social-handle="1"
              data-prefix="${esc(pl.prefix)}"
              ${inputAttrs}
              placeholder="${esc(urlPlaceholder)}"
              value="${esc(handleVal)}"
            />
          </div>
          ${metricCol}
          <div class="ips-social-row-status ips-col-1">${socialStatusBadge(stored)}</div>
        </div>`;
      })
      .join("");

    return `<div class="ips-card ips-card--dense ips-card--social" data-section="social">
      ${cardHead("🔗", "Social Platforms", "Handles and audience sizes.")}
      <div class="ips-social-table ips-social-table--dense">${rows}</div>
    </div>`;
  }

  function renderPortfolio(p) {
    const portfolio = Array.isArray(p.portfolio)
      ? p.portfolio.map((x) => (typeof x === "string" ? x : x?.url)).filter(Boolean)
      : [];
    return `<div class="ips-card" data-section="portfolio">
      ${cardHead("🖼", "Portfolio", "Showcase your best work and brand collaborations.")}
      <div class="ips-grid ips-grid--1">
        ${field("Portfolio Images & Videos (one URL per line)", `<textarea id="ips-portfolio" rows="5" placeholder="https://…">${esc(portfolio.join("\n"))}</textarea>`, true)}
        ${field("Media Kit URL", `<input id="ips-media-kit" value="${esc(p.mediaKitUrl || "")}" placeholder="Link to PDF or drive folder" />`, true, true)}
        ${field("Past Collaborations", `<textarea id="ips-past-collabs" rows="3" placeholder="Brand names or campaign highlights…">${esc(
          Array.isArray(p.pastCollaborations)
            ? p.pastCollaborations.map((c) => (typeof c === "string" ? c : c?.name || "")).filter(Boolean).join("\n")
            : ""
        )}</textarea>`, true, true)}
      </div>
    </div>`;
  }

  function normalizeCollabTypesForDisplay(types) {
    if (!Array.isArray(types)) return [];
    return types.map((id) => (id === "youtube" ? "yt" : id));
  }

  function normalizePriceRangeForDisplay(id) {
    const legacy = {
      under10k: "entry",
      "10kto50k": "standard",
      "50kto2l": "premium",
      "2lplus": "pro",
    };
    const s = String(id || "").trim();
    return legacy[s] || s;
  }

  function renderCollaboration(p, role, budgetVals) {
    if (role === "business") {
      return `<div class="ips-card" data-section="collaboration">
        ${cardHead("🤝", "Campaign Preferences", "Tell creators what you're looking for.")}
        <div class="ips-grid">
          ${field("Monthly Marketing Budget", `<select id="ips-budget">${optionHtml(BUDGET_RANGES, budgetVals.select, "Select range")}</select>`)}
          ${field("Custom Budget", `<input id="ips-budget-custom" value="${esc(budgetVals.custom)}" style="${budgetVals.select === "Other" ? "" : "display:none"}" />`)}
          ${field("Campaign Types", `<input value="Influencer Marketing · Reach & Awareness" disabled />`, true)}
        </div>
      </div>`;
    }
    const selectedCollabs = normalizeCollabTypesForDisplay(p.collabTypes || []);
    const selected = normalizePriceRangeForDisplay(p.priceRange || "");
    return `<div class="ips-card ips-card--dense" data-section="collaboration">
      ${cardHead("🤝", "Collaboration Preferences", "Campaign types and pricing.")}
      <div class="ips-dense-grid">
        <div class="ips-collab-grid ips-collab-grid--dense" id="ips-collab-cards">${COLLAB_TYPES.map(
          (c) =>
            `<button type="button" class="ips-collab-card${selectedCollabs.includes(c.id) ? " active" : ""}" data-collab-card="${c.id}">
              <strong>${c.label}</strong><span>${c.desc}</span></button>`
        ).join("")}</div>
        <div class="ips-price-grid ips-price-grid--dense" id="ips-price-range">${PRICE_RANGES.map(
          (r) =>
            `<button type="button" class="ips-price-btn${selected === r.id ? " active" : ""}" data-price="${r.id}">
              <div class="tier">${r.label}</div><div class="range">${r.range}</div></button>`
        ).join("")}</div>
        ${denseRow(
          denseCell(
            6,
            "Min. budget",
            `<input id="ips-min-budget" class="ips-compact-input" value="${esc(p.minimumBudget || "")}" placeholder="e.g. ₹10,000" />`
          )
        )}
      </div>
    </div>`;
  }

  function renderVerification(p, role) {
    const emailOk = !!(p.email && String(p.email).includes("@"));
    const phoneOk = !!p.phoneVerified;
    const profileOk = role === "business" ? p.approvalStatus === "approved" : !!(p.username && p.avatarUrl);
    const identityOk = false;
    const rows = [
      { label: "Mobile Verification", ok: phoneOk, pending: !!p.phone && !phoneOk },
      { label: "Email Verification", ok: emailOk, pending: false },
      { label: "Profile Verification", ok: profileOk, pending: role === "business" && p.approvalStatus === "pending" },
      { label: "Identity Verification", ok: identityOk, pending: false },
    ];
    return `<div class="ips-card" data-section="verification">
      ${cardHead("🛡", "Verification", "Build trust with brands and creators.")}
      ${rows
        .map(
          (r) =>
            `<div class="ips-verify-row">
              <div><strong style="font-size:0.85rem">${r.label}</strong></div>
              ${verifyBadge(r.ok, r.pending)}
            </div>`
        )
        .join("")}
    </div>`;
  }

  function renderNotifications(userId, prefs) {
    return `<div class="ips-card" data-section="notifications">
      ${cardHead("🔔", "Notification Settings", "Choose what you want to be notified about.")}
      ${NOTIF_KEYS.map(
        (n) =>
          `<div class="ips-toggle-row">
            <div><strong>${n.label}</strong><span>${n.desc}</span></div>
            <label class="ips-switch"><input type="checkbox" data-notif="${n.id}" ${prefs[n.id] !== false ? "checked" : ""} /><span></span></label>
          </div>`
      ).join("")}
      <p style="font-size:0.72rem;color:#9ca3af;margin:0.75rem 0 0">Preferences saved locally on this device.</p>
    </div>`;
  }

  function renderSecurity(p) {
    return `<div class="ips-card ips-card--dense" data-section="security">
      ${cardHead("🔒", "Security", "Sign-in and account access.")}
      <div class="ips-dense-grid">
        ${denseRow(
          `<div class="ips-dense-cell ips-col-12">
            <label class="ips-dense-label">Email address</label>
            <div class="ips-input-suffix-wrap">
              <input id="ips-sec-email" class="ips-compact-input" type="email" value="${esc(p.email || "")}" placeholder="you@email.com" />
              <button type="button" class="ips-suffix-btn ips-suffix-btn--primary" id="ips-email-update-btn" title="Update email">Update</button>
            </div>
            <div class="ips-email-pw-slide" id="ips-email-pw-slide" hidden>
              <input id="ips-sec-email-pw" class="ips-compact-input" type="password" autocomplete="current-password" placeholder="Current password to confirm" />
            </div>
          </div>`
        )}
        ${denseRow(
          denseCell(
            12,
            "Phone",
            `<input class="ips-compact-input" value="${esc(p.phone || "—")}" disabled />`
          )
        )}
        ${denseRow(
          `<div class="ips-dense-cell ips-col-12">
            <label class="ips-dense-label">Password</label>
            <input id="ips-current-pw" class="ips-compact-input" type="password" autocomplete="current-password" placeholder="Current password" />
            <div class="ips-pw-accordion" id="ips-pw-accordion" aria-hidden="true">
              <input id="ips-new-pw" class="ips-compact-input" type="password" autocomplete="new-password" placeholder="New password (6+ chars)" />
              <input id="ips-confirm-pw" class="ips-compact-input" type="password" autocomplete="new-password" placeholder="Confirm new password" />
              <button type="button" class="ips-save-btn ips-save-btn--inline" id="ips-change-pw">Change password</button>
            </div>
          </div>`
        )}
        ${denseRow(
          denseCell(
            12,
            "",
            `<p class="ips-security-meta">Last sign-in: ${esc(p.lastSignIn || "Current session")} · This browser</p>`,
            "ips-dense-cell--meta"
          )
        )}
      </div>
    </div>`;
  }

  function renderSubscription() {
    return `<div class="ips-card" data-section="subscription">
      ${cardHead("💳", "Subscription", "Manage your Influnet plan.")}
      <p style="font-size:0.85rem;margin:0 0 0.75rem">You're on the <strong>Influnet Free</strong> plan.</p>
      <p style="font-size:0.78rem;color:#6b7280;margin:0">Upgrade options coming soon. Contact <a href="mailto:support@influnet.io" style="color:#ee3e96">support@influnet.io</a> for enterprise plans.</p>
    </div>`;
  }

  function renderDanger() {
    return `<div class="ips-card ips-danger-zone" data-section="danger">
      ${cardHead("⚙", "Account Management", "Permanently close your account and remove your data.")}
      <p style="font-size:0.82rem;color:#6b7280;margin:0 0 1rem">Deleting your account removes all profile data, messages, and collaborations permanently.</p>
      <button type="button" class="ips-btn-danger" id="ips-delete-account">Delete Account</button>
    </div>`;
  }

  async function fetchCompletion() {
    try {
      const res = await fetch("/api/profile/completion", {
        credentials: "same-origin",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        const comp = data.completion || data;
        return {
          ...comp,
          percent: comp.percent ?? data.percent ?? data.completionPercent ?? 0,
        };
      }
    } catch (_) {}
    return { percent: 0 };
  }

  async function mount(root, profile, options) {
    const role = options?.role === "business" ? "business" : "influencer";

    const container =
      root.closest(".max-w-2xl.mx-auto, .max-w-3xl.mx-auto") || root.parentElement;
    if (container) {
      container.classList.add("ips-wide", "influnet-profile-edit-enhanced");
    }
    renderSkeleton(root);

    const user = getUser();
    const p = { ...user, ...profile };
    const loc = parseLocation(p.location, p.city, p.state);
    const niches = nicheArray(p.niche);
    const langs = Array.isArray(p.languages) ? [...p.languages] : [];
    const typeVals = resolveSelectOther(BUSINESS_TYPES, p.businessType || "");
    const indVals = resolveSelectOther(INDUSTRIES, p.industry || "");
    const budgetVals = resolveSelectOther(BUDGET_RANGES, p.marketingBudget || "");
    const completion = await fetchCompletion();
    const pct = completion.percent ?? completion.completionPercent ?? 0;
    const prefs = loadNotifPrefs(p.id || user?.id || "anon");
    const nav = buildNav(role);
    let activePanel = loadSavedPanel();
    if (!nav.some((n) => n.id === activePanel)) activePanel = "profile";
    let selectedCollabs = Array.isArray(p.collabTypes) ? [...p.collabTypes] : [];
    let priceRange = p.priceRange || "";
    let selectedNiches = Array.isArray(p.preferredCreatorNiches) ? [...p.preferredCreatorNiches] : [];
    let autoSaveTimer = 0;
    let dirty = false;

    const displayName = role === "business" ? p.companyName || p.name : p.name;
    const username = role === "business" ? p.businessUsername || p.username : p.username;
    const avatarUrl = role === "business" ? p.logoUrl || p.avatarUrl : p.avatarUrl;
    const publicUrl =
      username
        ? `/influnet/${encodeURIComponent(String(username).toLowerCase())}`
        : "#";

    root.innerHTML = `
      <div class="ips-shell" id="ips-root-inner">
        <header class="ips-page-header">
          <p class="ips-crumb">Account</p>
          <h1 class="ips-page-title">Settings</h1>
        </header>

        <div class="ips-completion-strip">
          <div class="ips-completion-strip-main">
            <div class="ips-completion-label">
              <span class="ips-completion-title">Profile Completion</span>
              <span class="ips-completion-pct" id="ips-pct-label">${pct}%</span>
            </div>
            <div class="ips-completion-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
              <div class="ips-completion-fill" id="ips-pct-bar" style="width:${pct}%"></div>
            </div>
            <p class="ips-completion-hint">Complete your profile to improve visibility in search and collaboration requests.</p>
          </div>
          ${publicUrl !== "#" ? `<a class="ips-view-public" href="${esc(publicUrl)}" target="_blank" rel="noopener">View public profile →</a>` : ""}
        </div>

        <div class="ips-hero">
          <div class="ips-avatar-wrap">
            <div class="ips-avatar" id="ips-avatar">${avatarUrl ? `<img src="${esc(avatarUrl)}" alt="" />` : esc(initials(displayName))}</div>
            <button type="button" class="ips-avatar-btn" id="ips-avatar-btn" title="Change photo">📷</button>
            <input type="file" id="ips-avatar-file" class="ips-hidden-input" accept="image/*" />
          </div>
          <div class="ips-hero-body">
            <h2>${esc(displayName || "Your Profile")}</h2>
            <p class="ips-hero-meta">${username ? `@${esc(username)}` : "Set your username"} · ${esc(p.email || "")}</p>
            <div class="ips-badges">
              <span class="ips-badge ips-badge--role">${roleLabel(role, p)}</span>
              ${verifyBadge(p.phoneVerified || p.approvalStatus === "approved", p.approvalStatus === "pending")}
            </div>
          </div>
        </div>

        <nav class="ips-tabs" id="ips-settings-tabs" role="tablist" aria-label="Settings sections">
          ${nav
            .map(
              (n) =>
                `<button type="button" role="tab" class="ips-tab${n.danger ? " ips-tab--danger" : ""}${n.id === activePanel ? " active" : ""}" data-panel="${n.id}" aria-selected="${n.id === activePanel ? "true" : "false"}">${n.label}</button>`
            )
            .join("")}
        </nav>

        <div id="ips-msg" class="ips-msg" style="display:none"></div>

        <div id="ips-panels" class="ips-panels">
          <div class="ips-panel active" data-panel="profile" role="tabpanel">
            ${role === "business" ? renderBusinessProfile(p, loc, typeVals, indVals) : renderInfluencerProfile(p, loc, niches, langs)}
          </div>
          <div class="ips-panel" data-panel="social" role="tabpanel">${renderSocial(p, role)}</div>
          ${role === "influencer" ? `<div class="ips-panel" data-panel="portfolio" role="tabpanel">${renderPortfolio(p)}</div>` : ""}
          <div class="ips-panel" data-panel="collaboration" role="tabpanel">${renderCollaboration(p, role, budgetVals)}</div>
          <div class="ips-panel" data-panel="verification" role="tabpanel">${renderVerification(p, role)}</div>
          <div class="ips-panel" data-panel="notifications" role="tabpanel">${renderNotifications(p.id || user?.id, prefs)}</div>
          <div class="ips-panel" data-panel="security" role="tabpanel">${renderSecurity(p)}</div>
          <div class="ips-panel" data-panel="subscription" role="tabpanel">${renderSubscription()}</div>
          <div class="ips-panel" data-panel="danger" role="tabpanel">${renderDanger()}</div>
        </div>
      </div>`;

    let savebar = document.getElementById("ips-savebar");
    if (!savebar) {
      savebar = document.createElement("div");
      savebar.id = "ips-savebar";
      savebar.className = "ips-savebar";
      savebar.innerHTML = `<span class="ips-save-status" id="ips-save-status">All changes saved</span>
        <button type="button" class="ips-save-btn" id="ips-save-btn">Save Changes</button>`;
      document.body.appendChild(savebar);
    }

    function showMsg(text, ok) {
      const el = root.querySelector("#ips-msg");
      if (!el) return;
      el.style.display = "block";
      el.className = `ips-msg ${ok ? "ok" : "err"}`;
      el.textContent = text;
    }

    function setSaveStatus(state, text) {
      const el = document.getElementById("ips-save-status");
      if (!el) return;
      el.className = `ips-save-status ${state || ""}`;
      el.textContent = text;
    }

    function syncCollabUi() {
      root.querySelectorAll("[data-collab]").forEach((chip) => {
        const id = chip.getAttribute("data-collab");
        chip.classList.toggle("active", selectedCollabs.includes(id));
      });
      root.querySelectorAll("[data-collab-card]").forEach((card) => {
        const id = card.getAttribute("data-collab-card");
        card.classList.toggle("active", selectedCollabs.includes(id));
      });
    }

    function switchPanel(id) {
      if (!id) return;
      activePanel = id;
      saveActivePanel(id);
      root.querySelectorAll(".ips-tab").forEach((b) => {
        const on = b.getAttribute("data-panel") === id;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      root.querySelectorAll(".ips-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.getAttribute("data-panel") === id);
      });
    }

    function parseMetric(id) {
      const raw = root.querySelector(id)?.value;
      const n = parseMetricValue(raw);
      return n == null ? 0 : n;
    }

    function collectInfluencerPayload() {
      const niche = [
        root.querySelector("#ips-niche1")?.value,
        root.querySelector("#ips-niche2")?.value,
      ].filter(Boolean);
      const portfolioLines = (root.querySelector("#ips-portfolio")?.value || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const pastLines = (root.querySelector("#ips-past-collabs")?.value || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const topCities = (root.querySelector("#ips-audience-locations")?.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const phoneDigits = String(root.querySelector("#ips-phone")?.value || "")
        .replace(/\D/g, "")
        .slice(-10);
      return {
        phone: phoneDigits.length === 10 ? `+91 ${phoneDigits}` : null,
        gender: root.querySelector("#ips-gender")?.value || null,
        city: root.querySelector("#ips-city")?.value?.trim() || null,
        state: root.querySelector("#ips-state")?.value?.trim() || null,
        languages: langs,
        bio: root.querySelector("#ips-bio")?.value?.trim() || null,
        headline: root.querySelector("#ips-headline")?.value?.trim() || null,
        availabilityStatus: root.querySelector("#ips-availability")?.value || null,
        niche,
        username: root.querySelector("#ips-username")?.value?.trim().toLowerCase() || null,
        instagramHandle: collectSocialHandleFromRoot(root, "#ips-ig", "instagram.com/"),
        facebookHandle: collectSocialHandleFromRoot(root, "#ips-fb", "facebook.com/"),
        youtubeHandle: collectSocialHandleFromRoot(root, "#ips-yt", "youtube.com/@"),
        linkedinHandle: collectSocialHandleFromRoot(root, "#ips-li", "linkedin.com/in/"),
        instagramFollowers: parseMetric("#ips-instagramFollowers"),
        facebookFollowers: parseMetric("#ips-facebookFollowers"),
        youtubeSubscribers: parseMetric("#ips-youtubeSubscribers"),
        collabTypes: selectedCollabs,
        priceRange: priceRange || null,
        mediaKitUrl: root.querySelector("#ips-media-kit")?.value?.trim() || null,
        portfolio: portfolioLines.map((url) => ({ url })),
        pastCollaborations: pastLines,
        audienceDemographics: {
          topCities,
          notes: root.querySelector("#ips-audience-demo")?.value?.trim() || "",
        },
      };
    }

    function collectBusinessPayload() {
      const phoneDigits = String(root.querySelector("#ips-phone")?.value || p.phone || "")
        .replace(/\D/g, "")
        .slice(-10);
      const industrySel = root.querySelector("#ips-industry")?.value;
      const typeSel = root.querySelector("#ips-biz-type")?.value;
      const budgetSel = root.querySelector("#ips-budget")?.value;
      const ta = {
        foundedYear: root.querySelector("#ips-founded")?.value?.trim() || "",
        companySize: root.querySelector("#ips-company-size")?.value?.trim() || "",
        description: root.querySelector("#ips-target-audience")?.value?.trim() || "",
        notes: root.querySelector("#ips-target-audience")?.value?.trim() || "",
      };
      return {
        name: root.querySelector("#ips-name")?.value?.trim(),
        companyName: root.querySelector("#ips-company")?.value?.trim(),
        businessUsername: root.querySelector("#ips-biz-username")?.value?.trim().toLowerCase(),
        tagline: root.querySelector("#ips-tagline")?.value?.trim() || null,
        companyDescription: root.querySelector("#ips-description")?.value?.trim() || null,
        industry: industrySel === "Other" ? root.querySelector("#ips-industry-custom")?.value?.trim() : industrySel,
        businessType: typeSel === "Other" ? root.querySelector("#ips-biz-type-custom")?.value?.trim() : typeSel,
        city: root.querySelector("#ips-city")?.value?.trim() || null,
        state: root.querySelector("#ips-state")?.value?.trim() || null,
        phone: phoneDigits.length === 10 ? `+91 ${phoneDigits}` : null,
        instagramHandle: collectSocialHandleFromRoot(root, "#ips-ig", "instagram.com/"),
        facebookHandle: collectSocialHandleFromRoot(root, "#ips-fb", "facebook.com/"),
        linkedinHandle: collectSocialHandleFromRoot(root, "#ips-li", "linkedin.com/in/"),
        website:
          collectSocialHandleFromRoot(root, "#ips-web", "") ||
          root.querySelector("#ips-website")?.value?.trim() ||
          null,
        marketingBudget:
          budgetSel === "Other"
            ? root.querySelector("#ips-budget-custom")?.value?.trim()
            : budgetSel,
        preferredCreatorNiches: selectedNiches,
        targetAudience: ta,
      };
    }

    async function saveProfile(manual) {
      const btn = document.getElementById("ips-save-btn");
      if (btn?.disabled) return;
      if (btn) btn.disabled = true;
      setSaveStatus("saving", "Saving…");

      const prevPhone = String(p.phone || "").replace(/\D/g, "").slice(-10);
      const phoneDigits = String(root.querySelector("#ips-phone")?.value || "")
        .replace(/\D/g, "")
        .slice(-10);
      if (phoneDigits.length === 10 && phoneDigits !== prevPhone) {
        const otp = window.influnetPhoneOtpState?.();
        if (!otp?.verificationToken || otp.status !== "verified" || otp.phoneLocal !== phoneDigits) {
          showMsg("Verify your new mobile number with OTP before saving.", false);
          setSaveStatus("error", "Unsaved changes");
          if (btn) btn.disabled = false;
          return;
        }
      }

      if (role === "influencer") {
        const socialErr = validateInfluencerSocialMetrics(root);
        if (socialErr) {
          showMsg(socialErr, false);
          setSaveStatus("error", "Unsaved changes");
          if (btn) btn.disabled = false;
          return;
        }
        const nextUsername = root.querySelector("#ips-username")?.value?.trim().toLowerCase();
        const curUsername = String(p.username || "").trim().toLowerCase();
        if (manual && nextUsername && nextUsername !== curUsername) {
          const ok = window.confirm("Changing your username will change your public profile URL. Continue?");
          if (!ok) {
            if (btn) btn.disabled = false;
            setSaveStatus("", dirty ? "Unsaved changes" : "All changes saved");
            return;
          }
        }
      }

      try {
        const path = role === "business" ? "/api/business-profile/me" : "/api/influencer-profile/me";
        const payload = role === "business" ? collectBusinessPayload() : collectInfluencerPayload();
        const data = await api(path, "PATCH", payload);
        const next = data.profile || data.user || data;
        if (next) {
          Object.assign(p, next);
          const merged = mergeSavedUser(getUser(), next);
          applyUser(merged, data.token);
        }
        dirty = false;
        setSaveStatus("saved", "All changes saved");
        if (manual) {
          showMsg("Profile saved successfully.", true);
          window.dispatchEvent(new CustomEvent("influnet-profile-updated"));
        }
        const comp = await fetchCompletion();
        const newPct = comp.percent ?? comp.completionPercent ?? pct;
        const bar = root.querySelector("#ips-pct-bar");
        const lbl = root.querySelector("#ips-pct-label");
        const barWrap = root.querySelector(".ips-completion-bar");
        if (bar) bar.style.width = `${newPct}%`;
        if (lbl) lbl.textContent = `${newPct}%`;
        if (barWrap) barWrap.setAttribute("aria-valuenow", String(newPct));
        options?.onSaved?.(next);
      } catch (err) {
        setSaveStatus("error", "Could not save");
        if (manual) showMsg(err.message || "Save failed.", false);
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    function scheduleAutoSave() {
      dirty = true;
      setSaveStatus("", "Unsaved changes");
      clearTimeout(autoSaveTimer);
      autoSaveTimer = window.setTimeout(() => saveProfile(false), 2500);
    }

    root.querySelectorAll(".ips-tab").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        switchPanel(b.getAttribute("data-panel"));
      });
    });

    switchPanel(activePanel);

    wireSocialPlatformInputs(root);
    wireDenseProfileControls(root);

    root.querySelector("#ips-languages")?.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-lang]");
      if (!chip) return;
      const lang = chip.getAttribute("data-lang");
      chip.classList.toggle("active");
      const idx = langs.indexOf(lang);
      if (chip.classList.contains("active") && idx < 0) langs.push(lang);
      else if (!chip.classList.contains("active") && idx >= 0) langs.splice(idx, 1);
      syncLanguageCompact(root, langs);
      scheduleAutoSave();
    });

    root.querySelector("#ips-collab-types")?.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-collab]");
      if (!chip) return;
      const id = chip.getAttribute("data-collab");
      const idx = selectedCollabs.indexOf(id);
      if (idx >= 0) selectedCollabs.splice(idx, 1);
      else selectedCollabs.push(id);
      syncCollabUi();
      scheduleAutoSave();
    });

    root.querySelector("#ips-collab-cards")?.addEventListener("click", (e) => {
      const card = e.target.closest("[data-collab-card]");
      if (!card) return;
      const id = card.getAttribute("data-collab-card");
      const idx = selectedCollabs.indexOf(id);
      if (idx >= 0) selectedCollabs.splice(idx, 1);
      else selectedCollabs.push(id);
      syncCollabUi();
      scheduleAutoSave();
    });

    root.querySelector("#ips-price-range")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-price]");
      if (!btn) return;
      priceRange = btn.getAttribute("data-price");
      root.querySelectorAll(".ips-price-btn").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-price") === priceRange);
      });
      scheduleAutoSave();
    });

    root.querySelector("#ips-pref-niches")?.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-niche]");
      if (!chip) return;
      const n = chip.getAttribute("data-niche");
      chip.classList.toggle("active");
      const idx = selectedNiches.indexOf(n);
      if (chip.classList.contains("active") && idx < 0) selectedNiches.push(n);
      else if (!chip.classList.contains("active") && idx >= 0) selectedNiches.splice(idx, 1);
      scheduleAutoSave();
    });

    root.querySelector("#ips-industry")?.addEventListener("change", (e) => {
      const custom = root.querySelector("#ips-industry-custom");
      if (custom) custom.style.display = e.target.value === "Other" ? "" : "none";
      scheduleAutoSave();
    });
    root.querySelector("#ips-biz-type")?.addEventListener("change", (e) => {
      const custom = root.querySelector("#ips-biz-type-custom");
      if (custom) custom.style.display = e.target.value === "Other" ? "" : "none";
      scheduleAutoSave();
    });
    root.querySelector("#ips-budget")?.addEventListener("change", (e) => {
      const custom = root.querySelector("#ips-budget-custom");
      if (custom) custom.style.display = e.target.value === "Other" ? "" : "none";
      scheduleAutoSave();
    });

    root.querySelectorAll("input, select, textarea").forEach((el) => {
      if (el.disabled) return;
      el.addEventListener("input", scheduleAutoSave);
      el.addEventListener("change", scheduleAutoSave);
    });

    root.querySelector("#ips-username")?.addEventListener("input", () => {
      const u = root.querySelector("#ips-username").value.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
      root.querySelector("#ips-username").value = u;
      const preview = root.querySelector("#ips-username-preview");
      if (preview) preview.textContent = u || "username";
    });

    const saveBtn = document.getElementById("ips-save-btn");
    if (saveBtn) {
      saveBtn.onclick = () => saveProfile(true);
    }

    root.querySelectorAll("[data-notif]").forEach((inp) => {
      inp.addEventListener("change", () => {
        prefs[inp.getAttribute("data-notif")] = inp.checked;
        saveNotifPrefs(p.id || user?.id || "anon", prefs);
        setSaveStatus("saved", "Notification preferences saved");
      });
    });

    root.querySelector("#ips-email-update-btn")?.addEventListener("click", async () => {
      const slide = root.querySelector("#ips-email-pw-slide");
      const btn = root.querySelector("#ips-email-update-btn");
      if (slide?.hidden) {
        slide.hidden = false;
        slide.classList.add("is-open");
        root.querySelector("#ips-sec-email-pw")?.focus();
        if (btn) btn.textContent = "Confirm";
        return;
      }
      try {
        const data = await api("/api/auth/update-email", "POST", {
          email: root.querySelector("#ips-sec-email").value,
          password: root.querySelector("#ips-sec-email-pw").value,
        });
        if (data.user) applyUser(data.user, data.token);
        showMsg("Email update initiated. Check your inbox if confirmation is required.", true);
        if (slide) {
          slide.hidden = true;
          slide.classList.remove("is-open");
        }
        const pw = root.querySelector("#ips-sec-email-pw");
        if (pw) pw.value = "";
        if (btn) btn.textContent = "Update";
      } catch (err) {
        showMsg(err.message, false);
      }
    });

    root.querySelector("#ips-change-pw")?.addEventListener("click", async () => {
      const np = root.querySelector("#ips-new-pw").value;
      const cp = root.querySelector("#ips-confirm-pw").value;
      if (np !== cp) {
        showMsg("Passwords do not match.", false);
        return;
      }
      try {
        await api("/api/auth/change-password", "POST", {
          currentPassword: root.querySelector("#ips-current-pw").value,
          newPassword: np,
        });
        showMsg("Password changed successfully.", true);
        root.querySelector("#ips-current-pw").value = "";
        root.querySelector("#ips-new-pw").value = "";
        root.querySelector("#ips-confirm-pw").value = "";
        root.querySelector("#ips-pw-accordion")?.classList.remove("is-open");
      } catch (err) {
        showMsg(err.message, false);
      }
    });

    root.querySelector("#ips-delete-account")?.addEventListener("click", () => {
      window.alert("Account deletion is not available in-app yet. Please contact support@influnet.io.");
    });

    const avatarBtn = root.querySelector("#ips-avatar-btn");
    const avatarFile = root.querySelector("#ips-avatar-file");
    avatarBtn?.addEventListener("click", () => avatarFile?.click());
    avatarFile?.addEventListener("change", async () => {
      const file = avatarFile.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      const endpoint =
        role === "business" ? "/api/business-profile/logo" : "/api/influencer-profile/avatar";
      try {
        setSaveStatus("saving", "Uploading photo…");
        const res = await fetch(endpoint, {
          method: "POST",
          headers: authHeaders(),
          credentials: "same-origin",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        const url = data.url || data.avatarUrl || data.logoUrl;
        if (url) {
          const av = root.querySelector("#ips-avatar");
          if (av) av.innerHTML = `<img src="${esc(url)}" alt="" />`;
        }
        setSaveStatus("saved", "Photo updated");
        window.dispatchEvent(new CustomEvent("influnet-profile-updated", { detail: { soft: true } }));
      } catch (err) {
        showMsg(err.message, false);
        setSaveStatus("error", "Upload failed");
      }
    });

    if (window.influnetEnhanceIndiaLocations) {
      window.influnetEnhanceIndiaLocations(root);
    }

    if (typeof window.influnetEndInfluencerProfileNavigation === "function") {
      window.influnetEndInfluencerProfileNavigation();
    }
  }

  window.InflProfileSettings = { mount, renderSkeleton, skeletonHtml };
})();
