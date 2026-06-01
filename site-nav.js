/**
 * Wires data-influnet-app paths to the React app (influnet.io build at /app/).
 * Routes: /login, /signup, /signup/business, /signup/influencer,
 *         /dashboard, /dashboard/influencer, /influencers
 */
(function () {
  function wire() {
    if (typeof influnetAppUrl !== "function") return;

    document.querySelectorAll("[data-influnet-app]").forEach(function (el) {
      var path = el.getAttribute("data-influnet-app");
      if (!path) return;
      var url = influnetAppUrl(path);

      if (el.tagName === "A") {
        el.setAttribute("href", url);
        return;
      }

      if (el.tagName === "BUTTON" || el.tagName === "INPUT") {
        el.addEventListener("click", function (e) {
          if (el.type === "submit" && el.form) return;
          e.preventDefault();
          window.location.href = url;
        });
        return;
      }

      el.style.cursor = "pointer";
      el.addEventListener("click", function () {
        window.location.href = url;
      });
    });

    document.querySelectorAll("[data-influnet-app-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var path = form.getAttribute("data-influnet-app-form") || "/login";
        window.location.href = influnetAppUrl(path);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
