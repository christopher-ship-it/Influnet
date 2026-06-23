/**
 * Influencer signup — mandatory Influnet profile name with live availability.
 */
(function () {
  try {
    const ROOT_ID = "infl-signup-username-root";
    const INPUT_ID = "infl-signup-username-input";
    const DRAFT_KEY = "influnet_influencer_signup_draft";
    let checkTimer = 0;
    let lastChecked = "";
    let signupUsernameCache = "";

    function rememberUsername(raw) {
      const u = normalizeUsername(raw);
      if (isValidFormat(u)) signupUsernameCache = u;
      return u;
    }

    function isSignupPage() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/influencer";
    }

    function normalizeUsername(raw) {
      return String(raw || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
    }

    function isValidFormat(u) {
      return /^[a-z0-9][a-z0-9._]{3,29}$/.test(u);
    }

    function isAccountStep() {
      return [...document.querySelectorAll("h2")].some((h) =>
        /create your influencer account|complete your registration/i.test(h.textContent.trim())
      );
    }

    function isProfileDetailsStep() {
      return [...document.querySelectorAll("h2")].some(
        (h) => h.textContent.trim() === "Profile Details"
      );
    }

    function shouldShowUsername() {
      return isAccountStep();
    }

    function hasSavedUsername() {
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
        return isValidFormat(draft.username || "");
      } catch {
        return false;
      }
    }

    function hideUsernameField() {
      const root = document.getElementById(ROOT_ID);
      if (root) root.style.display = "none";
    }

    function showUsernameField() {
      const root = document.getElementById(ROOT_ID);
      if (root) root.style.display = "block";
    }

    function findSignupCard(h2Matcher) {
      const h = [...document.querySelectorAll("h2")].find((el) =>
        typeof h2Matcher === "function"
          ? h2Matcher(el.textContent.trim())
          : h2Matcher.test(el.textContent.trim())
      );
      if (!h) return null;
      return (
        h.closest(".max-w-xl") ||
        h.closest(".max-w-lg") ||
        h.closest(".rounded-2xl") ||
        h.closest("[class*='rounded-2xl']") ||
        h.parentElement?.parentElement
      );
    }

    function findProfileStepRoot() {
      const card = findSignupCard((t) => t === "Profile Details");
      return card?.querySelector(".space-y-5") || null;
    }

    function findAccountStepRoot() {
      const card = findSignupCard((t) =>
        /create your influencer account|complete your registration/i.test(t)
      );
      return card?.querySelector(".space-y-4") || null;
    }

    function isFieldMounted() {
      const el = document.getElementById(ROOT_ID);
      return !!(el && el.isConnected);
    }

    function mountPoint() {
      if (isAccountStep()) {
        const root = findAccountStepRoot();
        if (!root) return null;
        // Mount as sibling AFTER React's .space-y-4 so re-renders don't remove the field.
        return { mode: "after", el: root };
      }
      if (isProfileDetailsStep()) {
        const root = findProfileStepRoot();
        if (!root) return null;
        return { mode: "after", el: root };
      }
      return null;
    }

    function insertField(wrap) {
      const point = mountPoint();
      if (!point?.el) return false;
      if (point.mode === "after") point.el.after(wrap);
      else if (point.mode === "before") point.el.before(wrap);
      else point.el.insertBefore(wrap, point.el.firstChild);
      return true;
    }

    function syncUsernameVisibility() {
      if (!isSignupPage()) {
        document.getElementById(ROOT_ID)?.remove();
        return;
      }
      if (!shouldShowUsername()) {
        hideUsernameField();
        return;
      }
      if (isProfileDetailsStep()) {
        hideUsernameField();
        return;
      }
      if (!isFieldMounted()) {
        ensureField();
      } else {
        showUsernameField();
        prefillUsernameSuggestion();
      }
    }

    function suggestFromNames(first, last) {
      const f = String(first || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      const l = String(last || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (!f) return "";
      let base = l ? `${f}${l}` : f;
      if (base.length < 4) base = `${f}infl`;
      return base.slice(0, 30);
    }

    function wireInput(input) {
      if (!input || input.dataset.inflUsernameWired === "1") return;
      input.dataset.inflUsernameWired = "1";
      input.addEventListener("input", () => {
        const u = normalizeUsername(input.value).replace(/[^a-z0-9._]/g, "");
        if (input.value !== u) input.value = u;
        updatePreview(u);
        scheduleCheck(u);
        captureDraft();
      });
    }

    function prefillUsernameSuggestion() {
      if (!isAccountStep()) return;
      const input = document.getElementById(INPUT_ID);
      if (!input || input.value.trim()) return;
      const first =
        document.querySelector('input[placeholder="First name"]')?.value || "";
      const last =
        document.querySelector('input[placeholder="Last name"]')?.value || "";
      const suggested = suggestFromNames(first, last);
      if (!isValidFormat(suggested)) return;
      input.value = suggested;
      updatePreview(suggested);
      scheduleCheck(suggested);
      captureDraft();
    }

    function ensureField() {
      if (!isSignupPage()) return;
      if (!shouldShowUsername()) return;
      if (isProfileDetailsStep()) return;

      const existing = document.getElementById(ROOT_ID);
      if (existing?.isConnected) {
        prefillUsernameSuggestion();
        return;
      }
      if (existing) existing.remove();

      let savedValue = "";
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
        if (draft.username) savedValue = draft.username;
      } catch {
        /* ignore */
      }

      const wrap = document.createElement("div");
      wrap.id = ROOT_ID;
      wrap.className = "infl-signup-username-wrap";
      wrap.setAttribute("data-infl-profile-name", "1");
      wrap.innerHTML = `
        <label class="infl-signup-username-label" for="${INPUT_ID}">
          Influnet Profile Name <span class="req">*</span>
        </label>
        <p class="infl-signup-username-hint">Your public profile URL: influnet/<strong class="infl-signup-username-preview">username</strong></p>
        <div class="infl-signup-username-row">
          <span class="infl-signup-username-at">@</span>
          <input type="text" id="${INPUT_ID}" autocomplete="username" maxlength="30"
            placeholder="priyasharma" spellcheck="false" />
        </div>
        <p class="infl-signup-username-status" data-status aria-live="polite"></p>
        <ul class="infl-signup-username-suggestions" data-suggestions hidden></ul>
      `;
      if (!insertField(wrap)) {
        console.warn("[influnet] Could not mount profile name field on signup step.");
        return;
      }

      const input = document.getElementById(INPUT_ID);
      wireInput(input);

      if (savedValue) {
        input.value = savedValue;
        updatePreview(savedValue);
        scheduleCheck(savedValue);
      } else {
        prefillUsernameSuggestion();
      }
    }

    function updatePreview(u) {
      const el = document.querySelector(".infl-signup-username-preview");
      if (el) el.textContent = u || "username";
    }

    function setStatus(kind, text) {
      const el = document.querySelector("[data-status]");
      if (!el) return;
      el.className = `infl-signup-username-status ${kind || ""}`;
      el.textContent = text || "";
    }

    function setSuggestions(list) {
      const ul = document.querySelector("[data-suggestions]");
      if (!ul) return;
      if (!list?.length) {
        ul.hidden = true;
        ul.innerHTML = "";
        return;
      }
      ul.hidden = false;
      ul.innerHTML = list
        .map(
          (s) =>
            `<li><button type="button" class="infl-signup-username-suggest" data-u="${s}">${s}</button></li>`
        )
        .join("");
      ul.querySelectorAll("[data-u]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const input = document.getElementById(INPUT_ID);
          if (input) {
            input.value = btn.getAttribute("data-u") || "";
            updatePreview(input.value);
            scheduleCheck(input.value);
            captureDraft();
          }
        });
      });
    }

    function scheduleCheck(u) {
      clearTimeout(checkTimer);
      if (!u) {
        setStatus("", "");
        setSuggestions([]);
        return;
      }
      if (!isValidFormat(u)) {
        setStatus("err", "Use 4–30 characters: lowercase a-z, 0-9, underscore, dot.");
        setSuggestions([]);
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
          `/api/influencer-profile/username/check?username=${encodeURIComponent(u)}`,
          { credentials: "same-origin" }
        );
        const data = await res.json();
        if (lastChecked !== u) return;
        if (data.available) {
          setStatus("ok", "✓ Profile name available");
          setSuggestions([]);
        } else {
          setStatus("err", "✗ Profile name already taken");
          setSuggestions(data.suggestions || []);
        }
      } catch {
        setStatus("", "");
      }
    }

    function getUsernameValue() {
      const fromInput = rememberUsername(document.getElementById(INPUT_ID)?.value || "");
      if (isValidFormat(fromInput)) return fromInput;
      if (isValidFormat(signupUsernameCache)) return signupUsernameCache;
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
        const fromDraft = rememberUsername(draft.username || "");
        if (isValidFormat(fromDraft)) return fromDraft;
      } catch {
        /* ignore */
      }
      return "";
    }

    function resolveUsernameForRegister(body) {
      let u = getUsernameValue();
      if (!isValidFormat(u) && body?.username) {
        u = rememberUsername(body.username);
      }
      return isValidFormat(u) ? u : "";
    }

    function hookRegister() {
      if (window.__inflSignupUsernameHooked) return;
      window.__inflSignupUsernameHooked = true;
      const prev = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        const url = typeof input === "string" ? input : input?.url || "";
        let newInit = init;
        if (url.includes("/api/auth/register") && init?.body && typeof init.body === "string") {
          try {
            const body = JSON.parse(init.body);
            if (body.role === "influencer") {
              const u = resolveUsernameForRegister(body);
              if (!u) {
                throw new Error("INVALID_USERNAME");
              }
              body.username = u;
              rememberUsername(u);
              newInit = { ...init, body: JSON.stringify(body) };
            }
          } catch (e) {
            if (e?.message === "INVALID_USERNAME") {
              setStatus("err", "Choose a valid, available profile name before continuing.");
              return Promise.resolve(
                new Response(JSON.stringify({ error: "Valid Influnet profile name required." }), {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                })
              );
            }
          }
        }
        return prev(input, newInit);
      };
    }

    function captureDraft() {
      if (!isSignupPage()) return;
      const u = normalizeUsername(document.getElementById(INPUT_ID)?.value);
      if (!u) return;
      rememberUsername(u);
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
        draft.username = u;
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* ignore */
      }
    }

    hookRegister();
    window.addEventListener("influnet-ensure-signup-username", () => {
      if (shouldShowUsername()) ensureField();
    });
    syncUsernameVisibility();
    setInterval(() => {
      syncUsernameVisibility();
      captureDraft();
    }, 500);
    window.addEventListener("load", syncUsernameVisibility);
    window.influnetSignupUsername = {
      getValue: getUsernameValue,
      ensureField,
      suggestFromNames,
      prefillUsernameSuggestion,
    };
  } catch (e) {
    console.warn("[influnet] influencer-signup-username:", e);
  }
})();
