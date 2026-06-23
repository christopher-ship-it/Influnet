/**
 * Messages: presence ping, typing (cross-user via DB), live status for React + business standalone.
 */
(function () {
  const PING_MS = 30000;
  const STATUS_MS = 2500;
  const TYPING_HIDE_MS = 2000;
  const TYPING_SEND_MS = 1500;

  let pingTimer = null;
  let statusTimer = null;
  let activeConvId = null;
  let typingUntil = 0;
  let lastTypingSent = 0;
  let collabRealtimeClient = null;
  let collabRealtimeChannel = null;

  function isDashboard() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return path === "/dashboard" || path === "/dashboard/influencer";
  }

  function getToken() {
    return localStorage.getItem("influnet_token");
  }

  function formatLastSeen(iso) {
    if (!iso) return "Last seen recently";
    const t = Date.now() - new Date(iso).getTime();
    const m = Math.floor(t / 60000);
    if (m < 60) return "Active " + m + " min" + (m === 1 ? "" : "s") + " ago";
    const h = Math.floor(m / 60);
    if (h < 24) return "Active " + h + " hour" + (h === 1 ? "" : "s") + " ago";
    const d = Math.floor(h / 24);
    if (d === 1) return "Active yesterday";
    return "Active " + d + " days ago";
  }

  function statusLabel(data) {
    if (data?.presenceEnabled === false) return null;
    if (data?.typing) return "Typing…";
    if (data?.isOnline) return "Active now";
    if (data?.lastSeenAt) return formatLastSeen(data.lastSeenAt);
    if (data?.presenceEnabled) return "Last seen recently";
    return null;
  }

  function isStandaloneMessages() {
    const host = document.getElementById("influnet-biz-msgs-standalone");
    return !!host && host.style.display !== "none";
  }

  async function getCollabRealtimeClient() {
    if (collabRealtimeClient) return collabRealtimeClient;
    if (typeof window.influnetEnsureSupabase === "function") {
      try {
        collabRealtimeClient = await window.influnetEnsureSupabase();
        return collabRealtimeClient;
      } catch (_) {}
    }
    const cfg = window.INFLUNET_SUPABASE;
    if (!cfg?.url || !cfg?.key) return null;
    try {
      const { createClient } = await import(
        "https://esm.sh/@supabase/supabase-js@2.49.4"
      );
      collabRealtimeClient = createClient(cfg.url, cfg.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      return collabRealtimeClient;
    } catch (_) {
      return null;
    }
  }

  function myUserIdFromToken() {
    const token = getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      return payload.sub || null;
    } catch (_) {
      return null;
    }
  }

  async function setupCollabRealtime() {
    if (collabRealtimeChannel) return;
    const sb = await getCollabRealtimeClient();
    if (!sb) return;
    const access = getToken();
    const refresh = localStorage.getItem("influnet_refresh_token");
    if (access && refresh) {
      try {
        await sb.auth.setSession({
          access_token: access,
          refresh_token: refresh,
        });
      } catch (_) {}
    }
    const uid = myUserIdFromToken();
    if (!uid) return;

    collabRealtimeChannel = sb
      .channel("infl-global-collab-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "collab_requests",
        },
        (payload) => {
          const row = payload?.new;
          if (!row || (row.from_user_id !== uid && row.to_user_id !== uid)) return;
          const status = String(row.status || "").toLowerCase();
          window.dispatchEvent(
            new CustomEvent("influnet-dashboard-stale", {
              detail: { reason: "collab_" + status },
            })
          );
          window.dispatchEvent(
            new CustomEvent("influnet-notification", {
              detail: {
                type:
                  status === "accepted"
                    ? "REQUEST_ACCEPTED"
                    : status === "declined" || status === "cancelled"
                      ? "REQUEST_REJECTED"
                      : "collab_update",
                requestId: row.id,
                fromUserId: row.from_user_id,
                toUserId: row.to_user_id,
              },
            })
          );
          if (status === "accepted") {
            window.influnetSyncBusinessMessagesStandalone?.();
          }
        }
      )
      .subscribe();
  }

  function teardownCollabRealtime() {
    try {
      if (collabRealtimeChannel && collabRealtimeClient) {
        collabRealtimeClient.removeChannel(collabRealtimeChannel);
      }
    } catch (_) {}
    collabRealtimeChannel = null;
  }

  async function pingPresence() {
    const token = getToken();
    if (!token) return;
    try {
      await fetch("/api/presence/ping", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        credentials: "same-origin",
      });
    } catch (_) {}
  }

  function isMessagesView() {
    const nav = document.querySelector("aside nav");
    if (!nav) return false;
    const active = [...nav.querySelectorAll(":scope > button")].find(
      (b) =>
        b.classList.contains("bg-violet-100") ||
        /\bbg-violet-100\b/.test(b.className)
    );
    if (!active) return false;
    const label = active.textContent.replace(/\d+/g, "").trim().toLowerCase();
    return label === "messages";
  }

  function getActiveConversationName() {
    if (window.influnetBizMsgsActiveConversationId) {
      const item = document.querySelector(
        "#influnet-biz-msgs-standalone .infl-biz-msgs-item.is-active .infl-biz-msgs-item-name"
      );
      if (item) return item.textContent.trim();
    }
    const btn = document.querySelector(
      ".w-72 button.bg-violet-50, [class*='w-72'] button.bg-violet-50"
    );
    if (!btn) return null;
    const nameEl = btn.querySelector(".font-semibold");
    return nameEl ? nameEl.textContent.trim() : null;
  }

  function getChatHeaderSubtitle() {
    const standalone = document.getElementById("infl-biz-msgs-status");
    if (standalone) return standalone;
    const main = document.querySelector("main.flex-1");
    if (!main) return null;
    const headers = main.querySelectorAll(
      ".border-b.border-gray-100 .text-xs.text-gray-400"
    );
    for (const el of headers) {
      const parent = el.closest(".flex.items-center.gap-3");
      if (parent?.querySelector(".font-semibold.text-sm")) return el;
    }
    return null;
  }

  function getMessageScrollArea() {
    const standalone = document.getElementById("infl-biz-msgs-bubbles");
    if (standalone) return standalone;
    const main = document.querySelector("main.flex-1");
    if (!main) return null;
    return main.querySelector(
      ".flex-1.overflow-y-auto.p-5.space-y-3, .overflow-y-auto.p-5.space-y-3"
    );
  }

  function reactShowsTyping() {
    const area = getMessageScrollArea();
    if (!area) return false;
    return (
      area.querySelector(".animate-bounce") !== null &&
      !area.querySelector(".infl-presence-typing")
    );
  }

  function setTypingIndicator(show) {
    const area = getMessageScrollArea();
    if (!area) return;
    let el = area.querySelector(".infl-presence-typing");
    if (!show) {
      el?.remove();
      return;
    }
    if (reactShowsTyping()) return;
    if (el) return;
    el = document.createElement("div");
    el.className = "flex justify-start infl-presence-typing";
    el.innerHTML =
      '<div class="bg-white border border-gray-100 rounded-2xl px-4 py-3">' +
      '<span class="flex items-center gap-1">' +
      '<span class="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]"></span>' +
      '<span class="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]"></span>' +
      '<span class="size-1.5 rounded-full bg-gray-400 animate-bounce"></span>' +
      "</span></div>";
    area.appendChild(el);
    area.scrollTop = area.scrollHeight;
  }

  async function resolveActiveConversationId() {
    if (window.influnetBizMsgsActiveConversationId) {
      return window.influnetBizMsgsActiveConversationId;
    }
    const name = getActiveConversationName();
    if (!name) return null;
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch("/api/conversations", {
        headers: { Authorization: "Bearer " + token },
        credentials: "same-origin",
      });
      const list = await res.json();
      if (!Array.isArray(list)) return null;
      const match = list.find((c) => {
        const other = c.otherUser || {};
        const display = other.companyName || other.name || "";
        return display === name;
      });
      return match?.id || null;
    } catch (_) {
      return null;
    }
  }

  async function sendTypingPing(convId) {
    const now = Date.now();
    if (now - lastTypingSent < TYPING_SEND_MS) return;
    lastTypingSent = now;
    const token = getToken();
    if (!token || !convId) return;
    try {
      await fetch("/api/conversations/" + convId + "/typing", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        credentials: "same-origin",
      });
    } catch (_) {}
  }

  function wireTypingInput() {
    if (document.documentElement.dataset.inflTypingWire) return;
    document.documentElement.dataset.inflTypingWire = "1";
    document.addEventListener(
      "keydown",
      (e) => {
        if (!isMessagesView()) return;
        const inStandalone = e.target.closest("#infl-biz-msgs-form input[name='body']");
        if (inStandalone) return;
        const input = e.target.closest(
          "main.flex-1 input[type='text'], main.flex-1 textarea"
        );
        if (!input) return;
        const convId =
          window.influnetBizMsgsActiveConversationId || activeConvId;
        if (!convId || !input.value.trim()) return;
        if (
          e.key.length === 1 ||
          e.key === "Backspace" ||
          e.key === "Delete"
        ) {
          sendTypingPing(convId);
        }
      },
      true
    );
  }

  async function pollConversationStatus() {
    if (!isMessagesView()) {
      activeConvId = null;
      setTypingIndicator(false);
      return;
    }

    const convId =
      window.influnetBizMsgsActiveConversationId ||
      (await resolveActiveConversationId()) ||
      activeConvId;
    if (!convId) return;
    activeConvId = convId;

    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch("/api/conversations/" + convId + "/status", {
        headers: { Authorization: "Bearer " + token },
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = await res.json();
      const label = statusLabel(data);
      const sub = getChatHeaderSubtitle();
      if (sub) {
        if (label) {
          sub.textContent = label;
          sub.setAttribute("data-infl-presence", "1");
        } else if (sub.getAttribute("data-infl-presence") === "1") {
          sub.removeAttribute("data-infl-presence");
        }
      }
      if (data?.typing) {
        typingUntil = Date.now() + TYPING_HIDE_MS;
        if (!isStandaloneMessages()) setTypingIndicator(true);
      } else if (!isStandaloneMessages()) {
        setTypingIndicator(false);
      }
    } catch (_) {}
  }

  function startPing() {
    if (pingTimer) return;
    pingPresence();
    pingTimer = setInterval(pingPresence, PING_MS);
  }

  function startStatusPoll() {
    if (statusTimer) return;
    pollConversationStatus();
    statusTimer = setInterval(pollConversationStatus, STATUS_MS);
  }

  function boot() {
    if (
      document.body.classList.contains("infl-msgs-workspace-active") ||
      document.getElementById("infl-msgs-workspace-root")
    ) {
      if (pingTimer) clearInterval(pingTimer);
      if (statusTimer) clearInterval(statusTimer);
      pingTimer = null;
      statusTimer = null;
      setTypingIndicator(false);
      return;
    }
    if (!isDashboard()) {
      if (pingTimer) clearInterval(pingTimer);
      if (statusTimer) clearInterval(statusTimer);
      pingTimer = null;
      statusTimer = null;
      teardownCollabRealtime();
      return;
    }
    wireTypingInput();
    startPing();
    startStatusPoll();
    setupCollabRealtime();
  }

  boot();
  window.addEventListener("load", boot);
  window.addEventListener("popstate", boot);
  setInterval(boot, 5000);
})();
