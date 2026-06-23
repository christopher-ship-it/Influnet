/**
 * Influencer signup — Profile Details step (step 2): layout, city/state dropdowns, validation.
 */
(function () {
  try {
    const DRAFT_KEY = "influnet_influencer_signup_draft";

    function getLoc() {
      return (
        window.INFLUNET_INDIA_LOCATIONS ||
        window.INFLUNET_INDIA_STATES_CITIES || { states: [], citiesByState: {} }
      );
    }

    const STATE_ABBREV = {
      an: "Andaman and Nicobar Islands",
      ap: "Andhra Pradesh",
      ar: "Arunachal Pradesh",
      as: "Assam",
      br: "Bihar",
      cg: "Chhattisgarh",
      ch: "Chandigarh",
      dd: "Dadra and Nagar Haveli and Daman and Diu",
      dl: "Delhi",
      ga: "Goa",
      gj: "Gujarat",
      hp: "Himachal Pradesh",
      hr: "Haryana",
      jh: "Jharkhand",
      jk: "Jammu and Kashmir",
      ka: "Karnataka",
      kl: "Kerala",
      la: "Ladakh",
      ld: "Lakshadweep",
      mh: "Maharashtra",
      ml: "Meghalaya",
      mn: "Manipur",
      mp: "Madhya Pradesh",
      mz: "Mizoram",
      nl: "Nagaland",
      od: "Odisha",
      pb: "Punjab",
      py: "Puducherry",
      rj: "Rajasthan",
      sk: "Sikkim",
      ta: "Tamil Nadu",
      tn: "Tamil Nadu",
      ts: "Telangana",
      tg: "Telangana",
      tr: "Tripura",
      uk: "Uttarakhand",
      up: "Uttar Pradesh",
      wb: "West Bengal",
    };

    const CITY_ALIASES = {
      allahabad: "Prayagraj",
      banaras: "Varanasi",
      bangalore: "Bengaluru",
      baroda: "Vadodara",
      benares: "Varanasi",
      bombay: "Mumbai",
      calicut: "Kozhikode",
      cochin: "Kochi",
      gurgaon: "Gurugram",
      madras: "Chennai",
      mysore: "Mysuru",
      pondicherry: "Puducherry",
      trichy: "Tiruchirappalli",
      trivandrum: "Thiruvananthapuram",
    };

    function resolveCityName(raw, state) {
      const s = String(raw || "").trim();
      if (!s) return "";
      const cities = citiesForState(state);
      if (!cities.length) return "";
      if (cities.includes(s)) return s;
      const q = s.toLowerCase();
      const alias = CITY_ALIASES[q];
      if (alias && cities.includes(alias)) return alias;
      const exact = cities.find((c) => c.toLowerCase() === q);
      if (exact) return exact;
      const prefix = cities.filter((c) => c.toLowerCase().startsWith(q));
      if (prefix.length === 1) return prefix[0];
      return "";
    }

    function isValidState(name) {
      const canonical = resolveStateName(name);
      if (!canonical) return false;
      return getLoc().states.includes(canonical);
    }

    function resolveStateName(raw) {
      const s = String(raw || "").trim();
      if (!s) return "";
      const loc = getLoc();
      const states = loc.states || [];
      const q = s.toLowerCase();

      const exact = states.find((x) => x.toLowerCase() === q);
      if (exact) return exact;

      const abbrev = STATE_ABBREV[q];
      if (abbrev && states.includes(abbrev)) return abbrev;

      const prefix = states.filter((x) => x.toLowerCase().startsWith(q));
      if (prefix.length === 1) return prefix[0];

      const wordStart = states.filter((x) =>
        x.toLowerCase().split(/\s+/).some((w) => w.startsWith(q))
      );
      if (wordStart.length === 1) return wordStart[0];

      const includes = states.filter((x) => x.toLowerCase().includes(q));
      if (includes.length === 1) return includes[0];

      return "";
    }

    function citiesForState(state) {
      const canonical = resolveStateName(state);
      if (!canonical || !getLoc().states.includes(canonical)) return [];
      return getLoc().citiesByState[canonical] || [];
    }

    function persistLocationDraft() {
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
        const state = resolveStateName(stateCombo?.getValue() || "");
        const city = cityCombo?.getValue() || "";
        if (state) draft.state = state;
        else delete draft.state;
        if (city) draft.city = city;
        else delete draft.city;
        if (state && city) draft.location = `${city}, ${state}`;
        else delete draft.location;
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* ignore */
      }
    }

    let stateCombo = null;
    let cityCombo = null;
    let nativeStateInput = null;
    let nativeCityInput = null;

    function handleStateChange(raw, options = {}) {
      const canonical = resolveStateName(raw);
      const prior = resolveStateName(stateCombo?.getValue() || "");
      const keepCity =
        options.keepCity !== undefined ? options.keepCity : prior !== "" && prior === canonical;

      if (!canonical) {
        stateCombo?.setError(raw?.trim() ? "Please select a state from the list." : "");
        syncCityOptions("", { keepCity: false });
        persistLocationDraft();
        return;
      }

      stateCombo?.setError("");
      if (stateCombo && canonical !== stateCombo.getValue()) {
        stateCombo.setValue(canonical, true);
      }
      if (nativeStateInput) setReactInputValue(nativeStateInput, canonical);
      const legacy = document.querySelector("select.influnet-state-select");
      if (legacy) legacy.value = canonical;
      syncCityOptions(canonical, { keepCity });
      persistLocationDraft();
    }

    function reconcileStateAndCity() {
      if (!stateCombo || !cityCombo) return;
      const raw = stateCombo.getValue();
      const canonical = resolveStateName(raw);
      if (canonical) {
        if (canonical !== raw) stateCombo.setValue(canonical, true);
        stateCombo.setError("");
        syncCityOptions(canonical, { keepCity: true });
        if (nativeStateInput) setReactInputValue(nativeStateInput, canonical);
      } else if (raw.trim()) {
        stateCombo.setError("Please select a state from the list.");
        syncCityOptions("", { keepCity: false });
      } else {
        stateCombo.setError("");
        syncCityOptions("", { keepCity: false });
      }
    }

    function handleCityChange(raw) {
      const state = resolveStateName(stateCombo?.getValue() || "");
      const city = resolveCityName(raw, state) || String(raw || "").trim();
      if (cityCombo && city && city !== cityCombo.getValue()) {
        cityCombo.setValue(city, true);
      }
      if (nativeCityInput) setReactInputValue(nativeCityInput, city);
      persistLocationDraft();
    }

    function restoreLocationFromDraft() {
      if (!stateCombo || !cityCombo) return;
      try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
        const draftState = draft.state || stateCombo.getValue() || nativeStateInput?.value || "";
        const draftCity = draft.city || cityCombo.getValue() || nativeCityInput?.value || "";
        if (draftState) {
          const st = resolveStateName(draftState);
          if (st) {
            stateCombo.setValue(st, true);
            if (nativeStateInput) setReactInputValue(nativeStateInput, st);
            syncCityOptions(st, { keepCity: true });
          }
        }
        if (draftCity) {
          const cities = citiesForState(stateCombo.getValue());
          if (!cities.length || cities.includes(draftCity)) {
            cityCombo.setValue(draftCity, true);
            if (nativeCityInput) setReactInputValue(nativeCityInput, draftCity);
          }
        }
      } catch {
        /* ignore */
      }
    }
    const LANGUAGES = [
      "English",
      "Hindi",
      "Tamil",
      "Telugu",
      "Malayalam",
      "Kannada",
      "Marathi",
      "Bengali",
      "Gujarati",
      "Punjabi",
    ];
    const GENDERS = ["Male", "Female", "Non-Binary", "Prefer Not To Say"];

    function isSignupPage() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/influencer";
    }

    function isProfileDetailsStep() {
      if (!isSignupPage()) return false;
      return [...document.querySelectorAll("h2")].some(
        (h) => h.textContent.trim() === "Profile Details"
      );
    }

    function isAccountStep() {
      if (!isSignupPage()) return false;
      return [...document.querySelectorAll("h2")].some((h) =>
        /create your influencer account/i.test(h.textContent.trim())
      );
    }

    function isSocialStep() {
      if (!isSignupPage()) return false;
      return [...document.querySelectorAll("h2")].some((h) =>
        h.textContent.trim().includes("Creator & Social")
      );
    }

    function rescueSocialSectionFromGrid(grid) {
      const root = grid.parentElement;
      if (!root) return;

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

    function syncFieldsToReact() {
      nativeStateInput = findStateInput();
      nativeCityInput = findCityInput();
      const state = resolveStateName(
        stateCombo?.getValue() || nativeStateInput?.value?.trim() || ""
      );
      const city = cityCombo?.getValue() || nativeCityInput?.value?.trim() || "";
      if (state) {
        if (stateCombo && stateCombo.getValue() !== state) {
          stateCombo.setValue(state, true);
        }
        if (nativeStateInput) setReactInputValue(nativeStateInput, state);
      }
      if (city) {
        const cities = citiesForState(state);
        if (!cities.length || cities.includes(city)) {
          if (cityCombo && cityCombo.getValue() !== city) {
            cityCombo.setValue(city, true);
          }
          if (nativeCityInput) setReactInputValue(nativeCityInput, city);
        }
      }
    }

    function scrollToFirstInvalid(err) {
      if (!err) return;
      const rules = [
        { re: /username/i, get: () => document.getElementById("infl-signup-username-root") },
        { re: /photo/i, get: () => document.querySelector(".isd-photo-block") },
        { re: /state/i, get: () => stateCombo?.wrap },
        { re: /city/i, get: () => cityCombo?.wrap },
        { re: /language/i, get: () => document.querySelector(".isd-lang-section") },
      ];
      for (const rule of rules) {
        if (!rule.re.test(err)) continue;
        const el = rule.get();
        if (!el) break;
        el.classList.add("isd-field--highlight");
        window.setTimeout(() => el.classList.remove("isd-field--highlight"), 2200);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      document.querySelector(".isd-form-error")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function setReactSelectValue(select, value) {
      if (!select) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      if (setter) setter.call(select, value);
      else select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function findStepRoot() {
      const h = [...document.querySelectorAll("h2")].find(
        (el) => el.textContent.trim() === "Profile Details"
      );
      if (!h) return null;
      const card = h.closest(".max-w-lg") || h.closest("form") || document.body;
      return card.querySelector(".space-y-5");
    }

    function findCityInput() {
      return document.querySelector('input[placeholder="e.g. Mumbai"]');
    }

    function findStateInput() {
      return document.querySelector('input[placeholder="e.g. Tamil Nadu"]');
    }

    function findGenderSelect() {
      const root = findStepRoot();
      if (!root) return null;
      return root.querySelector("select");
    }

    function findPhotoBlock() {
      const root = findStepRoot();
      if (!root) return null;
      return root.querySelector(".border-dashed");
    }

    function hideNativeCityField() {
      const cityInput = findCityInput();
      if (!cityInput || cityInput.classList.contains("isd-combo-input")) return;
      const cityWrap = cityInput.closest(".space-y-1\\.5") || cityInput.parentElement;
      cityWrap?.classList.add("isd-hidden-native");
    }

    function hideNativeLocationFields() {
      const stateInput = findStateInput();
      const stateWrap = stateInput?.closest(".space-y-1\\.5") || stateInput?.parentElement;
      stateWrap?.classList.add("isd-hidden-native");
      hideNativeCityField();
      findPhotoBlock()?.closest(".flex")?.classList.add("isd-hidden-native");
    }

    function showFormError(msg) {
      const card = document.querySelector("h2")?.closest(".max-w-lg");
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

    const activeCombos = new Set();
    const LIST_MAX_HEIGHT = 220;

    function closeAllCombos(exceptApi) {
      activeCombos.forEach((api) => {
        if (api !== exceptApi) api.closeList();
      });
    }

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    }

    function selectListValue(listEl, li, setValue, closeList) {
      const picked = li.getAttribute("data-value") || "";
      if (!picked || li.classList.contains("isd-combo-empty")) return;
      setValue(picked);
      closeList();
    }

    function createSearchCombo(opts) {
      const wrap = document.createElement("div");
      wrap.className = "isd-field";
      wrap.innerHTML = `
        <label class="isd-label">${opts.label}${opts.required ? ' <span class="isd-req">*</span>' : ""}</label>
        <div class="isd-combo" data-isd-combo>
          <input type="text" class="isd-input isd-combo-input" placeholder="${opts.placeholder}" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" />
          <button type="button" class="isd-combo-toggle" aria-label="Show options" tabindex="-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <ul class="isd-combo-list" role="listbox" hidden></ul>
        </div>
        <p class="isd-combo-hint" hidden></p>
        <p class="isd-field-error" hidden></p>
      `;

      const combo = wrap.querySelector(".isd-combo");
      const input = wrap.querySelector(".isd-combo-input");
      const toggle = wrap.querySelector(".isd-combo-toggle");
      const list = wrap.querySelector(".isd-combo-list");
      const hintEl = wrap.querySelector(".isd-combo-hint");
      const errEl = wrap.querySelector(".isd-field-error");
      let items = opts.items || [];
      let emptyHint = opts.emptyHint || "No options available.";

      function positionList() {
        if (list.hidden) return;
        const rect = input.getBoundingClientRect();
        if (list.parentElement !== document.body) {
          document.body.appendChild(list);
        }
        list.classList.add("isd-combo-list--floating");

        const width = Math.max(rect.width, 200);
        const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
        const spaceBelow = window.innerHeight - rect.bottom - 12;
        const spaceAbove = rect.top - 12;
        const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;

        list.style.position = "fixed";
        list.style.left = `${left}px`;
        list.style.width = `${width}px`;
        list.style.maxHeight = `${LIST_MAX_HEIGHT}px`;
        list.style.zIndex = "10050";

        if (openUp) {
          list.style.top = "auto";
          list.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        } else {
          list.style.top = `${rect.bottom + 4}px`;
          list.style.bottom = "auto";
        }
      }

      function restoreList() {
        list.classList.remove("isd-combo-list--floating");
        list.style.cssText = "";
        if (list.parentElement !== combo) {
          combo.appendChild(list);
        }
      }

      function renderList(filter, forceOpen) {
        const q = String(filter || "").trim().toLowerCase();
        const filtered = items.filter((x) => !q || x.toLowerCase().includes(q));
        if (!items.length) {
          list.innerHTML = `<li class="isd-combo-empty" aria-disabled="true">${emptyHint}</li>`;
          list.hidden = !forceOpen;
        } else {
          list.innerHTML = filtered
            .map((x) => `<li role="option" data-value="${escapeHtml(x)}">${escapeHtml(x)}</li>`)
            .join("");
          list.hidden = !(forceOpen && filtered.length > 0);
        }

        const open = !list.hidden;
        input.setAttribute("aria-expanded", open ? "true" : "false");
        combo.classList.toggle("isd-combo--open", open);
        wrap.classList.toggle("isd-field--dropdown-open", open);

        if (open) positionList();
        else restoreList();
      }

      function openList() {
        if (input.disabled) return;
        if (opts.onBeforeOpen) opts.onBeforeOpen();
        closeAllCombos(api);
        renderList(input.value, true);
        if (!list.hidden) activeCombos.add(api);
      }

      function closeList() {
        list.hidden = true;
        input.setAttribute("aria-expanded", "false");
        combo.classList.remove("isd-combo--open");
        wrap.classList.remove("isd-field--dropdown-open");
        restoreList();
        activeCombos.delete(api);
      }

      function setItems(next) {
        items = next || [];
        if (!list.hidden) renderList(input.value, true);
        else renderList(input.value);
      }

      function setEmptyHint(text) {
        emptyHint = text || "No options available.";
      }

      function setHint(text) {
        if (!text) {
          hintEl.hidden = true;
          hintEl.textContent = "";
          return;
        }
        hintEl.hidden = false;
        hintEl.textContent = text;
      }

      function setPlaceholder(text) {
        input.placeholder = text || "";
      }

      function setEnabled(enabled) {
        input.disabled = !enabled;
        toggle.disabled = !enabled;
        wrap.classList.toggle("isd-field--disabled", !enabled);
        if (!enabled) closeList();
      }

      function getEnabled() {
        return !input.disabled;
      }

      function setValue(val, silent) {
        input.value = val || "";
        if (!silent && opts.onChange) opts.onChange(val);
      }

      function setError(msg) {
        errEl.hidden = !msg;
        errEl.textContent = msg || "";
        wrap.classList.toggle("isd-field--err", !!msg);
      }

      function onViewportChange() {
        if (!list.hidden) positionList();
      }

      input.addEventListener("focus", () => openList());
      input.addEventListener("click", () => openList());
      input.addEventListener("input", () => renderList(input.value, true));
      input.addEventListener("blur", () => {
        if (opts.onBlur) opts.onBlur(input.value);
      });
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (list.hidden) openList();
        else closeList();
        input.focus();
      });
      list.addEventListener("mousedown", (e) => {
        const li = e.target.closest("[data-value]");
        if (!li) return;
        e.preventDefault();
        selectListValue(list, li, setValue, closeList);
      });
      list.addEventListener("click", (e) => {
        const li = e.target.closest("[data-value]");
        if (!li) return;
        e.preventDefault();
        e.stopPropagation();
        selectListValue(list, li, setValue, closeList);
      });
      list.addEventListener("pointerdown", (e) => {
        const li = e.target.closest("[data-value]");
        if (!li) return;
        e.preventDefault();
      });
      document.addEventListener("mousedown", (e) => {
        if (wrap.contains(e.target) || list.contains(e.target)) return;
        closeList();
      });
      window.addEventListener("resize", onViewportChange);
      window.addEventListener("scroll", onViewportChange, true);

      const api = {
        wrap,
        setItems,
        setValue,
        getValue: () => input.value.trim(),
        setError,
        setHint,
        setEmptyHint,
        setPlaceholder,
        setEnabled,
        getEnabled,
        openList,
        closeList,
      };
      wrap.isdComboApi = api;
      return api;
    }

    function createCitySelect(opts) {
      const wrap = document.createElement("div");
      wrap.className = "isd-field";
      wrap.innerHTML = `
        <label class="isd-label">${opts.label}${opts.required ? ' <span class="isd-req">*</span>' : ""}</label>
        <select class="isd-input isd-city-select" disabled aria-label="City">
          <option value="">Select state first</option>
        </select>
        <p class="isd-combo-hint" hidden></p>
        <p class="isd-field-error" hidden></p>
      `;

      const select = wrap.querySelector(".isd-city-select");
      const hintEl = wrap.querySelector(".isd-combo-hint");
      const errEl = wrap.querySelector(".isd-field-error");
      let cities = [];

      function rebuildOptions(placeholder) {
        const prev = select.value;
        select.innerHTML = "";
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = placeholder || (select.disabled ? "Select state first" : "Select city");
        select.appendChild(empty);
        cities.forEach((city) => {
          const opt = document.createElement("option");
          opt.value = city;
          opt.textContent = city;
          select.appendChild(opt);
        });
        if (prev && cities.includes(prev)) select.value = prev;
      }

      function setItems(next) {
        cities = next || [];
        rebuildOptions(select.disabled ? "Select state first" : "Select city");
      }

      function setValue(val, silent) {
        const v = val && cities.includes(val) ? val : "";
        select.value = v;
        if (!silent && opts.onChange) opts.onChange(v);
      }

      function getValue() {
        return String(select.value || "").trim();
      }

      function setEnabled(enabled) {
        select.disabled = !enabled;
        wrap.classList.toggle("isd-field--disabled", !enabled);
        if (!enabled) {
          cities = [];
          rebuildOptions("Select state first");
        } else {
          rebuildOptions("Select city");
        }
      }

      function setPlaceholder(text) {
        const empty = select.querySelector('option[value=""]');
        if (empty) empty.textContent = text || "Select city";
      }

      function setError(msg) {
        errEl.hidden = !msg;
        errEl.textContent = msg || "";
        wrap.classList.toggle("isd-field--err", !!msg);
      }

      function setHint(text) {
        if (!text) {
          hintEl.hidden = true;
          hintEl.textContent = "";
          return;
        }
        hintEl.hidden = false;
        hintEl.textContent = text;
      }

      select.addEventListener("change", () => {
        setError("");
        if (opts.onChange) opts.onChange(select.value);
      });

      const api = {
        wrap,
        setItems,
        setValue,
        getValue,
        setError,
        setHint,
        setPlaceholder,
        setEnabled,
        getEnabled: () => !select.disabled,
        setEmptyHint: () => {},
        openList: () => {},
        closeList: () => {},
      };
      wrap.isdComboApi = api;
      return api;
    }

    function buildPhotoUpload() {
      const block = document.createElement("div");
      block.className = "isd-photo-block";
      block.innerHTML = `
        <label class="isd-label">Profile Photo <span class="isd-req">*</span></label>
        <p class="isd-photo-sub">Upload a professional profile photo</p>
        <p class="isd-photo-hint">This image will appear on your public profile.</p>
        <div class="isd-photo-drop" tabindex="0" role="button" aria-label="Upload profile photo">
          <div class="isd-photo-preview">
            <span class="isd-photo-icon">+</span>
          </div>
          <span class="isd-photo-overlay">Upload</span>
        </div>
        <p class="isd-photo-status">JPG, PNG or WEBP · max 5 MB</p>
        <button type="button" class="isd-photo-change">Change Photo</button>
        <p class="isd-field-error isd-photo-error" hidden></p>
      `;
      window.influnetSignupPhoto?.attach?.(block);
      return block;
    }

    function buildGenderSegments(genderSelect) {
      const wrap = document.createElement("div");
      wrap.className = "isd-field isd-gender-field";
      wrap.innerHTML = `
        <label class="isd-label">Gender <span class="isd-optional">(optional)</span></label>
        <div class="isd-segments" role="group" aria-label="Gender"></div>
      `;
      const seg = wrap.querySelector(".isd-segments");
      GENDERS.forEach((g) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "isd-segment";
        btn.textContent = g;
        btn.addEventListener("click", () => {
          seg.querySelectorAll(".isd-segment").forEach((b) => b.classList.remove("isd-segment--on"));
          btn.classList.add("isd-segment--on");
          const reactVal = g === "Non-Binary" ? "Non-binary" : g === "Prefer Not To Say" ? "Prefer not to say" : g;
          setReactSelectValue(genderSelect, reactVal);
        });
        seg.appendChild(btn);
      });
      return wrap;
    }

    function upgradeLanguages(root) {
      const langSection = [...root.querySelectorAll("label")].find((l) =>
        l.textContent.toUpperCase().includes("LANGUAGES")
      )?.parentElement;
      if (!langSection || langSection.dataset.isdLangUpgraded) return;
      langSection.dataset.isdLangUpgraded = "1";
      langSection.classList.add("isd-lang-section");

      const label = langSection.querySelector("label");
      if (label) {
        label.innerHTML = 'Languages <span class="isd-req">*</span>';
        label.className = "isd-label";
      }

      langSection.querySelectorAll("button.rounded-full").forEach((b) => {
        b.classList.add("isd-hidden-native");
      });
      langSection.querySelector(".flex.flex-wrap")?.classList.add("isd-hidden-native");

      const hint = document.createElement("p");
      hint.className = "isd-lang-hint";
      hint.textContent = "Select all languages you create content in.";

      const chips = document.createElement("div");
      chips.className = "isd-lang-chips";
      chips.setAttribute("role", "group");
      chips.setAttribute("aria-label", "Languages");

      LANGUAGES.forEach((lang) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "isd-lang-chip";
        btn.textContent = lang;
        btn.setAttribute("aria-pressed", "false");
        btn.addEventListener("click", () => {
          const reactBtn = [...root.querySelectorAll("button.rounded-full")].find(
            (b) => b.textContent.replace("✓", "").trim() === lang
          );
          reactBtn?.click();
          const on = btn.classList.toggle("isd-lang-chip--on");
          btn.setAttribute("aria-pressed", on ? "true" : "false");
          document.querySelector(".isd-lang-error")?.setAttribute("hidden", "");
        });
        chips.appendChild(btn);
      });

      langSection.appendChild(hint);
      langSection.appendChild(chips);

      const err = document.createElement("p");
      err.className = "isd-field-error isd-lang-error";
      err.hidden = true;
      langSection.appendChild(err);

      syncLangChipsFromReact(root);
    }

    function syncLangChipsFromReact(root) {
      const scope = root || findStepRoot() || document;
      document.querySelectorAll(".isd-lang-chip").forEach((chip) => {
        const lang = chip.textContent.trim();
        const reactBtn = [...scope.querySelectorAll("button.rounded-full")].find(
          (b) => b.textContent.replace("✓", "").trim() === lang
        );
        const on =
          !!reactBtn &&
          (reactBtn.className.includes("bg-primary") ||
            reactBtn.className.includes("border-primary"));
        chip.classList.toggle("isd-lang-chip--on", on);
        chip.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    function syncCityOptions(state, options = {}) {
      const canonical = resolveStateName(state);
      const cities = citiesForState(canonical);
      if (!cityCombo) return;

      const keepCity = !!options.keepCity;
      const prevCity = cityCombo.getValue();

      if (canonical && cities.length) {
        cityCombo.setItems(cities);
        cityCombo.setEnabled(true);
        cityCombo.setHint("");
        cityCombo.setPlaceholder("Select city");
        cityCombo.setError("");
        if (keepCity && prevCity && cities.includes(prevCity)) {
          cityCombo.setValue(prevCity, true);
          if (nativeCityInput) setReactInputValue(nativeCityInput, prevCity);
        } else if (!keepCity || !prevCity || !cities.includes(prevCity)) {
          cityCombo.setValue("", true);
          if (nativeCityInput) setReactInputValue(nativeCityInput, "");
        }
      } else {
        cityCombo.setEnabled(false);
        cityCombo.setItems([]);
        cityCombo.setHint("Select your state first to see available cities.");
        cityCombo.setPlaceholder("Select state first");
        cityCombo.setValue("", true);
        if (nativeCityInput) setReactInputValue(nativeCityInput, "");
      }
    }

    let layoutSynced = false;

    function resetLayoutSync() {
      layoutSynced = false;
      document.querySelectorAll(".isd-grid").forEach((g) => {
        delete g.dataset.isdPhotoRestored;
      });
    }

    function reconnectCombosFromDom(grid) {
      const stateWrap = grid?.querySelector("[data-isd-state]");
      const cityWrap = grid?.querySelector("[data-isd-city]");
      stateCombo = stateWrap?.isdComboApi || null;
      cityCombo = cityWrap?.isdComboApi || null;
      nativeStateInput = findStateInput();
      nativeCityInput = findCityInput();
      if (stateCombo && cityCombo) {
        reconcileStateAndCity();
        restoreLocationFromDraft();
      }
    }

    function teardownLayoutIfNeeded() {
      if (isProfileDetailsStep()) return;

      closeAllCombos();

      // Profile step marks native nodes with isd-hidden-native; React reuses those
      // DOM nodes on later steps (bio, social rows), so strip the class when leaving.
      document.querySelectorAll(".isd-hidden-native").forEach((el) => {
        el.classList.remove("isd-hidden-native");
      });

      document.querySelectorAll(".isd-grid").forEach((grid) => {
        if (isSocialStep()) rescueSocialSectionFromGrid(grid);
        grid.remove();
      });

      document.querySelectorAll(".isd-profile-card").forEach((card) => {
        card.classList.remove("isd-profile-card");
      });

      const usernameRoot = document.getElementById("infl-signup-username-root");
      if (usernameRoot) {
        // Keep profile name visible on step 1; only hide on later signup steps.
        usernameRoot.style.display = isAccountStep() ? "" : "none";
      }

      document.querySelectorAll("[data-isd-layout]").forEach((el) => {
        delete el.dataset.isdLayout;
      });
      resetLayoutSync();
    }

    function hideProfileStepUsername() {
      const usernameEl = document.getElementById("infl-signup-username-root");
      if (usernameEl) usernameEl.style.display = "none";
    }

    function syncCityForCurrentState() {
      if (!stateCombo || !cityCombo) return;
      const st = resolveStateName(stateCombo.getValue() || "");
      if (st) syncCityOptions(st, { keepCity: true });
    }

    function upgradeLayout() {
      if (!isProfileDetailsStep()) return;
      const root = findStepRoot();
      if (!root) return;

      const existingGrid = root.querySelector(":scope > .isd-grid");
      const cityField = existingGrid?.querySelector("[data-isd-city]");
      if (
        existingGrid &&
        cityField &&
        !cityField.querySelector(".isd-combo-input") &&
        !cityField.querySelector(".isd-city-select")
      ) {
        existingGrid.remove();
        delete root.dataset.isdLayout;
        resetLayoutSync();
      } else if (existingGrid) {
        existingGrid.style.display = "";
        root.dataset.isdLayout = "1";
        hideProfileStepUsername();
        if (!layoutSynced) {
          reconnectCombosFromDom(existingGrid);
          hideNativeLocationFields();
          layoutSynced = true;
        } else {
          reconcileStateAndCity();
        }
        existingGrid.querySelectorAll(".isd-photo-block").forEach((b) => {
          window.influnetSignupPhoto?.attach?.(b);
        });
        if (!existingGrid.dataset.isdPhotoRestored) {
          existingGrid.dataset.isdPhotoRestored = "1";
          window.influnetSignupPhoto?.restorePreview?.();
        }
        syncLangChipsFromReact(root);
        return;
      }

      if (root.dataset.isdLayout === "1") return;
      root.dataset.isdLayout = "1";

      const cityInput = findCityInput();
      const stateInput = findStateInput();
      nativeCityInput = cityInput;
      nativeStateInput = stateInput;
      const genderSelect = findGenderSelect();
      const photoHost = findPhotoBlock();
      if (!cityInput || !stateInput) return;

      const originalRow = photoHost?.closest(".flex");
      const stateWrap = stateInput.closest(".space-y-1\\.5") || stateInput.parentElement;
      const langSection = [...root.querySelectorAll("label")].find((l) =>
        l.textContent.toUpperCase().includes("LANGUAGES")
      )?.parentElement;

      const grid = document.createElement("div");
      grid.className = "isd-grid";
      const left = document.createElement("div");
      left.className = "isd-col-left";
      const right = document.createElement("div");
      right.className = "isd-col-right";

      const usernameEl = document.getElementById("infl-signup-username-root");
      if (usernameEl && usernameEl.parentElement?.classList?.contains("isd-col-left")) {
        usernameEl.remove();
      }
      hideProfileStepUsername();

      stateCombo = createSearchCombo({
        label: "State / Province",
        required: true,
        placeholder: "Search state…",
        items: getLoc().states,
        onChange: (val) => handleStateChange(val, { keepCity: false }),
        onBlur: (val) => handleStateChange(val, { keepCity: true }),
      });
      stateCombo.wrap.dataset.isdState = "1";

      cityCombo = createCitySelect({
        label: "City",
        required: true,
        onChange: (val) => handleCityChange(val),
      });
      cityCombo.wrap.dataset.isdCity = "1";
      cityCombo.setEnabled(false);
      cityCombo.setHint("Select your state first to see available cities.");

      const initialState = resolveStateName(
        stateInput.value || document.querySelector("select.influnet-state-select")?.value || ""
      );
      if (initialState) {
        stateCombo.setValue(initialState, true);
        setReactInputValue(stateInput, initialState);
      }
      syncCityOptions(initialState, { keepCity: true });
      const initialCity = cityInput.value || "";
      if (initialCity && citiesForState(initialState).includes(initialCity)) {
        cityCombo.setValue(initialCity, true);
      }
      restoreLocationFromDraft();
      reconcileStateAndCity();

      left.appendChild(stateCombo.wrap);
      left.appendChild(cityCombo.wrap);
      if (langSection) left.appendChild(langSection);

      right.appendChild(buildPhotoUpload());
      if (genderSelect) {
        right.appendChild(buildGenderSegments(genderSelect));
        genderSelect.closest(".space-y-1\\.5")?.classList.add("isd-hidden-native");
      }

      grid.appendChild(left);
      grid.appendChild(right);
      root.prepend(grid);

      const card = root.closest("[class*='rounded-2xl']");
      if (card) card.classList.add("isd-profile-card");

      if (originalRow) originalRow.classList.add("isd-hidden-native");
      if (stateWrap) stateWrap.classList.add("isd-hidden-native");
      hideNativeCityField();

      upgradeLanguages(root);
      wireValidation();
      persistLocationDraft();
      layoutSynced = true;

      window.influnetSignupLocation = {
        getState: () => stateCombo?.getValue() || "",
        getCity: () => cityCombo?.getValue() || "",
        syncCityOptions,
      };
    }

    function getSelectedLanguages() {
      const fromChips = [...document.querySelectorAll(".isd-lang-chip--on")]
        .map((b) => b.textContent.trim())
        .filter(Boolean);
      if (fromChips.length) return fromChips;
      return [...document.querySelectorAll("button.rounded-full")]
        .filter((b) => b.className.includes("bg-primary") || b.className.includes("border-primary"))
        .map((b) => b.textContent.replace("✓", "").trim())
        .filter(Boolean);
    }

    function hasProfilePhoto() {
      return !!window.influnetSignupPhoto?.hasPhoto?.();
    }

    function validateProfileStep() {
      reconcileStateAndCity();
      syncFieldsToReact();

      const usernameInput = document.getElementById("infl-signup-username-input");
      const u = String(
        usernameInput?.value ||
          window.influnetSignupUsername?.getValue?.() ||
          (() => {
            try {
              return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}").username || "";
            } catch {
              return "";
            }
          })()
      )
        .trim()
        .toLowerCase();
      if (!u || !/^[a-z0-9][a-z0-9._]{3,29}$/.test(u)) {
        usernameInput?.closest(".infl-signup-username-wrap")?.classList.add("isd-field--highlight");
        window.setTimeout(
          () =>
            usernameInput?.closest(".infl-signup-username-wrap")?.classList.remove("isd-field--highlight"),
          2200
        );
        return "Choose a valid username (4–30 characters, lowercase, no spaces).";
      }
      const status = document.querySelector(".infl-signup-username-status");
      if (status?.classList.contains("err")) {
        return "Please choose an available username.";
      }
      if (!hasProfilePhoto()) {
        document.querySelector(".isd-photo-error")?.removeAttribute("hidden");
        const el = document.querySelector(".isd-photo-error");
        if (el) {
          el.hidden = false;
          el.textContent = "Please upload a profile photo.";
        }
        return "Please upload a profile photo.";
      }
      const state = resolveStateName(stateCombo?.getValue() || findStateInput()?.value?.trim());
      if (!state || !getLoc().states.includes(state)) {
        stateCombo?.setError("Please select your state.");
        return "Please select your state.";
      }
      stateCombo?.setError("");
      const city =
        resolveCityName(cityCombo?.getValue() || findCityInput()?.value?.trim(), state) ||
        cityCombo?.getValue() ||
        findCityInput()?.value?.trim();
      const cities = citiesForState(state);
      if (!city || !cities.includes(city)) {
        cityCombo?.setError("Please select your city.");
        return "Please select your city.";
      }
      cityCombo?.setError("");
      const langs = getSelectedLanguages();
      if (!langs.length) {
        const le = document.querySelector(".isd-lang-error");
        if (le) {
          le.hidden = false;
          le.textContent = "Please select at least one language.";
        }
        return "Please select at least one language.";
      }
      document.querySelector(".isd-lang-error")?.setAttribute("hidden", "");
      return "";
    }

    function wireValidation() {
      if (window.__isdValidationWired) return;
      window.__isdValidationWired = true;

      document.addEventListener(
        "click",
        (e) => {
          if (!isProfileDetailsStep()) return;
          const btn = e.target.closest("button");
          if (!btn?.textContent?.includes("Next Step")) return;

          if (window.influnetSignupPhoto?.isUploading?.()) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
          }

          const err = validateProfileStep();
          if (err) {
            e.preventDefault();
            e.stopImmediatePropagation();
            showFormError(err);
            scrollToFirstInvalid(err);
            return;
          }
          reconcileStateAndCity();
          syncFieldsToReact();
          persistLocationDraft();
          try {
            const usernameInput = document.getElementById("infl-signup-username-input");
            const u = String(usernameInput?.value || "")
              .trim()
              .toLowerCase();
            if (u) {
              const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
              draft.username = u;
              sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            }
          } catch {
            /* ignore */
          }
          showFormError("");
        },
        true
      );
    }

    function refreshLocationData() {
      const loc = getLoc();
      if (!loc.states?.length) return;
      if (stateCombo) {
        stateCombo.setItems(loc.states);
        reconcileStateAndCity();
        syncCityForCurrentState();
      }
    }

    function tick() {
      if (!isSignupPage()) return;
      teardownLayoutIfNeeded();
      if (!isProfileDetailsStep()) return;
      hideProfileStepUsername();
      upgradeLayout();
      refreshLocationData();
      syncCityForCurrentState();
    }

    tick();
    setInterval(tick, 600);
    window.addEventListener("load", tick);
    window.addEventListener("influnet-india-locations-ready", () => {
      refreshLocationData();
      syncCityForCurrentState();
      if (isProfileDetailsStep()) upgradeLayout();
    });
  } catch (e) {
    console.warn("[influnet] signup profile details:", e);
  }
})();
