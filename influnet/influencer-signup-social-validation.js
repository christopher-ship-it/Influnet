/**
 * Influencer signup — Creator & Social Platforms: fields, visibility, live validation.
 */
(function () {
  try {
    const SOCIAL = () => window.INFLUNET_SOCIAL;
    const FALLBACK_ROOT_ID = "infl-social-platforms-root";
    const DRAFT_KEY = "influnet_influencer_signup_draft";
    let allowReactNext = false;

    const DEFAULT_PLATFORMS = [
      { id: "instagram", label: "Instagram", placeholder: "instagram.com/yourprofile", color: "#E1306C" },
      { id: "facebook", label: "Facebook", placeholder: "facebook.com/yourprofile", color: "#1877F2" },
      { id: "youtube", label: "YouTube", placeholder: "youtube.com/@channel", color: "#FF0000" },
      { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/you", color: "#0A66C2" },
    ];

    const PLATFORM_BY_LABEL = {
      Instagram: "instagram",
      Facebook: "facebook",
      YouTube: "youtube",
      LinkedIn: "linkedin",
      TikTok: "tiktok",
      Twitter: "twitter",
      "X / Twitter": "twitter",
      "X (Twitter)": "twitter",
    };

    function isSignupPage() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/influencer";
    }

    function isSocialStep() {
      if (!isSignupPage()) return false;
      return [...document.querySelectorAll("h2")].some((h) =>
        h.textContent.trim().includes("Creator & Social")
      );
    }

    function findSocialStepRoot() {
      const h2 = [...document.querySelectorAll("h2")].find((h) =>
        h.textContent.trim().includes("Creator & Social")
      );
      return h2?.closest("[class*='rounded-2xl']")?.querySelector(".space-y-5") || null;
    }

    function findSocialRows() {
      return [...document.querySelectorAll(".flex.items-center.gap-3")].filter((row) => {
        const label = row.querySelector("span.text-xs.font-semibold")?.textContent?.trim();
        const input = row.querySelector("input");
        return !!(label && PLATFORM_BY_LABEL[label] && input);
      });
    }

    function hasSocialSectionTitle() {
      return [...document.querySelectorAll("p")].some((p) =>
        /social platforms/i.test(p.textContent || "")
      );
    }

    function rescueSocialSectionFromGrids() {
      const root = findSocialStepRoot();
      if (!root) return;

      document.querySelectorAll(".isd-grid").forEach((grid) => {
        let socialSection = [...grid.querySelectorAll(".space-y-2")].find((section) =>
          /social platforms/i.test(section.textContent || "")
        );

        if (!socialSection) {
          const rows = [...grid.querySelectorAll(".flex.items-center.gap-3")].filter((row) => {
            const label = row.querySelector("span.text-xs.font-semibold")?.textContent?.trim() || "";
            return /instagram|facebook|youtube|linkedin|tiktok|twitter/i.test(label);
          });
          if (!rows.length) return;

          socialSection = document.createElement("div");
          socialSection.className = "space-y-2";
          const title = document.createElement("p");
          title.className = "text-[10px] font-bold uppercase tracking-widest text-gray-500";
          title.textContent = "Social Platforms";
          socialSection.appendChild(title);
          rows.forEach((row) => {
            row.classList.remove("isd-hidden-native");
            row.style.display = "";
            socialSection.appendChild(row);
          });
        } else {
          socialSection.classList.remove("isd-hidden-native");
          socialSection.style.display = "";
          socialSection.querySelectorAll(".flex.items-center.gap-3, .isd-hidden-native").forEach((el) => {
            el.classList.remove("isd-hidden-native");
            if (el.style.display === "none") el.style.display = "";
          });
        }

        root.appendChild(socialSection);
      });
    }

    function ensureSocialVisibility() {
      if (!isSocialStep()) return;

      document.querySelectorAll(".isd-hidden-native").forEach((el) => {
        el.classList.remove("isd-hidden-native");
      });

      rescueSocialSectionFromGrids();

      const root = findSocialStepRoot();
      if (!root) return;

      root.querySelectorAll(".space-y-1\\.5, .space-y-2, .flex.items-center.gap-3").forEach((el) => {
        el.classList.remove("isd-hidden-native");
        if (el.style.display === "none") el.style.display = "";
      });

      const bio = root.querySelector("textarea");
      if (bio) {
        bio.closest(".isd-hidden-native")?.classList.remove("isd-hidden-native");
        bio.style.display = "";
      }

      const socialWrap = root.querySelector(".space-y-2");
      if (socialWrap) {
        socialWrap.classList.remove("isd-hidden-native");
        socialWrap.style.display = "";
      }
    }

    function setReactInputValue(input, value) {
      if (!input) return;
      const proto =
        input instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const lastValue = input.value;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) setter.call(input, value);
      else input.value = value;
      const tracker = input._valueTracker;
      if (tracker) tracker.setValue(lastValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function loadDraftValue(platform) {
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
        const key = `${platform}Handle`;
        return draft[key] || "";
      } catch {
        return "";
      }
    }

    function saveDraftSocial(platform, value) {
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
        const key = `${platform}Handle`;
        if (value) draft[key] = value;
        else delete draft[key];
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* ignore */
      }
    }

    function buildFallbackSection() {
      const wrap = document.createElement("div");
      wrap.id = FALLBACK_ROOT_ID;
      wrap.className = "space-y-2 infl-social-platforms-fallback";
      wrap.innerHTML = `
        <p class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Social Platforms</p>
        <p class="infl-social-section-hint">Enter usernames or profile links — we validate the platform and save the full URL automatically.</p>
      `;

      DEFAULT_PLATFORMS.forEach(({ id, label, placeholder, color }) => {
        const row = document.createElement("div");
        row.className =
          "flex items-center gap-3 bg-[#1a1a2a] border border-white/10 rounded-xl px-3 py-2.5 infl-social-row";
        row.innerHTML = `
          <div class="size-8 rounded-lg flex items-center justify-center shrink-0 infl-social-icon" style="background-color:${color}22;color:${color}">●</div>
          <span class="text-xs font-semibold text-gray-300 w-20 shrink-0">${label}</span>
        `;
        const input = document.createElement("input");
        input.type = "text";
        input.className =
          "flex-1 h-8 bg-transparent border-0 border-b border-white/10 rounded-none text-xs text-white placeholder:text-gray-600 focus-visible:outline-none focus-visible:border-primary/50 px-0";
        input.placeholder = placeholder;
        input.dataset.inflPlatform = id;
        const saved = loadDraftValue(id);
        if (saved) input.value = saved;
        row.appendChild(input);
        wrap.appendChild(row);
      });

      return wrap;
    }

    function ensureSocialFields() {
      if (!isSocialStep()) {
        document.getElementById(FALLBACK_ROOT_ID)?.remove();
        return;
      }

      ensureSocialVisibility();

      const root = findSocialStepRoot();
      if (!root) return;

      const rows = findSocialRows();
      if (rows.length >= 4 && hasSocialSectionTitle()) {
        document.getElementById(FALLBACK_ROOT_ID)?.remove();
        return;
      }

      if (document.getElementById(FALLBACK_ROOT_ID)) return;

      const mountAfter =
        root.querySelector("textarea")?.closest(".space-y-1\\.5") ||
        root.querySelector(".grid.grid-cols-2") ||
        root.lastElementChild;

      const fallback = buildFallbackSection();
      if (mountAfter?.parentElement === root) {
        mountAfter.after(fallback);
      } else {
        root.appendChild(fallback);
      }

      findSocialRows().forEach(upgradeRow);
    }

    function ensureInputWrap(row, input) {
      let wrap = input.closest(".infl-social-input-wrap");
      if (wrap) return wrap;
      wrap = document.createElement("div");
      wrap.className = "infl-social-input-wrap";
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      row.classList.add("infl-social-row");
      return wrap;
    }

    function renderStatus(wrap, result) {
      let el = wrap.querySelector(".infl-social-status");
      if (!el) {
        el = document.createElement("div");
        el.className = "infl-social-status";
        el.setAttribute("aria-live", "polite");
        wrap.appendChild(el);
      }
      el.className = "infl-social-status";
      if (!result || result.status === "empty") {
        el.textContent = "";
        return;
      }
      const soc = SOCIAL();
      el.textContent = soc?.statusLabel(result.status) || "";
      if (result.status === "valid") el.classList.add("infl-social-status--valid");
      else if (result.status === "invalid") el.classList.add("infl-social-status--invalid");
      else if (result.status === "unverified") el.classList.add("infl-social-status--unverified");
      else el.classList.add("infl-social-status--checking");
    }

    function validateRow(row) {
      const label = row.querySelector("span.text-xs.font-semibold")?.textContent?.trim();
      const platform =
        PLATFORM_BY_LABEL[label] || row.querySelector("input")?.dataset?.inflPlatform;
      const input = row.querySelector("input");
      if (!platform || !input) return { status: "empty", valid: true };

      const soc = SOCIAL();
      if (!soc) return { status: "empty", valid: true };

      const result = soc.validate(platform, input.value);
      const wrap = ensureInputWrap(row, input);
      renderStatus(wrap, result);

      if (result.valid && result.url) {
        input.dataset.inflSocialUrl = result.url;
        input.dataset.inflSocialPlatform = platform;
        saveDraftSocial(platform, soc.normalizeForStorage(platform, input.value) || input.value.trim());
      } else if (!input.value.trim()) {
        delete input.dataset.inflSocialUrl;
        delete input.dataset.inflSocialPlatform;
        saveDraftSocial(platform, "");
      } else {
        delete input.dataset.inflSocialUrl;
        delete input.dataset.inflSocialPlatform;
      }

      return result;
    }

    function onBlurNormalize(row) {
      const label = row.querySelector("span.text-xs.font-semibold")?.textContent?.trim();
      const platform =
        PLATFORM_BY_LABEL[label] || row.querySelector("input")?.dataset?.inflPlatform;
      const input = row.querySelector("input");
      const soc = SOCIAL();
      if (!platform || !input || !soc) return;

      const raw = input.value.trim();
      if (!raw) return;

      const result = soc.validate(platform, raw);
      if (result.valid && result.display) {
        setReactInputValue(input, result.display);
        if (result.url) input.dataset.inflSocialUrl = result.url;
      }
      validateRow(row);
    }

    function upgradeRow(row) {
      if (row.dataset.inflSocialWired === "1") return;
      const label = row.querySelector("span.text-xs.font-semibold")?.textContent?.trim();
      const platform =
        PLATFORM_BY_LABEL[label] || row.querySelector("input")?.dataset?.inflPlatform;
      const input = row.querySelector("input");
      const soc = SOCIAL();
      if (!platform || !input || !soc) return;

      row.dataset.inflSocialWired = "1";
      row.classList.remove("isd-hidden-native");
      row.style.display = "";

      const ux = soc.UX[platform];
      if (ux?.placeholder) input.placeholder = ux.placeholder;

      const wrap = ensureInputWrap(row, input);

      input.addEventListener("input", () => validateRow(row));
      input.addEventListener("blur", () => onBlurNormalize(row));

      if (input.value.trim()) validateRow(row);
      else renderStatus(wrap, { status: "empty" });
    }

    function syncSocialToReact() {
      findSocialRows().forEach((row) => {
        const input = row.querySelector("input");
        const label = row.querySelector("span.text-xs.font-semibold")?.textContent?.trim();
        const platform = PLATFORM_BY_LABEL[label] || input?.dataset?.inflPlatform;
        if (!input?.value?.trim() || !platform) return;

        const ph = input.placeholder;
        const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(ph) : ph.replace(/"/g, '\\"');
        const reactInput =
          (ph && document.querySelector(`input[placeholder="${esc}"]`)) || input;
        setReactInputValue(reactInput, input.value);
      });
    }

    function hasAtLeastOneSocial() {
      return findSocialRows().some((row) => row.querySelector("input")?.value?.trim());
    }

    function validateSocialStep() {
      const rows = findSocialRows();
      if (!rows.length) {
        return "Social platform fields failed to load. Please refresh the page.";
      }
      if (!hasAtLeastOneSocial()) {
        return "Add at least one social platform URL.";
      }
      for (const row of rows) {
        const input = row.querySelector("input");
        if (!input?.value?.trim()) continue;
        const result = validateRow(row);
        if (!result.valid) {
          return result.message || "Please fix invalid social profile links.";
        }
      }
      return "";
    }

    function showFormError(msg) {
      const card = findSocialStepRoot()?.closest("[class*='rounded-2xl']");
      let box = card?.querySelector(".infl-social-step-error");
      if (!box && card) {
        const nav = card.querySelector(".flex.gap-3.mt-4");
        box = document.createElement("div");
        box.className =
          "infl-social-step-error flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mt-4";
        box.innerHTML = '<p class="text-xs text-red-400"></p>';
        if (nav) card.insertBefore(box, nav);
        else card.appendChild(box);
      }
      const p = box?.querySelector("p");
      if (p) p.textContent = msg;
      if (box) box.hidden = !msg;
    }

    function wireNextStep() {
      if (window.__inflSocialValidationWired) return;
      window.__inflSocialValidationWired = true;

      document.addEventListener(
        "click",
        (e) => {
          if (!isSocialStep()) return;
          const btn = e.target.closest("button");
          if (!btn?.textContent?.includes("Next Step")) return;

          if (allowReactNext) {
            allowReactNext = false;
            syncSocialToReact();
            showFormError("");
            return;
          }

          ensureSocialFields();
          syncSocialToReact();

          const err = validateSocialStep();
          if (err) {
            e.preventDefault();
            e.stopImmediatePropagation();
            showFormError(err);
            const first = findSocialRows().find((r) => r.querySelector("input"));
            first?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }

          e.preventDefault();
          e.stopImmediatePropagation();
          syncSocialToReact();
          showFormError("");
          allowReactNext = true;
          window.setTimeout(() => {
            syncSocialToReact();
            btn.click();
          }, 0);
        },
        true
      );
    }

    function tick() {
      if (!isSocialStep()) {
        document.getElementById(FALLBACK_ROOT_ID)?.remove();
        return;
      }
      ensureSocialFields();
      findSocialRows().forEach(upgradeRow);
      wireNextStep();
    }

    window.influnetSignupSocial = {
      validateStep: validateSocialStep,
      getCanonicalUrl: (input) => input?.dataset?.inflSocialUrl || null,
      normalizeValue: (platform, raw) => SOCIAL()?.normalizeForStorage(platform, raw) || raw,
      ensureFields: ensureSocialFields,
      syncToReact: syncSocialToReact,
    };

    tick();
    setInterval(tick, 500);
    window.addEventListener("load", tick);
  } catch (e) {
    console.warn("[influnet] signup social validation:", e);
  }
})();
