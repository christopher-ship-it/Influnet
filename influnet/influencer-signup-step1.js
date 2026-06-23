/**
 * Influencer signup — step 1 (account) validation, autofill sync, visible errors.
 */
(function () {
  try {
    const DRAFT_KEY = "influnet_influencer_signup_draft";
    let allowReactNext = false;
    let syncingFields = false;
    const lastSyncedValue = new WeakMap();

    function isAccountStep() {
      return [...document.querySelectorAll("h2")].some((h) =>
        /create your influencer account|complete your registration/i.test(h.textContent.trim())
      );
    }

    function setReactInputValue(input, value) {
      if (!input) return;
      const next = String(value ?? "");
      if (lastSyncedValue.get(input) === next) return;

      try {
        const proto =
          input instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        if (!(input instanceof HTMLInputElement) && !(input instanceof HTMLTextAreaElement)) {
          return;
        }
        const lastValue = input.value;
        if (lastValue === next) {
          lastSyncedValue.set(input, next);
          return;
        }
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        if (setter) setter.call(input, next);
        else input.value = next;
        const tracker = input._valueTracker;
        if (tracker) tracker.setValue(lastValue);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        lastSyncedValue.set(input, next);
      } catch (err) {
        console.warn("[influnet] signup step1 sync:", err);
      }
    }

    function findSignupCard() {
      const h = [...document.querySelectorAll("h2")].find((el) =>
        /create your influencer account/i.test(el.textContent.trim())
      );
      if (!h) return null;
      return (
        h.closest(".max-w-lg") ||
        h.closest(".rounded-2xl") ||
        h.closest("[class*='rounded-2xl']") ||
        h.parentElement?.parentElement
      );
    }

    function findFields() {
      const root =
        findSignupCard()?.querySelector(".space-y-4") ||
        document.querySelector(".space-y-4");
      return {
        root,
        first:
          root?.querySelector('input[placeholder="First name"]') ||
          document.querySelector('input[placeholder="First name"]'),
        last:
          root?.querySelector('input[placeholder="Last name"]') ||
          document.querySelector('input[placeholder="Last name"]'),
        email:
          root?.querySelector('input[type="email"]') ||
          root?.querySelector('input[placeholder="you@example.com"]') ||
          document.querySelector('input[type="email"]'),
        phone:
          document.querySelector(".infl-phone-local") ||
          document.querySelector('input[type="tel"]'),
        password:
          root?.querySelector('input[placeholder="Create a strong password"]') ||
          document.querySelector('input[placeholder="Create a strong password"]'),
        username: document.getElementById("infl-signup-username-input"),
      };
    }

    function phoneLocal(raw) {
      return String(raw || "").replace(/\D/g, "").slice(-10);
    }

    function getUsernameValue() {
      const fromInput = String(
        document.getElementById("infl-signup-username-input")?.value || ""
      )
        .trim()
        .toLowerCase();
      if (fromInput) return fromInput;
      return String(window.influnetSignupUsername?.getValue?.() || "").trim().toLowerCase();
    }

    function syncFieldsToReact() {
      if (syncingFields) return;
      syncingFields = true;
      try {
        const f = findFields();
        if (f.first?.value?.trim()) setReactInputValue(f.first, f.first.value.trim());
        if (f.last?.value?.trim()) setReactInputValue(f.last, f.last.value.trim());
        if (f.email?.value?.trim()) setReactInputValue(f.email, f.email.value.trim());
        if (f.password?.value) setReactInputValue(f.password, f.password.value);
        if (f.phone) {
          const local = phoneLocal(f.phone.value);
          if (local.length === 10) {
            setReactInputValue(f.phone, `+91 ${local}`);
          }
        }
      } finally {
        syncingFields = false;
      }
    }

    function ensureUsernameReady() {
      window.influnetSignupUsername?.ensureField?.();
    }

    function showFormError(msg) {
      const card = findSignupCard();
      let box = card?.querySelector(".isd-form-error");
      if (!box && card) {
        const nav = card.querySelector(".flex.gap-3.mt-4");
        box = document.createElement("div");
        box.className =
          "isd-form-error flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mt-4";
        box.innerHTML = '<p class="text-xs text-red-400"></p>';
        if (nav) card.insertBefore(box, nav);
        else card.appendChild(box);
      }
      const p = box?.querySelector("p");
      if (p) p.textContent = msg;
      if (box) box.hidden = !msg;
    }

    function highlight(el) {
      if (!el) return;
      const wrap =
        el.closest(".infl-signup-username-wrap") ||
        el.closest(".space-y-1\\.5") ||
        el.closest(".infl-phone-otp-wrap") ||
        el;
      wrap.classList.add("isd-field--highlight");
      window.setTimeout(() => wrap.classList.remove("isd-field--highlight"), 2200);
      wrap.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function validateStep1() {
      const f = findFields();
      if (!f.first?.value?.trim()) {
        return { err: "First name is required.", el: f.first };
      }
      if (!f.last?.value?.trim()) {
        return { err: "Last name is required.", el: f.last };
      }
      if (!f.email?.value?.trim()) {
        return { err: "Email address is required.", el: f.email };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) {
        return { err: "Enter a valid email address.", el: f.email };
      }

      ensureUsernameReady();
      window.influnetSignupUsername?.prefillUsernameSuggestion?.();

      let username = getUsernameValue();
      if (!username || !/^[a-z0-9][a-z0-9._]{3,29}$/.test(username)) {
        const suggested = window.influnetSignupUsername?.suggestFromNames?.(
          f.first.value,
          f.last.value
        );
        const input = document.getElementById("infl-signup-username-input");
        if (input && suggested && /^[a-z0-9][a-z0-9._]{3,29}$/.test(suggested)) {
          input.value = suggested;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          username = suggested;
        }
      }
      if (!username || !/^[a-z0-9][a-z0-9._]{3,29}$/.test(username)) {
        return {
          err: "Choose your Influnet profile name (4–30 characters, lowercase, no spaces).",
          el:
            document.getElementById("infl-signup-username-root") ||
            document.getElementById("infl-signup-username-input"),
        };
      }
      const uStatus = document.querySelector(".infl-signup-username-status");
      if (uStatus?.classList.contains("err")) {
        return {
          err: "This profile name is already taken. Pick another.",
          el: document.getElementById("infl-signup-username-input"),
        };
      }

      const local = phoneLocal(f.phone?.value);
      if (local.length !== 10) {
        return { err: "Enter a valid 10-digit mobile number.", el: f.phone };
      }
      if (!window.influnetPhoneOtp?.isSignupVerified?.()) {
        const statusEl = document.querySelector("[data-otp-status]");
        if (statusEl) {
          statusEl.className = "infl-phone-otp-status failed";
          statusEl.textContent = "Verify your mobile number with OTP before continuing.";
        }
        return {
          err: "Tap Send OTP, enter the code, then continue.",
          el: f.phone || document.querySelector(".infl-phone-otp-wrap"),
        };
      }

      if (!f.password?.value) {
        return { err: "Password is required.", el: f.password };
      }
      if (f.password.value.length < 6) {
        return { err: "Password must be at least 6 characters.", el: f.password };
      }

      return null;
    }

    function saveUsernameDraft() {
      const u = getUsernameValue();
      if (!u) return;
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
        draft.username = u;
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* ignore */
      }
    }

    function mirrorReactError() {
      window.setTimeout(() => {
        if (!isAccountStep()) return;
        const card = findSignupCard();
        const reactErr = card?.querySelector(
          ".flex.items-center.gap-2.bg-red-500\\/10 .text-red-400"
        );
        const text = reactErr?.textContent?.trim();
        const ours = card?.querySelector(".isd-form-error p")?.textContent?.trim();
        if (text && text !== ours) {
          showFormError(text);
          reactErr.closest(".flex")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 30);
    }

    let autofillTimer = 0;
    function scheduleAutofillSync() {
      clearTimeout(autofillTimer);
      autofillTimer = window.setTimeout(() => {
        if (isAccountStep()) syncFieldsToReact();
      }, 120);
    }

    function wireAutofillSync() {
      if (window.__inflSignupAutofillWired) return;
      window.__inflSignupAutofillWired = true;
      document.addEventListener(
        "animationstart",
        (e) => {
          if (
            e.animationName === "influnetAutofillStart" ||
            e.animationName === "onAutoFillStart"
          ) {
            scheduleAutofillSync();
          }
        },
        true
      );
    }

    function wireNextStep() {
      if (window.__inflSignupStep1Wired) return;
      window.__inflSignupStep1Wired = true;

      document.addEventListener(
        "click",
        (e) => {
          if (!isAccountStep()) return;
          const btn = e.target.closest("button");
          if (!btn?.textContent?.includes("Next Step")) return;

          if (allowReactNext) {
            allowReactNext = false;
            saveUsernameDraft();
            showFormError("");
            return;
          }

          ensureUsernameReady();
          syncFieldsToReact();
          const fail = validateStep1();
          if (fail) {
            e.preventDefault();
            e.stopImmediatePropagation();
            showFormError(fail.err);
            highlight(fail.el);
            return;
          }

          e.preventDefault();
          e.stopImmediatePropagation();
          saveUsernameDraft();
          syncFieldsToReact();
          allowReactNext = true;
          window.setTimeout(() => {
            syncFieldsToReact();
            btn.click();
            mirrorReactError();
          }, 0);
        },
        true
      );
    }

    function tick() {
      if (!isAccountStep()) return;
      ensureUsernameReady();
    }

    wireAutofillSync();
    wireNextStep();
    tick();
    setInterval(tick, 1200);
    window.addEventListener("load", tick);

    window.influnetSignupStep1 = { syncFieldsToReact, validateStep1, isAccountStep };
  } catch (e) {
    console.warn("[influnet] signup step1:", e);
  }
})();
