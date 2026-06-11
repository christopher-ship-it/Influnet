import { AnimatePresence, motion } from "framer-motion";
import { useMessagingStore, totalUnread } from "../store/messagingStore";
import { ConversationList } from "./ConversationList";
import { Avatar } from "./Avatar";
import type { AuthUser } from "../types";

type Props = {
  currentUser: AuthUser | null;
  isMobile: boolean;
  onOpenChat: (id: string) => void;
};

export function MessagingLauncher({ currentUser, isMobile, onOpenChat }: Props) {
  const panelExpanded = useMessagingStore((s) => s.panelExpanded);
  const togglePanel = useMessagingStore((s) => s.togglePanel);
  const setPanelExpanded = useMessagingStore((s) => s.setPanelExpanded);
  const setMobileFullscreen = useMessagingStore((s) => s.setMobileFullscreen);
  const conversations = useMessagingStore((s) => s.conversations);
  const mobileFullscreen = useMessagingStore((s) => s.mobileFullscreen);
  const unread = totalUnread(conversations);

  const openPanel = () => {
    if (isMobile) {
      setMobileFullscreen(true);
      setPanelExpanded(true);
    } else {
      togglePanel();
    }
  };

  if (isMobile && mobileFullscreen && panelExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[10000] bg-white dark:bg-gray-950 flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <span className="font-bold text-gray-900 dark:text-gray-100">Messages</span>
          <button
            type="button"
            onClick={() => {
              setMobileFullscreen(false);
              setPanelExpanded(false);
            }}
            className="p-2 rounded-lg border-0 bg-transparent cursor-pointer text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <ConversationList currentUser={currentUser} onSelect={onOpenChat} />
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className={`fixed z-[9999] ${isMobile ? "right-4 bottom-4 left-4" : "right-6 bottom-6"}`}
      style={isMobile ? undefined : { width: 340 }}
    >
      <AnimatePresence>
        {panelExpanded && !isMobile && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, height: 50 }}
            animate={{ opacity: 1, y: 0, height: 500 }}
            exit={{ opacity: 0, y: 12, height: 50 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="infl-glass mb-3 rounded-2xl shadow-2xl border border-white/70 dark:border-gray-700 overflow-hidden flex flex-col"
            style={{ width: 340 }}
          >
            <ConversationList currentUser={currentUser} onSelect={onOpenChat} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={openPanel}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center gap-3 px-4 h-[50px] rounded-2xl infl-glass shadow-xl border border-white/70 dark:border-gray-700 cursor-pointer border-solid bg-white/90 dark:bg-gray-900/90"
      >
        <Avatar user={currentUser || undefined} size={32} />
        <span className="flex-1 text-left font-semibold text-sm text-gray-900 dark:text-gray-100">
          Messages
          {unread > 0 && (
            <span className="ml-1.5 text-infl-primary font-bold">({unread} unread)</span>
          )}
        </span>
        {unread > 0 && (
          <span className="min-w-[1.35rem] h-[1.35rem] px-1 rounded-full bg-infl-primary text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
        <span className="text-gray-400 text-lg leading-none" aria-hidden>
          {panelExpanded ? "▾" : "▴"}
        </span>
      </motion.button>
    </div>
  );
}
