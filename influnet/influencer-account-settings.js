/**
 * Email + password settings on the influencer Edit Profile page.
 * Mounts into #influnet-influencer-account-mount (injected in the profile view).
 */
(function () {
  const MOUNT_ID = "influnet-influencer-account-mount";

  function getStoredUser() {
    try {
      const raw = localStorage.getItem("influnet_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function applyUser(user, token) {
    if (user) localStorage.setItem("influnet_user", JSON.stringify(user));
    if (token) localStorage.setItem("influnet_token", token);
    window.dispatchEvent(
      new CustomEvent("influnet-user-updated", { detail: { user, token } })
    );
  }

  async function api(path, method, body) {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem("influnet_token");
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
    return data;
  }

  function field(label, id, type, value, opts) {
    const wrap = document.createElement("div");
    wrap.className = "space-y-1";
    const lbl = document.createElement("label");
    lbl.className = "text-sm font-medium text-gray-700";
    lbl.htmlFor = id;
    lbl.textContent = label;
    const input = document.createElement("input");
    input.id = id;
    input.name = id;
    input.type = type || "text";
    input.value = value ?? "";
    input.className =
      "w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400";
    if (opts?.placeholder) input.placeholder = opts.placeholder;
    if (opts?.required) input.required = true;
    wrap.appendChild(lbl);
    wrap.appendChild(input);
    return wrap;
  }

  async function renderAccountSettings(root) {
    if (root.dataset.rendered === "1") return;
    root.dataset.rendered = "1";

    let user = getStoredUser();
    try {
      const data = await api("/api/auth/me", "GET");
      if (data.user) {
        user = data.user;
        applyUser(data.user, data.token);
      }
    } catch (_) {
      /* use cached user */
    }

    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "space-y-6";

    const msg = document.createElement("div");
    msg.id = "influnet-influencer-account-msg";
    msg.className = "hidden text-sm rounded-xl px-4 py-3";
    wrap.appendChild(msg);

    function showMsg(text, ok) {
      msg.textContent = text;
      msg.className = ok
        ? "text-sm rounded-xl px-4 py-3 bg-green-50 text-green-800 border border-green-100"
        : "text-sm rounded-xl px-4 py-3 bg-red-50 text-red-800 border border-red-100";
    }

    const emailCard = document.createElement("div");
    emailCard.className =
      "bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4";
    emailCard.innerHTML =
      '<h2 class="text-lg font-semibold text-gray-900">Email address</h2><p class="text-xs text-gray-500">Current: ' +
      (user?.email || "—") +
      "</p>";
    const emailForm = document.createElement("form");
    emailForm.className = "space-y-4";
    emailForm.appendChild(
      field("New email", "email", "email", user?.email, { required: true })
    );
    emailForm.appendChild(
      field("Current password (to confirm)", "password", "password", "", {
        required: true,
      })
    );
    const emailBtn = document.createElement("button");
    emailBtn.type = "submit";
    emailBtn.className =
      "bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50";
    emailBtn.textContent = "Update email";
    emailForm.appendChild(emailBtn);
    emailForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      emailBtn.disabled = true;
      try {
        const fd = new FormData(emailForm);
        const data = await api("/api/auth/update-email", "POST", {
          email: fd.get("email"),
          password: fd.get("password"),
        });
        if (data.user) applyUser(data.user, data.token);
        showMsg(
          "Email updated. If Supabase sent a confirmation link, click it to finish.",
          true
        );
      } catch (err) {
        showMsg(err.message, false);
      } finally {
        emailBtn.disabled = false;
      }
    });
    emailCard.appendChild(emailForm);
    wrap.appendChild(emailCard);

    const passCard = document.createElement("div");
    passCard.className =
      "bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4";
    passCard.innerHTML =
      '<h2 class="text-lg font-semibold text-gray-900">Change password</h2>';
    const passForm = document.createElement("form");
    passForm.className = "space-y-4";
    passForm.appendChild(
      field("Current password", "currentPassword", "password", "", { required: true })
    );
    passForm.appendChild(
      field("New password", "newPassword", "password", "", {
        required: true,
        placeholder: "At least 6 characters",
      })
    );
    const passBtn = document.createElement("button");
    passBtn.type = "submit";
    passBtn.className =
      "bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50";
    passBtn.textContent = "Change password";
    passForm.appendChild(passBtn);
    passForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      passBtn.disabled = true;
      try {
        const fd = new FormData(passForm);
        await api("/api/auth/change-password", "POST", {
          currentPassword: fd.get("currentPassword"),
          newPassword: fd.get("newPassword"),
        });
        passForm.reset();
        showMsg("Password changed successfully.", true);
      } catch (err) {
        showMsg(err.message, false);
      } finally {
        passBtn.disabled = false;
      }
    });
    passCard.appendChild(passForm);
    wrap.appendChild(passCard);

    root.appendChild(wrap);
  }

  function tryMount() {
    const el = document.getElementById(MOUNT_ID);
    if (el) renderAccountSettings(el);
  }

  const observer = new MutationObserver(tryMount);

  function startObserver() {
    const root = document.body || document.documentElement;
    if (!root) return;
    observer.observe(root, { childList: true, subtree: true });
    tryMount();
  }

  if (document.body) startObserver();
  else document.addEventListener("DOMContentLoaded", startObserver);

  window.addEventListener("influnet-influencer-account-remount", () => {
    const el = document.getElementById(MOUNT_ID);
    if (el) {
      delete el.dataset.rendered;
      renderAccountSettings(el);
    }
  });
})();
