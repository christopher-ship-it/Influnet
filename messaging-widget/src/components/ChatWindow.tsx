import { useEffect, useRef, useState } from "react";
import { useMessagingStore } from "../store/messagingStore";
import { EMPTY_MESSAGES } from "../constants";
import { displayName } from "../utils/avatar";
import { lastInteractionLabel } from "../utils/activity";
import { dateSeparator, sameDay } from "../utils/dates";
import { isValidConversation } from "../utils/conversation";
import { logMessenger } from "../utils/debug";
import { presenceLabel, roleLabel } from "../utils/presence";
import type { AuthUser, Conversation } from "../types";
import { Avatar } from "./Avatar";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatComposer } from "./ChatComposer";
import { ConversationMenu } from "./ConversationMenu";
import { CreateCollaborationButton } from "./CreateCollaborationButton";
import { ChatMessagesSkeleton } from "./MessagingSkeletons";

type Props = {
  conversation: Conversation;
  myUserId: string | null;
  currentUser?: AuthUser | null;
  embedded?: boolean;
  workspace?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onOpenContext?: () => void;
};

export function ChatWindow({
  conversation,
  myUserId,
  currentUser = null,
  embedded = false,
  workspace = false,
  showBack = false,
  onBack,
  onOpenContext,
}: Props) {
  const conversationId = conversation?.id ?? "";
  const clearSelectedConversation = useMessagingStore((s) => s.clearSelectedConversation);

  const messages = useMessagingStore((s) => {
    if (!conversationId) return EMPTY_MESSAGES;
    return s.activeMessages[conversationId] ?? EMPTY_MESSAGES;
  });

  const loading = useMessagingStore(
    (s) => !!(conversationId && s.loadingMessages[conversationId])
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loggedRef = useRef(false);

  const valid = isValidConversation(conversation);
  const otherUser = conversation?.otherUser;
  const name = valid ? displayName(otherUser) || "Unknown" : "Unknown";
  const role = valid
    ? roleLabel(otherUser?.role, otherUser?.displayRole, otherUser)
    : "";

  const activityLine = workspace
    ? lastInteractionLabel(conversation.lastMessageAt)
    : presenceLabel(otherUser);

  const isTyping =
    !workspace && valid ? !!(otherUser?.presenceEnabled && otherUser?.isTyping) : false;

  const publicPath =
    otherUser?.profileSlug || otherUser?.username
      ? `/influnet/${encodeURIComponent(otherUser.profileSlug || otherUser.username || "")}`
      : null;

  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    logMessenger("Selected Conversation", conversation);
  }, [conversation]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isTyping]);

  if (!valid) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-sm text-gray-400">
        Conversation unavailable
      </div>
    );
  }

  const handleBack = () => {
    if (onBack) onBack();
    else clearSelectedConversation();
  };

  const profileSlug = otherUser?.profileSlug || otherUser?.username;

  const shellClass = embedded
    ? `flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-gray-900 infl-msgs-chat-pane${
        workspace ? " infl-msgs-chat-workspace" : ""
      }`
    : "infl-msgs-panel infl-msgs-drawer flex flex-col h-full min-h-0 overflow-hidden";

  const messageList = Array.isArray(messages) ? messages : EMPTY_MESSAGES;
  const showMessageSkeletons = loading && messageList.length === 0;

  return (
    <div className={shellClass}>
      <header
        className={`flex items-center justify-between gap-2 shrink-0 border-b border-[#f3f4f6] dark:border-gray-800 bg-white dark:bg-gray-900 ${
          workspace ? "px-4 py-3" : "infl-msgs-header px-3 py-2.5"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && (
            <button
              type="button"
              title="Back to conversations"
              className="infl-icon-btn shrink-0"
              onClick={handleBack}
            >
              ←
            </button>
          )}
          <Avatar user={otherUser} size={workspace ? 40 : 34} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate m-0">
              {name}
            </p>
            {role ? (
              <p className="text-[11px] text-gray-500 truncate m-0">{role}</p>
            ) : null}
            {workspace && profileSlug ? (
              <p className="text-[10px] text-gray-400 truncate m-0 font-mono">
                @{profileSlug}
              </p>
            ) : null}
            {workspace && otherUser?.location ? (
              <p className="text-[10px] text-gray-400 truncate m-0">
                {otherUser.location}
              </p>
            ) : null}
            {activityLine ? (
              <p className="text-[10px] text-gray-400 truncate m-0 mt-0.5">{activityLine}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
          {publicPath && (
            <button
              type="button"
              title="View profile"
              className="infl-msgs-btn-secondary text-[11px] font-semibold px-2.5 h-8"
              onClick={() => window.open(publicPath, "_blank", "noopener noreferrer")}
            >
              View Profile
            </button>
          )}
          {workspace && <CreateCollaborationButton conversation={conversation} />}
          {onOpenContext && (
            <button
              type="button"
              title="Collaboration context"
              className="infl-msgs-btn-secondary text-[11px] font-semibold px-2.5 h-8"
              onClick={onOpenContext}
            >
              Context
            </button>
          )}
          <button
            ref={menuTriggerRef}
            type="button"
            title="More options"
            className="infl-icon-btn"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋯
          </button>
        </div>
      </header>

      <ConversationMenu
        conversation={conversation}
        currentUser={currentUser}
        triggerRef={menuTriggerRef}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 infl-msgs-scroll infl-msgs-body min-h-0"
      >
        {showMessageSkeletons && <ChatMessagesSkeleton />}
        {messageList.map((m, i) => {
          if (!m?.id) return null;
          const prev = messageList[i - 1];
          const showDate = !prev || !sameDay(prev.createdAt, m.createdAt);
          const isMe = !!myUserId && m.senderUserId === myUserId;
          const grouped =
            !!prev &&
            prev.senderUserId === m.senderUserId &&
            sameDay(prev.createdAt, m.createdAt);
          return (
            <div key={m.id}>
              {showDate && (
                <p className="text-center text-[10px] font-semibold text-gray-400 my-2 uppercase tracking-wide">
                  {dateSeparator(m.createdAt)}
                </p>
              )}
              <MessageBubble message={m} isMe={isMe} grouped={grouped} />
            </div>
          );
        })}
        {!showMessageSkeletons && isTyping && <TypingIndicator />}
      </div>

      <ChatComposer conversationId={conversation.id} workspace={workspace} />
    </div>
  );
}
