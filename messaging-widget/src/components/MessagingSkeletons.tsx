const CONV_SKELETON_COUNT = 6;
const CHAT_SKELETON_COUNT = 5;

export function ConversationListSkeleton() {
  return (
    <div className="infl-msgs-skeleton-list" aria-hidden>
      {Array.from({ length: CONV_SKELETON_COUNT }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-[#f3f4f6] dark:border-gray-800"
          style={{ minHeight: 64 }}
        >
          <div className="infl-msgs-skeleton w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex justify-between gap-2">
              <div className="infl-msgs-skeleton h-3 rounded-md" style={{ width: `${58 + (i % 3) * 8}%` }} />
              <div className="infl-msgs-skeleton h-2.5 w-10 rounded-md shrink-0" />
            </div>
            <div className="infl-msgs-skeleton h-2.5 rounded-md" style={{ width: `${72 + (i % 2) * 10}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatHeaderSkeleton() {
  return (
    <header className="infl-msgs-header flex items-center gap-2 px-3 py-2.5 shrink-0" aria-hidden>
      <div className="infl-msgs-skeleton w-[34px] h-[34px] rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="infl-msgs-skeleton h-3.5 rounded-md w-32" />
        <div className="infl-msgs-skeleton h-2.5 rounded-md w-20" />
      </div>
    </header>
  );
}

export function ChatMessagesSkeleton() {
  return (
    <div className="space-y-3 py-1" aria-hidden>
      {Array.from({ length: CHAT_SKELETON_COUNT }).map((_, i) => {
        const isMe = i % 2 === 1;
        return (
          <div
            key={i}
            className={`flex flex-col gap-1.5 ${isMe ? "items-end" : "items-start"}`}
          >
            <div
              className="infl-msgs-skeleton rounded-2xl"
              style={{
                width: isMe ? `${48 + (i % 3) * 6}%` : `${52 + (i % 2) * 8}%`,
                height: i === 2 ? 56 : 40,
                maxWidth: 280,
                borderBottomRightRadius: isMe ? 6 : undefined,
                borderBottomLeftRadius: isMe ? undefined : 6,
              }}
            />
            <div className="infl-msgs-skeleton h-2 w-12 rounded-md" />
          </div>
        );
      })}
    </div>
  );
}

export function ContextPanelSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="infl-msgs-skeleton w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="infl-msgs-skeleton h-3.5 rounded-md w-28" />
          <div className="infl-msgs-skeleton h-2.5 rounded-md w-20" />
        </div>
      </div>
      <div className="infl-msgs-skeleton h-24 rounded-xl" />
      <div className="infl-msgs-skeleton h-16 rounded-xl" />
      <div className="infl-msgs-skeleton h-20 rounded-xl" />
    </div>
  );
}

export function ChatPaneSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-gray-900 infl-msgs-chat-pane">
      <ChatHeaderSkeleton />
      <ChatMessagesSkeleton />
      <div className="infl-msgs-footer shrink-0 px-3 py-3 border-t border-[#e5e7eb] dark:border-gray-700" aria-hidden>
        <div className="infl-msgs-skeleton h-11 w-full rounded-2xl" />
      </div>
    </div>
  );
}
