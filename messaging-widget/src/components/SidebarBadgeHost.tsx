import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNotificationStore } from "../store/notificationStore";
import { findNavButton } from "../utils/nav";
import { SidebarBadge } from "./SidebarBadge";

const BADGE_HOST = "infl-sidebar-badge-host";

function ensureHost(btn: HTMLButtonElement): HTMLElement {
  let host = btn.querySelector(`:scope > .${BADGE_HOST}`) as HTMLElement | null;
  if (!host) {
    host = document.createElement("span");
    host.className = `${BADGE_HOST} ml-auto shrink-0 flex items-center`;
    btn.appendChild(host);
  }
  return host;
}

type Anchors = {
  messages: HTMLElement | null;
  requests: HTMLElement | null;
};

/**
 * Sidebar badges are portaled into the host SPA nav. Avoid MutationObserver here —
 * observing nav while injecting foreign DOM into React-managed buttons caused
 * maximum update depth (#185) on the influencer dashboard.
 */
export function SidebarBadgeHost() {
  const unreadMessagesCount = useNotificationStore((s) => s.unreadMessagesCount);
  const pendingRequestsCount = useNotificationStore((s) => s.pendingRequestsCount);
  const pulseMessages = useNotificationStore((s) => s.pulseMessages);
  const pulseRequests = useNotificationStore((s) => s.pulseRequests);
  const [anchors, setAnchors] = useState<Anchors>({ messages: null, requests: null });
  const syncingRef = useRef(false);

  const syncAnchors = useCallback(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const messagesBtn = findNavButton("messages");
      const requestsBtn = findNavButton("requests");
      setAnchors((prev) => {
        const next: Anchors = {
          messages: messagesBtn ? ensureHost(messagesBtn) : null,
          requests: requestsBtn ? ensureHost(requestsBtn) : null,
        };
        if (prev.messages === next.messages && prev.requests === next.requests) {
          return prev;
        }
        return next;
      });
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("infl-custom-sidebar-badges");
    syncAnchors();

    const interval = window.setInterval(syncAnchors, 5000);
    const onNav = () => window.setTimeout(syncAnchors, 120);
    window.addEventListener("popstate", onNav);
    window.addEventListener("influnet-user-updated", onNav);

    return () => {
      clearInterval(interval);
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("influnet-user-updated", onNav);
      document.body.classList.remove("infl-custom-sidebar-badges");
    };
  }, [syncAnchors]);

  // Re-anchor when badge counts change — debounced to avoid render storms after chat open.
  useEffect(() => {
    const t = window.setTimeout(syncAnchors, 200);
    return () => clearTimeout(t);
  }, [unreadMessagesCount, pendingRequestsCount, syncAnchors]);

  return (
    <>
      {anchors.messages &&
        createPortal(
          <SidebarBadge
            count={unreadMessagesCount}
            color="#ee3e96"
            pulse={pulseMessages}
          />,
          anchors.messages
        )}
      {anchors.requests &&
        createPortal(
          <SidebarBadge
            count={pendingRequestsCount}
            color="#f26e59"
            pulse={pulseRequests}
          />,
          anchors.requests
        )}
    </>
  );
}
