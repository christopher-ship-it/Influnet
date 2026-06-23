import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { searchRecipients } from "../api/activityApi";
import type { AuthUser, DiscoverRecipient } from "../types";
import { Avatar } from "./Avatar";

type Props = {
  open: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("influnet_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export function CreateCollaborationDialog({ open, onClose, currentUser }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscoverRecipient[]>([]);
  const [selected, setSelected] = useState<DiscoverRecipient | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchRecipients(query, currentUser));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [open, query, currentUser]);

  const close = () => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setTitle("");
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!selected) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Enter a collaboration title.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        credentials: "same-origin",
        headers: authHeaders(),
        body: JSON.stringify({
          title: trimmed,
          counterpartyUserId: selected.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Could not create collaboration");
      }
      close();
      const openProject = (
        window as Window & { influnetOpenProject?: (id: number | string) => void }
      ).influnetOpenProject;
      if (openProject && data?.id != null) openProject(data.id);
      else import("../utils/nav").then(({ openNavSection }) => openNavSection("Collaborations"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create collaboration");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const isBusiness = currentUser?.role === "business_owner";

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
              Create Collaboration
            </p>
            <p className="m-0 text-xs text-gray-400 mt-0.5">
              Launch a new brand–creator project
            </p>
          </div>
          <button type="button" onClick={close} className="infl-icon-btn" aria-label="Close">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto infl-msgs-scroll bg-white dark:bg-gray-900 flex-1 min-h-0">
          {!selected ? (
            <>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  isBusiness ? "Search creators…" : "Search business partners…"
                }
                autoFocus
                className="infl-msgs-search w-full h-10 px-3 rounded-xl text-sm"
              />
              {searching && <p className="text-sm text-gray-400 m-0">Searching…</p>}
              <ul className="m-0 p-0 list-none space-y-1">
                {results.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(person)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#e5e7eb] hover:bg-[#f9fafb] cursor-pointer text-left"
                    >
                      <Avatar user={{ id: person.id, name: person.name }} size={36} />
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {person.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-[#e5e7eb] bg-[#fafafa]">
                <Avatar user={{ id: selected.id, name: selected.name }} size={40} />
                <span className="flex-1 text-sm font-semibold truncate">{selected.name}</span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-xs font-semibold text-[#ee3e96] border-0 bg-transparent cursor-pointer"
                >
                  Change
                </button>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Collaboration title, e.g. Summer Campaign"
                className="infl-msgs-search w-full h-10 px-3 rounded-xl text-sm"
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
              className="flex-1 h-10 rounded-xl border border-[#e5e7eb] text-sm font-semibold text-gray-600 cursor-pointer bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void submit()}
              className="flex-1 h-10 rounded-xl border-0 text-sm font-semibold text-white bg-gradient-to-r from-[#ee3e96] to-[#f26e59] cursor-pointer disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
