import { create } from "zustand";
import {
  fetchConversations,
  fetchMessages,
  hideConversation,
  loadArchivedIds,
  saveArchivedIds,
  sendMessage,
  sendTyping,
} from "../api/messagingApi";
import type {
  Conversation,
  ConversationTab,
  Message,
  ToastNotification,
} from "../types";

type MessagesMap = Record<string, Message[]>;

type MessagingState = {
  panelExpanded: boolean;
  mobileFullscreen: boolean;
  listTab: ConversationTab;
  searchQuery: string;
  conversations: Conversation[];
  archivedIds: Set<string>;
  openChatIds: string[];
  activeMessages: MessagesMap;
  loadingList: boolean;
  loadingMessages: Record<string, boolean>;
  sending: Record<string, boolean>;
  drafts: Record<string, string>;
  toasts: ToastNotification[];
  darkMode: boolean;
  listError: string | null;

  setPanelExpanded: (v: boolean) => void;
  setMobileFullscreen: (v: boolean) => void;
  togglePanel: () => void;
  setListTab: (t: ConversationTab) => void;
  setSearchQuery: (q: string) => void;
  setDarkMode: (v: boolean) => void;

  loadConversations: () => Promise<void>;
  openChat: (conversationId: string) => Promise<void>;
  closeChat: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => Promise<void>;
  restoreConversation: (conversationId: string) => void;

  loadMessages: (conversationId: string) => Promise<void>;
  setDraft: (conversationId: string, text: string) => void;
  submitMessage: (conversationId: string) => Promise<void>;
  notifyTyping: (conversationId: string) => void;

  pushToast: (toast: Omit<ToastNotification, "id" | "createdAt">) => void;
  dismissToast: (id: string) => void;

  applyPresenceUpdate: (
    conversationId: string,
    patch: Partial<Conversation["otherUser"]>
  ) => void;
  ingestRealtimeMessage: (conversationId: string, message: Message) => void;
};

let typingThrottle: Record<string, number> = {};

export const useMessagingStore = create<MessagingState>((set, get) => ({
  panelExpanded: false,
  mobileFullscreen: false,
  listTab: "active",
  searchQuery: "",
  conversations: [],
  archivedIds: loadArchivedIds(),
  openChatIds: [],
  activeMessages: {},
  loadingList: false,
  loadingMessages: {},
  sending: {},
  drafts: {},
  toasts: [],
  darkMode:
    localStorage.getItem("infl_messenger_dark") === "1" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  listError: null,

  setPanelExpanded: (v) => set({ panelExpanded: v }),
  setMobileFullscreen: (v) => set({ mobileFullscreen: v }),
  togglePanel: () => set((s) => ({ panelExpanded: !s.panelExpanded })),
  setListTab: (t) => set({ listTab: t }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setDarkMode: (v) => {
    localStorage.setItem("infl_messenger_dark", v ? "1" : "0");
    set({ darkMode: v });
  },

  loadConversations: async () => {
    set({ loadingList: true, listError: null });
    try {
      const conversations = await fetchConversations();
      set({ conversations, loadingList: false });
    } catch (e) {
      set({
        loadingList: false,
        listError: e instanceof Error ? e.message : "Could not load conversations",
      });
    }
  },

  openChat: async (conversationId) => {
    set((s) => {
      const open = s.openChatIds.includes(conversationId)
        ? s.openChatIds
        : [...s.openChatIds, conversationId].slice(-4);
      return { openChatIds: open, panelExpanded: false };
    });
    await get().loadMessages(conversationId);
    window.dispatchEvent(new CustomEvent("influnet-messenger-chat-opened"));
    import("../api/notificationsApi").then(({ fetchNotificationSummary }) => {
      fetchNotificationSummary().then((summary) => {
        import("./notificationStore").then(({ useNotificationStore }) => {
          useNotificationStore.getState().setCounts(
            summary.unreadMessagesCount,
            summary.pendingRequestsCount
          );
        });
      });
    });
  },

  closeChat: (conversationId) => {
    set((s) => ({
      openChatIds: s.openChatIds.filter((id) => id !== conversationId),
    }));
  },

  archiveConversation: async (conversationId) => {
    const archived = new Set(get().archivedIds);
    archived.add(conversationId);
    saveArchivedIds(archived);
    get().closeChat(conversationId);
    set({ archivedIds: archived });
    try {
      await hideConversation(conversationId);
    } catch {
      /* local archive still applies */
    }
    await get().loadConversations();
  },

  restoreConversation: (conversationId) => {
    const archived = new Set(get().archivedIds);
    archived.delete(conversationId);
    saveArchivedIds(archived);
    set({ archivedIds: archived, listTab: "active" });
  },

  loadMessages: async (conversationId) => {
    set((s) => ({
      loadingMessages: { ...s.loadingMessages, [conversationId]: true },
    }));
    try {
      const messages = await fetchMessages(conversationId);
      set((s) => ({
        activeMessages: { ...s.activeMessages, [conversationId]: messages },
        loadingMessages: { ...s.loadingMessages, [conversationId]: false },
      }));
    } catch {
      set((s) => ({
        loadingMessages: { ...s.loadingMessages, [conversationId]: false },
      }));
    }
  },

  setDraft: (conversationId, text) => {
    set((s) => ({ drafts: { ...s.drafts, [conversationId]: text } }));
    get().notifyTyping(conversationId);
  },

  submitMessage: async (conversationId) => {
    const body = (get().drafts[conversationId] || "").trim();
    if (!body || get().sending[conversationId]) return;
    set((s) => ({
      sending: { ...s.sending, [conversationId]: true },
      drafts: { ...s.drafts, [conversationId]: "" },
    }));
    const myId =
      JSON.parse(localStorage.getItem("influnet_user") || "{}")?.id || "me";
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      body,
      senderUserId: myId,
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    set((s) => ({
      activeMessages: {
        ...s.activeMessages,
        [conversationId]: [...(s.activeMessages[conversationId] || []), optimistic],
      },
    }));
    try {
      const saved = await sendMessage(conversationId, body);
      set((s) => ({
        activeMessages: {
          ...s.activeMessages,
          [conversationId]: (s.activeMessages[conversationId] || []).map((m) =>
            m.id === optimistic.id ? { ...saved, status: "sent" as const } : m
          ),
        },
        sending: { ...s.sending, [conversationId]: false },
      }));
      await get().loadConversations();
    } catch {
      set((s) => ({
        activeMessages: {
          ...s.activeMessages,
          [conversationId]: (s.activeMessages[conversationId] || []).filter(
            (m) => m.id !== optimistic.id
          ),
        },
        sending: { ...s.sending, [conversationId]: false },
        drafts: { ...s.drafts, [conversationId]: body },
      }));
    }
  },

  notifyTyping: (conversationId) => {
    const now = Date.now();
    if ((typingThrottle[conversationId] || 0) > now - 1500) return;
    typingThrottle[conversationId] = now;
    sendTyping(conversationId).catch(() => {});
  },

  pushToast: (toast) => {
    const item: ToastNotification = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };
    set((s) => ({ toasts: [...s.toasts, item].slice(-5) }));
    window.setTimeout(() => get().dismissToast(item.id), 5000);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  applyPresenceUpdate: (conversationId, patch) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, otherUser: { ...c.otherUser, ...patch } }
          : c
      ),
    }));
  },

  ingestRealtimeMessage: (conversationId, message) => {
    const uid = JSON.parse(localStorage.getItem("influnet_user") || "{}")?.id;
    set((s) => {
      const existing = s.activeMessages[conversationId] || [];
      if (existing.some((m) => m.id === message.id)) return s;
      const next = { ...s.activeMessages, [conversationId]: [...existing, message] };
      const conversations = s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: message.body,
              lastMessageAt: message.createdAt,
              unreadCount:
                message.senderUserId !== uid && !s.openChatIds.includes(conversationId)
                  ? (c.unreadCount || 0) + 1
                  : c.unreadCount,
            }
          : c
      );
      return { activeMessages: next, conversations };
    });
    if (message.senderUserId !== uid) {
      import("./notificationStore").then(({ useNotificationStore }) => {
        useNotificationStore.getState().incrementMessages();
      });
    }
  },
}));

export function totalUnread(conversations: Conversation[]): number {
  return conversations.reduce((n, c) => n + (c.unreadCount || 0), 0);
}
