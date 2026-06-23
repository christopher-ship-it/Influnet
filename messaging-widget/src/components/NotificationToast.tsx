import { AnimatePresence, motion } from "framer-motion";
import { useNotificationStore } from "../store/notificationStore";
import { useMessagingStore } from "../store/messagingStore";
import { openNavSection } from "../utils/nav";

export function NotificationToastStack() {
  const toasts = useNotificationStore((s) => s.toasts);
  const dismissToast = useNotificationStore((s) => s.dismissToast);
  const openChat = useMessagingStore((s) => s.openChat);

  const handleAction = (t: (typeof toasts)[0]) => {
    if (t.kind === "message" && t.conversationId) {
      window.influnetOpenFloatingMessenger?.();
      openChat(t.conversationId);
    }
    if (t.kind === "collab" || t.kind === "response") {
      openNavSection("requests");
    }
    dismissToast(t.id);
  };

  return (
    <div className="fixed bottom-24 right-6 z-[10002] flex flex-col gap-2 w-[min(340px,calc(100vw-2rem))] pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="pointer-events-auto p-3.5 rounded-2xl border border-[#e5e7eb] dark:border-gray-700 shadow-xl bg-white dark:bg-gray-900"
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 m-0">
              {t.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2 m-0 line-clamp-2">
              {t.body}
            </p>
            {t.actionLabel && (
              <button
                type="button"
                onClick={() => handleAction(t)}
                className="text-xs font-bold text-infl-primary hover:underline border-0 bg-transparent cursor-pointer p-0"
              >
                [{t.actionLabel}]
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
