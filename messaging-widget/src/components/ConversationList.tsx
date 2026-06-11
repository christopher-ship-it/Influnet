import { useMemo } from "react";
import { useMessagingStore } from "../store/messagingStore";
import { ConversationItem } from "./ConversationItem";
import { Avatar } from "./Avatar";
import type { AuthUser } from "../types";

type Props = {
  currentUser: AuthUser | null;
  onSelect: (id: string) => void;
};

export function ConversationList({ currentUser, onSelect }: Props) {
  const conversations = useMessagingStore((s) => s.conversations);
  const searchQuery = useMessagingStore((s) => s.searchQuery);
  const setSearchQuery = useMessagingStore((s) => s.setSearchQuery);
  const listTab = useMessagingStore((s) => s.listTab);
  const setListTab = useMessagingStore((s) => s.setListTab);
  const archivedIds = useMessagingStore((s) => s.archivedIds);
  const loadingList = useMessagingStore((s) => s.loadingList);
  const listError = useMessagingStore((s) => s.listError);
  const setDarkMode = useMessagingStore((s) => s.setDarkMode);
  const darkMode = useMessagingStore((s) => s.darkMode);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => {
      const archived = archivedIds.has(c.id);
      if (listTab === "archived" ? !archived : archived) return false;
      if (!q) return true;
      const name = (c.otherUser.name || c.otherUser.companyName || "").toLowerCase();
      return name.includes(q);
    });
  }, [conversations, searchQuery, listTab, archivedIds]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar user={currentUser || undefined} size={32} />
            <span className="font-bold text-gray-900 dark:text-gray-100">Messaging</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Toggle dark mode"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 border-0 cursor-pointer"
            >
              {darkMode ? "☀" : "☾"}
            </button>
            <button
              type="button"
              title="Settings"
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 border-0 cursor-pointer"
            >
              ⚙
            </button>
            <button
              type="button"
              title="New message"
              className="p-2 rounded-lg text-infl-primary hover:bg-violet-50 dark:hover:bg-violet-950/40 border-0 cursor-pointer font-bold"
            >
              ✎
            </button>
          </div>
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations…"
          className="w-full h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-infl-primary/30"
        />
        <div className="flex gap-1 mt-3 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
          {(["active", "archived"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setListTab(tab)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border-0 cursor-pointer capitalize ${
                listTab === tab
                  ? "bg-white dark:bg-gray-900 text-infl-primary shadow-sm"
                  : "text-gray-500 bg-transparent"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto infl-msgs-scroll min-h-0">
        {loadingList && (
          <p className="p-4 text-sm text-gray-400">Loading conversations…</p>
        )}
        {listError && (
          <p className="p-4 text-sm text-red-500">{listError}</p>
        )}
        {!loadingList && !listError && filtered.length === 0 && (
          <p className="p-4 text-sm text-gray-400">
            {listTab === "archived"
              ? "No archived conversations."
              : "No conversations yet. Accepted collaboration requests unlock messaging."}
          </p>
        )}
        {filtered.map((c) => (
          <ConversationItem key={c.id} conversation={c} onClick={() => onSelect(c.id)} />
        ))}
      </div>
    </div>
  );
}
