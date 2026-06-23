/**
 * Business Messages: standalone chat UI (replaces broken React flex panel on business dashboard).
 */
(function () {
  if (window.__inflBizMsgsStandaloneInit) return;
  window.__inflBizMsgsStandaloneInit = true;

  try {
    const HOST_ID = "influnet-biz-msgs-standalone";
    const LIVE_POLL_MS = 4000;
    const REALTIME_POLL_FALLBACK_MS = 12000;

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

    function getNav() {
      return document.querySelector(".flex.h-screen aside nav");
    }

    function getActiveNavButton() {
      const nav = getNav();
      if (!nav) return null;
      return [...nav.querySelectorAll(":scope > button")].find(
        (b) =>
          b.classList.contains("bg-violet-100") ||
          /\bbg-violet-100\b/.test(b.className)
      );
    }

    function getActiveNavLabel() {
      const active = getActiveNavButton();
      if (active) {
        const label = normalizeNavText(active.textContent);
        if (label) return label;
      }
      const crumb = document.querySelector(
        ".flex.h-screen header .text-gray-800.font-medium"
      );
      if (crumb) return normalizeNavText(crumb.textContent);
      return "";
    }

    function isMessagesTab() {
      if (!isBusinessDashboard()) return false;
      if (typeof window.influnetBizIsMessagesTab === "function") {
        return window.influnetBizIsMessagesTab();
      }
      if (window.influnetBizIsDefinitelyDashboard?.()) return false;
      return getActiveNavLabel().toLowerCase() === "messages";
    }

    function getColumn() {
      const shell = document.querySelector(".flex.h-screen");
      if (!shell) return null;
      return (
        shell.querySelector(":scope > .flex-1.flex.flex-col.min-w-0") ||
        shell.querySelector(":scope > .flex-1.flex.flex-col.min-h-0") ||
        null
      );
    }

    function getMain() {
      const col = getColumn();
      if (col) {
        const inCol = col.querySelector(":scope > main.flex-1, :scope > main");
        if (inCol) return inCol;
      }
      return (
        document.querySelector(".flex.h-screen > .flex-1 main.flex-1") ||
        document.querySelector(".flex.h-screen main.flex-1") ||
        document.querySelector("#root main.flex-1") ||
        document.querySelector("#root main")
      );
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

    function myUserId() {
      try {
        const token = localStorage.getItem("influnet_token");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload.sub) return payload.sub;
        }
        return JSON.parse(localStorage.getItem("influnet_user") || "{}")?.id;
      } catch {
        return null;
      }
    }

    /** Active messages only — deleted rows stay in DB but should not clutter the thread. */
    function visibleMessages() {
      const seen = new Set();
      return state.messages.filter((m) => {
        if (!m?.id || m.deleted || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    }

    async function getRealtimeClient() {
      if (realtimeClient) return realtimeClient;
      if (typeof window.influnetEnsureSupabase === "function") {
        try {
          realtimeClient = await window.influnetEnsureSupabase();
          return realtimeClient;
        } catch (_) {}
      }
      if (realtimeReady) return realtimeReady;
      const cfg = window.INFLUNET_SUPABASE;
      if (!cfg?.url || !cfg?.key) return null;
      realtimeReady = import("https://esm.sh/@supabase/supabase-js@2.49.4")
        .then(({ createClient }) => {
          realtimeClient = createClient(cfg.url, cfg.key, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          });
          return realtimeClient;
        })
        .catch((error) => {
          console.warn("[influnet] realtime init failed:", error);
          return null;
        });
      return realtimeReady;
    }

    async function syncRealtimeAuth(sb) {
      if (!sb?.auth) return;
      const access = localStorage.getItem("influnet_token");
      const refresh = localStorage.getItem("influnet_refresh_token");
      if (!access || !refresh) return;
      try {
        await sb.auth.setSession({
          access_token: access,
          refresh_token: refresh,
        });
      } catch (error) {
        console.warn("[influnet] realtime auth sync failed:", error);
      }
    }

    function normalizeRealtimeMessage(row) {
      if (!row?.id) return null;
      return {
        id: row.id,
        conversationId: row.conversation_id || null,
        senderUserId: row.sender_user_id || null,
        body: row.body || "",
        createdAt: row.created_at || new Date().toISOString(),
        deleted: !!row.deleted_at || !!row.deleted,
      };
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
      const main = getMain();
      if (!main) return null;
      if (getComputedStyle(main).position === "static") {
        main.style.position = "relative";
      }
      let host = document.getElementById(HOST_ID);
      if (!host) {
        host = document.createElement("div");
        host.id = HOST_ID;
        host.className = "influnet-biz-msgs-standalone";
      }
      if (host.parentElement !== main) {
        main.appendChild(host);
      }
      return host;
    }

    function hideHost() {
      const host = document.getElementById(HOST_ID);
      if (host) host.style.display = "none";
      unsubscribeRealtime();
      const main = getMain();
      if (main) {
        main.style.removeProperty("visibility");
        main.style.removeProperty("pointer-events");
      }
      document.body.classList.remove("infl-business-messages-view");
    }

    function showHost() {
      const host = ensureHost();
      if (!host) return null;
      document.body.classList.add("infl-business-messages-view");
      host.style.display = "flex";
      return host;
    }

    const state = {
      conversations: [],
      activeId: null,
      messages: [],
      loading: true,
      sending: false,
      draft: "",
      searchQuery: "",
      error: "",
      lastTypingSent: 0,
    };
    let realtimeClient = null;
    let realtimeReady = null;
    let messagesChannel = null;
    let presenceChannel = null;
    let collabChannel = null;
    let activeRealtimeConvId = null;
    let realtimeSetupGen = 0;

    const AVATAR_GRADIENTS = [
      ["#ee3e96", "#f26e59"],
      ["#8b5cf6", "#a78bfa"],
      ["#3b82f6", "#60a5fa"],
      ["#10b981", "#34d399"],
      ["#f59e0b", "#fbbf24"],
      ["#ec4899", "#f472b6"],
    ];

    function userDisplayName(user) {
      return user?.name || user?.companyName || "User";
    }

    function displayName(conv) {
      return userDisplayName(conv?.otherUser);
    }

    function initials(name) {
      const parts = String(name || "?").trim().split(/\s+/);
      return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
    }

    function avatarGradient(seed) {
      const s = String(seed || "user");
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) % AVATAR_GRADIENTS.length;
      return AVATAR_GRADIENTS[h];
    }

    function avatarHtml(user, size) {
      const px = size || 40;
      const name = userDisplayName(user);
      if (user?.avatarUrl) {
        return `<img class="infl-biz-msgs-avatar" src="${escapeHtml(user.avatarUrl)}" alt="" width="${px}" height="${px}" loading="lazy" />`;
      }
      const [c1, c2] = avatarGradient(user?.id || name);
      const fs = Math.max(11, Math.round(px * 0.36));
      return `<div class="infl-biz-msgs-avatar infl-biz-msgs-avatar--initials" style="width:${px}px;height:${px}px;font-size:${fs}px;background:linear-gradient(135deg,${c1},${c2})" aria-hidden="true">${escapeHtml(initials(name))}</div>`;
    }

    function userSubtitle(user) {
      if (!user) return "";
      if (user.isTyping) return "Typing…";
      if (user.isOnline) return "Active now";
      if (user.lastSeenAt) {
        const t = Date.now() - new Date(user.lastSeenAt).getTime();
        if (t < 90000) return "Active now";
        const m = Math.floor(t / 60000);
        if (m < 60) return "Last seen " + m + "m ago";
        const h = Math.floor(m / 60);
        if (h < 24) return "Last seen " + h + "h ago";
        return "Last seen " + Math.floor(h / 24) + "d ago";
      }
      const niche = Array.isArray(user.niche)
        ? user.niche.filter(Boolean).join(", ")
        : user.niche;
      if (niche) return niche;
      if (user.industry) return user.industry;
      return "Creator";
    }

    function filteredConversations() {
      const q = state.searchQuery.trim().toLowerCase();
      if (!q) return state.conversations;
      return state.conversations.filter((c) =>
        displayName(c).toLowerCase().includes(q)
      );
    }

    function messagesFingerprint(msgs) {
      const visible = (msgs || []).filter((m) => m?.id && !m.deleted);
      if (!visible.length) return "0";
      const last = visible[visible.length - 1];
      return visible.length + ":" + last.id + ":" + (last.createdAt || "");
    }

    function conversationsFingerprint(convs) {
      return (convs || [])
        .map((c) => c.id + ":" + (c.lastMessageAt || "") + ":" + (c.lastMessage || ""))
        .join("|");
    }

    function captureDraft(host) {
      const input = host?.querySelector('#infl-biz-msgs-form input[name="body"]');
      if (input) state.draft = input.value;
    }

    function sidebarHtml() {
      if (state.loading) {
        return '<p class="infl-biz-msgs-muted">Loading…</p>';
      }
      if (state.error && state.conversations.length === 0) {
        return `<p class="infl-biz-msgs-error">${escapeHtml(state.error)}</p>`;
      }
      if (state.conversations.length === 0) {
        return '<p class="infl-biz-msgs-muted">No conversations yet. Connection requests must be accepted before messaging.</p>';
      }
      return filteredConversations()
        .map((c) => {
          const name = escapeHtml(displayName(c));
          const activeCls = c.id === state.activeId ? " is-active" : "";
          const unread =
            Number(c.unreadCount) > 0
              ? '<span class="infl-biz-msgs-unread" aria-label="Unread"></span>'
              : "";
          return `<button type="button" class="infl-biz-msgs-item${activeCls}" data-conv-id="${escapeHtml(c.id)}">
            ${avatarHtml(c.otherUser, 40)}
            <span class="infl-biz-msgs-item-body">
              <span class="infl-biz-msgs-item-top">
                <span class="infl-biz-msgs-item-name">${name}</span>
                <span class="infl-biz-msgs-item-time">${escapeHtml(timeShort(c.lastMessageAt))}</span>
              </span>
              <span class="infl-biz-msgs-item-preview">${escapeHtml(c.lastMessage || "No messages yet")}</span>
            </span>
            ${unread}
          </button>`;
        })
        .join("");
    }

    function bubblesHtml() {
      const uid = myUserId();
      const msgs = visibleMessages();
      return msgs
        .map((m, i) => {
          const me = m.senderUserId === uid;
          const prev = msgs[i - 1];
          const sameSide =
            prev && (prev.senderUserId === uid) === (m.senderUserId === uid);
          const groupedCls = sameSide ? " is-grouped" : "";
          return `<div class="infl-biz-msgs-bubble ${me ? "is-me" : "is-them"}${groupedCls}">
            <p>${escapeHtml(m.body || "")}</p>
            <time>${escapeHtml(timeShort(m.createdAt))}</time>
          </div>`;
        })
        .join("");
    }

    function typingIndicatorHtml(active) {
      if (!active?.otherUser?.isTyping) return "";
      const label = escapeHtml(userDisplayName(active.otherUser));
      return `<div class="infl-biz-msgs-typing" id="infl-biz-msgs-typing" aria-live="polite">
        <span class="infl-biz-msgs-typing-label">${label} is typing</span>
        <span class="infl-biz-msgs-typing-bubble" aria-hidden="true">
          <span class="infl-biz-msgs-typing-dot"></span>
          <span class="infl-biz-msgs-typing-dot"></span>
          <span class="infl-biz-msgs-typing-dot"></span>
        </span>
      </div>`;
    }

    function wireSearch(host) {
      const input = host.querySelector("#infl-biz-msgs-search");
      if (!input || input.dataset.inflWired) return;
      input.dataset.inflWired = "1";
      input.addEventListener("input", () => {
        state.searchQuery = input.value;
        updateSidebar(host);
      });
    }

    function wireSidebar(host) {
      host.querySelectorAll("[data-conv-id]").forEach((btn) => {
        if (btn.dataset.inflWired) return;
        btn.dataset.inflWired = "1";
        btn.addEventListener("click", async () => {
          state.activeId = btn.getAttribute("data-conv-id");
          state.error = "";
          window.influnetBizMsgsActiveConversationId = state.activeId;
          await loadMessages(state.activeId, false);
          render(host);
          await setupRealtimeForActiveConversation(host);
        });
      });
    }

    function wireCompose(host) {
      const form = host.querySelector("#infl-biz-msgs-form");
      if (!form || form.dataset.inflWired) return;
      form.dataset.inflWired = "1";

      form.querySelector('input[name="body"]')?.addEventListener("input", (e) => {
        state.draft = e.target.value;
        const convId = state.activeId;
        if (!convId || !state.draft.trim()) return;
        const now = Date.now();
        if (now - state.lastTypingSent < 1500) return;
        state.lastTypingSent = now;
        api("/api/conversations/" + encodeURIComponent(convId) + "/typing", {
          method: "POST",
        }).catch(() => {});
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = form.querySelector('input[name="body"]');
        const body = (input?.value || "").trim();
        if (!body || !state.activeId || state.sending) return;
        state.sending = true;
        state.error = "";
        const sendBtn = form.querySelector('button[type="submit"]');
        if (sendBtn) sendBtn.disabled = true;
        const res = await api(
          "/api/conversations/" + encodeURIComponent(state.activeId) + "/messages",
          { method: "POST", body: JSON.stringify({ body }) }
        );
        state.sending = false;
        if (sendBtn) sendBtn.disabled = false;
        if (!res.ok) {
          state.error = res.data?.error || "Could not send message.";
          const errEl = host.querySelector(".infl-biz-msgs-thread .infl-biz-msgs-error");
          if (errEl) errEl.textContent = state.error;
          else render(host);
          return;
        }
        state.draft = "";
        if (input) input.value = "";
        await loadMessages(state.activeId, true);
        updateBubbles(host, true);
        updateSidebar(host);
      });
    }

    function render(host) {
      captureDraft(host);
      window.influnetBizMsgsActiveConversationId = state.activeId || null;

      const active =
        state.conversations.find((c) => c.id === state.activeId) || null;
      const activeName = active ? displayName(active) : "";

      host.innerHTML = `
        <div class="infl-biz-msgs-layout">
          <aside class="infl-biz-msgs-sidebar">
            <div class="infl-biz-msgs-sidebar-head">
              <h1>Messages</h1>
              <div class="infl-biz-msgs-search-wrap">
                <input type="search" id="infl-biz-msgs-search" placeholder="Search conversations…" value="${escapeHtml(state.searchQuery)}" autocomplete="off" />
              </div>
            </div>
            <div class="infl-biz-msgs-list">${sidebarHtml()}</div>
          </aside>
          <section class="infl-biz-msgs-thread">
            ${
              !active
                ? '<div class="infl-biz-msgs-empty-thread"><p>Select a conversation</p></div>'
                : `
              <header class="infl-biz-msgs-thread-head">
                <div class="infl-biz-msgs-thread-user">
                  ${avatarHtml(active.otherUser, 40)}
                  <div class="infl-biz-msgs-thread-meta">
                    <p class="infl-biz-msgs-thread-name">${escapeHtml(activeName)}</p>
                    <p class="infl-biz-msgs-thread-status" id="infl-biz-msgs-status">${escapeHtml(userSubtitle(active.otherUser))}</p>
                  </div>
                </div>
              </header>
              <div class="infl-biz-msgs-bubbles" id="infl-biz-msgs-bubbles">${bubblesHtml()}</div>
              ${typingIndicatorHtml(active)}
              <form class="infl-biz-msgs-compose" id="infl-biz-msgs-form">
                <input type="text" name="body" placeholder="Type a message…" value="${escapeHtml(state.draft)}" autocomplete="off" />
                <button type="submit" ${state.sending ? "disabled" : ""}>Send</button>
              </form>
              ${state.error ? `<p class="infl-biz-msgs-error">${escapeHtml(state.error)}</p>` : ""}
            `
            }
          </section>
        </div>`;

      wireSidebar(host);
      wireSearch(host);
      wireCompose(host);
      const bubbles = host.querySelector("#infl-biz-msgs-bubbles");
      if (bubbles) bubbles.scrollTop = bubbles.scrollHeight;
    }

    function updateSidebar(host) {
      const list = host.querySelector(".infl-biz-msgs-list");
      if (!list) return;
      list.innerHTML = sidebarHtml();
      list.querySelectorAll("[data-conv-id]").forEach((btn) => {
        delete btn.dataset.inflWired;
      });
      wireSidebar(host);
    }

    function updateBubbles(host, scrollToEnd) {
      const bubbles = host.querySelector("#infl-biz-msgs-bubbles");
      if (!bubbles) return;
      const nearBottom =
        bubbles.scrollHeight - bubbles.scrollTop - bubbles.clientHeight < 80;
      bubbles.innerHTML = bubblesHtml();
      if (scrollToEnd || nearBottom) {
        bubbles.scrollTop = bubbles.scrollHeight;
      }
    }

    function updateThreadHeader(host) {
      const active = state.conversations.find((c) => c.id === state.activeId);
      if (!active) return;
      const nameEl = host.querySelector(".infl-biz-msgs-thread-name");
      if (nameEl) nameEl.textContent = displayName(active);
      const statusEl = host.querySelector("#infl-biz-msgs-status");
      if (statusEl) {
        statusEl.textContent = userSubtitle(active.otherUser);
      }
      const avatarSlot = host.querySelector(".infl-biz-msgs-thread-user");
      if (avatarSlot) {
        const existing = avatarSlot.querySelector(".infl-biz-msgs-avatar, .infl-biz-msgs-avatar--initials");
        const tmp = document.createElement("div");
        tmp.innerHTML = avatarHtml(active.otherUser, 40);
        const next = tmp.firstElementChild;
        if (existing && next) existing.replaceWith(next);
      }
      const typingWrap = host.querySelector("#infl-biz-msgs-typing");
      const compose = host.querySelector("#infl-biz-msgs-form");
      if (!compose) return;
      const nextTyping = typingIndicatorHtml(active);
      if (nextTyping) {
        if (typingWrap) {
          typingWrap.outerHTML = nextTyping;
        } else {
          compose.insertAdjacentHTML("beforebegin", nextTyping);
        }
      } else if (typingWrap) {
        typingWrap.remove();
      }
    }

    function appendMessageFromRealtime(host, msg) {
      if (!msg?.id || msg.deleted) return;
      if (String(msg.conversationId || "") !== String(state.activeId || "")) return;
      if (state.messages.some((m) => String(m?.id || "") === String(msg.id))) return;
      state.messages = [...state.messages, msg].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
      state.conversations = state.conversations.map((c) => {
        if (c.id !== state.activeId) return c;
        return {
          ...c,
          lastMessage: msg.body || c.lastMessage || "",
          lastMessageAt: msg.createdAt || c.lastMessageAt || null,
          unreadCount: 0,
        };
      });
      updateBubbles(host, true);
      updateSidebar(host);
    }

    function applyPresenceRealtime(host, convId, payload) {
      if (!payload?.new || !state.activeId || state.activeId !== convId) return;
      const nowMs = Date.now();
      const typingExpiresMs = payload.new.typing_expires_at
        ? new Date(payload.new.typing_expires_at).getTime()
        : 0;
      const isTyping =
        payload.new.typing_conversation_id === convId && typingExpiresMs > nowMs;
      state.conversations = state.conversations.map((c) => {
        if (c.id !== state.activeId || !c.otherUser) return c;
        return {
          ...c,
          otherUser: {
            ...c.otherUser,
            isTyping,
            lastSeenAt: payload.new.last_seen_at || c.otherUser.lastSeenAt || null,
            isOnline:
              !!payload.new.last_seen_at &&
              nowMs - new Date(payload.new.last_seen_at).getTime() < 2 * 60 * 1000,
          },
        };
      });
      updateThreadHeader(host);
      updateSidebar(host);
    }

    function clearOtherUserTyping(host, convId) {
      state.conversations = state.conversations.map((c) => {
        if (c.id !== convId || !c.otherUser) return c;
        return {
          ...c,
          otherUser: { ...c.otherUser, isTyping: false },
        };
      });
      updateThreadHeader(host);
    }

    function unsubscribeRealtime() {
      try {
        if (messagesChannel && realtimeClient) realtimeClient.removeChannel(messagesChannel);
      } catch (_) {}
      try {
        if (presenceChannel && realtimeClient) realtimeClient.removeChannel(presenceChannel);
      } catch (_) {}
      try {
        if (collabChannel && realtimeClient) realtimeClient.removeChannel(collabChannel);
      } catch (_) {}
      messagesChannel = null;
      presenceChannel = null;
      collabChannel = null;
      activeRealtimeConvId = null;
    }

    async function setupRealtimeForActiveConversation(host) {
      const convId = state.activeId;
      if (!convId) {
        unsubscribeRealtime();
        return;
      }
      const setupGen = ++realtimeSetupGen;
      unsubscribeRealtime();

      const sb = await getRealtimeClient();
      if (!sb || typeof sb.channel !== "function") return;
      if (setupGen !== realtimeSetupGen || state.activeId !== convId) return;
      await syncRealtimeAuth(sb);
      if (setupGen !== realtimeSetupGen || state.activeId !== convId) return;

      const uid = myUserId();
      const activeConv = state.conversations.find((c) => c.id === convId) || null;
      const otherId = activeConv?.otherUser?.id || null;

      messagesChannel = sb
        .channel(`infl-biz-msgs:${convId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${convId}`,
          },
          (payload) => {
            if (state.activeId !== convId) return;
            const msg = normalizeRealtimeMessage(payload?.new);
            if (!msg) return;
            appendMessageFromRealtime(host, msg);
            if (msg.senderUserId && uid && msg.senderUserId !== uid) {
              clearOtherUserTyping(host, convId);
            }
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.warn("[influnet] messages realtime channel error");
          }
        });

      if (otherId) {
        presenceChannel = sb
          .channel(`infl-biz-presence:${convId}:${otherId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "user_presence",
              filter: `user_id=eq.${otherId}`,
            },
            (payload) => {
              if (state.activeId !== convId) return;
              applyPresenceRealtime(host, convId, payload);
            }
          )
          .subscribe();
      }

      activeRealtimeConvId = convId;
    }

    async function setupCollabRealtime(host) {
      if (collabChannel) return;
      const sb = await getRealtimeClient();
      if (!sb || typeof sb.channel !== "function") return;
      await syncRealtimeAuth(sb);
      const uid = myUserId();
      if (!uid) return;

      collabChannel = sb
        .channel("infl-biz-collab-updates")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "collab_requests",
          },
          async (payload) => {
            const row = payload?.new;
            if (!row) return;
            if (row.from_user_id !== uid && row.to_user_id !== uid) return;
            const status = String(row.status || "").toLowerCase();
            if (status === "accepted") {
              await loadConversations(true);
              updateSidebar(host);
              updateThreadHeader(host);
            }
          }
        )
        .subscribe();
    }

    async function selectConversationById(convId, host) {
      if (!convId || !host) return false;
      if (!state.conversations.some((c) => c.id === convId)) {
        await loadConversations(true);
      }
      const match = state.conversations.find((c) => c.id === convId);
      if (!match) return false;
      state.activeId = convId;
      window.influnetBizMsgsActiveConversationId = convId;
      await loadMessages(convId, false);
      render(host);
      await setupRealtimeForActiveConversation(host);
      return true;
    }

    async function refreshAfterCollabEvent(detail) {
      const host = document.getElementById(HOST_ID);
      if (!host || host.style.display === "none") return;
      await loadConversations(true);
      updateSidebar(host);
      updateThreadHeader(host);
      if (detail?.conversationId) {
        await selectConversationById(detail.conversationId, host);
      }
    }

    async function loadConversations(silent) {
      if (!silent) state.loading = true;
      const res = await api("/api/conversations");
      if (!silent) state.loading = false;
      if (!res.ok) {
        if (!silent) {
          state.conversations = [];
          state.error = res.data?.error || "Could not load conversations.";
        }
        return false;
      }
      if (!silent) state.error = "";
      state.conversations = Array.isArray(res.data) ? res.data : [];
      if (!state.activeId && state.conversations[0]) {
        state.activeId = state.conversations[0].id;
      }
      return true;
    }

    async function loadMessages(convId, silent) {
      if (!convId) {
        state.messages = [];
        return false;
      }
      const res = await api(
        "/api/conversations/" + encodeURIComponent(convId) + "/messages"
      );
      const next = res.ok && Array.isArray(res.data) ? res.data : null;
      if (!next) return false;
      state.messages = next;
      return true;
    }

    let uiReady = false;
    let syncRunning = false;
    let syncQueued = false;
    let scheduleTimer = null;
    let liveTimer = null;
    let pollInFlight = false;
    let lastMsgFp = "";
    let lastConvFp = "";

    async function initialLoad(host) {
      state.loading = true;
      render(host);
      await loadConversations(false);
      if (state.activeId) await loadMessages(state.activeId, false);
      state.loading = false;
      render(host);
      uiReady = true;
      lastMsgFp = messagesFingerprint(state.messages);
      lastConvFp = conversationsFingerprint(state.conversations);
    }

    async function pollLive() {
      if (!isMessagesTab() || !uiReady || pollInFlight) return;
      const host = document.getElementById(HOST_ID);
      if (!host || host.style.display === "none") return;

      pollInFlight = true;
      try {
        const prevMsgFp = messagesFingerprint(state.messages);
        const prevConvFp = conversationsFingerprint(state.conversations);

        await loadConversations(true);
        if (state.activeId) await loadMessages(state.activeId, true);

        const nextMsgFp = messagesFingerprint(state.messages);
        const nextConvFp = conversationsFingerprint(state.conversations);

        if (nextConvFp !== prevConvFp) {
          updateSidebar(host);
          updateThreadHeader(host);
        }
        if (nextMsgFp !== prevMsgFp) {
          updateBubbles(host, false);
        }

        lastMsgFp = nextMsgFp;
        lastConvFp = nextConvFp;
      } finally {
        pollInFlight = false;
      }
    }

    function startLivePoll() {
      if (liveTimer) return;
      liveTimer = window.setInterval(pollLive, LIVE_POLL_MS);
    }

    function stopLivePoll() {
      if (liveTimer) {
        clearInterval(liveTimer);
        liveTimer = null;
      }
      unsubscribeRealtime();
    }

    function leaveMessagesTab() {
      uiReady = false;
      stopLivePoll();
      window.influnetBizMsgsActiveConversationId = null;
      hideHost();
    }

    function ensureNotBlockingInfluencer() {
      if (isBusinessDashboard()) return;
      hideHost();
    }

    async function sync() {
      if (syncRunning) {
        syncQueued = true;
        return;
      }
      syncRunning = true;
      try {
        if (!isBusinessDashboard()) {
          hideHost();
          uiReady = false;
          stopLivePoll();
          window.influnetBizMsgsActiveConversationId = null;
          return;
        }

        if (!isMessagesTab()) {
          hideHost();
          uiReady = false;
          stopLivePoll();
          window.influnetBizMsgsActiveConversationId = null;
          return;
        }

        const host = showHost();
        if (!host) return;

        if (!uiReady) {
          await initialLoad(host);
          await setupRealtimeForActiveConversation(host);
          await setupCollabRealtime(host);
          startLivePoll();
        }
      } finally {
        syncRunning = false;
        if (syncQueued) {
          syncQueued = false;
          scheduleSync();
        }
      }
    }

    function scheduleSync() {
      if (scheduleTimer) return;
      scheduleTimer = window.setTimeout(() => {
        scheduleTimer = null;
        sync();
      }, 150);
    }

    function onNavClick(e) {
      const btn = e.target.closest("button");
      if (!btn || !getNav()?.contains(btn)) return;
      const label = normalizeNavText(btn.textContent).toLowerCase();
      if (label === "messages") {
        scheduleSync();
        return;
      }
      leaveMessagesTab();
    }

    function wireNav() {
      const nav = getNav();
      if (!nav || nav.dataset.inflBizMsgsStandalone) return;
      nav.dataset.inflBizMsgsStandalone = "1";
      nav.addEventListener("click", onNavClick);
    }

    function wireCollabEvents() {
      if (window.__inflBizMsgsCollabWired) return;
      window.__inflBizMsgsCollabWired = true;
      window.addEventListener("influnet-collab-accepted", (ev) => {
        refreshAfterCollabEvent(ev.detail || {});
      });
      window.addEventListener("influnet-notification", (ev) => {
        const type = ev.detail?.type || "";
        if (type === "REQUEST_ACCEPTED" || type === "conversation") {
          refreshAfterCollabEvent(ev.detail || {});
        }
      });
    }

    wireNav();
    wireCollabEvents();
    scheduleSync();
    ensureNotBlockingInfluencer();
    window.addEventListener("load", scheduleSync);
    window.addEventListener("popstate", ensureNotBlockingInfluencer);
    setInterval(ensureNotBlockingInfluencer, 1500);
    const push = history.pushState.bind(history);
    history.pushState = function () {
      const r = push.apply(history, arguments);
      ensureNotBlockingInfluencer();
      scheduleSync();
      return r;
    };
    const replace = history.replaceState.bind(history);
    history.replaceState = function () {
      const r = replace.apply(history, arguments);
      ensureNotBlockingInfluencer();
      scheduleSync();
      return r;
    };
    window.influnetHideBusinessMessagesStandalone = hideHost;
    window.influnetSyncBusinessMessagesStandalone = scheduleSync;
    window.influnetBizMsgsSelectConversation = async (convId) => {
      let host = document.getElementById(HOST_ID);
      if (!host || host.style.display === "none") {
        scheduleSync();
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        host = document.getElementById(HOST_ID);
      }
      if (!host) return false;
      return selectConversationById(convId, host);
    };
  } catch (e) {
    console.warn("[influnet] business messages standalone:", e);
  }
})();
