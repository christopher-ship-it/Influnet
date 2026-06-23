/**
 * Persist all influencer signup fields to the API on register
 * (the bundled signup UI collects more than it sends by default).
 */
(function () {
  try {
    const DRAFT_KEY = "influnet_influencer_signup_draft";

    function isSignupPage() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/influencer";
    }

    function loadDraft() {
      try {
        return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
      } catch {
        return {};
      }
    }

    function saveDraft(draft) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }

    function val(sel) {
      return document.querySelector(sel)?.value?.trim() || "";
    }

    function captureDraft() {
      if (!isSignupPage()) return;
      const draft = loadDraft();

      const first = val('input[placeholder="First name"]');
      const last = val('input[placeholder="Last name"]');
      if (first || last) draft.name = `${first} ${last}`.trim();

      const email = val('input[placeholder="you@example.com"]');
      if (email) draft.email = email;

      const phone =
        val("input.infl-phone-local") ||
        val('input[placeholder="98765 43210"]') ||
        val('input[placeholder="+91 98765 43210"]');
      if (phone) {
        const digits = phone.replace(/\D/g, "").slice(-10);
        draft.phone = digits.length === 10 ? `+91 ${digits}` : phone;
        draft.phoneLocal = digits.length === 10 ? digits : "";
      }

      const otp = window.influnetPhoneOtp;
      if (otp?.isSignupVerified?.()) {
        draft.phoneVerified = true;
        draft.phone = otp.getVerifiedPhone() || draft.phone;
        draft.phoneLocal = otp.getPhoneLocal() || draft.phoneLocal;
        draft.phoneVerificationToken = otp.getVerificationToken() || null;
      }

      const city =
        document.querySelector("[data-isd-city] .isd-city-select")?.value?.trim() ||
        document.querySelector("[data-isd-city] .isd-combo-input")?.value?.trim() ||
        val('input[placeholder="e.g. Mumbai"]');
      if (city) draft.city = city;

      const genderSel = document.querySelector("select");
      if (genderSel?.value) draft.gender = genderSel.value;

      const stateVal =
        window.influnetSignupLocation?.getState?.() ||
        document.querySelector("[data-isd-state] .isd-combo-input")?.value?.trim() ||
        val('input[placeholder="e.g. Tamil Nadu"]');
      const stateSelect =
        document.querySelector("[data-isd-state] .isd-combo-input") ||
        document.querySelector("select.influnet-state-select");
      if (stateVal) draft.state = stateVal;
      else if (stateSelect?.value) draft.state = stateSelect.value;

      if (city && draft.state) draft.location = `${city}, ${draft.state}`;
      else if (city) draft.location = city;

      const langs = [...document.querySelectorAll(".rounded-full.text-xs.font-medium.border")]
        .filter((b) => b.className.includes("bg-primary"))
        .map((b) => b.textContent.replace("✓", "").trim())
        .filter(Boolean);
      if (langs.length) draft.languages = langs;

      const bio = document.querySelector("textarea")?.value?.trim();
      if (bio) draft.bio = bio;

      const nicheSelects = [...document.querySelectorAll("select")].filter((s) =>
        [...s.options].some((o) => o.text === "Fashion & Beauty")
      );
      if (nicheSelects[0]?.value) draft.niche = [nicheSelects[0].value, nicheSelects[1]?.value].filter(Boolean);

      const username =
        window.influnetSignupUsername?.getValue?.() ||
        document.getElementById("infl-signup-username-input")?.value?.trim().toLowerCase() ||
        "";
      if (username) draft.username = username.replace(/\s+/g, "");

      const social = {};
      const normalizeSocial = (platform, raw) => {
        const trimmed = String(raw || "").trim();
        if (!trimmed) return null;
        const fromDataset =
          typeof window.influnetSignupSocial?.normalizeValue === "function"
            ? window.influnetSignupSocial.normalizeValue(platform, trimmed)
            : null;
        if (fromDataset) return fromDataset;
        const soc = window.INFLUNET_SOCIAL;
        if (soc?.normalizeForStorage) return soc.normalizeForStorage(platform, trimmed);
        return trimmed;
      };

      document.querySelectorAll(".flex.items-center.gap-3").forEach((row) => {
        const label = row.querySelector("span.text-xs.font-semibold")?.textContent?.trim();
        const input = row.querySelector("input");
        if (!label || !input?.value?.trim()) return;
        const canonical = input.dataset.inflSocialUrl;
        const v = canonical || input.value.trim();
        if (label === "Instagram") social.instagramHandle = normalizeSocial("instagram", v);
        if (label === "Facebook") social.facebookHandle = normalizeSocial("facebook", v);
        if (label === "YouTube") social.youtubeHandle = normalizeSocial("youtube", v);
        if (label === "LinkedIn") social.linkedinHandle = normalizeSocial("linkedin", v);
        if (label === "TikTok") social.tiktokHandle = normalizeSocial("tiktok", v);
        if (label.includes("Twitter")) social.twitterHandle = normalizeSocial("twitter", v);
      });
      Object.assign(draft, social);

      const collabs = [...document.querySelectorAll("button.rounded-xl.border.p-4")]
        .filter((b) => b.className.includes("border-primary"))
        .map((b) => b.querySelector(".text-sm.font-semibold")?.textContent?.trim())
        .filter(Boolean);
      if (collabs.length) {
        const map = {
          Reel: "reel", Story: "story", Post: "post",
          "YouTube Video": "yt", "Event Appearance": "event",
        };
        draft.collabTypes = collabs.map((l) => map[l]).filter(Boolean);
      }

      const priceBtns = [...document.querySelectorAll("button.rounded-xl.border.p-3")];
      const priceBtn = priceBtns.find((b) => b.className.includes("border-primary"));
      if (priceBtn) {
        const label = priceBtn.querySelector(".text-sm.font-semibold")?.textContent?.trim();
        const tierText = priceBtn.querySelector(".text-\\[10px\\]")?.textContent?.trim().toLowerCase();
        const labelMap = { Entry: "entry", Standard: "standard", Premium: "premium", Pro: "pro" };
        if (labelMap[label]) {
          draft.priceRange = labelMap[label];
        } else if (["entry", "standard", "premium", "pro"].includes(tierText)) {
          draft.priceRange = tierText;
        } else if (tierText?.includes("1k")) {
          draft.priceRange = "entry";
        } else if (tierText?.includes("5k") && tierText?.includes("10k")) {
          draft.priceRange = "standard";
        } else if (tierText?.includes("10k") && tierText?.includes("25k")) {
          draft.priceRange = "premium";
        } else if (tierText?.includes("25k")) {
          draft.priceRange = "pro";
        }
      }

      saveDraft(draft);
    }

    function hookRegister() {
      if (window.__inflSignupPersistHooked) return;
      window.__inflSignupPersistHooked = true;
      const prev = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        const url = typeof input === "string" ? input : input?.url || "";
        let newInit = init;
        if (url.includes("/api/auth/register") && init?.body && typeof init.body === "string") {
          try {
            const body = JSON.parse(init.body);
            const draft = loadDraft();
            const merged = {
              ...body,
              bio: body.bio || draft.bio || null,
              niche: body.niche?.length ? body.niche : draft.niche || null,
              instagramHandle: body.instagramHandle || draft.instagramHandle || null,
              youtubeHandle: body.youtubeHandle || draft.youtubeHandle || null,
              gender: body.gender || draft.gender || null,
              facebookHandle: body.facebookHandle || draft.facebookHandle || null,
              linkedinHandle: body.linkedinHandle || draft.linkedinHandle || null,
              tiktokHandle: body.tiktokHandle || draft.tiktokHandle || null,
              city: body.city || draft.city || null,
              state: body.state || draft.state || null,
              location: body.location || draft.location || null,
              languages: body.languages?.length ? body.languages : draft.languages || [],
              collabTypes: body.collabTypes?.length ? body.collabTypes : draft.collabTypes || [],
              priceRange: body.priceRange || draft.priceRange || null,
            };
            merged.username = body.username || draft.username || null;
            if (!body.twitterHandle && draft.twitterHandle) {
              merged.twitterHandle = draft.twitterHandle;
            }
            if (draft.phoneVerified && draft.phoneVerificationToken) {
              merged.phone = draft.phone || body.phone || null;
              merged.phoneVerificationToken = draft.phoneVerificationToken;
            }
            newInit = { ...init, body: JSON.stringify(merged) };
          } catch {
            /* keep original body */
          }
        }
        const response = await prev(input, newInit);
        if (
          url.includes("/api/auth/register") &&
          response?.ok &&
          isSignupPage()
        ) {
          sessionStorage.removeItem(DRAFT_KEY);
        }
        return response;
      };
    }

    hookRegister();
    document.addEventListener(
      "click",
      (e) => {
        const btn = e.target.closest("button");
        if (btn?.textContent?.includes("Complete Signup")) captureDraft();
      },
      true
    );
    setInterval(captureDraft, 800);
  } catch (e) {
    console.warn("[influnet] influencer-signup-persist:", e);
  }
})();
