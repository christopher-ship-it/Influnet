import { useEffect } from "react";
import { connectEvents, fetchConversationStatus } from "../api/messagingApi";
import { useMessagingStore } from "../store/messagingStore";

function currentUserId(): string | null {
  try {
    return JSON.parse(localStorage.getItem("influnet_user") || "{}")?.id || null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("influnet_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useMessagingRealtime() {
  const selectedConversationId = useMessagingStore((s) => s.selectedConversationId);
  const applyPresenceUpdate = useMessagingStore((s) => s.applyPresenceUpdate);
  const loadConversations = useMessagingStore((s) => s.loadConversations);
  const loadMessages = useMessagingStore((s) => s.loadMessages);

  useEffect(() => {
    const delay = window.setTimeout(() => loadConversations(), 2000);
    const poll = window.setInterval(() => loadConversations(), 12000);
    return () => {
      window.clearTimeout(delay);
      window.clearInterval(poll);
    };
  }, [loadConversations]);

  useEffect(() => {
    const uid = currentUserId();
    if (!uid) return;

    const ping = () => {
      fetch("/api/presence/ping", {
        method: "POST",
        credentials: "same-origin",
        headers: authHeaders(),
      }).catch(() => {});
    };

    ping();
    const heartbeat = window.setInterval(ping, 30000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const close = connectEvents((evt) => {
      if (evt.type === "message" && typeof evt.conversationId === "string") {
        loadMessages(evt.conversationId as string);
        loadConversations();
      }

      if (evt.type === "MESSAGE_READ" && typeof evt.conversationId === "string") {
        const convId = evt.conversationId as string;
        const state = useMessagingStore.getState();
        if (
          state.selectedConversationId === convId ||
          state.openChatIds.includes(convId)
        ) {
          loadMessages(convId);
        }
      }

      if (
        evt.type === "typing" &&
        typeof evt.conversationId === "string" &&
        typeof evt.userId === "string"
      ) {
        const uid = currentUserId();
        if (!uid || evt.userId === uid) return;
        const conv = useMessagingStore
          .getState()
          .conversations.find((c) => c.id === evt.conversationId);
        if (!conv || conv.otherUser.id !== evt.userId) return;
        if (!conv.otherUser.presenceEnabled) return;

        applyPresenceUpdate(evt.conversationId as string, { isTyping: true });
        window.setTimeout(() => {
          applyPresenceUpdate(evt.conversationId as string, { isTyping: false });
        }, 2000);
      }

      if (evt.type === "presence" && typeof evt.userId === "string") {
        const convs = useMessagingStore.getState().conversations;
        for (const c of convs) {
          if (c.otherUser.id !== evt.userId || !c.otherUser.presenceEnabled) continue;
          applyPresenceUpdate(c.id, {
            isOnline: !!evt.isOnline,
            lastSeenAt: (evt.lastSeenAt as string) || c.otherUser.lastSeenAt,
          });
        }
      }
    });
    return close;
  }, [applyPresenceUpdate, loadConversations, loadMessages]);

  useEffect(() => {
    if (document.body.classList.contains("infl-msgs-workspace-active")) return;
    const timers: number[] = [];
    const ids = selectedConversationId ? [selectedConversationId] : [];
    for (const id of ids) {
      const tick = async () => {
        try {
          const status = await fetchConversationStatus(id);
          const conv = useMessagingStore.getState().conversations.find((c) => c.id === id);
          if (!status.presenceEnabled) {
            applyPresenceUpdate(id, {
              presenceEnabled: false,
              isOnline: false,
              lastSeenAt: null,
              isTyping: false,
            });
            return;
          }
          applyPresenceUpdate(id, {
            presenceEnabled: true,
            isOnline: !!status.isOnline,
            lastSeenAt: status.lastSeenAt ?? null,
            isTyping: !!status.typing && !!conv?.otherUser.presenceEnabled,
          });
        } catch {
          /* ignore */
        }
      };
      tick();
      timers.push(window.setInterval(tick, 2800) as unknown as number);
    }
    return () => timers.forEach((t) => clearInterval(t));
  }, [selectedConversationId, applyPresenceUpdate]);
}
