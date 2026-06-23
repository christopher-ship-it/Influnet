import { useEffect, useMemo } from "react";
import { useMessagingStore } from "../store/messagingStore";
import { ConversationItem } from "./ConversationItem";
import { MessagingPanelHeader } from "./MessagingPanelHeader";
import { ConversationListSkeleton } from "./MessagingSkeletons";
import type { AuthUser, ConversationTab } from "../types";

const WORKSPACE_TABS: { id: ConversationTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "archived", label: "Archived" },
];

const DRAWER_TABS: { id: ConversationTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "archived", label: "Archived" },
];

type Props = {
  currentUser: AuthUser | null;
  onSelect: (id: string) => void;
  variant?: "drawer" | "workspace";
};

export function ConversationList({
  currentUser,
  onSelect,
  variant = "drawer",
}: Props) {
  const conversations = useMessagingStore((s) => s.conversations);
  const selectedConversationId = useMessagingStore((s) => s.selectedConversationId);
  const searchQuery = useMessagingStore((s) => s.searchQuery);
  const setSearchQuery = useMessagingStore((s) => s.setSearchQuery);
  const listTab = useMessagingStore((s) => s.listTab);
  const setListTab = useMessagingStore((s) => s.setListTab);
  const archivedIds = useMessagingStore((s) => s.archivedIds);
  const loadingList = useMessagingStore((s) => s.loadingList);
  const listError = useMessagingStore((s) => s.listError);

  const isWorkspace = variant === "workspace";
  const tabs = isWorkspace ? WORKSPACE_TABS : DRAWER_TABS;

  useEffect(() => {
    if (isWorkspace && listTab === "requests") setListTab("all");
  }, [isWorkspace, listTab, setListTab]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => {
      const archived = archivedIds.has(c.id);
      if (listTab === "archived") return archived;
      if (archived) return false;
      if (listTab === "unread" && !(c.unreadCount || 0)) return false;
      if (!q) return true;
      const name = (c.otherUser.name || c.otherUser.companyName || c.otherUser.username || "").toLowerCase();
      const role = (c.otherUser.displayRole || c.otherUser.role || "").toLowerCase();
      const username = (c.otherUser.username || "").toLowerCase();
      return name.includes(q) || role.includes(q) || username.includes(q);
    });
  }, [conversations, searchQuery, listTab, archivedIds]);

  return (
    <div className="flex flex-col h-full min-h-0 infl-msgs-list">
      <div
        className={`infl-msgs-header-popover-host overflow-visible relative z-30 px-4 pt-4 pb-3 border-b border-[#f3f4f6] dark:border-gray-800 ${
          isWorkspace ? "infl-msgs-workspace-list-head" : "infl-msgs-header"
        }`}
      >
        {isWorkspace ? (
          <div className="flex items-center justify-end gap-1 mb-3 overflow-visible relative">
            <MessagingPanelHeader currentUser={currentUser} onOpenChat={onSelect} compact />
          </div>
        ) : (
          <div className="mb-3 overflow-visible relative">
            <MessagingPanelHeader currentUser={currentUser} onOpenChat={onSelect} />
          </div>
        )}
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            isWorkspace
              ? "Search creators, businesses, or conversations"
              : "Search conversations…"
          }
          className="infl-msgs-search w-full h-9 px-3 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-infl-primary/30"
        />
        <div
          className={`infl-msgs-tabs-track flex gap-1 mt-3 p-1 rounded-xl ${
            isWorkspace ? "infl-msgs-tabs-scroll overflow-x-auto" : ""
          }`}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setListTab(tab.id)}
              className={`${isWorkspace ? "shrink-0 px-3" : "flex-1"} py-1.5 text-xs font-semibold rounded-lg border-0 cursor-pointer whitespace-nowrap ${
                listTab === tab.id ? "infl-msgs-tab-active" : "infl-msgs-tab-inactive"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto infl-msgs-scroll min-h-0 infl-msgs-list">
        {loadingList && conversations.length === 0 && <ConversationListSkeleton />}
        {listError && <p className="p-4 text-sm text-red-500">{listError}</p>}
        {!loadingList && !listError && filtered.length === 0 && (
          <p className="p-4 text-sm text-gray-400">
            {listTab === "archived"
              ? "No archived conversations."
              : listTab === "unread"
                ? "No unread conversations."
                : "No conversations yet. Accepted collaboration requests unlock messaging."}
          </p>
        )}
        {filtered.map((c) =>
          c?.id ? (
            <ConversationItem
              key={c.id}
              conversation={c}
              active={selectedConversationId === c.id}
              onClick={() => onSelect(c.id)}
              showRole
              showLastActivity={isWorkspace}
            />
          ) : null
        )}
      </div>
    </div>
  );
}
