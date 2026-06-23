/**
 * Influencer signup & profile: state/province as dropdown; city stays typed.
 */
(function () {
  try {
    const INDIAN_STATES = [
      "Andhra Pradesh",
      "Arunachal Pradesh",
      "Assam",
      "Bihar",
      "Chhattisgarh",
      "Goa",
      "Gujarat",
      "Haryana",
      "Himachal Pradesh",
      "Jharkhand",
      "Karnataka",
      "Kerala",
      "Madhya Pradesh",
      "Maharashtra",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Odisha",
      "Punjab",
      "Rajasthan",
      "Sikkim",
      "Tamil Nadu",
      "Telangana",
      "Tripura",
      "Uttar Pradesh",
      "Uttarakhand",
      "West Bengal",
      "Andaman and Nicobar Islands",
      "Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi",
      "Jammu and Kashmir",
      "Ladakh",
      "Lakshadweep",
      "Puducherry",
    ];

    const STATE_PLACEHOLDER = "e.g. Tamil Nadu";
    const CITY_PLACEHOLDER = "e.g. Mumbai";
    const COMMON_CITIES = [
      "Mumbai",
      "Delhi",
      "Bengaluru",
      "Hyderabad",
      "Chennai",
      "Kolkata",
      "Pune",
      "Ahmedabad",
      "Jaipur",
      "Lucknow",
      "Surat",
      "Indore",
      "Bhopal",
      "Patna",
      "Chandigarh",
      "Coimbatore",
      "Kochi",
      "Visakhapatnam",
      "Nagpur",
      "Noida",
      "Gurugram",
    ];
    const CITIES_BY_STATE = {
      Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
      Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"],
      Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
      "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
      Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
      Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
      "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Agra", "Varanasi"],
      "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
      Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kannur"],
      Delhi: ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
      Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar"],
      Punjab: ["Chandigarh", "Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
    };

    function setReactInputValue(input, value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (setter) setter.call(input, value);
      else input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function hideStateInput(input) {
      input.classList.add("influnet-state-input-hidden");
      input.style.setProperty("display", "none", "important");
      input.tabIndex = -1;
      input.setAttribute("aria-hidden", "true");
    }

    function isBusinessSignup() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/business";
    }

    function findStateSelect(input) {
      if (input.nextElementSibling?.classList?.contains("influnet-state-select")) {
        return input.nextElementSibling;
      }
      return input.parentElement?.querySelector(":scope > select.influnet-state-select") || null;
    }

    function findCitySelect(input) {
      if (input.nextElementSibling?.classList?.contains("influnet-city-select")) {
        return input.nextElementSibling;
      }
      return input.parentElement?.querySelector(":scope > select.influnet-city-select") || null;
    }

    function upgradeStateInput(input) {
      if (document.querySelector("[data-isd-state]")) return;
      if (input.classList.contains("influnet-state-input-hidden")) return;
      if (input.getAttribute("placeholder") !== STATE_PLACEHOLDER) return;

      const existing = findStateSelect(input);
      if (existing) {
        hideStateInput(input);
        return;
      }

      if (input.dataset.influnetStateUpgraded === "1") {
        hideStateInput(input);
        return;
      }

      input.dataset.influnetStateUpgraded = "1";

      const select = document.createElement("select");
      select.className = `${input.className} influnet-state-select`.trim();
      select.setAttribute("aria-label", "State / Province");

      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Select state";
      select.appendChild(empty);

      INDIAN_STATES.forEach((state) => {
        const opt = document.createElement("option");
        opt.value = state;
        opt.textContent = state;
        select.appendChild(opt);
      });

      const syncSelectFromInput = () => {
        const val = input.value || "";
        if (val && ![...select.options].some((o) => o.value === val)) {
          const custom = document.createElement("option");
          custom.value = val;
          custom.textContent = val;
          select.appendChild(custom);
        }
        select.value = val;
      };

      syncSelectFromInput();

      select.addEventListener("change", () => {
        setReactInputValue(input, select.value);
      });

      hideStateInput(input);
      input.insertAdjacentElement("afterend", select);

      const poll = window.setInterval(() => {
        if (!document.body.contains(input)) {
          window.clearInterval(poll);
          return;
        }
        if (input.value !== select.value) syncSelectFromInput();
      }, 400);
    }

    function createCityOptions(select, stateValue, keepValue) {
      const current = keepValue || "";
      const stateCities = CITIES_BY_STATE[stateValue] || [];
      const cities = stateCities.length ? stateCities : COMMON_CITIES;
      select.innerHTML = "";
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Select city";
      select.appendChild(empty);
      cities.forEach((city) => {
        const opt = document.createElement("option");
        opt.value = city;
        opt.textContent = city;
        select.appendChild(opt);
      });
      if (current) {
        if (![...select.options].some((o) => o.value === current)) {
          const custom = document.createElement("option");
          custom.value = current;
          custom.textContent = current;
          select.appendChild(custom);
        }
        select.value = current;
      }
    }

    function upgradeCityInput(input) {
      if (!isBusinessSignup()) return;
      if (document.querySelector("[data-isd-city]")) return;
      if (input.classList.contains("influnet-state-input-hidden")) return;
      if (input.getAttribute("placeholder") !== CITY_PLACEHOLDER) return;

      const existing = findCitySelect(input);
      if (existing) {
        hideStateInput(input);
        return;
      }
      if (input.dataset.influnetCityUpgraded === "1") {
        hideStateInput(input);
        return;
      }
      input.dataset.influnetCityUpgraded = "1";

      const select = document.createElement("select");
      select.className = `${input.className} influnet-city-select`.trim();
      select.setAttribute("aria-label", "City");
      select.dataset.isdCity = "1";

      const getState = () => {
        const stateSelect = document.querySelector("select.influnet-state-select");
        if (stateSelect?.value) return stateSelect.value;
        const stateInput = document.querySelector(`input[placeholder="${STATE_PLACEHOLDER}"]`);
        return stateInput?.value || "";
      };

      const syncSelectFromInput = () => {
        const val = input.value || "";
        createCityOptions(select, getState(), val);
      };

      syncSelectFromInput();
      select.addEventListener("change", () => setReactInputValue(input, select.value));
      document.addEventListener("change", (e) => {
        if (e.target?.matches?.("select.influnet-state-select")) {
          createCityOptions(select, getState(), "");
          setReactInputValue(input, "");
        }
      });

      hideStateInput(input);
      input.insertAdjacentElement("afterend", select);

      const poll = window.setInterval(() => {
        if (!document.body.contains(input)) {
          window.clearInterval(poll);
          return;
        }
        if (input.value !== select.value) syncSelectFromInput();
      }, 400);
    }

    function ensureCityInputs() {
      document.querySelectorAll('input[placeholder="e.g. Mumbai"]').forEach((input) => {
        if (input.type === "hidden") return;
        input.type = "text";
        input.autocomplete = "address-level2";
      });
    }

    function run() {
      document
        .querySelectorAll(`input[placeholder="${STATE_PLACEHOLDER}"]`)
        .forEach(upgradeStateInput);

      document.querySelectorAll(`input[placeholder="${CITY_PLACEHOLDER}"]`).forEach(upgradeCityInput);

      document.querySelectorAll("select.influnet-state-select").forEach((select) => {
        const prev = select.previousElementSibling;
        if (prev?.matches(`input[placeholder="${STATE_PLACEHOLDER}"]`)) {
          hideStateInput(prev);
        }
      });

      ensureCityInputs();
    }

    run();
    window.addEventListener("load", run);
    window.setInterval(run, 1500);
  } catch (err) {
    console.warn("[influnet] influencer state dropdown:", err);
  }
})();
