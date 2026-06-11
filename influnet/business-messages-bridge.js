/**
 * Business dashboard: open Messages chat with a creator (after request accepted).
 */
(function () {
  try {
    const PENDING_SLUG_KEY = "influnet_pending_chat_slug";
    const PENDING_NAME_KEY = "influnet_pending_chat_name";

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
      if (!nav) return "Dashboard";
      const active = [...nav.querySelectorAll(":scope > button")].find(
        (b) =>
          b.classList.contains("bg-violet-100") ||
          /\bbg-violet-100\b/.test(b.className)
      );
      return active ? normalizeNavText(active.textContent) : "Dashboard";
    }

    function navToMessages() {
      const btn = [...document.querySelectorAll("aside nav button")].find(
        (b) => normalizeNavText(b.textContent).toLowerCase() === "messages"
      );
      if (btn) btn.click();
    }

    function parseSlug(raw) {
      const t = String(raw || "").trim();
      if (!t) return null;
      const fromPath = t.match(/influnet[/\\]([a-z0-9-]+)/i);
      if (fromPath) return fromPath[1].toLowerCase();
      if (/^[a-z0-9][a-z0-9-]*$/i.test(t)) return t.toLowerCase();
      return null;
    }

    async function fetchPublicProfile(slug) {
      const res = await fetch(`/api/public/influencer/${encodeURIComponent(slug)}`, {
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.userId) return null;
      return data;
    }

    function trySelectConversation(displayName) {
      if (!displayName) return false;
      const main = document.querySelector("main.flex-1.overflow-hidden, main.flex-1");
      if (!main) return false;
      const first = displayName.trim().split(/\s+/)[0].toLowerCase();
      const buttons = [...main.querySelectorAll("button")];
      const match = buttons.find((btn) => {
        const text = btn.textContent.replace(/\d+/g, "").trim().toLowerCase();
        return text.includes(first) && btn.closest(".w-72, [class*='border-r']");
      });
      if (match) {
        match.click();
        return true;
      }
      return false;
    }

    async function sendConnectionRequest(userId, message) {
      const res = await fetch("/api/collab-requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: userId,
          message: message || "Hi, we'd love to collaborate with you on Influnet!",
        }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data };
    }

    async function openChatWithUserId(userId, displayName) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: userId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403) {
        const send = window.confirm(
          (data.error ||
            "Messaging opens after the creator accepts your connection request.") +
            "\n\nSend a connection request now?"
        );
        if (send) {
          const req = await sendConnectionRequest(userId);
          if (req.ok) {
            alert("Connection request sent. You can message once they accept.");
          } else {
            alert(req.data?.error || "Could not send connection request.");
          }
        }
        return;
      }

      if (!res.ok) {
        alert(data.error || "Could not start conversation. Try again after refreshing.");
        return;
      }

      sessionStorage.setItem(PENDING_NAME_KEY, displayName || "Creator");
      sessionStorage.removeItem(PENDING_SLUG_KEY);
      navToMessages();

      let attempts = 0;
      const pick = () => {
        if (getActiveNavLabel().toLowerCase() !== "messages") return;
        if (trySelectConversation(displayName)) return;
        if (++attempts < 20) window.setTimeout(pick, 250);
      };
      window.setTimeout(pick, 300);
    }

    async function openChatWithSlug(slugOrQuery) {
      const slug = parseSlug(slugOrQuery);
      if (!slug) {
        console.warn("[influnet] openChat: invalid slug", slugOrQuery);
        return;
      }

      const profile = await fetchPublicProfile(slug);
      if (!profile) {
        alert("Could not find that creator. Check the profile link and try again.");
        return;
      }

      await openChatWithUserId(profile.userId, profile.name || slug);
    }

    window.influnetOpenChat = openChatWithSlug;

    function onMessageClick(ev) {
      const btn = ev.target.closest("[data-infl-message-slug]");
      if (!btn || !isBusinessDashboard()) return;
      ev.preventDefault();
      ev.stopPropagation();
      openChatWithSlug(btn.getAttribute("data-infl-message-slug"));
    }

    function maybeOpenFromUrl() {
      if (!isBusinessDashboard() || getActiveNavLabel().toLowerCase() !== "messages") return;
      const params = new URLSearchParams(window.location.search);
      const slug = params.get("chat") || params.get("message") || params.get("search");
      if (!slug) return;
      if (sessionStorage.getItem(PENDING_SLUG_KEY) === slug) return;
      sessionStorage.setItem(PENDING_SLUG_KEY, slug);
      openChatWithSlug(slug);
    }

    function tryReselectPending() {
      const name = sessionStorage.getItem(PENDING_NAME_KEY);
      if (!name || getActiveNavLabel().toLowerCase() !== "messages") return;
      if (trySelectConversation(name)) {
        sessionStorage.removeItem(PENDING_NAME_KEY);
      }
    }

    document.addEventListener("click", onMessageClick, true);

    function syncMessagesView() {
      if (!isBusinessDashboard()) return;
      if (getActiveNavLabel().toLowerCase() !== "messages") return;
      window.influnetClearBusinessHomeGreeting?.();
      window.influnetGuardBusinessMessages?.();
      window.influnetSyncBusinessMessagesStandalone?.();
    }

    const nav = document.querySelector(".flex.h-screen aside nav");
    if (nav) {
      nav.addEventListener("click", () => {
        [50, 200, 500].forEach((ms) => window.setTimeout(syncMessagesView, ms));
        window.setTimeout(maybeOpenFromUrl, 100);
        window.setTimeout(tryReselectPending, 400);
      });
    }

    window.setInterval(() => {
      if (!isBusinessDashboard()) return;
      if (getActiveNavLabel().toLowerCase() === "messages") {
        syncMessagesView();
        tryReselectPending();
      }
    }, 2000);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        syncMessagesView();
        maybeOpenFromUrl();
      });
    } else {
      syncMessagesView();
      maybeOpenFromUrl();
    }
  } catch (e) {
    console.warn("[influnet] business-messages-bridge:", e);
  }
})();
