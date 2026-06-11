/**
 * Bypass login OTP — sign in with email + password (business pre-deployment).
 */
(function () {
  function isLoginPage() {
    return window.location.pathname.replace(/\/$/, "") === "/login";
  }

  function destination(user) {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return user?.role === "influencer" ? "/dashboard/influencer" : "/dashboard";
  }

  function applyAuth(user, token, refreshToken) {
    localStorage.setItem("influnet_user", JSON.stringify(user));
    localStorage.setItem("influnet_token", token);
    if (refreshToken) {
      localStorage.setItem("influnet_refresh_token", refreshToken);
    }
    window.dispatchEvent(
      new CustomEvent("influnet-user-updated", { detail: { user, token } })
    );
  }

  function showError(form, message) {
    let box = form.querySelector("[data-influnet-login-error]");
    if (!box) {
      box = document.createElement("div");
      box.dataset.influnetLoginError = "1";
      box.className =
        "flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mt-2";
      box.innerHTML = '<p class="text-xs text-red-400"></p>';
      const btn = form.querySelector('[data-testid="button-submit"]');
      if (btn) btn.parentNode.insertBefore(box, btn);
      else form.appendChild(box);
    }
    const p = box.querySelector("p");
    if (p) p.textContent = message;
  }

  async function onSubmit(ev) {
    if (!isLoginPage()) return;

    const form = ev.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.querySelector('[data-testid="button-verify-otp"]')) return;

    const emailInput = form.querySelector('[data-testid="input-email"]');
    const passInput = form.querySelector('[data-testid="input-password"]');
    if (!emailInput || !passInput) return;

    ev.preventDefault();
    ev.stopImmediatePropagation();

    const email = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) {
      showError(form, "Please enter your email and password.");
      return;
    }

    const btn = form.querySelector('[data-testid="button-submit"]');
    const prevLabel = btn?.textContent;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Signing in…";
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password.");
      }

      applyAuth(data.user, data.token, data.refreshToken);
      window.location.replace(destination(data.user));
    } catch (err) {
      showError(form, err.message || "Login failed.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = prevLabel || "Log In";
      }
    }
  }

  document.addEventListener("submit", onSubmit, true);
})();
