import { create } from "zustand";
import type { ToastNotification } from "../types";

type NotificationState = {
  unreadMessagesCount: number;
  pendingRequestsCount: number;
  pulseMessages: boolean;
  pulseRequests: boolean;
  toasts: ToastNotification[];

  setCounts: (messages: number, requests: number) => void;
  incrementMessages: () => void;
  decrementMessages: () => void;
  incrementRequests: () => void;
  decrementRequests: () => void;
  resetMessages: () => void;
  resetRequests: () => void;

  pushToast: (toast: Omit<ToastNotification, "id" | "createdAt">) => void;
  dismissToast: (id: string) => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadMessagesCount: 0,
  pendingRequestsCount: 0,
  pulseMessages: false,
  pulseRequests: false,
  toasts: [],

  setCounts: (messages, requests) => {
    const prev = get();
    set({
      unreadMessagesCount: Math.max(0, messages),
      pendingRequestsCount: Math.max(0, requests),
      pulseMessages: messages > prev.unreadMessagesCount,
      pulseRequests: requests > prev.pendingRequestsCount,
    });
    if (messages > prev.unreadMessagesCount || requests > prev.pendingRequestsCount) {
      window.setTimeout(() => {
        set({ pulseMessages: false, pulseRequests: false });
      }, 450);
    }
  },

  incrementMessages: () => {
    const n = get().unreadMessagesCount + 1;
    get().setCounts(n, get().pendingRequestsCount);
  },

  decrementMessages: () => {
    get().setCounts(
      Math.max(0, get().unreadMessagesCount - 1),
      get().pendingRequestsCount
    );
  },

  incrementRequests: () => {
    get().setCounts(get().unreadMessagesCount, get().pendingRequestsCount + 1);
  },

  decrementRequests: () => {
    get().setCounts(
      get().unreadMessagesCount,
      Math.max(0, get().pendingRequestsCount - 1)
    );
  },

  resetMessages: () => get().setCounts(0, get().pendingRequestsCount),
  resetRequests: () => get().setCounts(get().unreadMessagesCount, 0),

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
}));
