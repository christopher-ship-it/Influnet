import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useMessagingStore } from "./store/messagingStore";
import { useMessagingRealtime } from "./hooks/useMessagingRealtime";
import { MessagingLauncher } from "./components/MessagingLauncher";
import { ChatWindow } from "./components/ChatWindow";
import { NotificationToastStack } from "./components/NotificationToast";
import { SidebarBadgeHost } from "./components/SidebarBadgeHost";
import { useNotificationRealtime } from "./hooks/useNotificationRealtime";
import type { AuthUser } from "./types";

function readUser(): AuthUser | null {
  try {
    return JSON.parse(localStorage.getItem("influnet_user") || "null");
  } catch {
    return null;
  }
}

function isDashboardRoute() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  return path === "/dashboard" || path === "/dashboard/influencer";
}

export function App() {
  const [user, setUser] = useState<AuthUser | null>(readUser);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  const darkMode = useMessagingStore((s) => s.darkMode);
  const openChatIds = useMessagingStore((s) => s.openChatIds);
  const conversations = useMessagingStore((s) => s.conversations);
  const openChat = useMessagingStore((s) => s.openChat);
  const mobileFullscreen = useMessagingStore((s) => s.mobileFullscreen);

  useMessagingRealtime();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onUser = () => setUser(readUser());
    window.addEventListener("influnet-user-updated", onUser);
    window.addEventListener("storage", onUser);
    return () => {
      window.removeEventListener("influnet-user-updated", onUser);
      window.removeEventListener("storage", onUser);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("infl-floating-messenger-active", !!user && isDashboardRoute());
    return () => document.body.classList.remove("infl-floating-messenger-active");
  }, [user]);

  const openConversations = useMemo(
    () =>
      openChatIds
        .map((id) => conversations.find((c) => c.id === id))
        .filter(Boolean) as typeof conversations,
    [openChatIds, conversations]
  );

  if (!user || !isDashboardRoute()) return null;

  const handleOpenChat = (id: string) => {
    openChat(id);
    if (isMobile) {
      useMessagingStore.getState().setMobileFullscreen(false);
      useMessagingStore.getState().setPanelExpanded(false);
    }
  };

  return (
    <>
      {!mobileFullscreen && (
        <MessagingLauncher
          currentUser={user}
          isMobile={isMobile}
          onOpenChat={handleOpenChat}
        />
      )}
      <AnimatePresence>
        {openConversations.map((conv, i) => (
          <ChatWindow
            key={conv.id}
            conversation={conv}
            stackIndex={openConversations.length - 1 - i}
            isMobile={isMobile}
            myUserId={user.id}
          />
        ))}
      </AnimatePresence>
      <SidebarBadgeHost />
      <NotificationToastStack />
    </>
  );
}
