import { useEffect, useState } from "react";
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

function hideNativeBadges() {
  document.body.classList.add("infl-custom-sidebar-badges");
  const nav = document.querySelector(".flex.h-screen aside nav");
  nav?.querySelectorAll("button").forEach((btn) => {
    btn.querySelectorAll(
      "span.min-w-\\[18px\\], span.bg-red-500, span.size-2\\.5.rounded-full.bg-red-500"
    ).forEach((el) => {
      if (!el.closest(`.${BADGE_HOST}`)) {
        (el as HTMLElement).style.display = "none";
      }
    });
  });
}

export function SidebarBadgeHost() {
  const unreadMessagesCount = useNotificationStore((s) => s.unreadMessagesCount);
  const pendingRequestsCount = useNotificationStore((s) => s.pendingRequestsCount);
  const pulseMessages = useNotificationStore((s) => s.pulseMessages);
  const pulseRequests = useNotificationStore((s) => s.pulseRequests);
  const [, tick] = useState(0);

  useEffect(() => {
    hideNativeBadges();
    const nav = document.querySelector(".flex.h-screen aside nav");
    if (!nav) return;
    const obs = new MutationObserver(() => {
      hideNativeBadges();
      tick((n) => n + 1);
    });
    obs.observe(nav, { childList: true, subtree: true, attributes: true });
    const interval = window.setInterval(() => tick((n) => n + 1), 2000);
    return () => {
      obs.disconnect();
      clearInterval(interval);
      document.body.classList.remove("infl-custom-sidebar-badges");
    };
  }, []);

  const messagesBtn = findNavButton("messages");
  const requestsBtn = findNavButton("requests");

  return (
    <>
      {messagesBtn &&
        createPortal(
          <SidebarBadge
            count={unreadMessagesCount}
            color="#ee3e96"
            pulse={pulseMessages}
          />,
          ensureHost(messagesBtn)
        )}
      {requestsBtn &&
        createPortal(
          <SidebarBadge
            count={pendingRequestsCount}
            color="#f26e59"
            pulse={pulseRequests}
          />,
          ensureHost(requestsBtn)
        )}
    </>
  );
}
