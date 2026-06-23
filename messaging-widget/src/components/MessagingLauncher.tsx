import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { LAUNCHER_GAP, VIEWPORT_MARGIN } from "../constants";
import { useMessagingLayout } from "../hooks/useMessagingLayout";
import { useMessagingStore, totalUnread } from "../store/messagingStore";
import { findConversationById, isValidConversation, isValidConversationId } from "../utils/conversation";
import { logMessenger } from "../utils/debug";
import { ConversationList } from "./ConversationList";
import { ChatWindow } from "./ChatWindow";
import { MessagingErrorBoundary } from "./MessagingErrorBoundary";
import { ChatPaneSkeleton } from "./MessagingSkeletons";
import type { AuthUser } from "../types";

type Props = {
  currentUser: AuthUser | null;
  isMobile: boolean;
};

function launcherProfileLabel(user: AuthUser | null | undefined): string {
  if (!user) return "Account";
  const first = user.name?.trim().split(/\s+/)[0];
  if (first) return first;
  return "Account";
}

const FADE_MS = 0.15;

export function MessagingLauncher({ currentUser, isMobile }: Props) {
  const layout = useMessagingLayout(isMobile);
  const panelExpanded = useMessagingStore((s) => s.panelExpanded);
  const setPanelExpanded = useMessagingStore((s) => s.setPanelExpanded);
  const setMobileFullscreen = useMessagingStore((s) => s.setMobileFullscreen);
  const selectConversation = useMessagingStore((s) => s.selectConversation);
  const clearSelectedConversation = useMessagingStore((s) => s.clearSelectedConversation);
  const selectedConversationId = useMessagingStore((s) => s.selectedConversationId);
  const conversations = useMessagingStore((s) => s.conversations);
  const mobileFullscreen = useMessagingStore((s) => s.mobileFullscreen);
  const unread = totalUnread(conversations);

  const selectedConversation = useMemo(
    () => findConversationById(conversations, selectedConversationId),
    [conversations, selectedConversationId]
  );

  const showChatColumn =
    !isMobile &&
    !!selectedConversationId &&
    (selectedConversation == null || isValidConversation(selectedConversation));

  const openPanel = () => {
    if (isMobile) {
      setMobileFullscreen(true);
      setPanelExpanded(true);
      clearSelectedConversation();
    } else if (panelExpanded) {
      setPanelExpanded(false);
    } else {
      clearSelectedConversation();
      setPanelExpanded(true);
    }
  };

  const minimizePanel = () => {
    setPanelExpanded(false);
    clearSelectedConversation();
    if (isMobile) setMobileFullscreen(false);
  };

  const handleSelectConversation = (id: string) => {
    try {
      const conversation = findConversationById(conversations, id);
      logMessenger("Conversation selected", conversation);

      if (!isValidConversationId(id)) {
        console.warn("[infl-messenger] Ignoring invalid conversation id:", id);
        return;
      }

      void selectConversation(id);

      if (isMobile) {
        setMobileFullscreen(true);
        setPanelExpanded(true);
      }
    } catch (err) {
      console.error("[infl-messenger] select conversation failed:", err);
    }
  };

  const chatPane =
    selectedConversation != null && isValidConversation(selectedConversation) ? (
      <motion.div
        key={selectedConversation.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: FADE_MS }}
        className="flex flex-col min-h-0 flex-1 min-w-0 h-full"
      >
        <MessagingErrorBoundary fallbackTitle="Could not open this chat">
          <ChatWindow
            conversation={selectedConversation}
            myUserId={currentUser?.id || null}
            currentUser={currentUser}
            embedded
            showBack={isMobile}
            onBack={isMobile ? clearSelectedConversation : undefined}
          />
        </MessagingErrorBoundary>
      </motion.div>
    ) : selectedConversationId ? (
      <ChatPaneSkeleton />
    ) : null;

  if (isMobile && mobileFullscreen && panelExpanded) {
    if (
      selectedConversation != null &&
      isValidConversation(selectedConversation) &&
      chatPane
    ) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: FADE_MS }}
          className="fixed inset-0 z-[10000] infl-msgs-panel infl-msgs-drawer rounded-none flex flex-col"
        >
          {chatPane}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: FADE_MS }}
        className="fixed inset-0 z-[10000] infl-msgs-panel infl-msgs-drawer rounded-none flex flex-col"
      >
        <div className="infl-msgs-header flex items-center justify-end px-4 py-2 shrink-0">
          <button
            type="button"
            onClick={minimizePanel}
            className="infl-icon-btn"
            aria-label="Close messaging"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0 infl-msgs-list">
          <ConversationList
            currentUser={currentUser}
            onSelect={handleSelectConversation}
          />
        </div>
      </motion.div>
    );
  }

  const panelWidth = panelExpanded
    ? showChatColumn
      ? layout.drawerWidth
      : layout.listOnlyWidth
    : layout.launcherWidth;

  return (
    <div
      className="fixed z-[9999] flex flex-col items-stretch"
      style={{
        bottom: VIEWPORT_MARGIN,
        right: VIEWPORT_MARGIN,
        width: panelWidth,
        maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
        maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`,
        transition: `width ${FADE_MS}s ease`,
      }}
    >
      <AnimatePresence>
        {panelExpanded && !isMobile && (
          <motion.div
            key="panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, height: layout.panelHeight }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_MS }}
            className="infl-msgs-panel infl-msgs-drawer mb-3 overflow-visible flex flex-row w-full shrink-0"
            style={{
              width: panelWidth,
              maxWidth: "100%",
              height: layout.panelHeight,
              maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2 + LAUNCHER_GAP + 56}px)`,
              transition: `width ${FADE_MS}s ease`,
            }}
          >
            <div
              className="flex flex-col min-h-0 shrink-0 overflow-visible border-r border-[#e5e7eb] dark:border-gray-700"
              style={{
                width: layout.listWidth,
                minWidth: layout.listWidth,
                maxWidth: layout.listWidth,
              }}
            >
              <div className="infl-msgs-header flex items-center justify-end px-2 py-1 shrink-0">
                <button
                  type="button"
                  onClick={minimizePanel}
                  className="infl-icon-btn"
                  title="Minimize"
                  aria-label="Minimize messaging panel"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-visible">
                <ConversationList
                  currentUser={currentUser}
                  onSelect={handleSelectConversation}
                />
              </div>
            </div>

            {(showChatColumn || selectedConversationId) && (
              <div
                className="flex flex-col min-h-0 overflow-hidden border-l border-[#e5e7eb] dark:border-gray-700"
                style={{ width: layout.chatWidth, minWidth: layout.chatWidth }}
              >
                {chatPane}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openPanel();
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="infl-msgs-launcher-btn w-full flex items-center gap-3 px-4 h-[50px] cursor-pointer border-solid shrink-0"
      >
        <span className="flex-1 text-left min-w-0 leading-tight pl-0.5">
          <span className="block text-sm font-semibold infl-msgs-launcher-profile-name truncate">
            {launcherProfileLabel(currentUser)}
          </span>
          <span className="block text-xs font-medium infl-msgs-launcher-label">
            Messages
            {unread > 0 && (
              <span className="ml-1 font-bold">({unread} unread)</span>
            )}
          </span>
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
