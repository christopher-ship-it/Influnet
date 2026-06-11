/**
 * Forgot / reset password — hooks "Forgot Password?" buttons and /reset-password route.
 */
(function () {
  const OVERLAY_ID = "influnet-forgot-overlay";
  const RESET_ROOT_ID = "influnet-reset-password-root";

  async function api(path, method, body) {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
    return data;
  }

  function nearestEmailInput(fromEl) {
    const form = fromEl?.closest?.("form");
    const input = form?.querySelector?.('input[type="email"]');
    return input?.value?.trim() || "";
  }

  function openForgotModal(prefillEmail) {
    if (document.getElementById(OVERLAY_ID)) return;

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className =
      "fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 p-4";
    overlay.innerHTML = `
      <div class="w-full max-w-md rounded-2xl bg-[#111116] border border-white/10 p-6 shadow-2xl text-white">
        <h2 class="text-xl font-bold">Reset your password</h2>
        <p class="text-sm text-gray-400 mt-2">Enter your account email. We will send a reset link.</p>
        <form id="influnet-forgot-form" class="mt-5 space-y-4">
          <div>
            <label class="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1.5" for="influnet-forgot-email">Email</label>
            <input id="influnet-forgot-email" type="email" required
              class="w-full h-11 px-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              placeholder="you@example.com" value="${prefillEmail ? String(prefillEmail).replace(/"/g, "&quot;") : ""}" />
          </div>
          <p id="influnet-forgot-msg" class="hidden text-sm rounded-xl px-3 py-2"></p>
          <div class="flex gap-3 pt-1">
            <button type="button" id="influnet-forgot-cancel"
              class="flex-1 h-11 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 text-sm font-semibold">Cancel</button>
            <button type="submit" id="influnet-forgot-submit"
              class="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50">Send reset link</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(overlay);

    const form = overlay.querySelector("#influnet-forgot-form");
    const msg = overlay.querySelector("#influnet-forgot-msg");
    const submit = overlay.querySelector("#influnet-forgot-submit");
    const cancel = overlay.querySelector("#influnet-forgot-cancel");

    function close() {
      overlay.remove();
    }

    cancel.addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = overlay.querySelector("#influnet-forgot-email").value.trim();
      msg.className = "hidden text-sm rounded-xl px-3 py-2";
      submit.disabled = true;
      try {
        await api("/api/auth/forgot-password", "POST", { email });
        msg.textContent =
          "If an account exists for this email, a reset link has been sent. Check your inbox.";
        msg.className =
          "text-sm rounded-xl px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-300";
      } catch (err) {
        msg.textContent = err.message;
        msg.className =
          "text-sm rounded-xl px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-300";
      } finally {
        submit.disabled = false;
      }
    });
  }

  function mountResetPasswordPage() {
    if (document.getElementById(RESET_ROOT_ID)) return;

    const root = document.getElementById("root");
    if (!root) return;

    const wrap = document.createElement("div");
    wrap.id = RESET_ROOT_ID;
    wrap.className =
      "min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6";
    wrap.innerHTML = `
      <div class="w-full max-w-md rounded-2xl bg-[#111116] border border-white/10 p-6 shadow-2xl">
        <h1 class="text-2xl font-bold">Choose a new password</h1>
        <p class="text-sm text-gray-400 mt-2">Enter a new password for your account.</p>
        <form id="influnet-reset-form" class="mt-5 space-y-4">
          <div>
            <label class="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1.5" for="influnet-reset-pass">New password</label>
            <input id="influnet-reset-pass" type="password" required minlength="6"
              class="w-full h-11 px-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              placeholder="At least 6 characters" />
          </div>
          <div>
            <label class="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1.5" for="influnet-reset-confirm">Confirm password</label>
            <input id="influnet-reset-confirm" type="password" required minlength="6"
              class="w-full h-11 px-3 rounded-xl bg-[#1a1a2a] border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              placeholder="Repeat password" />
          </div>
          <p id="influnet-reset-msg" class="hidden text-sm rounded-xl px-3 py-2"></p>
          <button type="submit" id="influnet-reset-submit"
            class="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50">Update password</button>
          <p class="text-center text-xs text-gray-500">
            <a href="/login" class="text-violet-400 hover:underline">Back to login</a>
          </p>
        </form>
      </div>`;

    root.innerHTML = "";
    root.appendChild(wrap);

    const form = wrap.querySelector("#influnet-reset-form");
    const msg = wrap.querySelector("#influnet-reset-msg");
    const submit = wrap.querySelector("#influnet-reset-submit");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = wrap.querySelector("#influnet-reset-pass").value;
      const confirmPassword = wrap.querySelector("#influnet-reset-confirm").value;
      msg.className = "hidden text-sm rounded-xl px-3 py-2";
      submit.disabled = true;
      try {
        await api("/api/auth/reset-password", "POST", { password, confirmPassword });
        msg.textContent = "Password updated. Redirecting to login…";
        msg.className =
          "text-sm rounded-xl px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-300";
        localStorage.removeItem("influnet_token");
        localStorage.removeItem("influnet_refresh_token");
        localStorage.removeItem("influnet_user");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } catch (err) {
        msg.textContent = err.message;
        msg.className =
          "text-sm rounded-xl px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-300";
      } finally {
        submit.disabled = false;
      }
    });
  }

  function isResetPasswordRoute() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return path === "/reset-password";
  }

  function maybeMountResetPage() {
    if (!isResetPasswordRoute()) return;
    const tryMount = () => {
      if (document.getElementById("root") && !document.getElementById(RESET_ROOT_ID)) {
        mountResetPasswordPage();
        return true;
      }
      return !!document.getElementById(RESET_ROOT_ID);
    };
    if (tryMount()) return;
    const obs = new MutationObserver(() => tryMount());
    const root = document.getElementById("root");
    if (root) {
      obs.observe(root, { childList: true });
      setTimeout(tryMount, 0);
      setTimeout(tryMount, 500);
      setTimeout(tryMount, 1500);
    } else {
      obs.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest?.("button");
    if (!btn) return;
    const label = (btn.textContent || "").trim();
    if (label !== "Forgot Password?") return;
    e.preventDefault();
    e.stopPropagation();
    openForgotModal(nearestEmailInput(btn));
  });

  window.addEventListener("influnet-password-recovery", maybeMountResetPage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", maybeMountResetPage);
  } else {
    maybeMountResetPage();
  }

  window.addEventListener("hashchange", maybeMountResetPage);
})();
