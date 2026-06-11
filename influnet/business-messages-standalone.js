/**
 * Business Messages: standalone chat UI when React panel fails to paint (flex height / script conflicts).
 */
(function () {
  if (window.__inflBizMsgsStandaloneInit) return;
  window.__inflBizMsgsStandaloneInit = true;

  try {
    const HOST_ID = "influnet-biz-msgs-standalone";

    function isBusinessDashboard() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path !== "/dashboard") return false;
      try {
        const user = JSON.parse(localStorage.getItem("influnet_user") || "null");
        return user?.role !== "influencer";
      } catch {
        return false;
      }
    }

    function normalizeNavText(text) {
      return String(text || "")
        .replace(/\d+/g, "")
        .replace(/\+/g, "")
        .trim();
    }

    function getActiveNavLabel() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return "";
      const active = [...nav.querySelectorAll(":scope > button")].find(
        (b) =>
          b.classList.contains("bg-violet-100") ||
          /\bbg-violet-100\b/.test(b.className)
      );
      return active ? normalizeNavText(active.textContent) : "";
    }

    function isMessagesTab() {
      return (
        isBusinessDashboard() &&
        getActiveNavLabel().toLowerCase() === "messages"
      );
    }

    function getColumn() {
      return document.querySelector(
        ".flex.h-screen > .flex-1.flex.flex-col.min-w-0"
      );
    }

    function getMain() {
      return getColumn()?.querySelector("main.flex-1");
    }

    function escapeHtml(str) {
      return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    }

    function timeShort(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    async function api(path, opts) {
      const token = localStorage.getItem("influnet_token");
      const res = await fetch(path, {
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
          ...(opts?.headers || {}),
        },
        ...opts,
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    }

    function ensureHost() {
      const col = getColumn();
      if (!col) return null;
      if (getComputedStyle(col).position === "static") {
        col.style.position = "relative";
      }
      let host = document.getElementById(HOST_ID);
      if (!host) {
        host = document.createElement("div");
        host.id = HOST_ID;
        host.className = "influnet-biz-msgs-standalone";
        col.appendChild(host);
      }
      return host;
    }

    function hideHost() {
      const host = document.getElementById(HOST_ID);
      if (host) host.style.display = "none";
      const main = getMain();
      if (main) {
        main.style.removeProperty("visibility");
        main.style.removeProperty("pointer-events");
      }
    }

    function showHost() {
      const host = ensureHost();
      if (!host) return null;
      host.style.display = "flex";
      const main = getMain();
      if (main) {
        main.style.visibility = "hidden";
        main.style.pointerEvents = "none";
      }
      return host;
    }

    const state = {
      conversations: [],
      activeId: null,
      messages: [],
      loading: true,
      sending: false,
      draft: "",
      error: "",
    };

    function displayName(conv) {
      const o = conv?.otherUser || {};
      return o.companyName || o.name || "User";
    }

    function render(host) {
      const active =
        state.conversations.find((c) => c.id === state.activeId) || null;
      const activeName = active ? displayName(active) : "";

      host.innerHTML = `
        <div class="infl-biz-msgs-layout">
          <aside class="infl-biz-msgs-sidebar">
            <div class="infl-biz-msgs-sidebar-head">
              <h1>Messages</h1>
            </div>
            <div class="infl-biz-msgs-list">
              ${
                state.loading
                  ? '<p class="infl-biz-msgs-muted">Loading…</p>'
                  : state.conversations.length === 0
                    ? '<p class="infl-biz-msgs-muted">No conversations yet. Connection requests must be accepted before messaging.</p>'
                    : state.conversations
                        .map((c) => {
                          const name = escapeHtml(displayName(c));
                          const activeCls =
                            c.id === state.activeId ? " is-active" : "";
                          return `<button type="button" class="infl-biz-msgs-item${activeCls}" data-conv-id="${escapeHtml(c.id)}">
                            <span class="infl-biz-msgs-item-name">${name}</span>
                            <span class="infl-biz-msgs-item-preview">${escapeHtml(c.lastMessage || "No messages yet")}</span>
                            <span class="infl-biz-msgs-item-time">${escapeHtml(timeShort(c.lastMessageAt))}</span>
                          </button>`;
                        })
                        .join("")
              }
            </div>
          </aside>
          <section class="infl-biz-msgs-thread">
            ${
              !active
                ? '<div class="infl-biz-msgs-empty-thread"><p>Select a conversation</p></div>'
                : `
              <header class="infl-biz-msgs-thread-head">
                <p class="infl-biz-msgs-thread-name">${escapeHtml(activeName)}</p>
              </header>
              <div class="infl-biz-msgs-bubbles" id="infl-biz-msgs-bubbles">
                ${state.messages
                  .map((m) => {
                    const me =
                      m.senderUserId ===
                      JSON.parse(localStorage.getItem("influnet_user") || "{}")
                        ?.id;
                    return `<div class="infl-biz-msgs-bubble ${me ? "is-me" : "is-them"}">
                      <p>${escapeHtml(m.deleted ? "This message was deleted" : m.body)}</p>
                      <time>${escapeHtml(timeShort(m.createdAt))}</time>
                    </div>`;
                  })
                  .join("")}
              </div>
              <form class="infl-biz-msgs-compose" id="infl-biz-msgs-form">
                <input type="text" name="body" placeholder="Type a message…" value="${escapeHtml(state.draft)}" autocomplete="off" />
                <button type="submit" ${state.sending ? "disabled" : ""}>Send</button>
              </form>
              ${state.error ? `<p class="infl-biz-msgs-error">${escapeHtml(state.error)}</p>` : ""}
            `
            }
          </section>
        </div>`;

      host.querySelectorAll("[data-conv-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.activeId = btn.getAttribute("data-conv-id");
          state.error = "";
          loadMessages(state.activeId).then(() => render(host));
        });
      });

      const form = host.querySelector("#infl-biz-msgs-form");
      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = form.querySelector('input[name="body"]');
        const body = (input?.value || "").trim();
        if (!body || !state.activeId || state.sending) return;
        state.sending = true;
        state.error = "";
        render(host);
        const res = await api(
          "/api/conversations/" + encodeURIComponent(state.activeId) + "/messages",
          { method: "POST", body: JSON.stringify({ body }) }
        );
        state.sending = false;
        if (!res.ok) {
          state.error = res.data?.error || "Could not send message.";
          render(host);
          return;
        }
        state.draft = "";
        await loadMessages(state.activeId);
        render(host);
        const bubbles = host.querySelector("#infl-biz-msgs-bubbles");
        if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;
      });

      const bubbles = host.querySelector("#infl-biz-msgs-bubbles");
      if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;
    }

    async function loadConversations() {
      state.loading = true;
      const res = await api("/api/conversations");
      state.loading = false;
      if (!res.ok) {
        state.conversations = [];
        state.error = res.data?.error || "Could not load conversations.";
        return;
      }
      state.conversations = Array.isArray(res.data) ? res.data : [];
      if (!state.activeId && state.conversations[0]) {
        state.activeId = state.conversations[0].id;
      }
    }

    async function loadMessages(convId) {
      if (!convId) {
        state.messages = [];
        return;
      }
      const res = await api(
        "/api/conversations/" + encodeURIComponent(convId) + "/messages"
      );
      state.messages = res.ok && Array.isArray(res.data) ? res.data : [];
    }

    let dataLoaded = false;

    async function ensureData() {
      if (dataLoaded) return;
      await loadConversations();
      if (state.activeId) await loadMessages(state.activeId);
      dataLoaded = true;
    }

    async function sync() {
      if (!isMessagesTab()) {
        hideHost();
        dataLoaded = false;
        return;
      }

      document.body.classList.add("infl-business-messages-view");

      const host = showHost();
      if (!host) return;

      if (!dataLoaded) {
        state.loading = true;
        render(host);
      }

      await ensureData();
      render(host);
    }

    function wireNav() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav || nav.dataset.inflBizMsgsStandalone) return;
      nav.dataset.inflBizMsgsStandalone = "1";
      nav.addEventListener("click", () => {
        state.conversations = [];
        state.messages = [];
        state.activeId = null;
        state.error = "";
        dataLoaded = false;
        [100, 400, 900, 1800].forEach((ms) => window.setTimeout(sync, ms));
      });
    }

    function wireRootObserver() {
      const root = document.getElementById("root");
      if (!root || root.dataset.inflBizMsgsObs) return;
      root.dataset.inflBizMsgsObs = "1";
      new MutationObserver(() => {
        if (isMessagesTab()) sync();
      }).observe(root, { childList: true, subtree: true });
    }

    wireNav();
    wireRootObserver();
    sync();
    window.addEventListener("load", sync);
    [300, 800, 1500, 3000].forEach((ms) => window.setTimeout(sync, ms));
    window.setInterval(sync, 1500);
    window.influnetSyncBusinessMessagesStandalone = sync;
  } catch (e) {
    console.warn("[influnet] business messages standalone:", e);
  }
})();
