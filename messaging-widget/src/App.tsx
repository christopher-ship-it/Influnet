import { useEffect, useState } from "react";
import { useMessagingStore } from "./store/messagingStore";
import { useMessagingRealtime } from "./hooks/useMessagingRealtime";
import { useIsMessagesPage } from "./hooks/useIsMessagesPage";
import { useCollapseFloatingMessengerOnNav } from "./hooks/useCollapseFloatingMessengerOnNav";
import { MessagingLauncher } from "./components/MessagingLauncher";
import { MessagesWorkspace } from "./components/MessagesWorkspace";
import { NotificationToastStack } from "./components/NotificationToast";
import { MessagingErrorBoundary } from "./components/MessagingErrorBoundary";
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
  const onMessagesPage = useIsMessagesPage();

  useCollapseFloatingMessengerOnNav(onMessagesPage);

  useMessagingRealtime();
  useNotificationRealtime();

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
    const showFloating = !!user && isDashboardRoute() && !onMessagesPage;
    document.body.classList.toggle("infl-floating-messenger-active", showFloating);
    return () => document.body.classList.remove("infl-floating-messenger-active");
  }, [user, onMessagesPage]);

  if (!user || !isDashboardRoute()) return null;

  return (
    <MessagingErrorBoundary fallbackTitle="Messaging unavailable">
      {onMessagesPage ? (
        <MessagesWorkspace currentUser={user} isMobile={isMobile} />
      ) : (
        <MessagingLauncher currentUser={user} isMobile={isMobile} />
      )}
      <SidebarBadgeHost />
      <NotificationToastStack />
    </MessagingErrorBoundary>
  );
}
