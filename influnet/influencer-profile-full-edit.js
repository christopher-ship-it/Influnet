/**
 * Full influencer profile edit — all fields from signup flow.
 */
(function () {
  try {
    const ROOT_ID = "influnet-profile-edit-root";
    const TRANSITION_ID = "infl-profile-transition-shell";
    const PENDING_KEY = "influnet_profile_nav_pending";
    const PROFILE_PAGE_TITLES = new Set([
      "Edit Profile",
      "Profile Settings",
      "Settings",
      "Account",
    ]);

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

    const EXTRA_PLATFORMS = [
      { id: "tiktok", label: "TikTok" },
      { id: "twitter", label: "X (Twitter)" },
      { id: "snapchat", label: "Snapchat" },
      { id: "pinterest", label: "Pinterest" },
      { id: "website", label: "Website" },
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

    let profileData = null;
    let extraLinks = [];
    let selectedLanguages = [];
    let selectedCollabs = [];
    let priceRange = "";
    let rendered = false;
    let remountRequested = false;
    let mountInFlight = false;

    function isProfileNavPending() {
      if (document.body?.classList.contains("infl-profile-nav-pending")) return true;
      try {
        return sessionStorage.getItem(PENDING_KEY) === "1";
      } catch (_) {
        return false;
      }
    }

    function isSettingsNavActive() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return false;
      return [...nav.querySelectorAll(":scope > button")].some((b) => {
        if (!normalizeNavLabel(b.textContent).includes("settings")) return false;
        return (
          b.classList.contains("bg-violet-100") || /\bbg-violet-100\b/.test(b.className)
        );
      });
    }

    function normalizeNavLabel(text) {
      return String(text || "")
        .replace(/\d+/g, "")
        .trim()
        .toLowerCase();
    }

    function profileSkeletonHtml() {
      if (window.InflProfileSettings?.skeletonHtml) {
        return window.InflProfileSettings.skeletonHtml();
      }
      return `<div class="ips-shell ips-shell--loading" aria-busy="true" aria-label="Loading settings">
        <div class="ips-sk-block ips-sk-header"></div>
        <div class="ips-sk-block ips-sk-strip"></div>
        <div class="ips-sk-block ips-sk-hero"></div>
        <div class="ips-sk-block ips-sk-tabs"></div>
        <div class="ips-sk-block ips-sk-panel"></div>
      </div>`;
    }

    function getProfileContainer() {
      return document.querySelector(".max-w-2xl.mx-auto, .max-w-3xl.mx-auto");
    }

    function showProfileTransitionShell() {
      const main =
        document.querySelector(".flex.h-screen main.flex-1") ||
        document.querySelector("main.flex-1");
      if (!main) return;
      if (!main.style.position) main.style.position = "relative";
      let shell = document.getElementById(TRANSITION_ID);
      if (!shell) {
        shell = document.createElement("div");
        shell.id = TRANSITION_ID;
        shell.className = "infl-profile-transition-shell";
        main.appendChild(shell);
      }
      shell.innerHTML = profileSkeletonHtml();
      shell.hidden = false;
    }

    function beginProfileNavigation() {
      try {
        sessionStorage.setItem(PENDING_KEY, "1");
      } catch (_) {}
      document.body?.classList.add("infl-profile-nav-pending");
      showProfileTransitionShell();
    }

    function endProfileNavigation() {
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch (_) {}
      document.body?.classList.remove("infl-profile-nav-pending");
      document.getElementById(TRANSITION_ID)?.remove();
    }

    window.influnetBeginInfluencerProfileNavigation = beginProfileNavigation;
    window.influnetEndInfluencerProfileNavigation = endProfileNavigation;

    function isEditProfilePage() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path === "/dashboard/settings" || path === "/dashboard/profile") return true;
      if (path !== "/dashboard/influencer") return false;
      if (isProfileNavPending()) return true;
      if (document.getElementById(TRANSITION_ID)) return true;
      if (document.getElementById(ROOT_ID)) return true;
      if (document.getElementById("ips-root-inner")) return true;
      if (isSettingsNavActive()) return true;
      const dash = document.getElementById("influnet-influencer-dashboard-mount");
      return [...document.querySelectorAll("h1")].some((h) => {
        const title = h.textContent.trim();
        if (!PROFILE_PAGE_TITLES.has(title)) return false;
        return !dash?.contains(h);
      });
    }

    function authHeaders() {
      const token = localStorage.getItem("influnet_token");
      return token ? { Authorization: "Bearer " + token } : {};
    }

    function findHeaderEditProfileButton() {
      const dash = document.getElementById("influnet-influencer-dashboard-mount");
      return [...document.querySelectorAll("button")].find((b) => {
        if (!b.textContent.includes("Edit Profile")) return false;
        if (dash?.contains(b)) return false;
        if (b.closest(".infl-idash-action-btn, .infl-idash-hero-social-btn")) {
          return false;
        }
        return !!b.closest(".absolute.right-0.top-full");
      });
    }

    function navigateToEditProfile() {
      if (isEditProfilePage() && isFormRendered()) {
        window.dispatchEvent(new CustomEvent("influnet-influencer-open-profile"));
        return;
      }
      beginProfileNavigation();
      const menuBtn = document.querySelector(
        ".flex.h-screen header .border-l.border-gray-100 button, .flex.h-screen header .pl-2.border-l button"
      );
      if (menuBtn) menuBtn.click();
      const tryOpen = () => {
        const editBtn = findHeaderEditProfileButton();
        if (editBtn) {
          editBtn.click();
          window.dispatchEvent(new CustomEvent("influnet-influencer-open-profile"));
          mount();
          return true;
        }
        return false;
      };
      if (!tryOpen()) {
        [50, 120, 250, 450].forEach((ms) => {
          window.setTimeout(() => {
            if (!tryOpen()) mount();
          }, ms);
        });
      }
    }

    window.influnetNavigateToEditProfile = function () {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      const onDashboard =
        path === "/dashboard/influencer" ||
        path === "/dashboard/settings" ||
        path === "/dashboard/profile";
      if (!onDashboard) {
        sessionStorage.setItem("influnet_open_settings", "/dashboard/settings");
        window.location.href = "/dashboard/influencer";
        return;
      }
      if (typeof window.influnetRouteToAccountSettings === "function") {
        window.influnetRouteToAccountSettings("/dashboard/settings");
        return;
      }
      navigateToEditProfile();
    };

    function getUser() {
      try {
        return JSON.parse(localStorage.getItem("influnet_user") || "null");
      } catch {
        return null;
      }
    }

    function parseLocation(location, city, state) {
      if (city || state) return { city: city || "", state: state || "" };
      const loc = String(location || "").trim();
      if (!loc) return { city: "", state: "" };
      const parts = loc.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { city: parts[0], state: parts.slice(1).join(", ") };
      }
      return { city: loc, state: "" };
    }

    function nicheArray(niche) {
      if (Array.isArray(niche)) return niche.filter(Boolean);
      return [];
    }

    function parseMetric(id) {
      const raw = document.getElementById(id)?.value;
      const n = parseInt(String(raw ?? "").replace(/,/g, ""), 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    }

    function parseExtraLinks(raw) {
      if (Array.isArray(raw)) return raw.filter((x) => x && x.id);
      if (typeof raw === "string") {
        try {
          const p = JSON.parse(raw);
          return Array.isArray(p) ? p : [];
        } catch {
          return [];
        }
      }
      return [];
    }

    function buildExtraFromProfile(p) {
      const links = parseExtraLinks(p.extraSocialLinks);
      const ids = new Set(links.map((l) => l.id));
      if (p.tiktokHandle && !ids.has("tiktok")) {
        links.push({ id: "tiktok", url: p.tiktokHandle });
      }
      if (p.twitterHandle && !ids.has("twitter")) {
        links.push({ id: "twitter", url: p.twitterHandle });
      }
      return links;
    }

    async function loadProfile() {
      const res = await fetch("/api/influencer-profile/me", {
        credentials: "same-origin",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load profile");
      return data;
    }

    async function saveProfile(payload) {
      const res = await fetch("/api/influencer-profile/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      return data;
    }

    function hideNativeForm(container) {
      container.classList.add("influnet-profile-edit-enhanced");
    }

    function optionHtml(list, value, emptyLabel) {
      return (
        `<option value="">${emptyLabel || "Select"}</option>` +
        list.map((o) => {
          const v = typeof o === "string" ? o : o.id;
          const l = typeof o === "string" ? o : o.label || o;
          return `<option value="${v}"${v === value ? " selected" : ""}>${l}</option>`;
        }).join("")
      );
    }

    const ICON = {
      user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>',
      mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>',
      phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.11a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92z"/></svg>',
      globe: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      at: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>',
      link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>',
    };

    function initials(name) {
      const p = String(name || "?").trim().split(/\s+/);
      return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
    }

    function refCard(iconTone, iconKey, title, subtitle, bodyHtml) {
      return `
        <section class="infl-ref-card">
          <div class="infl-ref-card-head">
            <div class="infl-ref-card-icon infl-ref-card-icon--${iconTone}">${ICON[iconKey] || ICON.user}</div>
            <div class="infl-ref-card-titles">
              <h3>${title}</h3>
              <p>${subtitle}</p>
            </div>
          </div>
          <div class="infl-ref-card-body">${bodyHtml}</div>
        </section>`;
    }

    function refInput(id, value, opts = {}) {
      const type = opts.type || "text";
      const disabled = opts.disabled ? " disabled" : "";
      const placeholder = opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : "";
      const extra = opts.inputmode ? ` inputmode="${opts.inputmode}"` : "";
      const max = opts.maxlength ? ` maxlength="${opts.maxlength}"` : "";
      const auto = opts.autocomplete ? ` autocomplete="${opts.autocomplete}"` : "";
      const idAttr = id ? ` id="${id}"` : "";
      const icon = opts.icon ? `<span class="infl-ref-input-icon">${opts.icon}</span>` : "";
      if (!opts.icon) {
        return `<input${idAttr} type="${type}" value="${esc(value)}"${disabled}${placeholder}${extra}${max}${auto} />`;
      }
      return `<div class="infl-ref-input-wrap">${icon}<input${idAttr} type="${type}" value="${esc(value)}"${disabled}${placeholder}${extra}${max}${auto} /></div>`;
    }

    function refField(label, inner, full) {
      return `<div class="infl-ref-field${full ? " infl-ref-field--full" : ""}"><label class="infl-ref-label">${label}</label>${inner}</div>`;
    }

    function showProfileLoadingState(root, container) {
      hideNativeForm(container);
      if (window.InflAccountSettings?.renderSkeleton) {
        window.InflAccountSettings.renderSkeleton(root);
      } else if (window.InflProfileSettings?.renderSkeleton) {
        window.InflProfileSettings.renderSkeleton(root);
      } else {
        root.innerHTML = profileSkeletonHtml();
      }
    }

    async function renderForm(root, p) {
      if (window.InflAccountSettings?.mount) {
        await window.InflAccountSettings.mount(root, p, {
          role: "influencer",
          onSaved: (next) => {
            profileData = next;
          },
        });
        return;
      }
      if (window.InflProfileSettings?.mount) {
        await window.InflProfileSettings.mount(root, p, {
          role: "influencer",
          onSaved: (next) => {
            profileData = next;
          },
        });
        return;
      }
      const user = getUser();
      const loc = parseLocation(p.location, p.city, p.state);
      const niches = nicheArray(p.niche);
      extraLinks = buildExtraFromProfile(p);
      selectedLanguages = Array.isArray(p.languages) ? [...p.languages] : [];
      selectedCollabs = Array.isArray(p.collabTypes) ? [...p.collabTypes] : [];
      priceRange = p.priceRange || "";

      const displayName = p.name || user?.name || "Creator";
      const displayEmail = p.email || user?.email || "";
      const avatarUrl = p.avatarUrl || user?.avatarUrl || "";
      const username = p.username || "";

      const userInfo = `
        <div class="infl-ref-grid">
          ${refField("Full name *", refInput("", displayName, { icon: ICON.user, disabled: true }), false)}
          ${refField("Work email", refInput("", displayEmail, { type: "email", icon: ICON.mail, disabled: true }), false)}
          ${refField("Phone", refInput("infl-phone", String(p.phone || "").replace(/\D/g, "").slice(-10), { type: "tel", icon: ICON.phone, placeholder: "9876543210" }), false)}
          ${refField("State / province", `<select id="infl-state">${optionHtml(INDIAN_STATES, loc.state, "Select state")}</select>`, false)}
          ${refField("City", refInput("infl-city", loc.city, { icon: ICON.globe, placeholder: "e.g. Mumbai" }), false)}
          ${refField("Gender", `<select id="infl-gender">${optionHtml(GENDERS, p.gender || "", "Select gender")}</select>`, false)}
          ${refField(
            "Languages",
            `<div class="infl-ref-chips" id="infl-languages">${LANGUAGES.map(
              (lang) =>
                `<button type="button" class="infl-ref-chip${selectedLanguages.includes(lang) ? " active" : ""}" data-lang="${lang}">${lang}</button>`
            ).join("")}</div>`,
            true
          )}
        </div>
        ${p.phoneVerified ? '<p class="infl-idash-verified-mobile">✓ Verified Mobile</p>' : ""}`;

      const identity = `
        <div class="infl-ref-grid">
          ${refField(
            "Influnet username *",
            `<div class="infl-ref-input-wrap"><span class="infl-ref-input-icon">${ICON.at}</span><input type="text" id="infl-username" value="${esc(username)}" maxlength="30" autocomplete="username" spellcheck="false" /></div>
            <p class="infl-ref-hint">Public URL: influnet/<span id="infl-username-preview">${esc(username || "username")}</span></p>
            <p class="infl-ref-warn">Changing your username changes your public profile URL (once every 30 days).</p>
            <p class="infl-ref-username-status" id="infl-username-status"></p>`,
            true
          )}
        </div>`;

      const creator = `
        <div class="infl-ref-grid">
          ${refField("Primary niche", `<select id="infl-niche1">${optionHtml(NICHES, niches[0] || "", "Select niche")}</select>`, false)}
          ${refField("Secondary niche", `<select id="infl-niche2">${optionHtml(NICHES, niches[1] || "", "Optional")}</select>`, false)}
          ${refField("Bio / about", `<textarea id="infl-bio" rows="4" placeholder="Tell brands about your creative journey...">${esc(p.bio || "")}</textarea>`, true)}
        </div>`;

      const social = `
        <div class="infl-ref-grid">
          ${refField("Instagram", refInput("infl-ig", p.instagramHandle || "", { icon: ICON.link, placeholder: "instagram.com/yourprofile" }), false)}
          ${refField("IG followers", refInput("infl-ig-followers", num(p.instagramFollowers), { inputmode: "numeric", placeholder: "Your entry" }), false)}
          ${refField("Facebook", refInput("infl-fb", p.facebookHandle || "", { icon: ICON.link, placeholder: "facebook.com/yourprofile" }), false)}
          ${refField("FB followers", refInput("infl-fb-followers", num(p.facebookFollowers), { inputmode: "numeric", placeholder: "Your entry" }), false)}
          ${refField("YouTube", refInput("infl-yt", p.youtubeHandle || "", { icon: ICON.link, placeholder: "youtube.com/@channel" }), false)}
          ${refField("YT subscribers", refInput("infl-yt-subs", num(p.youtubeSubscribers), { inputmode: "numeric", placeholder: "Your entry" }), false)}
          ${refField("LinkedIn", refInput("infl-li", p.linkedinHandle || "", { icon: ICON.link, placeholder: "linkedin.com/in/you" }), false)}
          ${refField("TikTok", refInput("infl-tiktok", p.tiktokHandle || "", { icon: ICON.link, placeholder: "tiktok.com/@username" }), false)}
          ${refField("TikTok followers", refInput("infl-tiktok-followers", num(p.tiktokFollowers), { inputmode: "numeric", placeholder: "Your entry" }), false)}
          ${refField(
            "Other platforms",
            `<div id="infl-extra-links"></div><button type="button" class="infl-ref-add-btn" id="infl-add-platform">+ Add platform</button>`,
            true
          )}
        </div>`;

      const collab = `
        <div class="infl-ref-collab-grid" id="infl-collab-types">
          ${COLLAB_TYPES.map(
            (c) => `
            <button type="button" class="infl-ref-collab-card${selectedCollabs.includes(c.id) ? " active" : ""}" data-collab="${c.id}">
              <strong>${c.label}</strong>
              <span>${c.desc}</span>
            </button>`
          ).join("")}
        </div>
        <div class="infl-ref-field infl-ref-field--full" style="margin-top:1rem">
          <label class="infl-ref-label">Typical price range</label>
          <div class="infl-ref-price-grid" id="infl-price-range">
            ${PRICE_RANGES.map(
              (pr) => `
              <button type="button" class="infl-ref-price-btn${priceRange === pr.id ? " active" : ""}" data-price="${pr.id}">
                <div class="tier">${pr.label}</div>
                <div class="range">${pr.range}</div>
              </button>`
            ).join("")}
          </div>
        </div>`;

      const portfolio = `
        <div class="infl-ref-grid infl-ref-grid--single">
          ${refField("Media kit URL", refInput("infl-media-kit", p.mediaKitUrl || "", { icon: ICON.link, placeholder: "https://..." }), true)}
          ${refField(
            "Portfolio links",
            `<textarea id="infl-portfolio" rows="4" placeholder="One link per line">${esc(
              (Array.isArray(p.portfolio) ? p.portfolio : [])
                .map((x) => (typeof x === "string" ? x : x.url || ""))
                .filter(Boolean)
                .join("\n")
            )}</textarea>`,
            true
          )}
        </div>`;

      root.innerHTML = `
        <div class="infl-ref-page">
          <p class="infl-ref-crumb">Profile <span>› Edit profile</span></p>
          <div class="infl-ref-topbar">
            <h1 class="infl-ref-title">Profile</h1>
            <button type="button" class="infl-ref-save" id="infl-edit-save-btn">${ICON.check} Save changes</button>
          </div>
          <div id="infl-edit-msg" class="infl-edit-msg" style="display:none"></div>

          <div class="infl-ref-hero">
            <div class="infl-ref-hero-avatar">${
              avatarUrl
                ? `<img src="${esc(avatarUrl)}" alt="" />`
                : esc(initials(displayName))
            }</div>
            <div>
              <h2>${esc(displayName)}</h2>
              <p>${esc(displayEmail)}</p>
              <div class="infl-ref-badges">
                <span class="infl-ref-badge infl-ref-badge--green">● Influencer</span>
                ${username ? `<span class="infl-ref-badge infl-ref-badge--gray">@${esc(username)}</span>` : ""}
                ${p.phoneVerified ? '<span class="infl-ref-badge infl-ref-badge--purple">✓ Verified mobile</span>' : ""}
              </div>
            </div>
          </div>

          ${refCard("blue", "user", "User information", "Who you are on Influnet.", userInfo)}
          ${refCard("violet", "at", "Influnet identity", "Your public username and profile URL.", identity)}
          ${refCard("green", "globe", "Creator profile", "Niches and bio brands see on your public page.", creator)}
          ${refCard("amber", "link", "Social platforms", "Handles and audience sizes you enter manually.", social)}
          ${refCard("rose", "link", "Collaboration preferences", "Types of work and typical pricing.", collab)}
          ${refCard("slate", "link", "Portfolio & media kit", "Links to your work and downloadable media kit.", portfolio)}
        </div>`;

      wireForm(root);
    }

    function esc(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    }

    function num(n) {
      const v = Number(n);
      return Number.isFinite(v) && v > 0 ? v : "";
    }

    function renderExtraLinks() {
      const host = document.getElementById("infl-extra-links");
      if (!host) return;
      host.innerHTML = extraLinks
        .map(
          (link, i) => `
        <div class="infl-edit-extra-row infl-ref-extra-row">
          <select data-extra-idx="${i}" class="infl-extra-id">
            ${EXTRA_PLATFORMS.map(
              (pl) =>
                `<option value="${pl.id}"${link.id === pl.id ? " selected" : ""}>${pl.label}</option>`
            ).join("")}
          </select>
          <input type="text" data-extra-idx="${i}" class="infl-extra-url" value="${esc(link.url || "")}" placeholder="Profile URL" />
          <button type="button" class="infl-ref-remove-btn" data-remove-extra="${i}">Remove</button>
        </div>`
        )
        .join("");
    }

    function wireForm(root) {
      renderExtraLinks();

      root.querySelector("#infl-languages")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-lang]");
        if (!btn) return;
        const lang = btn.getAttribute("data-lang");
        if (selectedLanguages.includes(lang)) {
          selectedLanguages = selectedLanguages.filter((l) => l !== lang);
          btn.classList.remove("active");
        } else {
          selectedLanguages.push(lang);
          btn.classList.add("active");
        }
      });

      root.querySelector("#infl-collab-types")?.addEventListener("click", (e) => {
        const card = e.target.closest("[data-collab]");
        if (!card) return;
        const id = card.getAttribute("data-collab");
        if (selectedCollabs.includes(id)) {
          selectedCollabs = selectedCollabs.filter((c) => c !== id);
          card.classList.remove("active");
        } else {
          selectedCollabs.push(id);
          card.classList.add("active");
        }
      });

      root.querySelector("#infl-price-range")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-price]");
        if (!btn) return;
        priceRange = btn.getAttribute("data-price");
        root.querySelectorAll("[data-price]").forEach((el) => {
          el.classList.toggle("active", el.getAttribute("data-price") === priceRange);
        });
      });

      root.querySelector("#infl-add-platform")?.addEventListener("click", () => {
        const used = new Set(extraLinks.map((l) => l.id));
        const next = EXTRA_PLATFORMS.find((p) => !used.has(p.id));
        if (!next) return;
        extraLinks.push({ id: next.id, url: "" });
        renderExtraLinks();
        wireExtraRows();
      });

      function wireExtraRows() {
        document.querySelectorAll("[data-remove-extra]").forEach((btn) => {
          btn.onclick = () => {
            const i = Number(btn.getAttribute("data-remove-extra"));
            extraLinks.splice(i, 1);
            renderExtraLinks();
            wireExtraRows();
          };
        });
        document.querySelectorAll(".infl-extra-id").forEach((sel) => {
          sel.onchange = () => {
            const i = Number(sel.getAttribute("data-extra-idx"));
            extraLinks[i].id = sel.value;
          };
        });
        document.querySelectorAll(".infl-extra-url").forEach((inp) => {
          inp.oninput = () => {
            const i = Number(inp.getAttribute("data-extra-idx"));
            extraLinks[i].url = inp.value;
          };
        });
      }
      wireExtraRows();

      root.querySelector("#infl-edit-save-btn")?.addEventListener("click", onSave);

      const usernameInput = root.querySelector("#infl-username");
      let usernameTimer = 0;
      usernameInput?.addEventListener("input", () => {
        const u = String(usernameInput.value || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9._]/g, "");
        if (usernameInput.value !== u) usernameInput.value = u;
        const preview = root.querySelector("#infl-username-preview");
        if (preview) preview.textContent = u || "username";
        clearTimeout(usernameTimer);
        usernameTimer = window.setTimeout(() => checkUsernameEdit(u), 350);
      });
    }

    async function checkUsernameEdit(u) {
      const status = document.getElementById("infl-username-status");
      if (!status) return;
      if (!u) {
        status.textContent = "";
        status.className = "infl-ref-username-status";
        return;
      }
      if (!/^[a-z0-9][a-z0-9._]{2,29}$/.test(u)) {
        status.textContent = "Use 3–30 characters: a-z, 0-9, underscore, dot.";
        status.className = "infl-ref-username-status err";
        return;
      }
      try {
        const res = await fetch(
          `/api/influencer-profile/username/check?username=${encodeURIComponent(u)}&excludeSelf=1`,
          { credentials: "same-origin", headers: authHeaders() }
        );
        const data = await res.json();
        if (data.available) {
          status.textContent = "✓ Username available";
          status.className = "infl-ref-username-status ok";
        } else {
          status.textContent = "✗ Username already taken";
          status.className = "infl-ref-username-status err";
        }
      } catch {
        status.textContent = "";
      }
    }

    function showMsg(text, ok) {
      const el = document.getElementById("infl-edit-msg");
      if (!el) return;
      el.style.display = "block";
      el.className = `infl-edit-msg ${ok ? "ok" : "err"}`;
      el.textContent = text;
    }

    async function onSave() {
      const btn = document.getElementById("infl-edit-save-btn");
      if (!btn) return;

      const nextUsername =
        document.getElementById("infl-username")?.value?.trim().toLowerCase() || null;
      const currentUsername = String(profileData?.username || profileData?.profile?.username || "")
        .trim()
        .toLowerCase();
      if (nextUsername && nextUsername !== currentUsername) {
        const ok = window.confirm(
          "Changing your username will change your public profile URL. Continue?"
        );
        if (!ok) return;
      }

      btn.disabled = true;
      btn.textContent = "Saving…";

      const niche = [
        document.getElementById("infl-niche1")?.value,
        document.getElementById("infl-niche2")?.value,
      ].filter(Boolean);

      const tiktokVal = document.getElementById("infl-tiktok")?.value?.trim() || "";
      const extras = extraLinks
        .filter((l) => l.url?.trim() && !["tiktok", "twitter"].includes(l.id))
        .map((l) => ({ id: l.id, url: l.url.trim() }));

      const twitterExtra = extraLinks.find((l) => l.id === "twitter");
      const portfolioLines = (document.getElementById("infl-portfolio")?.value || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const phoneDigits = String(document.getElementById("infl-phone")?.value || "")
        .replace(/\D/g, "")
        .slice(-10);
      const prevDigits = String(profileData?.phone || "")
        .replace(/\D/g, "")
        .slice(-10);
      if (phoneDigits.length === 10 && phoneDigits !== prevDigits) {
        const otp = window.influnetPhoneOtpState?.();
        if (
          !otp?.verificationToken ||
          otp.status !== "verified" ||
          otp.phoneLocal !== phoneDigits
        ) {
          showMsg("Verify your new mobile number with OTP before saving.", false);
          btn.disabled = false;
          btn.textContent = "Save changes";
          return;
        }
      } else if (phoneDigits.length > 0 && phoneDigits.length !== 10) {
        showMsg("Enter a valid 10-digit mobile number.", false);
        btn.disabled = false;
        btn.textContent = "Save changes";
        return;
      }

      const payload = {
        phone: phoneDigits.length === 10 ? `+91 ${phoneDigits}` : null,
        gender: document.getElementById("infl-gender")?.value || null,
        city: document.getElementById("infl-city")?.value?.trim() || null,
        state: document.getElementById("infl-state")?.value?.trim() || null,
        languages: selectedLanguages,
        bio: document.getElementById("infl-bio")?.value?.trim() || null,
        niche,
        instagramHandle: document.getElementById("infl-ig")?.value?.trim() || null,
        facebookHandle: document.getElementById("infl-fb")?.value?.trim() || null,
        youtubeHandle: document.getElementById("infl-yt")?.value?.trim() || null,
        linkedinHandle: document.getElementById("infl-li")?.value?.trim() || null,
        tiktokHandle: tiktokVal || null,
        instagramFollowers: parseMetric("infl-ig-followers"),
        facebookFollowers: parseMetric("infl-fb-followers"),
        youtubeSubscribers: parseMetric("infl-yt-subs"),
        tiktokFollowers: parseMetric("infl-tiktok-followers"),
        twitterHandle: twitterExtra?.url?.trim() || null,
        extraSocialLinks: extras.length ? JSON.stringify(extras) : null,
        collabTypes: selectedCollabs,
        priceRange: priceRange || null,
        mediaKitUrl: document.getElementById("infl-media-kit")?.value?.trim() || null,
        portfolio: portfolioLines.map((url) => ({ url })),
        username: document.getElementById("infl-username")?.value?.trim().toLowerCase() || null,
      };

      try {
        profileData = await saveProfile(payload);
        showMsg("Profile saved successfully.", true);
        window.dispatchEvent(new CustomEvent("influnet-profile-updated"));
      } catch (err) {
        showMsg(err.message || "Could not save profile.", false);
      } finally {
        btn.disabled = false;
        btn.textContent = "Save changes";
      }
    }

    function requestRemount() {
      remountRequested = true;
      rendered = false;
    }

    function isSettingsMounted() {
      return !!document.getElementById("ips-root-inner") || !!document.getElementById("ias-app");
    }

    function isFormRendered() {
      const root = document.getElementById(ROOT_ID);
      return !!(rendered && root?.querySelector("#ias-app, #ips-root-inner, #infl-edit-save-btn"));
    }

    async function mount() {
      if (!isEditProfilePage()) {
        rendered = false;
        remountRequested = false;
        return;
      }

      const container = getProfileContainer();
      if (!container) return;
      container.classList.add("infl-ref-profile-shell");

      let root = document.getElementById(ROOT_ID);
      if (!root) {
        root = document.createElement("div");
        root.id = ROOT_ID;
        const photoCard = document.getElementById("influnet-profile-photo-card");
        if (photoCard) photoCard.insertAdjacentElement("afterend", root);
        else container.prepend(root);
      }

      if (isFormRendered() && !remountRequested) {
        hideNativeForm(container);
        endProfileNavigation();
        return;
      }

      if (mountInFlight) return;
      mountInFlight = true;
      remountRequested = false;

      showProfileLoadingState(root, container);

      try {
        profileData = await loadProfile();
        await renderForm(root, profileData);
        rendered = true;
      } catch (err) {
        hideNativeForm(container);
        root.innerHTML = `<div class="infl-edit-msg err">${esc(err.message)}</div>`;
        rendered = false;
        endProfileNavigation();
      } finally {
        mountInFlight = false;
      }
    }

    window.influnetMountInfluencerProfileEdit = mount;

    function tick() {
      if (!isEditProfilePage()) {
        document.querySelector(".influnet-profile-edit-enhanced")?.classList.remove(
          "influnet-profile-edit-enhanced"
        );
        document.getElementById("ips-savebar")?.remove();
        rendered = false;
        remountRequested = false;
        if (!isSettingsNavActive()) {
          endProfileNavigation();
        }
        return;
      }
      if (isFormRendered() && !remountRequested) {
        const container = document.querySelector(".max-w-2xl.mx-auto");
        if (container) hideNativeForm(container);
        return;
      }
      mount();
    }

    function boot() {
      tick();
      if (sessionStorage.getItem("influnet_open_edit_profile") === "1") {
        sessionStorage.removeItem("influnet_open_edit_profile");
        window.setTimeout(() => window.influnetNavigateToEditProfile?.(), 400);
      }
    }

    function initProfileEdit() {
      boot();

      const rootEl = document.getElementById("root");
      if (rootEl) {
        const editObs = new MutationObserver(() => {
          if (!isEditProfilePage() || isFormRendered()) return;
          clearTimeout(editObsTimer);
          editObsTimer = window.setTimeout(tick, isProfileNavPending() ? 40 : 120);
        });
        editObs.observe(rootEl, { childList: true, subtree: true });
      }
    }

    let editObsTimer = null;
    if (document.body) initProfileEdit();
    else document.addEventListener("DOMContentLoaded", initProfileEdit);

    setInterval(() => {
      if (!isEditProfilePage()) {
        rendered = false;
        remountRequested = false;
        return;
      }
      if (!isFormRendered() || remountRequested) tick();
    }, 2000);
    window.addEventListener("popstate", boot);
    window.addEventListener("load", boot);
    window.addEventListener("influnet-profile-updated", (e) => {
      if (e?.detail?.soft || isSettingsMounted()) return;
      requestRemount();
      tick();
    });
  } catch (e) {
    console.warn("[influnet] influencer-profile-full-edit:", e);
  }
})();
