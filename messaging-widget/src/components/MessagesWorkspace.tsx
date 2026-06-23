import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { DESKTOP_CONTEXT_WIDTH, DESKTOP_LIST_WIDTH } from "../constants";
import { useMessagingStore } from "../store/messagingStore";
import { findConversationById, isValidConversation } from "../utils/conversation";
import { ChatWindow } from "./ChatWindow";
import { CollaborationContextPanel } from "./CollaborationContextPanel";
import { ConversationList } from "./ConversationList";
import { EmptyConversationState } from "./EmptyConversationState";
import { MessagingErrorBoundary } from "./MessagingErrorBoundary";
import { ChatPaneSkeleton } from "./MessagingSkeletons";
import type { AuthUser } from "../types";

type Props = {
  currentUser: AuthUser | null;
  isMobile: boolean;
};

function useMainTarget(): HTMLElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () =>
      (document.querySelector("main.flex-1") as HTMLElement | null) ||
      (document.querySelector("main") as HTMLElement | null);
    setTarget(find());
    const obs = new MutationObserver(() => setTarget(find()));
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return target;
}

export function MessagesWorkspace({ currentUser, isMobile }: Props) {
  const target = useMainTarget();
  const selectedConversationId = useMessagingStore((s) => s.selectedConversationId);
  const workspacePane = useMessagingStore((s) => s.workspacePane);
  const setWorkspacePane = useMessagingStore((s) => s.setWorkspacePane);
  const selectConversation = useMessagingStore((s) => s.selectConversation);
  const clearSelectedConversation = useMessagingStore((s) => s.clearSelectedConversation);
  const conversations = useMessagingStore((s) => s.conversations);
  const loadConversations = useMessagingStore((s) => s.loadConversations);

  useEffect(() => {
    loadConversations();
    document.body.classList.add("infl-msgs-workspace-active");
    return () => document.body.classList.remove("infl-msgs-workspace-active");
  }, [loadConversations]);

  const selectedConversation = useMemo(
    () => findConversationById(conversations, selectedConversationId),
    [conversations, selectedConversationId]
  );

  const handleSelect = (id: string) => {
    void selectConversation(id);
  };

  const chatPane =
    selectedConversation != null && isValidConversation(selectedConversation) ? (
      <MessagingErrorBoundary fallbackTitle="Could not open this chat">
        <ChatWindow
          conversation={selectedConversation}
          myUserId={currentUser?.id || null}
          currentUser={currentUser}
          embedded
          workspace
          showBack={isMobile && workspacePane !== "list"}
          onBack={() => {
            if (workspacePane === "context") setWorkspacePane("chat");
            else clearSelectedConversation();
          }}
          onOpenContext={
            isMobile ? () => setWorkspacePane("context") : undefined
          }
        />
      </MessagingErrorBoundary>
    ) : selectedConversationId ? (
      <ChatPaneSkeleton />
    ) : (
      <EmptyConversationState
        onStartConversation={() => {
          /* NewConversationModal in list header */
        }}
      />
    );

  const showList = !isMobile || workspacePane === "list";
  const showChat = !isMobile || workspacePane === "chat";
  const showContext =
    !isMobile
      ? !!selectedConversation && isValidConversation(selectedConversation)
      : workspacePane === "context" &&
        !!selectedConversation &&
        isValidConversation(selectedConversation);

  const workspace = (
    <div
      id="infl-msgs-workspace-root"
      className="influnet-react-messages-root infl-msgs-workspace"
    >
      <div className="infl-msgs-workspace-grid">
        {showList && (
          <div
            className="infl-msgs-workspace-col infl-msgs-workspace-list"
            style={{ width: isMobile ? "100%" : DESKTOP_LIST_WIDTH }}
          >
            <ConversationList
              variant="workspace"
              currentUser={currentUser}
              onSelect={handleSelect}
            />
          </div>
        )}

        {showChat && (
          <div className="infl-msgs-workspace-col infl-msgs-workspace-center min-w-0">
            {chatPane}
          </div>
        )}

        {showContext && selectedConversation && isValidConversation(selectedConversation) && (
          <div
            className="infl-msgs-workspace-col infl-msgs-workspace-context"
            style={{ width: isMobile ? "100%" : DESKTOP_CONTEXT_WIDTH }}
          >
            <CollaborationContextPanel
              conversation={selectedConversation}
              showClose={isMobile}
              onClose={() => setWorkspacePane("chat")}
            />
          </div>
        )}
      </div>

    </div>
  );

  if (!target) return null;
  return createPortal(workspace, target);
}
