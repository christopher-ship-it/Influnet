import { motion } from "framer-motion";
import type { Conversation } from "../types";
import { timeShort } from "../utils/dates";
import { displayName } from "../utils/avatar";
import { Avatar } from "./Avatar";

type Props = {
  conversation: Conversation;
  active?: boolean;
  onClick: () => void;
};

export function ConversationItem({ conversation, active, onClick }: Props) {
  const name = displayName(conversation.otherUser);
  const unread = conversation.unreadCount || 0;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ backgroundColor: "rgba(238, 62, 150, 0.06)" }}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-0 cursor-pointer ${
        active ? "bg-violet-50 dark:bg-violet-950/40" : "bg-transparent"
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
        <span className="block text-xs text-gray-400 truncate mt-0.5">
          {conversation.lastMessage || "No messages yet"}
        </span>
      </span>
      {unread > 0 && (
        <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-infl-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </motion.button>
  );
}
