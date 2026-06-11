import { useEffect } from "react";
import { connectEvents, fetchConversationStatus } from "../api/messagingApi";
import { useMessagingStore } from "../store/messagingStore";

export function useMessagingRealtime() {
  const openChatIds = useMessagingStore((s) => s.openChatIds);
  const applyPresenceUpdate = useMessagingStore((s) => s.applyPresenceUpdate);
  const ingestRealtimeMessage = useMessagingStore((s) => s.ingestRealtimeMessage);
  const loadConversations = useMessagingStore((s) => s.loadConversations);
  const loadMessages = useMessagingStore((s) => s.loadMessages);

  useEffect(() => {
    loadConversations();
    const poll = window.setInterval(() => loadConversations(), 12000);
    return () => clearInterval(poll);
  }, [loadConversations]);

  useEffect(() => {
    const close = connectEvents((evt) => {
      if (evt.type === "message" && typeof evt.conversationId === "string") {
        loadMessages(evt.conversationId as string);
        loadConversations();
      }
      if (evt.type === "typing" && typeof evt.conversationId === "string") {
        applyPresenceUpdate(evt.conversationId as string, { isTyping: true });
        window.setTimeout(
          () => applyPresenceUpdate(evt.conversationId as string, { isTyping: false }),
          3200
        );
      }
      if (evt.type === "presence" && typeof evt.userId === "string") {
        const convs = useMessagingStore.getState().conversations;
        for (const c of convs) {
          if (c.otherUser.id === evt.userId) {
            applyPresenceUpdate(c.id, {
              isOnline: !!evt.isOnline,
              lastSeenAt: (evt.lastSeenAt as string) || c.otherUser.lastSeenAt,
            });
          }
        }
      }
    });
    return close;
  }, [applyPresenceUpdate, loadConversations, loadMessages, ingestRealtimeMessage]);

  useEffect(() => {
    const timers: number[] = [];
    for (const id of openChatIds) {
      const tick = async () => {
        try {
          const status = await fetchConversationStatus(id);
          applyPresenceUpdate(id, {
            isOnline: status.isOnline,
            lastSeenAt: status.lastSeenAt ?? null,
            isTyping: status.typing,
          });
        } catch {
          /* ignore */
        }
      };
      tick();
      timers.push(window.setInterval(tick, 2800) as unknown as number);
    }
    return () => timers.forEach((t) => clearInterval(t));
  }, [openChatIds, applyPresenceUpdate]);
}
