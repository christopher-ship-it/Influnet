/**
 * Business signup — optional Influnet username (public URL) with live availability.
 */
(function () {
  try {
    const ROOT_ID = "infl-biz-signup-username-root";
    const INPUT_ID = "infl-biz-signup-username-input";

    function isSignupPage() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/business";
    }

    function normalizeUsername(raw) {
      return String(raw || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._]/g, "");
    }

    function isValidFormat(u) {
      return /^[a-z0-9][a-z0-9._]{2,29}$/.test(u);
    }

    function findAnchor() {
      const company = document.querySelector('input[placeholder="e.g. Creative Flow India"]');
      return company?.closest("div")?.parentElement || company?.parentElement;
    }

    function ensureField() {
      if (!isSignupPage()) return;
      if (document.getElementById(ROOT_ID)) return;
      const anchor = findAnchor();
      if (!anchor) return;

      const wrap = document.createElement("div");
      wrap.id = ROOT_ID;
      wrap.className = "infl-signup-username-wrap";
      wrap.innerHTML = `
        <label class="infl-signup-username-label" for="${INPUT_ID}">
          Business Username <span class="text-gray-500 font-normal">(optional now)</span>
        </label>
        <p class="infl-signup-username-hint">Public URL: influnet/<strong class="infl-biz-username-preview">yourbrand</strong></p>
        <div class="infl-signup-username-row">
          <span class="infl-signup-username-at">@</span>
          <input type="text" id="${INPUT_ID}" autocomplete="username" maxlength="30"
            placeholder="nexusapparel" spellcheck="false" />
        </div>
        <p class="infl-signup-username-status" data-biz-status aria-live="polite"></p>
        <ul class="infl-signup-username-suggestions" data-biz-suggestions hidden></ul>
      `;
      anchor.parentElement?.insertBefore(wrap, anchor.nextSibling);

      document.getElementById(INPUT_ID)?.addEventListener("input", (e) => {
        const u = normalizeUsername(e.target.value);
        if (e.target.value !== u) e.target.value = u;
        const preview = document.querySelector(".infl-biz-username-preview");
        if (preview) preview.textContent = u || "yourbrand";
        scheduleCheck(u);
      });
    }

    let checkTimer = 0;
    let lastChecked = "";

    function setStatus(kind, text) {
      const el = document.querySelector("[data-biz-status]");
      if (!el) return;
      el.className = `infl-signup-username-status ${kind || ""}`;
      el.textContent = text || "";
    }

    function scheduleCheck(u) {
      clearTimeout(checkTimer);
      if (!u) {
        setStatus("", "");
        return;
      }
      if (!isValidFormat(u)) {
        setStatus("err", "Use 3–30 characters: a-z, 0-9, underscore, dot.");
        return;
      }
      checkTimer = window.setTimeout(() => checkAvailability(u), 350);
    }

    async function checkAvailability(u) {
      if (u !== normalizeUsername(document.getElementById(INPUT_ID)?.value)) return;
      lastChecked = u;
      setStatus("pending", "Checking availability…");
      try {
        const res = await fetch(
          `/api/business-profile/username/check?username=${encodeURIComponent(u)}`,
          { credentials: "same-origin" }
        );
        const data = await res.json();
        if (lastChecked !== u) return;
        if (data.available) {
          setStatus("ok", "✓ Username available");
        } else {
          setStatus("err", "✗ Username already taken");
        }
      } catch {
        setStatus("", "");
      }
    }

    setInterval(ensureField, 800);
    window.addEventListener("load", ensureField);
  } catch (e) {
    console.warn("[influnet] business-signup-username:", e);
  }
})();
