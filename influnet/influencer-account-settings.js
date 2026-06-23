/**
 * Email + password settings on the influencer Edit Profile page.
 */
(function () {
  const MOUNT_ID = "influnet-influencer-account-mount";

  const ICON = {
    key: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
    mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>',
  };

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

  function refField(label, inputHtml, full) {
    return `<div class="infl-ref-field${full ? " infl-ref-field--full" : ""}"><label class="infl-ref-label">${label}</label>${inputHtml}</div>`;
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

    root.innerHTML = `
      <div id="influnet-influencer-account-msg" class="infl-ref-msg" style="display:none"></div>

      <section class="infl-ref-card">
        <div class="infl-ref-card-head">
          <div class="infl-ref-card-icon infl-ref-card-icon--blue">${ICON.mail}</div>
          <div class="infl-ref-card-titles">
            <h3>Email address</h3>
            <p>Update the email you use to sign in to Influnet.</p>
          </div>
        </div>
        <form id="infl-account-email-form" class="infl-ref-grid infl-ref-grid--single">
          ${refField(`New email <span style="font-weight:400;text-transform:none;letter-spacing:0">(current: ${user?.email || "—"})</span>`, `<input id="infl-account-email" type="email" value="${user?.email || ""}" required />`, true)}
          ${refField("Current password (to confirm)", `<input id="infl-account-email-pw" type="password" required />`, true)}
          <div class="infl-ref-field infl-ref-field--full">
            <button type="submit" class="infl-ref-btn" id="infl-account-email-btn">Update email</button>
          </div>
        </form>
      </section>

      <section class="infl-ref-card">
        <div class="infl-ref-card-head">
          <div class="infl-ref-card-icon infl-ref-card-icon--slate">${ICON.key}</div>
          <div class="infl-ref-card-titles">
            <h3>Password</h3>
            <p>Set or change your sign-in password.</p>
          </div>
        </div>
        <form id="infl-account-pass-form" class="infl-ref-grid">
          ${refField("Current password", `<input id="infl-account-current-pw" type="password" required />`, false)}
          ${refField("New password", `<input id="infl-account-new-pw" type="password" placeholder="At least 6 characters" required />`, false)}
          <div class="infl-ref-field infl-ref-field--full">
            <button type="submit" class="infl-ref-btn" id="infl-account-pass-btn">Change password</button>
          </div>
        </form>
      </section>`;

    const msg = root.querySelector("#influnet-influencer-account-msg");
    function showMsg(text, ok) {
      if (!msg) return;
      msg.style.display = "block";
      msg.textContent = text;
      msg.className = `infl-ref-msg ${ok ? "ok" : "err"}`;
    }

    root.querySelector("#infl-account-email-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = root.querySelector("#infl-account-email-btn");
      btn.disabled = true;
      try {
        const data = await api("/api/auth/update-email", "POST", {
          email: root.querySelector("#infl-account-email").value,
          password: root.querySelector("#infl-account-email-pw").value,
        });
        if (data.user) applyUser(data.user, data.token);
        showMsg("Email update initiated. Check your inbox if confirmation is required.", true);
      } catch (err) {
        showMsg(err.message, false);
      } finally {
        btn.disabled = false;
      }
    });

    root.querySelector("#infl-account-pass-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = root.querySelector("#infl-account-pass-btn");
      btn.disabled = true;
      try {
        await api("/api/auth/change-password", "POST", {
          currentPassword: root.querySelector("#infl-account-current-pw").value,
          newPassword: root.querySelector("#infl-account-new-pw").value,
        });
        root.querySelector("#infl-account-pass-form").reset();
        showMsg("Password changed successfully.", true);
      } catch (err) {
        showMsg(err.message, false);
      } finally {
        btn.disabled = false;
      }
    });
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
