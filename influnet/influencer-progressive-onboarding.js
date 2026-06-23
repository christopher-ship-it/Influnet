/**
 * Progressive influencer onboarding (steps 2–4) on dashboard after account creation.
 * Renders inside Shadow DOM so React/Tailwind global styles cannot blur or override it.
 */
(function () {
  try {
    const OVERLAY_ID = "infl-progressive-onboarding";
    const DISMISS_KEY = "influnet_progressive_onboarding_dismissed";
    const FORCE_SETUP_KEY = "influnet_needs_progressive_setup";
    const SUPPRESS_UNTIL_KEY = "influnet_progressive_onboarding_suppress_until";
    const FORM_STORAGE_KEY = "influnet_progressive_form_data";
    const LANGS = [
      "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
      "Marathi", "Bengali", "Gujarati", "Punjabi", "Urdu", "French", "Spanish",
    ];
    const NICHES = [
      "Fashion & Beauty", "Tech & Gadgets", "Food & Cooking", "Travel",
      "Fitness & Health", "Gaming", "Finance", "Lifestyle", "Education",
      "Entertainment", "Sports", "Parenting", "Home Decor", "Art & Design",
      "Music", "Comedy", "Business", "Environment",
    ];
    /** Step 4 collaboration types (matches profile settings / design spec). */
    const COLLAB_TYPES = [
      {
        id: "reel",
        label: "Reel",
        desc: "Short-form vertical video",
        wide: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M2 12h20M2 16h20M6 4v16M18 4v16"/></svg>`,
      },
      {
        id: "story",
        label: "Story",
        desc: "24-hour audience update",
        wide: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
      },
      {
        id: "post",
        label: "Post",
        desc: "Static image/grid content",
        wide: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>`,
      },
      {
        id: "yt",
        label: "YouTube Video",
        desc: "In-depth dedicated video",
        wide: false,
        icon: `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3" fill="#ef4444" stroke="none"/><path d="M10 9.5v5l5-2.5-5-2.5z" fill="#fff"/></svg>`,
      },
      {
        id: "event",
        label: "Event Appearance",
        desc: "In-person brand representation",
        wide: true,
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      },
    ];
    const BIO_MIN_LENGTH = 20;
    const CORE_SOCIAL_PLATFORMS = [
      {
        id: "infl-pob-ig",
        platform: "instagram",
        label: "Instagram",
        prefix: "instagram.com/",
        field: "instagramHandle",
        placeholder: "yourprofile",
      },
      {
        id: "infl-pob-fb",
        platform: "facebook",
        label: "Facebook",
        prefix: "facebook.com/",
        field: "facebookHandle",
        placeholder: "yourprofile",
      },
      {
        id: "infl-pob-yt",
        platform: "youtube",
        label: "YouTube",
        prefix: "youtube.com/",
        field: "youtubeHandle",
        placeholder: "@yourchannel",
      },
      {
        id: "infl-pob-li",
        platform: "linkedin",
        label: "LinkedIn",
        prefix: "linkedin.com/in/",
        field: "linkedinHandle",
        placeholder: "you",
      },
    ];
    const OPTIONAL_SOCIAL_PLATFORMS = [
      {
        id: "infl-pob-tt",
        platform: "tiktok",
        label: "TikTok",
        icon: "♪",
        prefix: "tiktok.com/@",
        field: "tiktokHandle",
        placeholder: "yourhandle",
      },
      {
        id: "infl-pob-tw",
        platform: "twitter",
        label: "X (Twitter)",
        icon: "𝕏",
        prefix: "x.com/",
        field: "twitterHandle",
        placeholder: "yourhandle",
      },
      {
        id: "infl-pob-sc",
        platform: "snapchat",
        label: "Snapchat",
        icon: "👻",
        prefix: "snapchat.com/add/",
        extraId: "snapchat",
        placeholder: "yourhandle",
      },
      {
        id: "infl-pob-pin",
        platform: "pinterest",
        label: "Pinterest",
        icon: "P",
        iconClass: "infl-pob-social-pick-icon--pinterest",
        prefix: "pinterest.com/",
        extraId: "pinterest",
        placeholder: "yourprofile",
      },
      {
        id: "infl-pob-web",
        platform: "website",
        label: "Website",
        icon: "🌐",
        prefix: "https://",
        extraId: "website",
        placeholder: "yoursite.com",
        isWebsite: true,
      },
    ];
    const PLATFORM_URL_PATTERNS = {
      instagram:
        /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:@)?([a-zA-Z0-9_.]+)/i,
      facebook:
        /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.com)\/(?:people\/[^/]+\/|profile\.php\?id=|pages\/[^/]+\/)?(?:@)?([a-zA-Z0-9_.-]+)/i,
      youtube:
        /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:@|c\/|channel\/|user\/)|youtu\.be\/)([a-zA-Z0-9_@.-]+)/i,
      linkedin:
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company|pub)\/([a-zA-Z0-9_%\-]+)/i,
      tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)/i,
      twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:@)?([a-zA-Z0-9_]+)/i,
      snapchat: /(?:https?:\/\/)?(?:www\.)?snapchat\.com\/add\/([a-zA-Z0-9_.-]+)/i,
      pinterest: /(?:https?:\/\/)?(?:www\.)?pinterest\.com\/([a-zA-Z0-9_/.\-]+)/i,
    };
    const PRICE_RANGES = [
      { id: "entry", label: "ENTRY", range: "₹1k – ₹5k" },
      { id: "standard", label: "STANDARD", range: "₹5k – ₹10k" },
      { id: "premium", label: "PREMIUM", range: "₹10k – ₹25k" },
      { id: "pro", label: "PRO", range: "₹25k+" },
    ];
    const LEGACY_PRICE_IDS = {
      under10k: "entry",
      "10kto50k": "standard",
      "50kto2l": "premium",
      "2lplus": "pro",
    };
    const MAX_SECONDARY_NICHES = 3;

    function getIndiaLoc() {
      return (
        window.INFLUNET_INDIA_LOCATIONS ||
        window.INFLUNET_INDIA_STATES_CITIES || { states: [], citiesByState: {} }
      );
    }

    function resolveStateName(raw) {
      const s = String(raw || "").trim();
      if (!s) return "";
      const states = getIndiaLoc().states || [];
      const exact = states.find((x) => x.toLowerCase() === s.toLowerCase());
      if (exact) return exact;
      const prefix = states.filter((x) => x.toLowerCase().startsWith(s.toLowerCase()));
      if (prefix.length === 1) return prefix[0];
      return "";
    }

    function citiesForState(state) {
      const canonical = resolveStateName(state);
      if (!canonical) return [];
      return getIndiaLoc().citiesByState[canonical] || [];
    }

    function buildStateOptions(selected) {
      const states = getIndiaLoc().states || [];
      const sel = resolveStateName(selected) || "";
      let html = `<option value="">Select state</option>`;
      states.forEach((st) => {
        html += `<option value="${esc(st)}"${sel === st ? " selected" : ""}>${esc(st)}</option>`;
      });
      if (sel && !states.includes(sel)) {
        html += `<option value="${esc(sel)}" selected>${esc(sel)}</option>`;
      }
      return html;
    }

    function buildCityOptions(state, selected) {
      const cities = citiesForState(state);
      const sel = String(selected || "").trim();
      const placeholder = state ? "Select city" : "Select state first";
      let html = `<option value="">${placeholder}</option>`;
      cities.forEach((c) => {
        html += `<option value="${esc(c)}"${sel === c ? " selected" : ""}>${esc(c)}</option>`;
      });
      if (sel && !cities.includes(sel)) {
        html += `<option value="${esc(sel)}" selected>${esc(sel)}</option>`;
      }
      return html;
    }

    function wireLocationDropdowns(root, initialState, initialCity) {
      const stateEl = root.querySelector("#infl-pob-state");
      const cityEl = root.querySelector("#infl-pob-city");
      if (!stateEl || !cityEl) return;

      function syncCities(keepCity) {
        const st = stateEl.value;
        const prev = keepCity ? cityEl.value : "";
        cityEl.disabled = !st;
        cityEl.innerHTML = buildCityOptions(st, prev);
      }

      function initFromProfile() {
        const loc = getIndiaLoc();
        if (!loc.states?.length) return false;
        const st = resolveStateName(initialState) || "";
        stateEl.innerHTML = buildStateOptions(st);
        if (st) stateEl.value = st;
        syncCities(false);
        if (st && initialCity) {
          const cities = citiesForState(st);
          const wanted = String(initialCity).trim();
          const match = cities.find((c) => c.toLowerCase() === wanted.toLowerCase());
          if (match) cityEl.value = match;
          else if (cities.includes(wanted)) cityEl.value = wanted;
        }
        return true;
      }

      stateEl.addEventListener("change", () => syncCities(false));

      if (!initFromProfile()) {
        const ready = () => initFromProfile();
        window.addEventListener("influnet-india-locations-ready", ready, { once: true });
        const poll = window.setInterval(() => {
          if (initFromProfile()) window.clearInterval(poll);
        }, 250);
        window.setTimeout(() => window.clearInterval(poll), 12000);
      }
    }

    const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

    const STEP_NAV = [
      { id: 2, label: "Profile" },
      { id: 3, label: "Social" },
      { id: 4, label: "Collab" },
    ];

    /** Plain JS onboarding state (mirrors persisted formData for external hooks). */
    const onboardingState = {
      currentStep: 2,
      formData: {
        primaryNiche: "",
        secondaryNiche: "",
        state: "",
        city: "",
        gender: "",
        bio: "",
        instagramUrl: "",
        youtubeUrl: "",
        facebookUrl: "",
        linkedinUrl: "",
        tiktokUrl: "",
        collabTypes: [],
        pricingTier: "",
        languages: [],
      },
    };

    function syncOnboardingState() {
      const step = steps[stepIndex];
      onboardingState.currentStep = step?.id || 2;
      onboardingState.formData = {
        primaryNiche: formData.niche?.[0] || "",
        secondaryNiche: formData.secondaryCategories?.[0] || "",
        state: formData.state || "",
        city: formData.city || "",
        gender: formData.gender || "",
        bio: formData.bio || "",
        instagramUrl: formData.instagramHandle || "",
        youtubeUrl: formData.youtubeHandle || "",
        facebookUrl: formData.facebookHandle || "",
        linkedinUrl: formData.linkedinHandle || "",
        twitterUrl: formData.twitterHandle || "",
        tiktokUrl: formData.tiktokHandle || "",
        collabTypes: [...(formData.collabTypes || [])],
        pricingTier: formData.priceRange || "",
        languages: [...(formData.languages || [])],
      };
      window.influnetOnboardingState = onboardingState;
    }

    const MODAL_CSS = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
.infl-pob-overlay {
  position: fixed; inset: 0; z-index: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; width: 100%; padding: 1rem;
  background: #090d16;
  font-family: "Inter", "Plus Jakarta Sans", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  opacity: 1;
  transform: translateY(0) scale(1);
}
.infl-pob-overlay.infl-pob-overlay--enter {
  opacity: 0;
  transform: translateY(14px) scale(0.988);
}
.infl-pob-overlay.infl-pob-overlay--enter.infl-pob-overlay--visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}
.infl-pob-track {
  width: 100%; max-width: 42rem; margin-bottom: 1.25rem;
}
.infl-pob-track-labels {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.5rem; margin-bottom: 0.55rem;
}
.infl-pob-track-labels span {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: #64748b; flex: 1; text-align: center;
}
.infl-pob-track-labels span.is-done { color: #94a3b8; }
.infl-pob-track-labels span.is-active { color: #ee3e96; }
.infl-pob-track-dot { color: #334155; flex: 0; user-select: none; }
.infl-pob-track-line {
  height: 0.3rem; border-radius: 999px; background: #1e293b; overflow: hidden;
}
.infl-pob-track-line span {
  display: block; height: 100%; border-radius: inherit;
  background: #ee3e96; transition: width 0.35s ease;
}
.infl-pob-select {
  width: 100%; background: #161b22; color: #fff;
  border: 1px solid #1e293b; border-radius: 0.75rem;
  padding: 0.75rem 1rem; font-size: 0.875rem; cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.infl-pob-select:focus {
  outline: none; border-color: #ee3e96; box-shadow: 0 0 0 1px #ee3e96;
}
.infl-pob-select:disabled { opacity: 0.5; cursor: not-allowed; }
.infl-pob-field-hint {
  margin: 0.35rem 0 0; font-size: 0.75rem; color: #f87171; line-height: 1.35;
}
.infl-pob-field.is-invalid .infl-pob-photo,
.infl-pob-field.is-invalid .infl-pob-select,
.infl-pob-field.is-invalid .infl-pob-chips,
.infl-pob-field.is-invalid .infl-pob-social-prefix-wrap,
.infl-pob-field.is-invalid textarea,
.infl-pob-field.is-invalid .infl-pob-collab-grid,
.infl-pob-field.is-invalid .infl-pob-price-grid {
  border-color: #f87171; box-shadow: 0 0 0 1px rgba(248,113,113,0.45);
}
.infl-pob-chip .infl-pob-chip-check {
  display: inline-block; margin-right: 0.2rem; font-size: 0.65rem; color: #ee3e96;
}
.infl-pob-social-prefix-wrap {
  display: flex; align-items: center; gap: 0;
  background: #161b22; border: 1px solid #1e293b; border-radius: 0.75rem;
  padding: 0 1rem; transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.infl-pob-social-prefix-wrap.is-focused {
  border-color: #ee3e96; box-shadow: 0 0 0 1px #ee3e96;
}
.infl-pob-social-prefix-wrap.is-valid {
  border-color: rgba(74, 222, 128, 0.55);
}
.infl-pob-social-verify {
  flex-shrink: 0; width: 1.35rem; height: 1.35rem; margin-left: 0.35rem;
  border-radius: 999px; background: rgba(34, 197, 94, 0.15); color: #4ade80;
  font-size: 0.72rem; font-weight: 700; display: inline-flex;
  align-items: center; justify-content: center;
}
.infl-pob-add-social {
  margin-top: 0.65rem; padding: 0; border: 0; background: transparent;
  color: #ee3e96; font-size: 0.8125rem; font-weight: 600; cursor: pointer;
}
.infl-pob-add-social:hover { color: #f9a8d4; }
.infl-pob-social-picker {
  margin-top: 0.65rem; padding: 0.85rem; border-radius: 0.75rem;
  background: rgba(15,23,42,0.55); border: 1px solid rgba(148,163,184,0.14);
}
.infl-pob-social-picker-grid {
  display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.45rem;
}
.infl-pob-social-pick {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.45rem 0.75rem; border-radius: 999px;
  border: 1px solid rgba(148,163,184,0.28); background: rgba(15,23,42,0.65);
  color: #e2e8f0; font-size: 0.75rem; font-weight: 600; cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.infl-pob-social-pick:hover {
  border-color: #ee3e96; background: rgba(238,62,150,0.08); color: #fff;
}
.infl-pob-social-pick-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1rem; height: 1rem; font-size: 0.78rem; line-height: 1;
}
.infl-pob-social-pick-icon--pinterest {
  background: #e60023; color: #fff; border-radius: 999px;
  font-size: 0.62rem; font-weight: 800;
}
.infl-pob-social-prefix {
  color: #64748b; font-size: 0.8125rem; white-space: nowrap; flex-shrink: 0;
}
.infl-pob-social-input {
  flex: 1; min-width: 0; border: 0; background: transparent; color: #fff;
  padding: 0.75rem 0 0.75rem 0.25rem; font-size: 0.875rem;
}
.infl-pob-social-input:focus { outline: none; }
.infl-pob-social-input::placeholder { color: #64748b; }
.infl-pob-social-compact { margin-bottom: 0.35rem; }
.infl-pob-social-compact-row {
  display: grid; grid-template-columns: minmax(4.5rem, 5.1rem) 1fr;
  gap: 0.4rem; align-items: center;
}
.infl-pob-social-tag {
  display: block; margin: 0;
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: #94a3b8; line-height: 1.2;
}
.infl-pob-social-block { margin-bottom: 0.35rem; }
.infl-pob-social-block > .infl-pob-label { margin-bottom: 0.35rem; }
.infl-pob-textarea {
  width: 100%; min-height: 6rem; resize: vertical;
  background: #161b22; color: #fff; border: 1px solid #1e293b;
  border-radius: 0.75rem; padding: 0.75rem 1rem; font-size: 0.875rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.infl-pob-textarea:focus {
  outline: none; border-color: #ee3e96; box-shadow: 0 0 0 1px #ee3e96;
}
.infl-pob-textarea::placeholder { color: #64748b; }
.infl-pob-panel--compact { padding: 1.1rem 1.25rem; }
@media (min-width: 768px) { .infl-pob-panel--compact { padding: 1.25rem 1.5rem; } }
.infl-pob-panel--compact .infl-pob-btn-dock {
  margin-top: 0.75rem; padding-top: 0.65rem;
}
.infl-pob-step-compact .infl-pob-head p { margin: 0.25rem 0 0.55rem; font-size: 0.8125rem; }
.infl-pob-step-compact .infl-pob-field { margin-bottom: 0.55rem; }
.infl-pob-step-compact .infl-pob-grid { gap: 0.55rem; margin-bottom: 0.55rem; }
.infl-pob-step-compact .infl-pob-field label,
.infl-pob-step-compact .infl-pob-label { margin-bottom: 0.28rem; }
.infl-pob-step-compact .infl-pob-select {
  padding: 0.5rem 0.75rem; font-size: 0.8125rem; border-radius: 0.55rem;
}
.infl-pob-step-compact .infl-pob-textarea {
  min-height: 2.75rem; max-height: 4.5rem; padding: 0.5rem 0.75rem;
  font-size: 0.8125rem; line-height: 1.4; border-radius: 0.55rem;
}
.infl-pob-step-compact .infl-pob-social-list { gap: 0.3rem; }
.infl-pob-step-compact .infl-pob-social-prefix-wrap {
  padding: 0 0.6rem; border-radius: 0.55rem;
}
.infl-pob-step-compact .infl-pob-social-input {
  padding: 0.42rem 0 0.42rem 0.15rem; font-size: 0.8125rem;
}
.infl-pob-step-compact .infl-pob-social-prefix { font-size: 0.75rem; }
.infl-pob-step-compact .infl-pob-social-verify {
  width: 1.1rem; height: 1.1rem; margin-left: 0.25rem; font-size: 0.62rem;
}
.infl-pob-step-compact .infl-pob-add-social { margin-top: 0.35rem; font-size: 0.75rem; }
.infl-pob-step-compact .infl-pob-social-picker {
  margin-top: 0.4rem; padding: 0.55rem 0.65rem;
}
.infl-pob-step-compact .infl-pob-social-picker-grid { gap: 0.35rem; margin-top: 0.3rem; }
.infl-pob-step-compact .infl-pob-social-pick { padding: 0.35rem 0.6rem; font-size: 0.7rem; }
.infl-pob-track--compact { margin-bottom: 0.75rem; }
.infl-pob-track--compact .infl-pob-track-labels { margin-bottom: 0.35rem; }
.infl-pob-btn-dock {
  flex-shrink: 0; display: flex; gap: 0.75rem; align-items: stretch;
  margin-top: 1.25rem; padding-top: 1rem;
  border-top: 1px solid rgba(148,163,184,0.12);
}
.infl-pob-btn-dock--solo { justify-content: flex-end; }
.infl-pob-card {
  position: relative; width: 100%; max-width: 42rem; max-height: calc(100vh - 5rem);
  display: flex; flex-direction: column; overflow: hidden;
  border-radius: 1rem; background: #0d1117;
  border: 1px solid #0f172a;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.65);
  color: #f8fafc;
}
.infl-pob-panel {
  flex: 1; display: flex; flex-direction: column; justify-content: space-between;
  padding: 1.5rem; min-height: 0;
}
@media (min-width: 768px) { .infl-pob-panel { padding: 2rem; } }
.infl-pob-panel-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0; min-width: 0; }
.infl-pob-head h2 {
  margin: 0; font-size: clamp(1.25rem, 2.5vw, 1.55rem); font-weight: 700;
  color: #fff; letter-spacing: -0.02em;
}
.infl-pob-head p {
  margin: 0.35rem 0 1.1rem; font-size: 0.875rem; color: #94a3b8; line-height: 1.45;
}
.infl-pob-progress {
  height: 0.25rem; border-radius: 999px; background: #1e293b;
  overflow: hidden; margin-bottom: 1.25rem;
}
.infl-pob-progress span {
  display: block; height: 100%; border-radius: inherit;
  background: #ee3e96; transition: width 0.3s ease;
}
.infl-pob-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }
.infl-pob-field { margin-bottom: 1rem; }
.infl-pob-field label, .infl-pob-label {
  display: block; margin-bottom: 0.4rem;
  font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: #94a3b8;
}
.infl-pob-field input, .infl-pob-field textarea, .infl-pob-field select {
  width: 100%; border: 1px solid rgba(148,163,184,0.22); border-radius: 0.65rem;
  padding: 0.65rem 0.85rem; font-size: 0.875rem;
  background: rgba(15,23,42,0.65); color: #f8fafc;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.infl-pob-field select { appearance: auto; cursor: pointer; }
.infl-pob-field select:disabled { opacity: 0.5; cursor: not-allowed; }
.infl-pob-field input:focus, .infl-pob-field textarea:focus, .infl-pob-field select:focus {
  outline: none; border-color: #ee3e96; box-shadow: 0 0 0 1px #ee3e96;
}
.infl-pob-field input::placeholder, .infl-pob-field textarea::placeholder { color: #64748b; }
.infl-pob-profile-row {
  display: grid; grid-template-columns: 7.5rem 1fr; gap: 0.85rem; margin-bottom: 1rem;
  align-items: start;
}
.infl-pob-profile-row--step2 .infl-pob-field { margin-bottom: 0; }
.infl-pob-photo {
  border: 1px dashed rgba(148,163,184,0.35); border-radius: 0.75rem;
  min-height: 7.5rem; aspect-ratio: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.35rem;
  color: #64748b; font-size: 0.72rem; cursor: pointer; overflow: hidden;
  background: #161b22; position: relative;
}
.infl-pob-photo img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
}
.infl-pob-photo svg { width: 1.35rem; height: 1.35rem; opacity: 0.7; }
.infl-pob-photo input { display: none; }
.infl-pob-photo--filled { border-style: solid; border-color: rgba(148,163,184,0.25); }
.infl-pob-photo-overlay {
  position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.25rem;
  background: rgba(9,13,22,0.55); color: #fff; font-size: 0.62rem; font-weight: 600;
  opacity: 0; transition: opacity 0.15s ease; pointer-events: none;
}
.infl-pob-photo--filled:hover .infl-pob-photo-overlay,
.infl-pob-photo--filled:focus-within .infl-pob-photo-overlay { opacity: 1; }
@media (hover: none) {
  .infl-pob-photo--filled .infl-pob-photo-overlay { opacity: 1; }
}
.infl-pob-photo-overlay svg { width: 1.1rem; height: 1.1rem; opacity: 0.95; }
.infl-pob-photo-hint {
  margin: 0.35rem 0 0; font-size: 0.68rem; color: #64748b; line-height: 1.35;
}
.infl-pob-photo-hint.is-error { color: #f87171; }
.infl-pob-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.infl-pob-chip {
  border: 1px solid rgba(148,163,184,0.28); border-radius: 999px;
  padding: 0.35rem 0.75rem; font-size: 0.75rem; font-weight: 600;
  background: rgba(15,23,42,0.55); color: #cbd5e1; cursor: pointer;
  transition: all 0.2s ease;
}
.infl-pob-chip.is-active {
  border-color: #ee3e96; background: #ee3e96; color: #fff;
  box-shadow: 0 0 0 1px rgba(238,62,150,0.35);
}
.infl-pob-chip.is-active .infl-pob-chip-check { color: #fff; }
.infl-pob-social-list { display: flex; flex-direction: column; gap: 0.55rem; }
.infl-pob-social-row {
  display: grid; grid-template-columns: auto 1fr; gap: 0.65rem; align-items: center;
  padding: 0.55rem 0.65rem; border-radius: 0.65rem;
  background: rgba(15,23,42,0.55); border: 1px solid rgba(148,163,184,0.12);
}
.infl-pob-social-meta { display: flex; align-items: center; gap: 0.45rem; min-width: 6.5rem; }
.infl-pob-social-meta strong { font-size: 0.78rem; color: #e2e8f0; font-weight: 600; }
.infl-pob-social-row input {
  border: 0; border-bottom: 1px solid rgba(148,163,184,0.25);
  border-radius: 0; background: transparent; color: #f8fafc;
  padding: 0.35rem 0; font-size: 0.8125rem;
}
.infl-pob-social-row input:focus {
  outline: none; border-bottom-color: #ee3e96;
}
.infl-pob-collab-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem;
}
.infl-pob-collab-card {
  position: relative; display: flex; align-items: flex-start; gap: 0.75rem;
  text-align: left; padding: 0.85rem 0.95rem;
  border-radius: 0.75rem; border: 1px solid rgba(148,163,184,0.22);
  background: rgba(15,23,42,0.55); color: #cbd5e1; cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}
.infl-pob-collab-card.is-wide { grid-column: 1 / -1; }
.infl-pob-collab-card.is-active {
  border-color: #ee3e96; background: rgba(238,62,150,0.08);
  box-shadow: 0 0 0 1px rgba(238,62,150,0.25);
}
.infl-pob-collab-icon {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; color: #94a3b8;
}
.infl-pob-collab-icon svg { width: 1.35rem; height: 1.35rem; display: block; }
.infl-pob-collab-card.is-active .infl-pob-collab-icon { color: #f8fafc; }
.infl-pob-collab-copy { min-width: 0; }
.infl-pob-collab-copy strong {
  display: block; font-size: 0.875rem; color: #f8fafc; margin-bottom: 0.2rem; font-weight: 600;
}
.infl-pob-collab-copy span { font-size: 0.72rem; color: #94a3b8; line-height: 1.4; display: block; }
.infl-pob-price-grid {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.45rem;
  width: 100%; min-width: 0;
}
.infl-pob-price-card {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.15rem; text-align: center; min-width: 0; width: 100%;
  border: 1px solid rgba(148,163,184,0.22); border-radius: 0.75rem;
  padding: 0.65rem 0.25rem; cursor: pointer; background: rgba(15,23,42,0.55);
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  min-height: 4rem;
}
.infl-pob-price-card.is-active {
  border-color: #ee3e96; background: rgba(238,62,150,0.08);
  box-shadow: 0 0 0 1px rgba(238,62,150,0.25);
}
.infl-pob-price-card input { position: absolute; opacity: 0; pointer-events: none; }
.infl-pob-price-copy { min-width: 0; max-width: 100%; }
.infl-pob-price-copy strong {
  font-size: 0.58rem; letter-spacing: 0.06em; color: #94a3b8; font-weight: 700;
  text-transform: uppercase;
}
.infl-pob-price-card.is-active .infl-pob-price-copy strong { color: #ee3e96; }
.infl-pob-price-copy span {
  font-size: 0.72rem; color: #f8fafc; font-weight: 700; line-height: 1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}
.infl-pob-error {
  margin: 0.75rem 0 0; font-size: 0.8125rem; color: #fda4af;
  padding: 0.55rem 0.75rem; border-radius: 0.5rem;
  background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.25);
}
#btn-back {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;
  border: 1px solid rgba(148,163,184,0.35); border-radius: 0.65rem;
  background: transparent; color: #cbd5e1;
  font-size: 0.875rem; font-weight: 600; padding: 0.75rem 1rem; cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
#btn-back:hover { border-color: #94a3b8; color: #f8fafc; }
#btn-next {
  flex: 1.35; display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;
  border: 0; border-radius: 0.65rem; background: #ee3e96; color: #fff;
  font-size: 0.875rem; font-weight: 700; padding: 0.75rem 1rem; cursor: pointer;
  box-shadow: 0 8px 24px rgba(238,62,150,0.35);
  transition: background-color 0.15s ease, opacity 0.15s ease;
}
#btn-next:hover:not(:disabled) { background: #d63384; }
#btn-next:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
@media (max-width: 640px) {
  .infl-pob-grid, .infl-pob-collab-grid { grid-template-columns: 1fr; }
  .infl-pob-price-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .infl-pob-profile-row { grid-template-columns: 1fr; }
  .infl-pob-social-compact-row { grid-template-columns: minmax(3.75rem, 4.25rem) 1fr; gap: 0.3rem; }
}
`;

    let open = false;
    let openingInProgress = false;
    let stepIndex = 0;
    let steps = [];
    let profile = null;
    let modalRoot = null;
    let shadowHost = null;
    let formData = emptyFormData();
    let pendingPhotoFile = null;
    let pendingPhotoPreviewUrl = null;
    let extraSocialVisible = new Set();

    const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
    const PHOTO_MAX_OUTPUT = 1000;
    const PHOTO_CROP_VIEWPORT = 320;
    const PHOTO_ALLOWED = ["image/jpeg", "image/png", "image/webp"];

    const CROP_MODAL_CSS = `
.infl-pob-crop-modal {
  position: fixed; inset: 0; z-index: 2147483647;
  display: flex; align-items: center; justify-content: center; padding: 1rem;
  font-family: "Inter", "Plus Jakarta Sans", system-ui, sans-serif;
}
.infl-pob-crop-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.78); }
.infl-pob-crop-dialog {
  position: relative; width: min(100%, 380px); background: #0d1117;
  border: 1px solid rgba(148,163,184,0.18); border-radius: 1rem; padding: 1rem;
  box-shadow: 0 24px 64px rgba(0,0,0,0.55);
}
.infl-pob-crop-title { margin: 0 0 0.25rem; font-size: 1rem; font-weight: 700; color: #fff; }
.infl-pob-crop-sub { margin: 0 0 0.85rem; font-size: 0.75rem; color: #94a3b8; }
.infl-pob-crop-viewport-wrap {
  width: 320px; max-width: 100%; margin: 0 auto 0.85rem;
  border-radius: 0.75rem; overflow: hidden; border: 1px solid rgba(148,163,184,0.2);
}
.infl-pob-crop-canvas {
  display: block; width: 320px; height: 320px; max-width: 100%;
  cursor: grab; touch-action: none;
}
.infl-pob-crop-canvas.is-dragging { cursor: grabbing; }
.infl-pob-crop-zoom-label {
  display: block; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: #94a3b8; margin-bottom: 0.35rem;
}
.infl-pob-crop-zoom { width: 100%; margin-bottom: 0.85rem; accent-color: #ee3e96; }
.infl-pob-crop-actions { display: flex; gap: 0.65rem; }
.infl-pob-crop-btn {
  flex: 1; height: 2.625rem; border-radius: 0.65rem; border: none;
  font-size: 0.8125rem; font-weight: 700; cursor: pointer;
}
.infl-pob-crop-btn--ghost {
  background: rgba(255,255,255,0.06); color: #e2e8f0;
  border: 1px solid rgba(148,163,184,0.22);
}
.infl-pob-crop-btn--primary { background: #ee3e96; color: #fff; }
.infl-pob-crop-btn--primary:hover { background: #d63384; }
`;

    function emptyFormData() {
      return {
        niche: [],
        secondaryCategories: [],
        instagramHandle: null,
        youtubeHandle: null,
        facebookHandle: null,
        linkedinHandle: null,
        tiktokHandle: null,
        twitterHandle: null,
        extraSocialLinks: [],
        gender: null,
        state: null,
        city: null,
        location: null,
        languages: [],
        bio: null,
        collabTypes: [],
        priceRange: null,
      };
    }

    function normalizePriceRangeId(value) {
      const s = String(value || "").trim();
      if (!s) return "";
      return LEGACY_PRICE_IDS[s] || s;
    }

    function normalizeCollabIds(list) {
      if (!Array.isArray(list)) return [];
      return [...new Set(list.filter(Boolean).map((id) => (id === "youtube" ? "yt" : String(id))))];
    }

    function loadPersistedFormData() {
      try {
        const raw = sessionStorage.getItem(FORM_STORAGE_KEY);
        if (!raw) return null;
        return { ...emptyFormData(), ...JSON.parse(raw) };
      } catch (_) {
        return null;
      }
    }

    function persistFormData() {
      try {
        sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
      } catch (_) {}
    }

    function clearPersistedFormData() {
      try {
        sessionStorage.removeItem(FORM_STORAGE_KEY);
      } catch (_) {}
    }

    function initFormData(serverProfile, persisted) {
      const p = serverProfile || {};
      const nicheList = normalizeNiche(p.niche);
      formData = {
        ...emptyFormData(),
        niche: nicheList.length ? nicheList : [],
        secondaryCategories: normalizeSecondaryCategories(p.secondaryCategories).length
          ? normalizeSecondaryCategories(p.secondaryCategories)
          : nicheList.slice(1),
        instagramHandle: p.instagramHandle || null,
        youtubeHandle: p.youtubeHandle || null,
        facebookHandle: p.facebookHandle || null,
        linkedinHandle: p.linkedinHandle || null,
        tiktokHandle: p.tiktokHandle || null,
        twitterHandle: p.twitterHandle || null,
        extraSocialLinks: Array.isArray(p.extraSocialLinks) ? [...p.extraSocialLinks] : [],
        gender: p.gender || null,
        state: p.state || null,
        city: p.city || null,
        location: p.location || null,
        languages: Array.isArray(p.languages) ? [...p.languages] : [],
        bio: p.bio || null,
        collabTypes: normalizeCollabIds(p.collabTypes),
        priceRange: normalizePriceRangeId(p.priceRange) || null,
        ...(persisted || {}),
      };
      if (formData.collabTypes) {
        formData.collabTypes = normalizeCollabIds(formData.collabTypes);
      }
      if (formData.priceRange) {
        formData.priceRange = normalizePriceRangeId(formData.priceRange) || null;
      }
      persistFormData();
    }

    function patchFormData(partial) {
      if (!partial || typeof partial !== "object") return;
      formData = { ...formData, ...partial };
      if (partial.collabTypes) {
        formData.collabTypes = normalizeCollabIds(partial.collabTypes);
      }
      if (partial.priceRange != null) {
        formData.priceRange = normalizePriceRangeId(partial.priceRange) || null;
      }
      persistFormData();
      syncOnboardingState();
    }

    function buildFullPayload() {
      captureCurrentStepDraft();
      return { ...formData };
    }

    function esc(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    }

    function q(sel) {
      return modalRoot ? modalRoot.querySelector(sel) : null;
    }

    function qAll(sel) {
      return modalRoot ? [...modalRoot.querySelectorAll(sel)] : [];
    }

    function qid(id) {
      return modalRoot ? modalRoot.querySelector("#" + id) : null;
    }

    function isInfluencerDashboard() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/dashboard/influencer";
    }

    function isSettingsRoute() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      return path === "/dashboard/settings" || path === "/dashboard/profile";
    }

    function isInfluencerDashboardArea() {
      return isInfluencerDashboard() || isSettingsRoute();
    }

    function authHeaders() {
      const token = localStorage.getItem("influnet_token");
      return token
        ? { Authorization: "Bearer " + token, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
    }

    function ensurePageLockStyle() {
      if (document.getElementById("infl-pob-page-lock")) return;
      const style = document.createElement("style");
      style.id = "infl-pob-page-lock";
      style.textContent =
        "body.infl-pob-open{overflow:hidden!important;background:#090d16!important}" +
        "body.infl-pob-open #root{display:none!important}" +
        "body.infl-pob-open .flex.h-screen{display:none!important}";
      document.head.appendChild(style);
    }

    function mountModalShell() {
      if (modalRoot) return modalRoot;
      ensurePageLockStyle();
      shadowHost = document.createElement("div");
      shadowHost.id = OVERLAY_ID;
      shadowHost.style.cssText =
        "position:fixed;inset:0;z-index:2147483647;display:block;pointer-events:auto;";
      const shadow = shadowHost.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = MODAL_CSS;
      shadow.appendChild(style);
      modalRoot = document.createElement("div");
      modalRoot.className = "infl-pob-overlay";
      modalRoot.addEventListener("click", (e) => {
        if (e.target.closest("#btn-back")) {
          e.preventDefault();
          goPrevStep();
          return;
        }
        if (e.target.closest("#btn-next")) {
          e.preventDefault();
          saveStep();
        }
      });
      shadow.appendChild(modalRoot);
      document.body.appendChild(shadowHost);
      return modalRoot;
    }

    function revealWizardShell(fromTransition) {
      if (!modalRoot) return;
      if (!fromTransition) return;
      modalRoot.classList.add("infl-pob-overlay--enter");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          modalRoot.classList.add("infl-pob-overlay--visible");
        });
      });
    }

    async function runEntryTransitionIfNeeded() {
      if (window.influnetOnboardingTransitionPromise) {
        document.body.classList.add("infl-pob-open");
        await window.influnetOnboardingTransitionPromise;
        return true;
      }
      if (typeof window.influnetShouldShowOnboardingTransition !== "function") return false;
      if (!window.influnetShouldShowOnboardingTransition()) return false;
      document.body.classList.add("infl-pob-open");
      if (typeof window.influnetShowOnboardingTransition === "function") {
        await window.influnetShowOnboardingTransition({ durationMs: 2000, immediate: true });
      } else {
        window.influnetClearOnboardingTransitionPending?.();
      }
      return true;
    }

    async function fetchCompletion() {
      const res = await fetch("/api/profile/completion", {
        credentials: "same-origin",
        headers: authHeaders(),
      });
      if (!res.ok) return null;
      return res.json();
    }

    function normalizeNiche(niche) {
      if (Array.isArray(niche)) return niche.map(String).filter(Boolean);
      if (typeof niche === "string" && niche.trim()) {
        try {
          const parsed = JSON.parse(niche);
          if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
        } catch (_) {}
        return [niche];
      }
      return [];
    }

    function normalizeSecondaryCategories(value) {
      if (!Array.isArray(value)) return [];
      return [...new Set(value.map(String).map((s) => s.trim()).filter(Boolean))];
    }

    function getPrimaryCategory() {
      const btn = q("#infl-pob-niche-primary .infl-pob-chip.is-active");
      return btn?.getAttribute("data-niche") || "";
    }

    function getSecondaryCategories() {
      return qAll("#infl-pob-niche-secondary .infl-pob-chip.is-secondary").map((btn) =>
        btn.getAttribute("data-niche")
      );
    }

    function syncSecondaryNichePills(root) {
      const primary = getPrimaryCategory();
      const secondaryWrap = root.querySelector("#infl-pob-niche-secondary");
      if (!secondaryWrap) return;
      secondaryWrap.querySelectorAll(".infl-pob-chip").forEach((btn) => {
        const niche = btn.getAttribute("data-niche");
        const hide = !!primary && niche === primary;
        btn.hidden = hide;
        if (hide) btn.classList.remove("is-secondary");
      });
      const hint = q("#infl-pob-secondary-hint");
      if (hint) {
        const count = getSecondaryCategories().length;
        hint.textContent = `Select up to ${MAX_SECONDARY_NICHES} complementary niches (${count}/${MAX_SECONDARY_NICHES} selected)`;
      }
    }

    function wirePrimarySecondaryNiches(root, primaryInit, secondaryInit) {
      const primaryWrap = root.querySelector("#infl-pob-niche-primary");
      const secondaryWrap = root.querySelector("#infl-pob-niche-secondary");
      if (!primaryWrap || !secondaryWrap) return;

      primaryWrap.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-niche]");
        if (!btn) return;
        primaryWrap.querySelectorAll(".infl-pob-chip").forEach((el) => {
          el.classList.toggle("is-active", el === btn);
        });
        syncSecondaryNichePills(root);
      });

      secondaryWrap.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-niche]");
        if (!btn || btn.hidden) return;
        const niche = btn.getAttribute("data-niche");
        if (btn.classList.contains("is-secondary")) {
          btn.classList.remove("is-secondary");
        } else if (getSecondaryCategories().length < MAX_SECONDARY_NICHES) {
          btn.classList.add("is-secondary");
        }
        syncSecondaryNichePills(root);
      });

      syncSecondaryNichePills(root);
    }

    function buildNicheOptions(selected, placeholder) {
      let html = `<option value="">${esc(placeholder || "Select niche")}</option>`;
      NICHES.forEach((n) => {
        html += `<option value="${esc(n)}"${selected === n ? " selected" : ""}>${esc(n)}</option>`;
      });
      return html;
    }

    function extractUsername(urlOrString, platform) {
      let clean = String(urlOrString || "").trim();
      if (!clean) return "";
      const pattern = platform ? PLATFORM_URL_PATTERNS[platform] : null;
      if (pattern) {
        const m = clean.match(pattern);
        if (m && m[1]) {
          return m[1].replace(/^@+/, "").split(/[/?#]/)[0];
        }
      }
      const generic =
        /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|facebook\.com|youtube\.com|linkedin\.com\/in|linkedin\.com)\/([a-zA-Z0-9_\-.]+)\/?/i;
      const match = clean.match(generic);
      if (match && match[1]) return match[1].replace(/^@+/, "");
      return clean.replace(/^@+/, "").split(/[/?#\s]/)[0];
    }

    function isValidSocialUsername(value, cfg) {
      const s = String(value || "").trim();
      if (!s) return false;
      if (cfg?.isWebsite) {
        return /^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}/.test(s.replace(/^https?:\/\//i, ""));
      }
      return /^[a-zA-Z0-9_.-]{2,100}$/.test(s);
    }

    function normalizeWebsiteDisplay(url) {
      return String(url || "")
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "");
    }

    function normalizeWebsiteSave(value) {
      let s = String(value || "").trim();
      if (!s) return null;
      if (!/^https?:\/\//i.test(s)) s = "https://" + s;
      return s;
    }

    function parseExtraSocialLinks(value) {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      try {
        const parsed = JSON.parse(String(value));
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }

    function getExtraSocialUrl(links, id) {
      const item = parseExtraSocialLinks(links).find(
        (e) => String(e?.id || "").toLowerCase() === String(id).toLowerCase()
      );
      return item?.url ? String(item.url) : "";
    }

    function upsertExtraSocialUrl(links, id, url) {
      const list = parseExtraSocialLinks(links).filter(
        (e) => String(e?.id || "").toLowerCase() !== String(id).toLowerCase()
      );
      if (url && String(url).trim()) list.push({ id, url: String(url).trim() });
      return list;
    }

    function getSocialStoredValue(cfg, p) {
      const source = { ...formData, ...p };
      if (cfg.extraId) return getExtraSocialUrl(source.extraSocialLinks, cfg.extraId);
      return source[cfg.field] || "";
    }

    function stripSocialPrefix(value, prefix, platform, cfg) {
      const raw = String(value || "").trim();
      if (!raw) return "";
      if (cfg?.isWebsite) return normalizeWebsiteDisplay(raw);
      if (/^https?:\/\//i.test(raw) || raw.includes(".com")) {
        return extractUsername(raw, platform);
      }
      const p = String(prefix || "").toLowerCase();
      const lower = raw.toLowerCase();
      if (lower.startsWith(p)) return raw.slice(p.length).replace(/^\/+/, "").replace(/^@+/, "");
      if (lower.startsWith("https://" + p)) {
        return raw.slice(("https://" + p).length).replace(/^\/+/, "").replace(/^@+/, "");
      }
      if (lower.startsWith("http://" + p)) {
        return raw.slice(("http://" + p).length).replace(/^\/+/, "").replace(/^@+/, "");
      }
      return extractUsername(raw, platform);
    }

    function withSocialPrefix(value, prefix, platform, cfg) {
      if (cfg?.isWebsite) {
        const site = normalizeWebsiteSave(
          value.includes("://") ? value : prefix.replace(/\/+$/, "") + "//" + value.replace(/^\/+/, "")
        );
        return site;
      }
      const slug = stripSocialPrefix(value, prefix, platform, cfg);
      if (!slug) return null;
      return prefix + slug.replace(/^\/+/, "").replace(/^@+/, "");
    }

    function socialPrefixRow(cfg, storedValue) {
      const displayVal = stripSocialPrefix(storedValue, cfg.prefix, cfg.platform, cfg);
      const verified = isValidSocialUsername(displayVal, cfg);
      return `
        <div class="infl-pob-field infl-pob-social-field infl-pob-social-compact" data-field-wrap="${cfg.id}" data-social-platform="${cfg.platform}">
          <div class="infl-pob-social-compact-row">
            <label class="infl-pob-social-tag" for="${cfg.id}">${esc(cfg.label)}</label>
            <div class="infl-pob-social-prefix-wrap${verified ? " is-valid" : ""}" data-prefix-wrap="${cfg.id}">
              <span class="infl-pob-social-prefix" aria-hidden="true">${esc(cfg.prefix)}</span>
              <input
                type="text"
                id="${cfg.id}"
                class="infl-pob-social-input"
                data-platform="${esc(cfg.platform)}"
                data-prefix="${esc(cfg.prefix)}"
                value="${esc(displayVal)}"
                placeholder="${esc(cfg.placeholder)}"
                autocomplete="off"
                aria-describedby="${cfg.id}-hint"
              />
              <span class="infl-pob-social-verify" id="${cfg.id}-verify"${verified ? "" : " hidden"} aria-label="Handle looks valid">✓</span>
            </div>
          </div>
          <p class="infl-pob-field-hint" id="${cfg.id}-hint" hidden></p>
        </div>`;
    }

    function getAvailableOptionalPlatforms(extras) {
      return OPTIONAL_SOCIAL_PLATFORMS.filter((cfg) => !extras.has(cfg.platform));
    }

    function buildPlatformPickerHtml(extras) {
      const available = getAvailableOptionalPlatforms(extras);
      if (!available.length) return "";
      const chips = available
        .map(
          (cfg) =>
            `<button type="button" class="infl-pob-social-pick" data-pick-platform="${esc(cfg.platform)}">
              <span class="infl-pob-social-pick-icon${cfg.iconClass ? " " + cfg.iconClass : ""}" aria-hidden="true">${esc(cfg.icon)}</span>
              <span>${esc(cfg.label)}</span>
            </button>`
        )
        .join("");
      return `
        <button type="button" id="infl-pob-add-social" class="infl-pob-add-social">+ Add more platform</button>
        <div id="infl-pob-social-picker" class="infl-pob-social-picker" hidden>
          <p class="infl-pob-label">Choose a platform</p>
          <div class="infl-pob-social-picker-grid">${chips}</div>
        </div>`;
    }

    function buildSocialRowsHtml(p, extras) {
      const core = CORE_SOCIAL_PLATFORMS.map((cfg) =>
        socialPrefixRow(cfg, getSocialStoredValue(cfg, p))
      ).join("");
      const optional = OPTIONAL_SOCIAL_PLATFORMS.filter((cfg) => extras.has(cfg.platform))
        .map((cfg) => socialPrefixRow(cfg, getSocialStoredValue(cfg, p)))
        .join("");
      return `
        ${core}
        <div id="infl-pob-social-extras">${optional}</div>
        ${buildPlatformPickerHtml(extras)}`;
    }

    function refreshSocialPicker(root) {
      const available = getAvailableOptionalPlatforms(extraSocialVisible);
      const picker = root.querySelector("#infl-pob-social-picker");
      const addBtn = root.querySelector("#infl-pob-add-social");
      if (!available.length) {
        picker?.remove();
        addBtn?.remove();
        return;
      }
      if (picker) {
        picker.querySelector(".infl-pob-social-picker-grid").innerHTML = available
          .map(
            (cfg) =>
              `<button type="button" class="infl-pob-social-pick" data-pick-platform="${esc(cfg.platform)}">
                <span class="infl-pob-social-pick-icon${cfg.iconClass ? " " + cfg.iconClass : ""}" aria-hidden="true">${esc(cfg.icon)}</span>
                <span>${esc(cfg.label)}</span>
              </button>`
          )
          .join("");
      }
    }

    function updateSocialVerifyBadge(input) {
      if (!input) return;
      const cfg = OPTIONAL_SOCIAL_PLATFORMS.concat(CORE_SOCIAL_PLATFORMS).find(
        (c) => c.id === input.id
      );
      const badge = q("#" + input.id + "-verify");
      const wrap = input.closest(".infl-pob-social-prefix-wrap");
      const ok = isValidSocialUsername(input.value.trim(), cfg);
      if (badge) badge.hidden = !ok;
      wrap?.classList.toggle("is-valid", ok);
    }

    function normalizeSocialInput(input) {
      if (!input) return;
      const cfg = OPTIONAL_SOCIAL_PLATFORMS.concat(CORE_SOCIAL_PLATFORMS).find(
        (c) => c.id === input.id
      );
      const platform = input.getAttribute("data-platform") || "";
      const prefix = input.getAttribute("data-prefix") || "";
      const raw = input.value;
      const parsed = stripSocialPrefix(raw, prefix, platform, cfg);
      if (parsed !== raw) input.value = parsed;
      updateSocialVerifyBadge(input);
    }

    function wireSingleSocialRow(root, cfg) {
      const input = root.querySelector("#" + cfg.id);
      const wrap = root.querySelector(`[data-prefix-wrap="${cfg.id}"]`);
      if (!input || !wrap) return;
      input.addEventListener("focus", () => wrap.classList.add("is-focused"));
      input.addEventListener("blur", () => {
        wrap.classList.remove("is-focused");
        normalizeSocialInput(input);
      });
      input.addEventListener("input", () => {
        clearFieldError(cfg.id);
        const v = input.value;
        if (/https?:\/\/|\.com/i.test(v)) normalizeSocialInput(input);
        else updateSocialVerifyBadge(input);
      });
      updateSocialVerifyBadge(input);
    }

    function addOptionalSocialPlatform(root, platform) {
      const cfg = OPTIONAL_SOCIAL_PLATFORMS.find((c) => c.platform === platform);
      if (!cfg || extraSocialVisible.has(platform)) return;
      extraSocialVisible.add(platform);
      const extrasEl = root.querySelector("#infl-pob-social-extras");
      const p = { ...profile, ...formData };
      extrasEl?.insertAdjacentHTML("beforeend", socialPrefixRow(cfg, getSocialStoredValue(cfg, p)));
      wireSingleSocialRow(root, cfg);
      const picker = root.querySelector("#infl-pob-social-picker");
      if (picker) picker.hidden = true;
      refreshSocialPicker(root);
      root.querySelector("#" + cfg.id)?.focus();
    }

    function wireSocialPlatformRows(root) {
      [...CORE_SOCIAL_PLATFORMS, ...OPTIONAL_SOCIAL_PLATFORMS.filter((c) =>
        extraSocialVisible.has(c.platform)
      )].forEach((cfg) => wireSingleSocialRow(root, cfg));

      root.querySelector("#infl-pob-add-social")?.addEventListener("click", () => {
        const picker = root.querySelector("#infl-pob-social-picker");
        if (picker) picker.hidden = !picker.hidden;
      });

      root.querySelector("#infl-pob-social-picker")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-pick-platform]");
        if (!btn) return;
        addOptionalSocialPlatform(root, btn.getAttribute("data-pick-platform"));
      });
    }

    function collectSocialHandles() {
      const out = { extraSocialLinks: parseExtraSocialLinks(formData.extraSocialLinks) };
      [...CORE_SOCIAL_PLATFORMS, ...OPTIONAL_SOCIAL_PLATFORMS.filter((c) =>
        extraSocialVisible.has(c.platform)
      )].forEach((cfg) => {
        const el = qid(cfg.id);
        if (el) normalizeSocialInput(el);
        const raw = qid(cfg.id)?.value?.trim() || "";
        if (cfg.extraId) {
          const url = raw
            ? cfg.isWebsite
              ? normalizeWebsiteSave(raw.includes("://") ? raw : "https://" + raw)
              : withSocialPrefix(raw, cfg.prefix, cfg.platform, cfg)
            : null;
          out.extraSocialLinks = upsertExtraSocialUrl(out.extraSocialLinks, cfg.extraId, url);
        } else if (cfg.field) {
          out[cfg.field] = withSocialPrefix(raw, cfg.prefix, cfg.platform, cfg);
        }
      });
      return out;
    }

    function syncExtraSocialFromProfile(p) {
      const source = { ...formData, ...p };
      OPTIONAL_SOCIAL_PLATFORMS.forEach((cfg) => {
        if (cfg.field && source[cfg.field] && String(source[cfg.field]).trim()) {
          extraSocialVisible.add(cfg.platform);
        }
        if (cfg.extraId) {
          const url = getExtraSocialUrl(source.extraSocialLinks, cfg.extraId);
          if (url) extraSocialVisible.add(cfg.platform);
        }
      });
    }

    function wireNicheSelects(root) {
      const primary = root.querySelector("#infl-pob-primary-niche");
      const secondary = root.querySelector("#infl-pob-secondary-niche");
      if (!primary || !secondary) return;
      primary.addEventListener("change", () => {
        if (secondary.value && secondary.value === primary.value) secondary.value = "";
        clearFieldError("infl-pob-primary-niche");
      });
      secondary.addEventListener("change", () => clearFieldError("infl-pob-secondary-niche"));
    }

    function wireBioField(root) {
      const bio = root.querySelector("#infl-pob-bio");
      const hint = root.querySelector("#infl-pob-bio-hint");
      if (!bio) return;
      bio.addEventListener("input", () => {
        clearFieldError("infl-pob-bio");
        if (!hint) return;
        const len = bio.value.trim().length;
        if (len > 0 && len < BIO_MIN_LENGTH) {
          hint.hidden = false;
          hint.textContent = `${BIO_MIN_LENGTH - len} more characters needed (min. ${BIO_MIN_LENGTH}).`;
        } else {
          hint.hidden = true;
        }
      });
    }

    /** Lightweight per-step validator — returns { ok, errors[] }. */
    function validateStep(stepNumber, payload) {
      const errors = [];
      const push = (field, message) => errors.push({ field, message });

      if (stepNumber === 2) {
        const hasPhoto = !!(pendingPhotoFile || profile?.avatarUrl || formData.avatarUrl);
        const hasGender = !!(payload.gender && String(payload.gender).trim());
        const hasState = !!(payload.state && String(payload.state).trim());
        const hasCity = !!(payload.city && String(payload.city).trim());
        const hasLanguages =
          Array.isArray(payload.languages) && payload.languages.length > 0;
        if (!hasPhoto) push("infl-pob-photo", "Please upload a profile photo.");
        if (!hasGender) push("infl-pob-gender", "Please select your gender.");
        if (!hasState) push("infl-pob-state", "Please select your state.");
        if (!hasCity) push("infl-pob-city", "Please select your city.");
        if (!hasLanguages) push("infl-pob-langs", "Please select at least one language.");
      }

      if (stepNumber === 3) {
        const hasPrimary = Array.isArray(payload.niche) && payload.niche.length > 0;
        const bioLen = String(payload.bio || "").trim().length;
        const hasSocial = !!(
          payload.instagramHandle ||
          payload.facebookHandle ||
          payload.youtubeHandle ||
          payload.linkedinHandle ||
          payload.twitterHandle ||
          payload.tiktokHandle ||
          (Array.isArray(payload.extraSocialLinks) &&
            payload.extraSocialLinks.some((e) => e?.url && String(e.url).trim()))
        );
        if (!hasPrimary) push("infl-pob-primary-niche", "Choose your primary niche.");
        if (bioLen < BIO_MIN_LENGTH) {
          push("infl-pob-bio", `Bio must be at least ${BIO_MIN_LENGTH} characters.`);
        }
        if (!hasSocial) {
          push(
            "infl-pob-ig",
            "Add at least one social profile (Instagram, Facebook, YouTube, or LinkedIn)."
          );
        }
      }

      if (stepNumber === 4) {
        const hasCollab = Array.isArray(payload.collabTypes) && payload.collabTypes.length > 0;
        const hasPrice = !!(payload.priceRange && String(payload.priceRange).trim());
        if (!hasCollab) push("infl-pob-collab-grid", "Select at least one collaboration type.");
        if (!hasPrice) push("infl-pob-price", "Select your typical price range.");
      }

      return { ok: errors.length === 0, errors };
    }

    function clearFieldErrors() {
      qAll(".infl-pob-field.is-invalid").forEach((el) => el.classList.remove("is-invalid"));
      qAll(".infl-pob-field-hint").forEach((el) => {
        el.hidden = true;
        el.textContent = "";
      });
      if (errEl()) errEl().hidden = true;
    }

    function clearFieldError(fieldId) {
      const wrap =
        q(`[data-field-wrap="${fieldId}"]`) ||
        q(`#${fieldId}`)?.closest(".infl-pob-field");
      wrap?.classList.remove("is-invalid");
      const hint = qid(fieldId + "-hint") || q(`#${fieldId}-hint`);
      if (hint) {
        hint.hidden = true;
        hint.textContent = "";
      }
    }

    function errEl() {
      return qid("infl-pob-error");
    }

    /** Flash red borders + inline hints for failed fields. */
    function flashFieldErrors(errors, summaryMessage) {
      clearFieldErrors();
      errors.forEach(({ field, message }) => {
        const wrap =
          q(`[data-field-wrap="${field}"]`) ||
          qid(field)?.closest(".infl-pob-field") ||
          qid(field)?.closest(".infl-pob-field");
        if (wrap) wrap.classList.add("is-invalid");
        const hint = qid(field + "-hint") || q(`#${field}-hint`);
        if (hint) {
          hint.hidden = false;
          hint.textContent = message;
        }
      });
      const banner = errEl();
      if (banner && summaryMessage) {
        banner.hidden = false;
        banner.textContent = summaryMessage;
      }
    }

    function renderProgressTracker(currentId) {
      const idx = STEP_NAV.findIndex((s) => s.id === currentId);
      const pct = idx >= 0 ? Math.round(((idx + 1) / STEP_NAV.length) * 100) : 33;
      const compact = currentId === 3;
      const labels = STEP_NAV.map((s, i) => {
        const cls = s.id < currentId ? "is-done" : s.id === currentId ? "is-active" : "";
        const dot = i < STEP_NAV.length - 1 ? '<span class="infl-pob-track-dot">·</span>' : "";
        return `<span class="${cls}">${esc(s.label)}</span>${dot}`;
      }).join("");
      return `
        <div class="infl-pob-track${compact ? " infl-pob-track--compact" : ""}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Onboarding progress">
          <div class="infl-pob-track-labels">${labels}</div>
          <div class="infl-pob-track-line"><span style="width:${pct}%"></span></div>
        </div>`;
    }

    function renderStepNav(currentId) {
      return renderProgressTracker(currentId);
    }

    function wireCollabCards(root) {
      root.querySelector("#infl-pob-collab-grid")?.addEventListener("click", (e) => {
        const card = e.target.closest("[data-collab]");
        if (!card) return;
        card.classList.toggle("is-active");
        const id = card.getAttribute("data-collab");
        const set = new Set(normalizeCollabIds(formData.collabTypes || []));
        if (card.classList.contains("is-active")) set.add(id);
        else set.delete(id);
        patchFormData({ collabTypes: [...set] });
        clearFieldError("infl-pob-collab-grid");
      });
    }

    function ensureCropModalStyle() {
      if (document.getElementById("infl-pob-crop-style")) return;
      const style = document.createElement("style");
      style.id = "infl-pob-crop-style";
      style.textContent = CROP_MODAL_CSS;
      document.head.appendChild(style);
    }

    function validatePhotoFile(file) {
      if (!file) return "No file selected.";
      const type = String(file.type || "").toLowerCase();
      if (!PHOTO_ALLOWED.includes(type)) return "Only JPG, PNG, or WEBP files allowed.";
      if (file.size > PHOTO_MAX_BYTES) return "File too large. Maximum size is 5 MB.";
      return null;
    }

    function openPhotoCropModal(file) {
      ensureCropModalStyle();
      return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);

          let scale = Math.max(PHOTO_CROP_VIEWPORT / img.width, PHOTO_CROP_VIEWPORT / img.height);
          let offsetX = 0;
          let offsetY = 0;
          let dragging = false;
          let lastX = 0;
          let lastY = 0;

          const modal = document.createElement("div");
          modal.className = "infl-pob-crop-modal";
          modal.innerHTML = `
            <div class="infl-pob-crop-backdrop"></div>
            <div class="infl-pob-crop-dialog" role="dialog" aria-modal="true" aria-label="Crop profile photo">
              <h3 class="infl-pob-crop-title">Crop profile photo</h3>
              <p class="infl-pob-crop-sub">Drag to reposition · use zoom to adjust</p>
              <div class="infl-pob-crop-viewport-wrap">
                <canvas class="infl-pob-crop-canvas" width="${PHOTO_CROP_VIEWPORT}" height="${PHOTO_CROP_VIEWPORT}"></canvas>
              </div>
              <label class="infl-pob-crop-zoom-label" for="infl-pob-crop-zoom">Zoom</label>
              <input type="range" id="infl-pob-crop-zoom" class="infl-pob-crop-zoom" min="100" max="300" value="100" />
              <div class="infl-pob-crop-actions">
                <button type="button" class="infl-pob-crop-btn infl-pob-crop-btn--ghost" data-cancel>Cancel</button>
                <button type="button" class="infl-pob-crop-btn infl-pob-crop-btn--primary" data-save>Use photo</button>
              </div>
            </div>`;

          document.body.appendChild(modal);
          const canvas = modal.querySelector(".infl-pob-crop-canvas");
          const ctx = canvas.getContext("2d");
          const zoom = modal.querySelector(".infl-pob-crop-zoom");
          const baseScale = scale;

          function cleanup() {
            modal.remove();
          }

          function draw() {
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(0, 0, PHOTO_CROP_VIEWPORT, PHOTO_CROP_VIEWPORT);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (PHOTO_CROP_VIEWPORT - w) / 2 + offsetX;
            const y = (PHOTO_CROP_VIEWPORT - h) / 2 + offsetY;
            ctx.drawImage(img, x, y, w, h);
            ctx.strokeStyle = "rgba(238, 62, 150, 0.85)";
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, PHOTO_CROP_VIEWPORT - 2, PHOTO_CROP_VIEWPORT - 2);
          }

          function exportCrop() {
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (PHOTO_CROP_VIEWPORT - w) / 2 + offsetX;
            const y = (PHOTO_CROP_VIEWPORT - h) / 2 + offsetY;
            const sx = Math.max(0, -x / scale);
            const sy = Math.max(0, -y / scale);
            const sSize = Math.min(img.width - sx, img.height - sy, PHOTO_CROP_VIEWPORT / scale);

            const out = document.createElement("canvas");
            out.width = PHOTO_MAX_OUTPUT;
            out.height = PHOTO_MAX_OUTPUT;
            const octx = out.getContext("2d");
            octx.drawImage(img, sx, sy, sSize, sSize, 0, 0, PHOTO_MAX_OUTPUT, PHOTO_MAX_OUTPUT);
            out.toBlob(
              (blob) => {
                cleanup();
                if (!blob) {
                  reject(new Error("Could not process image."));
                  return;
                }
                resolve(new File([blob], "profile.jpg", { type: "image/jpeg" }));
              },
              "image/jpeg",
              0.9
            );
          }

          function onPointerDown(e) {
            dragging = true;
            canvas.classList.add("is-dragging");
            lastX = e.clientX;
            lastY = e.clientY;
          }

          function onPointerMove(e) {
            if (!dragging) return;
            offsetX += e.clientX - lastX;
            offsetY += e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            draw();
          }

          function onPointerUp() {
            dragging = false;
            canvas.classList.remove("is-dragging");
          }

          canvas.addEventListener("mousedown", onPointerDown);
          window.addEventListener("mousemove", onPointerMove);
          window.addEventListener("mouseup", onPointerUp);
          canvas.addEventListener(
            "touchstart",
            (e) => {
              if (!e.touches[0]) return;
              onPointerDown(e.touches[0]);
            },
            { passive: true }
          );
          window.addEventListener(
            "touchmove",
            (e) => {
              if (!e.touches[0]) return;
              onPointerMove(e.touches[0]);
            },
            { passive: true }
          );
          window.addEventListener("touchend", onPointerUp);

          zoom.addEventListener("input", () => {
            scale = baseScale * (Number(zoom.value) / 100);
            draw();
          });

          modal.querySelector("[data-cancel]")?.addEventListener("click", () => {
            cleanup();
            reject(new Error("Crop cancelled."));
          });
          modal.querySelector(".infl-pob-crop-backdrop")?.addEventListener("click", () => {
            cleanup();
            reject(new Error("Crop cancelled."));
          });
          modal.querySelector("[data-save]")?.addEventListener("click", exportCrop);

          draw();
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not read image."));
        };
        img.src = objectUrl;
      });
    }

    async function processPhotoFile(file) {
      const err = validatePhotoFile(file);
      if (err) throw new Error(err);
      const cropped = await openPhotoCropModal(file);
      if (cropped.size > PHOTO_MAX_BYTES) {
        throw new Error("File too large after processing. Try a smaller image.");
      }
      return cropped;
    }

    function applyPhotoPreview(box, src, hasFile) {
      if (!box) return;
      let img = box.querySelector("img");
      const placeholderSvg = box.querySelector("svg");
      const placeholderSpan = box.querySelector(".infl-pob-photo-placeholder");
      if (src) {
        if (!img) {
          if (placeholderSvg) placeholderSvg.remove();
          if (placeholderSpan) placeholderSpan.remove();
          img = document.createElement("img");
          img.alt = "";
          const fileInput = box.querySelector("#infl-pob-photo-input");
          box.insertBefore(img, fileInput || null);
        }
        img.src = src;
        box.classList.add("infl-pob-photo--filled");
        if (!box.querySelector(".infl-pob-photo-overlay")) {
          const overlay = document.createElement("span");
          overlay.className = "infl-pob-photo-overlay";
          overlay.setAttribute("aria-hidden", "true");
          overlay.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2  2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>Change photo</span>';
          box.appendChild(overlay);
        }
      } else {
        box.classList.remove("infl-pob-photo--filled");
        box.querySelector(".infl-pob-photo-overlay")?.remove();
        img?.remove();
      }
      if (hasFile) box._photoFile = pendingPhotoFile;
    }

    function setPendingPhoto(file) {
      if (pendingPhotoPreviewUrl) URL.revokeObjectURL(pendingPhotoPreviewUrl);
      pendingPhotoFile = file;
      pendingPhotoPreviewUrl = file ? URL.createObjectURL(file) : null;
      if (file) clearFieldError("infl-pob-photo");
    }

    function showPhotoError(box, message) {
      const hint = box?.closest(".infl-pob-photo-field")?.querySelector(".infl-pob-photo-hint");
      if (!hint) return;
      hint.hidden = !message;
      hint.textContent = message || "";
      hint.classList.toggle("is-error", !!message);
    }

    function wirePhotoUpload(root, avatarUrl) {
      const box = root.querySelector("#infl-pob-photo");
      const input = root.querySelector("#infl-pob-photo-input");
      if (!box || !input) return;

      const openPicker = () => {
        input.value = "";
        input.click();
      };

      box.addEventListener("click", (e) => {
        e.preventDefault();
        if (e.target === input) return;
        openPicker();
      });
      box.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      });

      input.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        showPhotoError(box, "");
        try {
          const processed = await processPhotoFile(file);
          setPendingPhoto(processed);
          applyPhotoPreview(box, pendingPhotoPreviewUrl, true);
        } catch (e) {
          if (e?.message === "Crop cancelled.") return;
          showPhotoError(box, e?.message || "Could not process photo.");
        } finally {
          input.value = "";
        }
      });

      const previewSrc = pendingPhotoPreviewUrl || avatarUrl || "";
      if (previewSrc) {
        applyPhotoPreview(box, previewSrc, !!pendingPhotoFile);
      }
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read image file."));
        reader.readAsDataURL(file);
      });
    }

    async function uploadPhotoIfNeeded() {
      const file = pendingPhotoFile || q("#infl-pob-photo")?._photoFile;
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/influencer-profile/avatar", {
        method: "POST",
        credentials: "same-origin",
        headers: authHeaders(),
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not upload profile photo.");
      }
      const data = await res.json().catch(() => ({}));
      if (data.avatarUrl) {
        pendingPhotoFile = null;
        if (pendingPhotoPreviewUrl) {
          URL.revokeObjectURL(pendingPhotoPreviewUrl);
          pendingPhotoPreviewUrl = null;
        }
        try {
          const u = JSON.parse(localStorage.getItem("influnet_user") || "{}");
          localStorage.setItem("influnet_user", JSON.stringify({ ...u, avatarUrl: data.avatarUrl }));
        } catch (_) {}
      }
    }

    function buildSteps(data) {
      const p = { ...(data.profile || {}), ...formData };
      const nicheList = normalizeNiche(p.niche);
      const primaryCategory = nicheList[0] || "";
      const secondaryCategory =
        normalizeSecondaryCategories(p.secondaryCategories)[0] || nicheList[1] || "";
      const initState = resolveStateName(p.state) || p.state || "";
      const initCity = p.city || "";

      return [
        {
          id: 2,
          title: "Profile Details",
          subtitle: "Help brands know the person behind the content",
          render: () => {
            const langs = Array.isArray(p.languages) ? p.languages : [];
            const gender = p.gender || "";
            const previewSrc = pendingPhotoPreviewUrl || p.avatarUrl || "";
            const hasPreview = !!previewSrc;
            return `
            <div class="infl-pob-photo-field">
              <div class="infl-pob-profile-row infl-pob-profile-row--step2">
                <div class="infl-pob-photo${hasPreview ? " infl-pob-photo--filled" : ""}" id="infl-pob-photo" data-field-wrap="infl-pob-photo" tabindex="0" role="button" aria-label="Upload profile photo">
                  ${
                    hasPreview
                      ? `<img src="${esc(previewSrc)}" alt="" />`
                      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span class="infl-pob-photo-placeholder">Upload photo</span>`
                  }
                  ${
                    hasPreview
                      ? `<span class="infl-pob-photo-overlay" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>Change photo</span></span>`
                      : ""
                  }
                  <input type="file" id="infl-pob-photo-input" accept="image/jpeg,image/png,image/webp" hidden />
                </div>
                <div class="infl-pob-field" data-field-wrap="infl-pob-gender">
                  <label for="infl-pob-gender">Gender</label>
                  <select id="infl-pob-gender" class="infl-pob-select">
                    <option value="">Select gender</option>
                    ${GENDERS.map((g) => `<option value="${esc(g)}"${gender === g ? " selected" : ""}>${esc(g)}</option>`).join("")}
                  </select>
                  <p class="infl-pob-field-hint" id="infl-pob-gender-hint" hidden></p>
                </div>
              </div>
              <p class="infl-pob-field-hint infl-pob-photo-hint" id="infl-pob-photo-hint" hidden></p>
            </div>
            <div class="infl-pob-field" data-field-wrap="infl-pob-state">
              <label for="infl-pob-state">State / Province</label>
              <select id="infl-pob-state" class="infl-pob-select" aria-label="State">
                ${buildStateOptions(initState)}
              </select>
              <p class="infl-pob-field-hint" id="infl-pob-state-hint" hidden></p>
            </div>
            <div class="infl-pob-field" data-field-wrap="infl-pob-city">
              <label for="infl-pob-city">City</label>
              <select id="infl-pob-city" class="infl-pob-select" aria-label="City"${initState ? "" : " disabled"}>
                ${buildCityOptions(initState, initCity)}
              </select>
              <p class="infl-pob-field-hint" id="infl-pob-city-hint" hidden></p>
            </div>
            <div class="infl-pob-field" data-field-wrap="infl-pob-langs">
              <label>Languages (multi-select)</label>
              <div class="infl-pob-chips" id="infl-pob-langs">
                ${LANGS.map((l) => {
                  const active = langs.includes(l);
                  return `<button type="button" class="infl-pob-chip${active ? " is-active" : ""}" data-lang="${esc(l)}">${active ? '<span class="infl-pob-chip-check" aria-hidden="true">✓</span>' : ""}${esc(l)}</button>`;
                }).join("")}
              </div>
              <p class="infl-pob-field-hint" id="infl-pob-langs-hint" hidden></p>
            </div>`;
          },
          wire: (root) => {
            wireLocationDropdowns(root, p.state || "", p.city || "");
            wirePhotoUpload(root, p.avatarUrl || "");
            wireLanguageChips(root);
            root.querySelector("#infl-pob-state")?.addEventListener("change", () =>
              clearFieldError("infl-pob-state")
            );
            root.querySelector("#infl-pob-city")?.addEventListener("change", () =>
              clearFieldError("infl-pob-city")
            );
            root.querySelector("#infl-pob-gender")?.addEventListener("change", () =>
              clearFieldError("infl-pob-gender")
            );
          },
          collect: () => {
            const city = qid("infl-pob-city")?.value?.trim() || null;
            const state = qid("infl-pob-state")?.value?.trim() || null;
            return {
              gender: qid("infl-pob-gender")?.value?.trim() || null,
              state,
              city,
              languages: qAll("#infl-pob-langs .infl-pob-chip.is-active").map((b) =>
                b.getAttribute("data-lang")
              ),
              location: city && state ? `${city}, ${state}` : city || state || null,
            };
          },
        },
        {
          id: 3,
          title: "Creator & Social Platforms",
          subtitle: "Connect your social accounts and share your reach",
          render: () => `
            <div class="infl-pob-grid">
              <div class="infl-pob-field" data-field-wrap="infl-pob-primary-niche">
                <label for="infl-pob-primary-niche">Primary niche</label>
                <select id="infl-pob-primary-niche" class="infl-pob-select">${buildNicheOptions(primaryCategory, "Select niche")}</select>
                <p class="infl-pob-field-hint" id="infl-pob-primary-niche-hint" hidden></p>
              </div>
              <div class="infl-pob-field" data-field-wrap="infl-pob-secondary-niche">
                <label for="infl-pob-secondary-niche">Secondary niche (optional)</label>
                <select id="infl-pob-secondary-niche" class="infl-pob-select">${buildNicheOptions(secondaryCategory, "Optional")}</select>
              </div>
            </div>
            <div class="infl-pob-field" data-field-wrap="infl-pob-bio">
              <label for="infl-pob-bio">Bio / About</label>
              <textarea
                id="infl-pob-bio"
                class="infl-pob-textarea"
                rows="2"
                placeholder="Tell brands about your creative journey…"
                aria-describedby="infl-pob-bio-hint"
              >${esc(p.bio || "")}</textarea>
              <p class="infl-pob-field-hint" id="infl-pob-bio-hint" hidden></p>
            </div>
            <div class="infl-pob-social-block">
              <p class="infl-pob-label">Social platforms</p>
              <div class="infl-pob-social-list" id="infl-pob-social-list">
                ${buildSocialRowsHtml(p, extraSocialVisible)}
              </div>
            </div>`,
          wire: (root) => {
            wireNicheSelects(root);
            wireBioField(root);
            wireSocialPlatformRows(root);
          },
          collect: () => {
            const primaryVal = qid("infl-pob-primary-niche")?.value?.trim() || "";
            const secondaryVal = qid("infl-pob-secondary-niche")?.value?.trim() || "";
            return {
              niche: primaryVal ? [primaryVal] : [],
              secondaryCategories: secondaryVal && secondaryVal !== primaryVal ? [secondaryVal] : [],
              bio: qid("infl-pob-bio")?.value?.trim() || null,
              ...collectSocialHandles(),
            };
          },
        },
        {
          id: 4,
          title: "Collaboration Preferences",
          subtitle: "Set your terms and help brands find the perfect match",
          render: () => {
            const selected = normalizeCollabIds(formData.collabTypes || p.collabTypes || []);
            const selectedPriceRange = normalizePriceRangeId(formData.priceRange || p.priceRange || "");
            return `
              <div class="infl-pob-field" data-field-wrap="infl-pob-collab-grid">
                <label>Collaboration types</label>
                <div class="infl-pob-collab-grid" id="infl-pob-collab-grid">
                  ${COLLAB_TYPES.map((c) => {
                    const active = selected.includes(c.id);
                    return `<button type="button" class="infl-pob-collab-card${c.wide ? " is-wide" : ""}${active ? " is-active" : ""}" data-collab="${c.id}">
                      <span class="infl-pob-collab-icon">${c.icon}</span>
                      <span class="infl-pob-collab-copy">
                        <strong>${esc(c.label)}</strong>
                        <span>${esc(c.desc)}</span>
                      </span>
                    </button>`;
                  }).join("")}
                </div>
                <p class="infl-pob-field-hint" id="infl-pob-collab-grid-hint" hidden></p>
              </div>
              <div class="infl-pob-field" data-field-wrap="infl-pob-price">
                <label>Typical price range</label>
                <div class="infl-pob-price-grid" id="infl-pob-price">
                  ${PRICE_RANGES.map(
                    (pr) =>
                      `<label class="infl-pob-price-card${selectedPriceRange === pr.id ? " is-active" : ""}">
                        <input type="radio" name="priceRange" value="${pr.id}"${selectedPriceRange === pr.id ? " checked" : ""} />
                        <span class="infl-pob-price-copy">
                          <strong>${esc(pr.label)}</strong>
                          <span>${esc(pr.range)}</span>
                        </span>
                      </label>`
                  ).join("")}
                </div>
                <p class="infl-pob-field-hint" id="infl-pob-price-hint" hidden></p>
              </div>`;
          },
          wire: (root) => {
            wireCollabCards(root);
            root.querySelector("#infl-pob-price")?.addEventListener("change", () => {
              root.querySelectorAll("#infl-pob-price .infl-pob-price-card").forEach((el) => {
                el.classList.toggle("is-active", !!el.querySelector("input")?.checked);
              });
              clearFieldError("infl-pob-price");
            });
          },
          collect: () => ({
            collabTypes: qAll("#infl-pob-collab-grid .infl-pob-collab-card.is-active").map((b) =>
              b.getAttribute("data-collab")
            ),
            priceRange: q('#infl-pob-price input[name="priceRange"]:checked')?.value || null,
          }),
        },
      ];
    }

    function wireChips(root, sel, attr) {
      root.querySelector(sel)?.addEventListener("click", (e) => {
        const btn = e.target.closest(`[${attr}]`);
        if (!btn) return;
        btn.classList.toggle("is-active");
      });
    }

    function wireLanguageChips(root) {
      const wrap = root.querySelector("#infl-pob-langs");
      if (!wrap) return;
      wrap.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-lang]");
        if (!btn) return;
        btn.classList.toggle("is-active");
        const active = btn.classList.contains("is-active");
        let check = btn.querySelector(".infl-pob-chip-check");
        if (active && !check) {
          check = document.createElement("span");
          check.className = "infl-pob-chip-check";
          check.setAttribute("aria-hidden", "true");
          check.textContent = "✓";
          btn.insertBefore(check, btn.firstChild);
        } else if (!active && check) {
          check.remove();
        }
        clearFieldError("infl-pob-langs");
      });
    }

    function wireSingleChip(root, sel, attr) {
      root.querySelector(sel)?.addEventListener("click", (e) => {
        const btn = e.target.closest(`[${attr}]`);
        if (!btn) return;
        root.querySelectorAll(`${sel} [${attr}]`).forEach((el) => {
          el.classList.toggle("is-active", el === btn);
        });
      });
    }

    function setStep(updater) {
      const next = typeof updater === "function" ? updater(stepIndex) : Number(updater);
      stepIndex = Math.max(0, Math.min(steps.length - 1, Number(next) || 0));
    }

    function captureCurrentStepDraft() {
      const step = steps[stepIndex];
      if (!step?.collect) return;
      try {
        patchFormData(step.collect() || {});
      } catch (_) {}
    }

    function goPrevStep() {
      if (stepIndex <= 0) return;
      captureCurrentStepDraft();
      setStep((prev) => prev - 1);
      renderStep();
    }

    function renderStep() {
      if (!modalRoot || !steps.length) return;
      const step = steps[stepIndex];
      const showPrev = step.id > 2;
      const isLast = stepIndex === steps.length - 1;
      const isCompact = step.id === 3;
      modalRoot.innerHTML = `
        ${renderProgressTracker(step.id)}
        <div class="infl-pob-card" role="dialog" aria-modal="true" aria-labelledby="infl-pob-title">
          <form class="infl-pob-panel${isCompact ? " infl-pob-panel--compact" : ""}" id="infl-pob-form" novalidate>
            <div class="infl-pob-panel-scroll">
              <header class="infl-pob-head">
                <h2 id="infl-pob-title">${esc(step.title)}</h2>
                <p>${esc(step.subtitle)}</p>
              </header>
              <div id="infl-pob-body"${isCompact ? ' class="infl-pob-step-compact"' : ""}>${step.render()}</div>
              <p id="infl-pob-error" class="infl-pob-error" hidden role="alert"></p>
            </div>
            <footer class="infl-pob-btn-dock${showPrev ? "" : " infl-pob-btn-dock--solo"}">
              ${
                showPrev
                  ? '<button type="button" id="btn-back"><span aria-hidden="true">&lt;</span> Previous Step</button>'
                  : ""
              }
              <button type="button" id="btn-next">
                ${
                  isLast
                    ? '<span aria-hidden="true">✓</span> Complete Signup'
                    : 'Next Step <span aria-hidden="true">›</span>'
                }
              </button>
            </footer>
          </form>
        </div>`;
      const card = q(".infl-pob-card");
      step.wire?.(card || modalRoot);
      syncOnboardingState();
    }

    async function dismiss() {
      try {
        sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch (_) {}
      try {
        if (typeof window.influnetMarkOnboardingCompleted === "function") {
          await window.influnetMarkOnboardingCompleted();
        } else {
          await fetch("/api/profile/completion", {
            method: "PATCH",
            credentials: "same-origin",
            headers: authHeaders(),
            body: JSON.stringify({ markOnboardingCompleted: true }),
          });
        }
      } catch (_) {}
      clearForcedSetup();
      closeWizard();
    }

    function wantsForcedSetup() {
      try {
        return localStorage.getItem(FORCE_SETUP_KEY) === "1";
      } catch (_) {
        return false;
      }
    }

    function isSuppressedForProfileEditing() {
      try {
        const until =
          Number(sessionStorage.getItem(SUPPRESS_UNTIL_KEY) || 0) ||
          Number(localStorage.getItem(SUPPRESS_UNTIL_KEY) || 0);
        return until > Date.now();
      } catch (_) {
        return false;
      }
    }

    function isAccountSettingsActive() {
      return (
        !!document.getElementById("ias-app") ||
        document.body.classList.contains("infl-account-settings-active")
      );
    }

    function isSettingsNavActive() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return false;
      return [...nav.querySelectorAll(":scope > button")].some((b) => {
        const label = String(b.textContent || "")
          .replace(/\d+/g, "")
          .trim()
          .toLowerCase();
        if (!label.includes("settings")) return false;
        return b.classList.contains("bg-violet-100") || /\bbg-violet-100\b/.test(b.className);
      });
    }

    function clearForcedSetup() {
      try {
        localStorage.removeItem(FORCE_SETUP_KEY);
      } catch (_) {}
    }

    function closeWizard() {
      open = false;
      document.body.classList.remove("infl-pob-open");
      shadowHost?.remove();
      shadowHost = null;
      modalRoot = null;
    }

    function finishWizard() {
      clearPersistedFormData();
      clearForcedSetup();
      extraSocialVisible = new Set();
      closeWizard();
    }

    /** Final step — persist full profile and release dashboard lock. */
    async function submitData(mergedPayload) {
      const res = await fetch("/api/profile/completion", {
        method: "PATCH",
        credentials: "same-origin",
        headers: authHeaders(),
        body: JSON.stringify({ ...mergedPayload, finalizeProgressiveOnboarding: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not complete signup");
      if (data.profile || data.user) {
        const u = JSON.parse(localStorage.getItem("influnet_user") || "{}");
        localStorage.setItem(
          "influnet_user",
          JSON.stringify({ ...u, ...(data.profile || data.user), onboardingCompleted: true })
        );
      }
      if (typeof window.influnetMarkOnboardingCompleted === "function") {
        await window.influnetMarkOnboardingCompleted();
      }
      window.dispatchEvent(
        new CustomEvent("influnet-profile-updated", { detail: data.completion || data })
      );
      window.dispatchEvent(new CustomEvent("influnet-onboarding-completed"));
      finishWizard();
    }

    async function saveStep() {
      const step = steps[stepIndex];
      const btn = qid("btn-next");
      if (!step || !btn) return;
      btn.disabled = true;
      clearFieldErrors();
      try {
        const payload = step.collect();
        patchFormData(payload || {});
        const mergedPayload = buildFullPayload();
        const validation = validateStep(step.id, mergedPayload);
        if (!validation.ok) {
          flashFieldErrors(validation.errors, "Please fix the highlighted fields to continue.");
          return;
        }
        if (step.id === 2) {
          await uploadPhotoIfNeeded();
        }
        if (step.id === 4) {
          await submitData(mergedPayload);
          return;
        }
        const res = await fetch("/api/profile/completion", {
          method: "PATCH",
          credentials: "same-origin",
          headers: authHeaders(),
          body: JSON.stringify(mergedPayload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not save");
        if (data.profile || data.user) {
          const u = JSON.parse(localStorage.getItem("influnet_user") || "{}");
          localStorage.setItem(
            "influnet_user",
            JSON.stringify({ ...u, ...(data.profile || data.user) })
          );
          initFormData({ ...formData, ...(data.profile || data.user) }, null);
        }
        window.dispatchEvent(
          new CustomEvent("influnet-profile-updated", { detail: data.completion || data })
        );
        if (data.completion?.isProfileComplete || data.completion?.onboardingCompleted) {
          finishWizard();
          return;
        }
        const completedStepId = step.id;
        stepIndex += 1;
        if (stepIndex >= steps.length) {
          finishWizard();
          return;
        }
        const fresh = await fetchCompletion();
        if (fresh) {
          profile = fresh.profile || profile;
          initFormData({ ...profile, ...formData }, null);
          steps = buildSteps(fresh);
          const targetStepId = completedStepId + 1;
          const idx = steps.findIndex((s) => s.id === targetStepId);
          stepIndex = idx >= 0 ? idx : Math.min(stepIndex, Math.max(0, steps.length - 1));
        }
        renderStep();
      } catch (err) {
        const banner = errEl();
        if (banner) {
          banner.hidden = false;
          banner.textContent = err.message || "Save failed";
        }
      } finally {
        btn.disabled = false;
      }
    }

    function needsProgressiveOnboarding(completion) {
      if (!completion) return false;
      if (completion.onboardingCompleted === true) return false;
      const step = Number(completion.onboardingStep) || 2;
      // Once users reach onboarding step 5, never auto-open this wizard again.
      // They should edit profile details from Account/Profile screens instead.
      return step < 5;
    }

    function isEditProfilePage() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path === "/dashboard/settings" || path === "/dashboard/profile") return true;
      if (path !== "/dashboard/influencer") return false;
      if (document.getElementById("influnet-profile-photo-card")) return true;
      if (document.querySelector("h1")?.textContent?.trim() === "Edit Profile") return true;
      return false;
    }

    async function maybeOpen() {
      if (!isInfluencerDashboardArea() || open || openingInProgress) return;
      openingInProgress = true;
      try {
      if (isAccountSettingsActive() || isSettingsNavActive() || isEditProfilePage()) return;
      if (!localStorage.getItem("influnet_token")) return;
      try {
        if (typeof window.influnetEnsureOnboardingGate === "function") {
          await window.influnetEnsureOnboardingGate();
        }
        if (window.influnetIsOnboardingCompleted?.()) return;
      } catch (_) {}
      try {
        const user = JSON.parse(localStorage.getItem("influnet_user") || "null");
        if (user?.onboardingCompleted === true) return;
        if (user?.role && user.role !== "influencer") return;
      } catch (_) {}
      const forced = wantsForcedSetup();
      if (!forced && isSuppressedForProfileEditing()) return;
      if (!forced) {
        try {
          const dismissed = Number(sessionStorage.getItem(DISMISS_KEY) || 0);
          if (dismissed && Date.now() - dismissed < 1000 * 60 * 60 * 2) return;
        } catch (_) {}
      }

      let data = await fetchCompletion();
      if (!data?.completion || data.role !== "influencer") {
        if (!forced) return;
        data = {
          role: "influencer",
          profile: {},
          completion: { onboardingStep: 2, isProfileComplete: false, onboardingCompleted: false },
        };
      } else if (data.completion?.onboardingCompleted === true || data.profile?.onboardingCompleted === true) {
        clearForcedSetup();
        return;
      } else if (!forced && !needsProgressiveOnboarding(data.completion)) {
        return;
      } else if (forced && !needsProgressiveOnboarding(data.completion)) {
        data = {
          ...data,
          completion: {
            ...data.completion,
            onboardingStep: 2,
            isProfileComplete: false,
          },
        };
      }

      profile = data.profile || {};
      initFormData(profile, loadPersistedFormData());
      syncExtraSocialFromProfile(profile);
      steps = buildSteps(data);
      if (!steps.length) return;

      const requestedStep = Math.max(2, Math.min(4, Number(data?.completion?.onboardingStep) || 2));
      const initialIndex = steps.findIndex((s) => s.id === requestedStep);
      stepIndex = initialIndex >= 0 ? initialIndex : 0;
      open = true;

      const fromTransition = await runEntryTransitionIfNeeded();
      document.body.classList.add("infl-pob-open");
      mountModalShell();
      renderStep();
      revealWizardShell(fromTransition);
      console.info("[influnet] progressive onboarding opened at step", steps[stepIndex]?.id);
      } finally {
        if (!open) openingInProgress = false;
      }
    }

    window.influnetOpenProgressiveOnboarding = maybeOpen;
    window.influnetCloseProgressiveOnboarding = closeWizard;
    window.influnetValidateOnboardingStep = validateStep;
    window.influnetSubmitOnboarding = submitData;
    window.influnetExtractSocialUsername = extractUsername;

    function scheduleOpen(delayMs) {
      window.setTimeout(maybeOpen, delayMs);
    }

    function bootProgressiveOnboarding() {
      if (!isInfluencerDashboardArea()) return;
      scheduleOpen(300);
      scheduleOpen(1200);
      scheduleOpen(2500);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootProgressiveOnboarding);
    } else {
      bootProgressiveOnboarding();
    }
    window.addEventListener("load", () => scheduleOpen(900));
    window.addEventListener("influnet-user-updated", () => scheduleOpen(500));
    window.addEventListener("influnet-profile-updated", () => scheduleOpen(400));
  } catch (e) {
    console.warn("[influnet] progressive onboarding:", e);
  }
})();
