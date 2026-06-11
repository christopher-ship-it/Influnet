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

      const phone = val('input[placeholder="+91 98765 43210"]');
      if (phone) draft.phone = phone;

      const city = val('input[placeholder="e.g. Mumbai"]');
      if (city) draft.city = city;

      const genderSel = document.querySelector("select");
      if (genderSel?.value) draft.gender = genderSel.value;

      const stateInput = val('input[placeholder="e.g. Tamil Nadu"]');
      const stateSelect = document.querySelector("select.influnet-state-select");
      if (stateSelect?.value) draft.state = stateSelect.value;
      else if (stateInput) draft.state = stateInput;

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

      const social = {};
      document.querySelectorAll(".flex.items-center.gap-3.bg-\\[\\#1a1a2a\\]").forEach((row) => {
        const label = row.querySelector("span.text-xs.font-semibold")?.textContent?.trim();
        const input = row.querySelector("input");
        if (!label || !input?.value?.trim()) return;
        const v = input.value.trim();
        if (label === "Instagram") social.instagramHandle = v;
        if (label === "Facebook") social.facebookHandle = v;
        if (label === "YouTube") social.youtubeHandle = v;
        if (label === "LinkedIn") social.linkedinHandle = v;
        if (label === "TikTok") social.tiktokHandle = v;
        if (label.includes("Twitter")) social.twitterHandle = v;
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

      const priceBtn = document.querySelector("button.rounded-xl.border.p-3.border-primary");
      if (priceBtn) {
        const tier = priceBtn.querySelector(".text-\\[10px\\]")?.textContent?.trim().toLowerCase();
        if (tier) draft.priceRange = tier;
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
              gender: body.gender || draft.gender || null,
              facebookHandle: body.facebookHandle || draft.facebookHandle || null,
              linkedinHandle: body.linkedinHandle || draft.linkedinHandle || null,
              tiktokHandle: body.tiktokHandle || draft.tiktokHandle || null,
              city: draft.city || null,
              state: draft.state || null,
              location: body.location || draft.location || null,
              languages: draft.languages || [],
              collabTypes: draft.collabTypes || [],
              priceRange: draft.priceRange || null,
            };
            if (!body.twitterHandle && draft.twitterHandle) {
              merged.twitterHandle = draft.twitterHandle;
            }
            newInit = { ...init, body: JSON.stringify(merged) };
            sessionStorage.removeItem(DRAFT_KEY);
          } catch {
            /* keep original body */
          }
        }
        return prev(input, newInit);
      };
    }

    hookRegister();
    setInterval(captureDraft, 800);
  } catch (e) {
    console.warn("[influnet] influencer-signup-persist:", e);
  }
})();
