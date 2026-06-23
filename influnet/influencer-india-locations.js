/**
 * India states → cities for signup & profile forms.
 * Uses /data/india-states-cities.js (4,199+ cities). Retries load if the dataset is missing.
 */
(function () {
  const DATA_URL = "/data/india-states-cities.js?v=2";

  function normalize(data) {
    if (!data?.states?.length) return null;
    return {
      states: data.states.slice(),
      citiesByState: { ...data.citiesByState },
    };
  }

  function apply(data) {
    const n = normalize(data);
    if (!n) return false;
    window.INFLUNET_INDIA_STATES_CITIES = data;
    window.INFLUNET_INDIA_LOCATIONS = n;
    window.dispatchEvent(new CustomEvent("influnet-india-locations-ready"));
    return true;
  }

  function loadScript() {
    if (document.querySelector(`script[data-infl-india-loc="${DATA_URL}"]`)) return;
    const s = document.createElement("script");
    s.src = DATA_URL;
    s.dataset.inflIndiaLoc = DATA_URL;
    s.onload = () => {
      if (!apply(window.INFLUNET_INDIA_STATES_CITIES)) {
        console.warn("[influnet] India locations dataset loaded but empty.");
      }
    };
    s.onerror = () => {
      console.warn("[influnet] Could not load India locations from", DATA_URL);
    };
    document.head.appendChild(s);
  }

  if (!apply(window.INFLUNET_INDIA_STATES_CITIES)) {
    loadScript();
  }
})();
