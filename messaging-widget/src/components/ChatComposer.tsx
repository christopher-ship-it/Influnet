import { useEffect, useRef, useState } from "react";
import { useMessagingStore } from "../store/messagingStore";
import { validateAttachmentFile } from "../utils/messageBody";
import type { PendingAttachment } from "../types";

const EMOJIS = [
  "😀", "😂", "❤️", "👍", "🎉", "🔥", "✨", "🙏", "💯", "😊",
  "👋", "💼", "📎", "✅", "🚀",
];

type Props = {
  conversationId: string;
  workspace?: boolean;
};

export function ChatComposer({ conversationId, workspace = false }: Props) {
  const draft = useMessagingStore(
    (s) => (conversationId ? s.drafts[conversationId] : undefined) ?? ""
  );
  const pending = useMessagingStore(
    (s) => (conversationId ? s.pendingAttachments[conversationId] : undefined) ?? null
  );
  const setDraft = useMessagingStore((s) => s.setDraft);
  const signalTyping = useMessagingStore((s) => s.signalTyping);
  const setPendingAttachment = useMessagingStore((s) => s.setPendingAttachment);
  const submitMessage = useMessagingStore((s) => s.submitMessage);
  const sending = useMessagingStore(
    (s) => !!(conversationId && s.sending[conversationId])
  );

  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "44px";
    const next = Math.min(el.scrollHeight, 44 * 5);
    el.style.height = `${Math.max(44, next)}px`;
  }, [draft]);

  const attachFile = (file: File) => {
    const err = validateAttachmentFile(file);
    if (err) {
      window.alert(err);
      return;
    }
    const item: PendingAttachment = {
      file,
      name: file.name,
      mime: file.type,
      size: file.size,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    };
    setPendingAttachment(conversationId, item);
  };

  const canSend = (!!draft.trim() || !!pending) && !sending;

  return (
    <footer
      className={`infl-msgs-footer infl-msgs-composer relative shrink-0 ${
        workspace ? "infl-msgs-composer-workspace p-4" : "p-3"
      }`}
    >
      {pending && (
        <div className="infl-msgs-attachment-preview mb-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f9fafb] dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700">
          {pending.previewUrl ? (
            <img
              src={pending.previewUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover shrink-0"
            />
          ) : (
            <span className="text-lg shrink-0" aria-hidden>
              📎
            </span>
          )}
          <span className="flex-1 min-w-0 text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
            {pending.name}
          </span>
          <button
            type="button"
            className="text-xs font-bold text-infl-primary border-0 bg-transparent cursor-pointer shrink-0"
            onClick={() => setPendingAttachment(conversationId, null)}
          >
            Remove
          </button>
        </div>
      )}

      {emojiOpen && (
        <div className="infl-msgs-popover absolute bottom-full left-4 right-4 mb-2 p-3 rounded-xl grid grid-cols-5 gap-1.5 z-20 shadow-lg">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="text-xl p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border-0 cursor-pointer bg-white dark:bg-gray-900"
              onClick={() => {
                setDraft(conversationId, draft + e);
                setEmojiOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <form
        className={`flex items-end gap-2 ${workspace ? "infl-msgs-composer-bar" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) void submitMessage(conversationId);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,.pdf,.docx,.pptx,.xlsx,.zip"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) attachFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          title="Attach file"
          className="infl-msgs-composer-btn shrink-0"
          onClick={() => fileRef.current?.click()}
        >
          <span aria-hidden>📎</span>
          <span className="sr-only">Attach</span>
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(conversationId, e.target.value)}
          onKeyDown={(e) => {
            if (!workspace && (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete")) {
              signalTyping(conversationId);
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) void submitMessage(conversationId);
            }
          }}
          placeholder="Write a message…"
          className="infl-msgs-composer-input flex-1 min-h-[44px] max-h-[220px] px-4 py-2.5 rounded-xl text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-infl-primary/25"
        />
        <button
          type="button"
          title="Emoji"
          className="infl-msgs-composer-btn shrink-0"
          onClick={() => setEmojiOpen((v) => !v)}
        >
          <span aria-hidden>☺</span>
          <span className="sr-only">Emoji</span>
        </button>
        <button
          type="submit"
          disabled={!canSend}
          className="infl-msgs-composer-send h-[44px] px-4 rounded-xl border-0 font-semibold text-sm text-white cursor-pointer disabled:opacity-40 shrink-0"
        >
          Send
        </button>
      </form>
    </footer>
  );
}
