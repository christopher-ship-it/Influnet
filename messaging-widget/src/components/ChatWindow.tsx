import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMessagingStore } from "../store/messagingStore";
import { displayName, userSubtitle } from "../utils/avatar";
import { dateSeparator, sameDay } from "../utils/dates";
import type { Conversation } from "../types";
import { Avatar } from "./Avatar";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

const EMOJIS = ["😀", "😂", "❤️", "👍", "🎉", "🔥", "✨", "🙏", "💯", "😊"];

type Props = {
  conversation: Conversation;
  stackIndex: number;
  isMobile: boolean;
  myUserId: string | null;
};

export function ChatWindow({ conversation, stackIndex, isMobile, myUserId }: Props) {
  const closeChat = useMessagingStore((s) => s.closeChat);
  const archiveConversation = useMessagingStore((s) => s.archiveConversation);
  const messages = useMessagingStore((s) => s.activeMessages[conversation.id] || []);
  const loading = useMessagingStore((s) => s.loadingMessages[conversation.id]);
  const draft = useMessagingStore((s) => s.drafts[conversation.id] || "");
  const setDraft = useMessagingStore((s) => s.setDraft);
  const submitMessage = useMessagingStore((s) => s.submitMessage);
  const sending = useMessagingStore((s) => s.sending[conversation.id]);

  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const name = displayName(conversation.otherUser);
  const status = userSubtitle(conversation.otherUser);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, conversation.otherUser.isTyping]);

  const rightOffset = isMobile ? 0 : 24 + stackIndex * 368;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`infl-glass flex flex-col shadow-2xl border border-white/60 dark:border-gray-700 overflow-hidden ${
        isMobile
          ? "fixed inset-0 z-[10001] rounded-none"
          : "fixed bottom-6 z-[10000] rounded-2xl"
      }`}
      style={
        isMobile
          ? undefined
          : {
              width: 350,
              height: 500,
              right: rightOffset,
            }
      }
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar user={conversation.otherUser} size={36} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate m-0">
              {name}
            </p>
            <p className="text-xs text-gray-400 truncate m-0">{status}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 relative">
          <button type="button" title="Video" className="infl-icon-btn">▶</button>
          <button type="button" title="Call" className="infl-icon-btn">☎</button>
          <button
            type="button"
            title="More"
            className="infl-icon-btn"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋯
          </button>
          <button
            type="button"
            title="Close"
            className="infl-icon-btn"
            onClick={() => closeChat(conversation.id)}
          >
            ✕
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 py-1 w-40 rounded-xl infl-glass border border-gray-100 dark:border-gray-700 shadow-lg z-10">
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 border-0 bg-transparent cursor-pointer"
                onClick={() => {
                  archiveConversation(conversation.id);
                  setMenuOpen(false);
                }}
              >
                Archive conversation
              </button>
            </div>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 infl-msgs-scroll bg-gray-50/50 dark:bg-gray-950/40 min-h-0"
      >
        {loading && <p className="text-sm text-gray-400 text-center">Loading…</p>}
        {!loading &&
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showDate = !prev || !sameDay(prev.createdAt, m.createdAt);
            const isMe = !!myUserId && m.senderUserId === myUserId;
            const grouped =
              !!prev &&
              (prev.senderUserId === m.senderUserId || (prev.senderUserId === myUserId && isMe)) &&
              sameDay(prev.createdAt, m.createdAt);
            return (
              <div key={m.id}>
                {showDate && (
                  <p className="text-center text-[10px] font-semibold text-gray-400 my-2 uppercase tracking-wide">
                    {dateSeparator(m.createdAt)}
                  </p>
                )}
                <MessageBubble
                  message={m}
                  isMe={isMe}
                  grouped={grouped}
                  showRead={isMe && i === messages.length - 1}
                />
              </div>
            );
          })}
        {conversation.otherUser.isTyping && <TypingIndicator />}
      </div>

      <footer className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 relative">
        {emojiOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 p-2 rounded-xl infl-glass border border-gray-100 dark:border-gray-700 grid grid-cols-5 gap-1 shadow-lg">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className="text-lg p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border-0 cursor-pointer bg-transparent"
                onClick={() => {
                  setDraft(conversation.id, draft + e);
                  setEmojiOpen(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitMessage(conversation.id);
          }}
        >
          <button
            type="button"
            title="Emoji"
            className="infl-icon-btn"
            onClick={() => setEmojiOpen((v) => !v)}
          >
            ☺
          </button>
          <button type="button" title="Attach" className="infl-icon-btn">
            📎
          </button>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(conversation.id, e.target.value)}
            placeholder="Type a message…"
            className="flex-1 h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-infl-primary/30"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="h-10 px-4 rounded-xl border-0 font-semibold text-sm text-white bg-gradient-to-r from-infl-primary to-infl-secondary cursor-pointer disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </footer>
    </motion.div>
  );
}
