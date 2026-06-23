/**
 * Protect dashboard routes — require a valid session before rendering.
 * Without this, /dashboard opens with placeholder "Your Business" UI for anyone.
 */
(function () {
  const PROTECTED = [/^\/dashboard(\/|$)/];

  function isProtectedPath(path) {
    return PROTECTED.some((re) => re.test(path));
  }

  function loginUrl(next) {
    const u = new URL("/login", window.location.origin);
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      u.searchParams.set("next", next);
    }
    return u.pathname + u.search;
  }

  function clearAuth() {
    localStorage.removeItem("influnet_token");
    localStorage.removeItem("influnet_refresh_token");
    localStorage.removeItem("influnet_user");
  }

  function redirectToLogin(next) {
    clearAuth();
    window.location.replace(loginUrl(next));
  }

  function postLoginDestination(user) {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return user?.role === "influencer" ? "/dashboard/influencer" : "/dashboard";
  }

  window.addEventListener("influnet-user-updated", (ev) => {
    if (!window.location.pathname.startsWith("/login")) return;
    const user = ev.detail?.user;
    if (!user) return;
    window.location.replace(postLoginDestination(user));
  });

  async function ensureAuth() {
    const path = window.location.pathname;
    if (!isProtectedPath(path)) return;

    const token = localStorage.getItem("influnet_token");
    const refresh = localStorage.getItem("influnet_refresh_token");
    if (!token && !refresh) {
      redirectToLogin(path);
      return;
    }

    try {
      const headers = {};
      if (token) headers.Authorization = "Bearer " + token;
      const res = await fetch("/api/auth/me", { headers });
      if (!res.ok) {
        redirectToLogin(path);
        return;
      }
      const data = await res.json();
      if (data?.user) {
        localStorage.setItem("influnet_user", JSON.stringify(data.user));
        const path = window.location.pathname.replace(/\/$/, "") || "/";
        if (data.user.role === "influencer" && path === "/dashboard") {
          window.location.replace("/dashboard/influencer");
          return;
        }
        if (
          data.user.role === "influencer" &&
          (path === "/dashboard/settings" || path === "/dashboard/profile")
        ) {
          try {
            sessionStorage.setItem("influnet_open_settings", path);
          } catch (_) {}
          window.location.replace("/dashboard/influencer");
          return;
        }
        if (data.user.role === "business_owner" && path.startsWith("/dashboard/influencer")) {
          window.location.replace("/dashboard");
          return;
        }
      }
    } catch (_) {
      // Network error — allow render; API calls will fail safely.
    }
  }

  if (isProtectedPath(window.location.pathname)) {
    document.documentElement.classList.add("influnet-auth-check");
    const style = document.createElement("style");
    style.textContent = "html.influnet-auth-check #root{visibility:hidden}";
    document.head.appendChild(style);

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      document.documentElement.classList.remove("influnet-auth-check");
    };

    const earlyTimer = window.setTimeout(reveal, 500);
    const maxTimer = window.setTimeout(reveal, 4000);

    ensureAuth().finally(() => {
      window.clearTimeout(earlyTimer);
      window.clearTimeout(maxTimer);
      reveal();
    });
  }
})();
