import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { searchRecipients, startConversation } from "../api/activityApi";
import { sendMessage } from "../api/messagingApi";
import type { AuthUser, DiscoverRecipient } from "../types";
import { useMessagingStore } from "../store/messagingStore";
import { Avatar } from "./Avatar";

type Props = {
  open: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onOpenChat: (id: string) => void;
};

export function NewConversationDialog({
  open,
  onClose,
  currentUser,
  onOpenChat,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscoverRecipient[]>([]);
  const [selected, setSelected] = useState<DiscoverRecipient | null>(null);
  const [firstMessage, setFirstMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadConversations = useMessagingStore((s) => s.loadConversations);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const list = await searchRecipients(query, currentUser);
        setResults(list);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [open, query, currentUser]);

  const reset = () => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setFirstMessage("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleStart = async () => {
    if (!selected) return;
    const body = firstMessage.trim();
    if (!body) {
      setError("Write a message to start the conversation.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const conv = await startConversation(selected.id);
      await sendMessage(conv.id, body);
      await loadConversations();
      close();
      onOpenChat(conv.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start conversation");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const isBusiness = currentUser?.role === "business_owner";
  const searchHint = isBusiness
    ? "Search creators by name or niche…"
    : "Search businesses from your collaborations…";

  return (
    <div className="fixed inset-0 z-[10003] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 border-0 cursor-default"
        aria-label="Close"
        onClick={close}
      />
      <div className="infl-msgs-panel relative w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden z-10">
        <div className="infl-msgs-header flex items-center justify-between px-4 py-3">
          <div>
            <p className="m-0 text-sm font-bold text-gray-900 dark:text-gray-100">
              Start Conversation
            </p>
            <p className="m-0 text-xs text-gray-400 mt-0.5">
              {isBusiness ? "Connect with a creator" : "Message a business partner"}
            </p>
          </div>
          <button type="button" onClick={close} className="infl-icon-btn" aria-label="Close">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto infl-msgs-scroll bg-white dark:bg-gray-900 flex-1 min-h-0">
          {!selected && (
            <>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchHint}
                autoFocus
                className="infl-msgs-search w-full h-10 px-3 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#ee3e96]/30"
              />
              {searching && <p className="text-sm text-gray-400 m-0">Searching…</p>}
              {!searching && results.length === 0 && (
                <p className="text-sm text-gray-400 m-0">
                  {query
                    ? "No matches found."
                    : isBusiness
                      ? "Type to search creators."
                      : "No collaboration contacts yet."}
                </p>
              )}
              <ul className="m-0 p-0 list-none space-y-1">
                {results.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(person)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-[#f9fafb] dark:hover:bg-gray-800 cursor-pointer text-left transition-colors"
                    >
                      <Avatar
                        user={{
                          id: person.id,
                          name: person.name,
                          avatarUrl: person.avatarUrl,
                        }}
                        size={36}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {person.name}
                        </span>
                        {person.subtitle && (
                          <span className="block text-xs text-gray-400 truncate">
                            {person.subtitle}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {selected && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-[#e5e7eb] bg-[#fafafa] dark:bg-gray-800">
                <Avatar
                  user={{
                    id: selected.id,
                    name: selected.name,
                    avatarUrl: selected.avatarUrl,
                  }}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {selected.name}
                  </p>
                  {selected.subtitle && (
                    <p className="m-0 text-xs text-gray-400 truncate">{selected.subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-xs font-semibold text-[#ee3e96] border-0 bg-transparent cursor-pointer"
                >
                  Change
                </button>
              </div>
              <textarea
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                placeholder="Write your first message…"
                rows={4}
                className="infl-msgs-search w-full px-3 py-2 rounded-xl text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-[#ee3e96]/30"
              />
            </>
          )}

          {error && <p className="text-sm text-red-500 m-0">{error}</p>}
        </div>

        {selected && (
          <div className="infl-msgs-footer px-4 py-3 flex gap-2">
            <button
              type="button"
              onClick={close}
              className="flex-1 h-10 rounded-xl border border-[#e5e7eb] bg-white dark:bg-gray-900 text-sm font-semibold text-gray-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !firstMessage.trim()}
              onClick={() => void handleStart()}
              className="flex-1 h-10 rounded-xl border-0 text-sm font-semibold text-white bg-gradient-to-r from-[#ee3e96] to-[#f26e59] cursor-pointer disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send Message"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
