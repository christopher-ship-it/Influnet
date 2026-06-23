import { useState } from "react";
import { fetchConversationContext } from "../api/contextApi";
import type { Conversation } from "../types";

type Props = {
  conversation: Conversation;
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("influnet_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function openProject(projectId: string | number) {
  const fn = (window as Window & { influnetOpenProject?: (id: number | string) => void })
    .influnetOpenProject;
  if (fn) fn(projectId);
  else import("../utils/nav").then(({ openNavSection }) => openNavSection("Collaborations"));
}

export function CreateCollaborationButton({ conversation }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherId = conversation.otherUser.id;
  const otherName =
    conversation.otherUser.companyName || conversation.otherUser.name || "collaborator";

  const handlePrimaryClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const ctx = await fetchConversationContext(conversation.id);
      const existing = ctx?.activeProjects?.[0];
      if (existing?.id != null) {
        openProject(existing.id);
        return;
      }
      setOpen(true);
    } catch {
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
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
          counterpartyUserId: otherId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Could not create project");
      }
      setOpen(false);
      setTitle("");
      if (data?.id != null) openProject(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create collaboration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={loading}
        className="infl-msgs-btn-primary text-[11px] font-semibold px-3 h-8 disabled:opacity-60"
        onClick={() => void handlePrimaryClick()}
      >
        {loading ? "…" : "Collaboration"}
      </button>
      {open && (
        <div className="fixed inset-0 z-[10060] flex items-center justify-center p-4 bg-black/40">
          <div
            className="infl-msgs-popover w-full max-w-md rounded-2xl p-5"
            role="dialog"
            aria-labelledby="create-collab-title"
          >
            <h2
              id="create-collab-title"
              className="text-base font-bold text-gray-900 dark:text-gray-100 m-0"
            >
              New Collaboration
            </h2>
            <p className="text-xs text-gray-500 mt-1 mb-4 m-0">
              Start a project with {otherName}. No active collaboration exists yet.
            </p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Campaign"
              className="infl-msgs-search w-full h-10 px-3 rounded-xl text-sm mb-3"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 m-0 mb-2">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="infl-msgs-btn-ghost text-sm px-3 h-9"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                className="infl-msgs-btn-primary text-sm px-4 h-9 disabled:opacity-50"
                onClick={() => void submit()}
              >
                {loading ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
