/**
 * Business signup: skip legacy review screen; send new owners straight to dashboard.
 */
(function () {
  function redirectLegacyReviewUrl() {
    const path = window.location.pathname.replace(/\/$/, "");
    const params = new URLSearchParams(window.location.search);
    if (path === "/signup/business" && params.get("review") === "pending") {
      window.location.replace("/dashboard");
    }
  }

  function hookRegisterSuccess() {
    if (window.__inflBusinessRegisterHook) return;
    window.__inflBusinessRegisterHook = true;
    const prev = window.fetch.bind(window);
    window.fetch = async function (input, init) {
      const res = await prev(input, init);
      const url = typeof input === "string" ? input : input?.url || "";
      const method = (init?.method || "GET").toUpperCase();
      if (url.includes("/api/auth/register") && method === "POST") {
        try {
          const data = await res.clone().json();
          if (data?.user && data?.token && data.user.role === "business_owner") {
            localStorage.setItem("influnet_user", JSON.stringify(data.user));
            localStorage.setItem("influnet_token", data.token);
            if (data.refreshToken) {
              localStorage.setItem("influnet_refresh_token", data.refreshToken);
            }
            window.dispatchEvent(
              new CustomEvent("influnet-user-updated", {
                detail: { user: data.user, token: data.token },
              })
            );
            window.location.replace("/dashboard");
          }
        } catch {
          /* ignore */
        }
      }
      return res;
    };
  }

  hookRegisterSuccess();
  redirectLegacyReviewUrl();
  document.addEventListener("DOMContentLoaded", redirectLegacyReviewUrl);
})();
