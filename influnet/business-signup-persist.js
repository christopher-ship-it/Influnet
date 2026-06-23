/**
 * Persist all business signup fields to the register API payload.
 */
(function () {
  try {
    const DRAFT_KEY = "influnet_business_signup_draft";

    function isSignupPage() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/business";
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

    function selectedOption(selectEl) {
      if (!selectEl?.value) return "";
      const opt = selectEl.options[selectEl.selectedIndex];
      return opt?.textContent?.trim() || selectEl.value;
    }

    function captureDraft() {
      if (!isSignupPage()) return;
      const draft = loadDraft();

      const fullName = val('input[placeholder="e.g. Rahul Sharma"]');
      if (fullName) draft.name = fullName;

      const company = val('input[placeholder="e.g. Creative Flow India"]');
      if (company) draft.companyName = company;

      const email = val('input[placeholder="rahul@business.in"]');
      if (email) draft.email = email;

      const phone =
        val("input.infl-phone-local") ||
        val('input[placeholder="98765 43210"]') ||
        val('input[placeholder="+91 98765 43210"]');
      if (phone) {
        const digits = phone.replace(/\D/g, "").slice(-10);
        draft.phone = digits.length === 10 ? `+91 ${digits}` : phone;
      }

      const selects = [...document.querySelectorAll("select")];
      const typeSel = selects.find((s) =>
        [...s.options].some((o) => o.textContent === "Startup")
      );
      const indSel = selects.find((s) =>
        [...s.options].some((o) => o.textContent === "Fashion & Apparel")
      );
      const budgetSel = selects.find((s) =>
        [...s.options].some((o) => {
          const t = (o.textContent || "").trim();
          return t === "Select a range..." || t === "Select a range…";
        })
      );

      if (typeSel?.value) draft.businessType = selectedOption(typeSel);
      if (indSel?.value) draft.industry = selectedOption(indSel);
      if (budgetSel?.value) draft.marketingBudget = selectedOption(budgetSel);

      const website = val('input[placeholder="https://example.com"]');
      if (website) draft.website = website;

      const gst = val('input[placeholder="22AAAAA0000A1Z5"]');
      if (gst) draft.gstNumber = gst;

      const city = val('input[placeholder="e.g. Mumbai"]');
      if (city) draft.city = city;

      const state = val('input[placeholder="e.g. Tamil Nadu"]');
      if (state) draft.state = state;

      if (city && draft.state) draft.location = `${city}, ${draft.state}`;
      else if (city) draft.location = city;

      const address = document.querySelector(
        'textarea[placeholder*="registered business address"]'
      );
      if (address?.value?.trim()) draft.registeredAddress = address.value.trim();

      document.querySelectorAll('input[placeholder="Instagram username"]').forEach((inp) => {
        if (inp.value?.trim()) draft.instagramHandle = inp.value.trim();
      });
      document.querySelectorAll('input[placeholder="Facebook page URL"]').forEach((inp) => {
        if (inp.value?.trim()) draft.facebookHandle = inp.value.trim();
      });
      document.querySelectorAll('input[placeholder="LinkedIn company profile"]').forEach((inp) => {
        if (inp.value?.trim()) draft.linkedinHandle = inp.value.trim();
      });

      const collabIds = [...document.querySelectorAll("button.rounded-xl.border.p-3\\.5, button.rounded-xl.border.p-3")]
        .filter((b) => b.className.includes("border-primary"))
        .map((b) => {
          const label = b.querySelector(".text-sm.font-semibold")?.textContent?.trim();
          const map = {
            Influencers: "influencers",
            "Brand Ambassadors": "brand_ambassadors",
            "Content Creators": "content_creators",
            "Event Partners": "event_partners",
          };
          return map[label] || label?.toLowerCase().replace(/\s+/g, "_");
        })
        .filter(Boolean);
      if (collabIds.length) draft.collabPreferences = collabIds;

      const usernameInput = document.getElementById("infl-biz-signup-username-input");
      if (usernameInput?.value?.trim()) {
        draft.businessUsername = usernameInput.value.trim().toLowerCase();
      }

      saveDraft(draft);
    }

    function hookRegister() {
      if (window.__inflBusinessSignupPersistHooked) return;
      window.__inflBusinessSignupPersistHooked = true;
      const prev = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        const url = typeof input === "string" ? input : input?.url || "";
        let newInit = init;
        if (url.includes("/api/auth/register") && init?.body && typeof init.body === "string") {
          try {
            const body = JSON.parse(init.body);
            if (body.role === "business_owner") {
              const draft = loadDraft();
              const merged = {
                ...body,
                businessType: body.businessType || draft.businessType || null,
                marketingBudget: body.marketingBudget || draft.marketingBudget || null,
                registeredAddress: body.registeredAddress || draft.registeredAddress || null,
                city: body.city || draft.city || null,
                state: body.state || draft.state || null,
                location: body.location || draft.location || null,
                instagramHandle: body.instagramHandle || draft.instagramHandle || null,
                facebookHandle: body.facebookHandle || draft.facebookHandle || null,
                linkedinHandle: body.linkedinHandle || draft.linkedinHandle || null,
                collabPreferences: body.collabPreferences?.length
                  ? body.collabPreferences
                  : draft.collabPreferences?.length
                    ? draft.collabPreferences
                    : body.collabPreferences,
                businessUsername:
                  body.businessUsername || draft.businessUsername || body.username || null,
              };
              newInit = { ...init, body: JSON.stringify(merged) };
              sessionStorage.removeItem(DRAFT_KEY);
            }
          } catch {
            /* keep original */
          }
        }
        return prev(input, newInit);
      };
    }

    hookRegister();
    setInterval(captureDraft, 800);
  } catch (e) {
    console.warn("[influnet] business-signup-persist:", e);
  }
})();
