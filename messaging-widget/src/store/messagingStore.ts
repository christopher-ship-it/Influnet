import { create } from "zustand";
import {
  deleteConversation,
  fetchConversations,
  fetchMessages,
  hideConversation,
  loadArchivedIds,
  loadMutedIds,
  markConversationUnread,
  saveArchivedIds,
  saveMutedIds,
  sendMessage,
  sendTyping,
  uploadMessageAttachment,
} from "../api/messagingApi";
import type {
  Conversation,
  ConversationTab,
  Message,
  MessageAttachment,
  PendingAttachment,
  ToastNotification,
  WorkspacePane,
} from "../types";
import { logMessenger } from "../utils/debug";
import { dedupeConversationsByPeer } from "../utils/conversation";
import { parseMessageBody } from "../utils/messageBody";

type MessagesMap = Record<string, Message[]>;

function toMs(value: string | undefined): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function isRecentLocalMessage(msg: Message): boolean {
  const ts = toMs(msg.createdAt);
  if (!ts) return false;
  return Date.now() - ts < 15000;
}

function mergeFetchedMessages(existing: Message[], fetched: Message[]): Message[] {
  const byId = new Set(fetched.map((m) => String(m.id)));
  const keepLocal = existing.filter((m) => {
    const id = String(m.id || "");
    if (!id || byId.has(id)) return false;
    // Keep optimistic + just-sent local echoes to prevent brief disappear/reappear flicker.
    if (id.startsWith("tmp-")) return true;
    return isRecentLocalMessage(m);
  });
  return [...fetched, ...keepLocal].sort(
    (a, b) => toMs(a.createdAt) - toMs(b.createdAt)
  );
}

type MessagingState = {
  panelExpanded: boolean;
  mobileFullscreen: boolean;
  selectedConversationId: string | null;
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
  pendingAttachments: Record<string, PendingAttachment | null>;
  mutedIds: Set<string>;
  toasts: ToastNotification[];
  darkMode: boolean;
  listError: string | null;
  workspacePane: WorkspacePane;
  collaborationPartnerIds: Set<string>;

  setPanelExpanded: (v: boolean) => void;
  setMobileFullscreen: (v: boolean) => void;
  togglePanel: () => void;
  setListTab: (t: ConversationTab) => void;
  setWorkspacePane: (p: WorkspacePane) => void;
  setSearchQuery: (q: string) => void;
  setDarkMode: (v: boolean) => void;

  loadConversations: () => Promise<void>;
  loadCollaborationPartners: () => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  openChat: (conversationId: string) => Promise<void>;
  clearSelectedConversation: () => void;
  closeChat: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => Promise<void>;
  restoreConversation: (conversationId: string) => void;

  loadMessages: (conversationId: string) => Promise<void>;
  setDraft: (conversationId: string, text: string) => void;
  setPendingAttachment: (conversationId: string, file: PendingAttachment | null) => void;
  submitMessage: (conversationId: string) => Promise<void>;
  signalTyping: (conversationId: string) => void;
  markConversationUnread: (conversationId: string) => Promise<void>;
  toggleMuteConversation: (conversationId: string) => void;
  deleteConversationPermanently: (conversationId: string) => Promise<void>;

  pushToast: (toast: Omit<ToastNotification, "id" | "createdAt">) => void;
  dismissToast: (id: string) => void;

  applyPresenceUpdate: (
    conversationId: string,
    patch: Partial<Conversation["otherUser"]>
  ) => void;
  ingestRealtimeMessage: (conversationId: string, message: Message) => void;
};

let typingThrottle: Record<string, number> = {};
const typingStopTimers: Record<string, number> = {};

export const useMessagingStore = create<MessagingState>((set, get) => ({
  panelExpanded: false,
  mobileFullscreen: false,
  selectedConversationId: null,
  listTab: "all",
  workspacePane: "list",
  searchQuery: "",
  conversations: [],
  archivedIds: loadArchivedIds(),
  openChatIds: [],
  activeMessages: {},
  loadingList: false,
  loadingMessages: {},
  sending: {},
  drafts: {},
  pendingAttachments: {},
  mutedIds: loadMutedIds(),
  toasts: [],
  darkMode:
    localStorage.getItem("infl_messenger_dark") === "1" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  listError: null,
  collaborationPartnerIds: new Set(),

  setPanelExpanded: (v) => set({ panelExpanded: v }),
  setMobileFullscreen: (v) => set({ mobileFullscreen: v }),
  togglePanel: () => set((s) => ({ panelExpanded: !s.panelExpanded })),
  setListTab: (t) => set({ listTab: t }),
  setWorkspacePane: (p) => set({ workspacePane: p }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setDarkMode: (v) => {
    localStorage.setItem("infl_messenger_dark", v ? "1" : "0");
    set({ darkMode: v });
  },

  loadConversations: async () => {
    const isInitialLoad = get().conversations.length === 0;
    if (isInitialLoad) set({ loadingList: true, listError: null });
    try {
      const conversations = dedupeConversationsByPeer(await fetchConversations());
      set({ conversations, loadingList: false });
      void get().loadCollaborationPartners();
    } catch (e) {
      set({
        loadingList: false,
        listError: e instanceof Error ? e.message : "Could not load conversations",
      });
    }
  },

  loadCollaborationPartners: async () => {
    try {
      const user = JSON.parse(localStorage.getItem("influnet_user") || "{}");
      const myId = user?.id;
      if (!myId) return;
      const { fetchProjects, activeCollaborationPartnerIds } = await import(
        "../api/projectsApi"
      );
      const projects = await fetchProjects();
      set({ collaborationPartnerIds: activeCollaborationPartnerIds(projects, myId) });
    } catch {
      /* ignore */
    }
  },

  openChat: async (conversationId) => get().selectConversation(conversationId),

  selectConversation: async (conversationId) => {
    logMessenger("selectConversation called", conversationId);
    if (!conversationId || typeof conversationId !== "string") {
      console.warn("[infl-messenger] selectConversation ignored — invalid id", conversationId);
      return;
    }
    set((s) => ({
      selectedConversationId: conversationId,
      openChatIds: [conversationId],
      panelExpanded: true,
      workspacePane: "chat",
    }));
    logMessenger("state after select", {
      selectedConversationId: get().selectedConversationId,
      panelExpanded: get().panelExpanded,
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

  clearSelectedConversation: () => {
    set({ selectedConversationId: null, openChatIds: [], workspacePane: "list" });
  },

  closeChat: (conversationId) => {
    set((s) => ({
      selectedConversationId:
        s.selectedConversationId === conversationId ? null : s.selectedConversationId,
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
        activeMessages: {
          ...s.activeMessages,
          [conversationId]: mergeFetchedMessages(
            s.activeMessages[conversationId] || [],
            messages
          ),
        },
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
  },

  setPendingAttachment: (conversationId, file) => {
    set((s) => ({
      pendingAttachments: { ...s.pendingAttachments, [conversationId]: file },
    }));
  },

  submitMessage: async (conversationId) => {
    const text = (get().drafts[conversationId] || "").trim();
    const pending = get().pendingAttachments[conversationId];
    if ((!text && !pending) || get().sending[conversationId]) return;

    set((s) => ({
      sending: { ...s.sending, [conversationId]: true },
      drafts: { ...s.drafts, [conversationId]: "" },
      pendingAttachments: { ...s.pendingAttachments, [conversationId]: null },
    }));

    const myId =
      JSON.parse(localStorage.getItem("influnet_user") || "{}")?.id || "me";
    let attachments: MessageAttachment[] = [];

    try {
      if (pending?.file) {
        attachments = [await uploadMessageAttachment(conversationId, pending.file)];
      }

      const optimistic: Message = {
        id: `tmp-${Date.now()}`,
        body: text || (attachments[0] ? `📎 ${attachments[0].name}` : ""),
        attachments,
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

      const saved = await sendMessage(conversationId, text, attachments);
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
            (m) => !String(m.id).startsWith("tmp-")
          ),
        },
        sending: { ...s.sending, [conversationId]: false },
        drafts: { ...s.drafts, [conversationId]: text },
        pendingAttachments: { ...s.pendingAttachments, [conversationId]: pending },
      }));
    }
  },

  markConversationUnread: async (conversationId) => {
    await markConversationUnread(conversationId);
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: Math.max(1, c.unreadCount || 1) } : c
      ),
    }));
  },

  toggleMuteConversation: (conversationId) => {
    const muted = new Set(get().mutedIds);
    if (muted.has(conversationId)) muted.delete(conversationId);
    else muted.add(conversationId);
    saveMutedIds(muted);
    set({ mutedIds: muted });
  },

  deleteConversationPermanently: async (conversationId) => {
    await deleteConversation(conversationId);
    get().closeChat(conversationId);
    const archived = new Set(get().archivedIds);
    archived.delete(conversationId);
    saveArchivedIds(archived);
    set((s) => ({
      archivedIds: archived,
      conversations: s.conversations.filter((c) => c.id !== conversationId),
      activeMessages: Object.fromEntries(
        Object.entries(s.activeMessages).filter(([id]) => id !== conversationId)
      ),
    }));
  },

  signalTyping: (conversationId) => {
    const draft = (get().drafts[conversationId] || "").trim();
    if (!draft) return;

    const now = Date.now();
    if ((typingThrottle[conversationId] || 0) <= now - 1500) {
      typingThrottle[conversationId] = now;
      sendTyping(conversationId).catch(() => {});
    }

    if (typingStopTimers[conversationId]) {
      window.clearTimeout(typingStopTimers[conversationId]);
    }
    typingStopTimers[conversationId] = window.setTimeout(() => {
      delete typingStopTimers[conversationId];
    }, 2000);
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
    const parsed = parseMessageBody(message.body);
    const normalized = {
      ...message,
      body: parsed.text,
      attachments: parsed.attachments.length ? parsed.attachments : message.attachments,
    };
    set((s) => {
      const existing = s.activeMessages[conversationId] || [];
      if (existing.some((m) => m.id === message.id)) return s;
      const next = {
        ...s.activeMessages,
        [conversationId]: [...existing, normalized],
      };
      const conversations = s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: parsed.text || (parsed.attachments[0] ? `📎 ${parsed.attachments[0].name}` : message.body),
              lastMessageAt: message.createdAt,
              unreadCount:
                message.senderUserId !== uid &&
                s.selectedConversationId !== conversationId
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
