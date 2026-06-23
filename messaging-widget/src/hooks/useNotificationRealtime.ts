import { useEffect, useRef } from "react";
import { connectEvents, fetchConversations } from "../api/messagingApi";
import { fetchNotificationSummary } from "../api/notificationsApi";
import { useNotificationStore } from "../store/notificationStore";
import { useMessagingStore } from "../store/messagingStore";
import { displayName } from "../utils/avatar";
import { isOnMessagesPage, isOnRequestsPage } from "../utils/nav";

export function useNotificationRealtime() {
  const setCounts = useNotificationStore((s) => s.setCounts);
  const pushToast = useNotificationStore((s) => s.pushToast);
  const prevRef = useRef({ messages: 0, requests: 0 });

  const refresh = async () => {
    const summary = await fetchNotificationSummary();
    const prev = prevRef.current;

    if (
      summary.unreadMessagesCount > prev.messages &&
      !isOnMessagesPage()
    ) {
      try {
        const convs = await fetchConversations();
        const withUnread = convs.filter((c) => (c.unreadCount || 0) > 0);
        const latest = withUnread[0];
        if (latest) {
          pushToast({
            title: "📩 New Message",
            body: `${displayName(latest.otherUser)} sent you a message`,
            kind: "message",
            conversationId: latest.id,
            actionLabel: "View Conversation",
          });
        }
      } catch {
        pushToast({
          title: "📩 New Message",
          body: "You have a new message",
          kind: "message",
          actionLabel: "View Conversation",
        });
      }
    }

    if (
      summary.pendingRequestsCount > prev.requests &&
      !isOnRequestsPage()
    ) {
      pushToast({
        title: "🤝 New Collaboration Request",
        body: "You have a new collaboration request",
        kind: "collab",
        actionLabel: "View Request",
      });
    }

    prevRef.current = {
      messages: summary.unreadMessagesCount,
      requests: summary.pendingRequestsCount,
    };
    setCounts(summary.unreadMessagesCount, summary.pendingRequestsCount);
  };

  useEffect(() => {
    refresh();
    const poll = window.setInterval(refresh, 15000);

    const onNotify = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        type?: string;
        conversationId?: string;
        fromName?: string;
        body?: string;
        senderUserId?: string;
        requestId?: string;
      };
      if (!detail?.type) return;

      if (detail.type === "NEW_MESSAGE_RECEIVED" || detail.type === "message") {
        refresh();
        if (!isOnMessagesPage() && detail.conversationId) {
          const uid = JSON.parse(localStorage.getItem("influnet_user") || "{}")?.id;
          if (detail.senderUserId && detail.senderUserId === uid) return;
          pushToast({
            title: "📩 New Message",
            body: detail.body ? String(detail.body).slice(0, 120) : "New message received",
            kind: "message",
            conversationId: detail.conversationId,
            actionLabel: "View Conversation",
          });
        }
      }

      if (detail.type === "MESSAGE_READ") {
        refresh();
      }

      if (detail.type === "NEW_REQUEST_RECEIVED") {
        refresh();
        if (!isOnRequestsPage()) {
          pushToast({
            title: "🤝 New Collaboration Request",
            body: detail.fromName
              ? `${detail.fromName} wants to collaborate`
              : "New collaboration request received",
            kind: "collab",
            requestId: detail.requestId as string | undefined,
            actionLabel: "View Request",
          });
        }
      }

      if (detail.type === "PROFILE_VIEWED") {
        refresh();
        const uid = JSON.parse(localStorage.getItem("influnet_user") || "{}")?.id;
        if (detail.toUserId && detail.toUserId !== uid) return;
        pushToast({
          title: "👀 Profile View",
          body: detail.body || `${detail.fromName || "A business"} viewed your profile.`,
          kind: "response",
          actionLabel: "View Dashboard",
        });
      }

      if (
        detail.type === "REQUEST_ACCEPTED" ||
        detail.type === "REQUEST_REJECTED" ||
        detail.type === "REQUEST_VIEWED"
      ) {
        refresh();
      }
    };

    window.addEventListener("influnet-notification", onNotify);
    const closeSse = connectEvents((evt) => {
      onNotify(new CustomEvent("influnet-notification", { detail: evt }));
    });

    return () => {
      clearInterval(poll);
      window.removeEventListener("influnet-notification", onNotify);
      closeSse();
    };
  }, [pushToast, setCounts]);

  useEffect(() => {
    const onOpenChat = () => refresh();
    window.addEventListener("influnet-messenger-chat-opened", onOpenChat);
    return () => window.removeEventListener("influnet-messenger-chat-opened", onOpenChat);
  }, [setCounts]);
}
