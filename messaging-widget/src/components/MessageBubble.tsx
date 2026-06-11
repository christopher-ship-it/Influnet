import type { Message } from "../types";
import { timeShort } from "../utils/dates";

type Props = {
  message: Message;
  isMe: boolean;
  grouped?: boolean;
  showRead?: boolean;
};

export function MessageBubble({ message, isMe, grouped, showRead }: Props) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} ${grouped ? "-mt-1" : ""}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
          isMe
            ? "bg-gradient-to-br from-infl-primary to-infl-secondary text-white"
            : "infl-glass border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words m-0">{message.body}</p>
        <div
          className={`flex items-center gap-1.5 mt-1 text-[10px] ${
            isMe ? "text-white/80 justify-end" : "text-gray-400"
          }`}
        >
          <time>{timeShort(message.createdAt)}</time>
          {isMe && message.status === "sending" && <span>…</span>}
          {isMe && message.status === "sent" && <span>✓</span>}
          {isMe && showRead && <span className="text-white/90">Read</span>}
        </div>
      </div>
    </div>
  );
}
