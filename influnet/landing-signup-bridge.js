/**
 * After landing Step 1, finish phone OTP + register, then open dashboard onboarding.
 */
(function () {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") !== "landing") return;
    if ((window.location.pathname.replace(/\/$/, "") || "/") !== "/signup/influencer") return;

    const DRAFT_KEY = "influnet_influencer_signup_draft";

    function readDraft() {
      try {
        return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      } catch {
        return null;
      }
    }

    function prefillFromDraft() {
      const draft = readDraft();
      if (!draft) return;
      const set = (sel, val) => {
        const el = document.querySelector(sel);
        if (el && val != null) {
          el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };
      set('input[placeholder="First name"]', draft.firstName);
      set('input[placeholder="Last name"]', draft.lastName);
      set('input[type="email"]', draft.email);
      set(".infl-phone-local, input[type='tel']", draft.phone);
      set("#influnet-signup-username, input[name='username']", draft.username);
      set('input[placeholder="Create a strong password"]', draft.password);
    }

    const origFetch = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      const url = typeof input === "string" ? input : input?.url || "";
      if (url.includes("/api/auth/register") && init?.method === "POST") {
        const draft = readDraft();
        if (draft) {
          try {
            const body = JSON.parse(init.body || "{}");
            init.body = JSON.stringify({ ...draft, ...body, role: "influencer" });
          } catch (_) {}
        }
      }
      const res = await origFetch(input, init);
      if (url.includes("/api/auth/register") && res.ok) {
        sessionStorage.removeItem(DRAFT_KEY);
        window.setTimeout(() => {
          window.location.href = "/dashboard/influencer";
        }, 400);
      }
      return res;
    };

    prefillFromDraft();
    window.setInterval(prefillFromDraft, 800);
  } catch (e) {
    console.warn("[influnet] landing signup bridge:", e);
  }
})();
