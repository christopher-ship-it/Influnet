/**
 * After a collaboration request is accepted, open Messages and select the chat.
 */
(function () {
  try {
    const PENDING_CHAT_KEY = "influnet_pending_chat_name";

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

    function navToMessages() {
      const btn = [...document.querySelectorAll("aside nav button")].find(
        (b) => normalizeNavText(b.textContent).toLowerCase() === "messages"
      );
      if (btn) btn.click();
    }

    function trySelectConversation(displayName) {
      if (!displayName) return false;
      const main = document.querySelector("main.flex-1.overflow-hidden, main.flex-1");
      if (!main) return false;
      const needle = displayName.trim().split(/\s+/)[0].toLowerCase();
      const buttons = [...main.querySelectorAll("button")];
      const match = buttons.find((btn) => {
        const text = btn.textContent.replace(/\d+/g, "").trim().toLowerCase();
        if (!text.includes(needle)) return false;
        return btn.closest(".w-72, [class*='border-r']");
      });
      if (match) {
        match.click();
        return true;
      }
      return false;
    }

    function openMessagesWithPartner(displayName) {
      if (!displayName) return;
      sessionStorage.setItem(PENDING_CHAT_KEY, displayName);
      navToMessages();
      let attempts = 0;
      const pick = () => {
        if (getActiveNavLabel().toLowerCase() !== "messages") return;
        if (trySelectConversation(displayName)) {
          sessionStorage.removeItem(PENDING_CHAT_KEY);
          return;
        }
        if (++attempts < 24) window.setTimeout(pick, 250);
      };
      window.setTimeout(pick, 200);
    }

    window.addEventListener("influnet-collab-accepted", (ev) => {
      const d = ev.detail || {};
      const user = JSON.parse(localStorage.getItem("influnet_user") || "null");
      const isInfluencer = user?.role === "influencer";
      const label = isInfluencer
        ? d.businessName || "Business"
        : d.influencerName || "Creator";
      openMessagesWithPartner(label);
    });

    function tryReselectPending() {
      const name = sessionStorage.getItem(PENDING_CHAT_KEY);
      if (!name || getActiveNavLabel().toLowerCase() !== "messages") return;
      if (trySelectConversation(name)) {
        sessionStorage.removeItem(PENDING_CHAT_KEY);
      }
    }

    const nav = document.querySelector(".flex.h-screen aside nav");
    if (nav) {
      nav.addEventListener("click", () => {
        window.setTimeout(tryReselectPending, 400);
      });
    }

    window.setInterval(tryReselectPending, 2000);
  } catch (e) {
    console.warn("[influnet] collab-flow-bridge:", e);
  }
})();
