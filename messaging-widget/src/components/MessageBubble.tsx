import type { Message } from "../types";
import { timeShort } from "../utils/dates";

type Props = {
  message: Message;
  isMe: boolean;
  grouped?: boolean;
};

function attachmentIcon(mime: string): string {
  if (mime.startsWith("image/")) return "🖼";
  if (mime === "application/pdf") return "📄";
  return "📎";
}

export function MessageBubble({ message, isMe, grouped }: Props) {
  const attachments = message.attachments || [];

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} ${grouped ? "-mt-1" : ""}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm ${
          isMe
            ? "bg-gradient-to-br from-infl-primary to-infl-secondary text-white"
            : "infl-msgs-bubble-in text-gray-900 dark:text-gray-100"
        }`}
      >
        {message.body ? (
          <p className="text-sm whitespace-pre-wrap break-words m-0">{message.body}</p>
        ) : null}
        {attachments.length > 0 && (
          <div className={`space-y-1.5 ${message.body ? "mt-2" : ""}`}>
            {attachments.map((a) =>
              a.mime.startsWith("image/") ? (
                <a
                  key={`${a.url}-${a.name}`}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden max-w-[220px]"
                >
                  <img
                    src={a.url}
                    alt={a.name}
                    className="w-full h-auto max-h-48 object-cover"
                  />
                </a>
              ) : (
                <a
                  key={`${a.url}-${a.name}`}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-xs font-semibold rounded-lg px-2 py-1.5 no-underline ${
                    isMe
                      ? "bg-white/15 text-white hover:bg-white/25"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <span aria-hidden>{attachmentIcon(a.mime)}</span>
                  <span className="truncate">{a.name}</span>
                </a>
              )
            )}
          </div>
        )}
        <div
          className={`flex items-center gap-1.5 mt-1 text-[10px] ${
            isMe ? "text-white/90 justify-end" : "text-gray-400"
          }`}
        >
          <time>{timeShort(message.createdAt)}</time>
          {isMe && message.status === "sending" && <span>Sending…</span>}
          {isMe && message.status === "sent" && <span>✓ Sent</span>}
          {isMe && message.status === "delivered" && <span>✓ Delivered</span>}
          {isMe && message.status === "read" && <span>✓✓ Read</span>}
        </div>
      </div>
    </div>
  );
}
