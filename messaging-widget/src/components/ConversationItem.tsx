import type { Conversation } from "../types";
import { timeShort } from "../utils/dates";
import { lastInteractionLabel } from "../utils/activity";
import { displayName } from "../utils/avatar";
import { roleLabel } from "../utils/presence";
import { Avatar } from "./Avatar";

type Props = {
  conversation: Conversation;
  active?: boolean;
  onClick: () => void;
  showRole?: boolean;
  showLastActivity?: boolean;
};

export function ConversationItem({
  conversation,
  active,
  onClick,
  showRole = false,
  showLastActivity = false,
}: Props) {
  if (!conversation?.id || !conversation?.otherUser) return null;

  const name = displayName(conversation.otherUser) || "Unknown";
  const role = roleLabel(
    conversation.otherUser.role,
    conversation.otherUser.displayRole,
    conversation.otherUser
  );
  const unread = conversation.unreadCount || 0;
  const preview = conversation.lastMessage || "No messages yet";
  const activity = showLastActivity
    ? lastInteractionLabel(conversation.lastMessageAt)
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`infl-msgs-conv-item w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-0 cursor-pointer ${
        active ? "infl-msgs-conv-item-active" : ""
      }`}
    >
      <Avatar user={conversation.otherUser} size={40} />
      <span className="flex-1 min-w-0">
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {name}
          </span>
          <span className="text-[10px] text-gray-400 shrink-0">
            {timeShort(conversation.lastMessageAt)}
          </span>
        </span>
        {showRole && role ? (
          <span className="block text-[11px] text-gray-500 truncate mt-0.5">{role}</span>
        ) : null}
        <span className="block text-xs text-gray-400 truncate mt-0.5">{preview}</span>
        {activity ? (
          <span className="block text-[10px] text-gray-400 truncate mt-0.5">{activity}</span>
        ) : null}
      </span>
      {unread > 0 && (
        <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-infl-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
