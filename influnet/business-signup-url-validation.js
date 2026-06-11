/**
 * Business signup step 2: validate website & social URLs when filled.
 */
(function () {
  const ERROR_ID = "influnet-business-url-error";

  function isBusinessSignup() {
    return window.location.pathname.replace(/\/$/, "") === "/signup/business";
  }

  function isStep2() {
    const headings = Array.from(document.querySelectorAll("h2"));
    return headings.some((el) => el.textContent.trim() === "Business Details");
  }

  function inputByPlaceholder(text) {
    return Array.from(document.querySelectorAll("input")).find((el) => {
      const ph = (el.getAttribute("placeholder") || "").toLowerCase();
      return ph.includes(text.toLowerCase());
    });
  }

  function normalizeUrl(input) {
    let s = input.trim();
    if (!s) return null;
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(s)) {
      s = "https://" + s.replace(/^\/\//, "");
    }
    return s;
  }

  function isValidUrl(input, allowedHosts) {
    const normalized = normalizeUrl(input);
    if (!normalized) return true;
    try {
      const u = new URL(normalized);
      const host = u.hostname.replace(/^www\./, "").toLowerCase();
      if (!host || !host.includes(".")) return false;
      if (allowedHosts?.length) {
        return allowedHosts.some(
          (h) => host === h || host.endsWith("." + h)
        );
      }
      return /^https?:$/i.test(u.protocol);
    } catch {
      return false;
    }
  }

  function validateWebsite(value) {
    const t = value.trim();
    if (!t) return null;
    if (isValidUrl(t)) return null;
    return "Enter a valid company website URL (e.g. https://example.com).";
  }

  function validateInstagram(value) {
    const t = value.trim();
    if (!t) return null;
    const handle = t.replace(/^@/, "");
    if (/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return null;
    if (isValidUrl(t, ["instagram.com"])) return null;
    return "Enter a valid Instagram username or profile URL.";
  }

  function validateFacebook(value) {
    const t = value.trim();
    if (!t) return null;
    if (isValidUrl(t, ["facebook.com", "fb.com", "fb.me"])) return null;
    return "Enter a valid Facebook page URL (e.g. https://facebook.com/yourpage).";
  }

  function validateLinkedIn(value) {
    const t = value.trim();
    if (!t) return null;
    if (isValidUrl(t, ["linkedin.com"])) return null;
    return "Enter a valid LinkedIn company profile URL.";
  }

  const FIELD_RULES = [
    { placeholder: "https://example.com", validate: validateWebsite },
    { placeholder: "instagram username", validate: validateInstagram },
    { placeholder: "facebook page url", validate: validateFacebook },
    { placeholder: "linkedin company profile", validate: validateLinkedIn },
  ];

  function validateStep2Fields() {
    for (const rule of FIELD_RULES) {
      const input = inputByPlaceholder(rule.placeholder);
      if (!input) continue;
      const msg = rule.validate(input.value || "");
      if (msg) return msg;
    }
    return null;
  }

  function clearError() {
    document.getElementById(ERROR_ID)?.remove();
  }

  function findFormCard() {
    const h2 = Array.from(document.querySelectorAll("h2")).find(
      (el) => el.textContent.trim() === "Business Details"
    );
    return h2?.closest('[class*="rounded-2xl"]') || null;
  }

  function showError(message) {
    clearError();
    const anchor = findFormCard();

    const box = document.createElement("div");
    box.id = ERROR_ID;
    box.className =
      "flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mt-4";
    box.innerHTML =
      '<svg class="size-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p class="text-xs text-red-400"></p>';
    box.querySelector("p").textContent = message;

    const actions = anchor?.querySelector(".flex.gap-3.mt-4");
    if (actions?.parentNode) {
      actions.parentNode.insertBefore(box, actions);
    } else if (anchor) {
      anchor.appendChild(box);
    } else {
      document.body.appendChild(box);
    }
  }

  function onNextClick(ev) {
    if (!isBusinessSignup() || !isStep2()) return;

    const btn = ev.target.closest("button");
    if (!btn) return;
    const label = (btn.textContent || "").trim().toLowerCase();
    if (!label.includes("next step")) return;

    const err = validateStep2Fields();
    if (!err) {
      clearError();
      return;
    }

    ev.preventDefault();
    ev.stopImmediatePropagation();
    showError(err);
  }

  function onInput() {
    if (!isBusinessSignup() || !isStep2()) return;
    if (!document.getElementById(ERROR_ID)) return;
    const err = validateStep2Fields();
    if (err) showError(err);
    else clearError();
  }

  document.addEventListener("click", onNextClick, true);
  document.addEventListener("input", onInput, true);

  const obs = new MutationObserver(() => {
    if (!isBusinessSignup()) return;
    FIELD_RULES.forEach((rule) => {
      const input = inputByPlaceholder(rule.placeholder);
      if (input && !input.dataset.influnetUrlBound) {
        input.dataset.influnetUrlBound = "1";
        input.addEventListener("blur", onInput);
      }
    });
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
