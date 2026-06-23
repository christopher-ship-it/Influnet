import { useEffect } from "react";
import { useMessagingStore } from "../store/messagingStore";
import { isOnMessagesPage, normalizeNavText } from "../utils/nav";

function collapseFloatingMessenger() {
  const s = useMessagingStore.getState();
  if (!s.panelExpanded && !s.mobileFullscreen && !s.selectedConversationId) return;
  s.setPanelExpanded(false);
  s.setMobileFullscreen(false);
  s.clearSelectedConversation();
}

/**
 * Hide the floating Messages overlay when the user navigates away from Messages.
 * Do NOT observe the whole document — that collapsed the panel as soon as it opened.
 */
export function useCollapseFloatingMessengerOnNav(onMessagesPage: boolean) {
  useEffect(() => {
    if (!onMessagesPage) {
      collapseFloatingMessenger();
    }
  }, [onMessagesPage]);

  useEffect(() => {
    const collapseUnlessMessages = () => {
      if (!isOnMessagesPage()) collapseFloatingMessenger();
    };

    const onNavClick = (e: Event) => {
      const nav = document.querySelector(".flex.h-screen aside nav");
      const btn = (e.target as HTMLElement).closest?.("button");
      if (!btn || !nav?.contains(btn)) return;
      const label = normalizeNavText(btn.textContent || "");
      if (label !== "messages") {
        collapseFloatingMessenger();
        window.setTimeout(collapseUnlessMessages, 0);
        window.setTimeout(collapseUnlessMessages, 150);
      }
    };

    const wireNav = () => {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav || nav.dataset.inflMsgNavCollapse === "1") return;
      nav.dataset.inflMsgNavCollapse = "1";
      nav.addEventListener("click", onNavClick, true);
      nav.parentElement
        ?.querySelector(":scope > div:last-of-type")
        ?.addEventListener("click", onNavClick, true);
    };

    wireNav();

    window.addEventListener("influnet-nav-changed", collapseUnlessMessages);
    window.addEventListener("popstate", collapseUnlessMessages);

    const aside = document.querySelector(".flex.h-screen aside");
    const obs = aside
      ? new MutationObserver(() => wireNav())
      : null;
    if (aside && obs) {
      obs.observe(aside, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener("influnet-nav-changed", collapseUnlessMessages);
      window.removeEventListener("popstate", collapseUnlessMessages);
      obs?.disconnect();
    };
  }, []);
}
