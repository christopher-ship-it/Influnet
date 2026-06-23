import { useEffect, useState } from "react";
import { fetchConversationContext } from "../api/contextApi";
import { displayName } from "../utils/avatar";
import { connectedSinceLabel, lastInteractionLabel } from "../utils/activity";
import { timeAgo } from "../utils/dates";
import { roleLabel } from "../utils/presence";
import type { Conversation, ConversationContext } from "../types";
import { Avatar } from "./Avatar";
import { ContextPanelSkeleton } from "./MessagingSkeletons";

type Props = {
  conversation: Conversation;
  onClose?: () => void;
  showClose?: boolean;
};

function profilePath(conversation: Conversation): string | null {
  const slug =
    conversation.otherUser.profileSlug || conversation.otherUser.username;
  return slug ? `/influnet/${encodeURIComponent(slug)}` : null;
}

function metricRow(label: string, value: string | number | null | undefined) {
  if (value == null || value === "" || Number.isNaN(value)) return null;
  return (
    <div className="flex justify-between gap-3 text-xs py-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800 dark:text-gray-200 text-right">
        {value}
      </span>
    </div>
  );
}

export function CollaborationContextPanel({
  conversation,
  onClose,
  showClose,
}: Props) {
  const [ctx, setCtx] = useState<ConversationContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchConversationContext(conversation.id).then((data) => {
      if (!cancelled) {
        setCtx(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [conversation.id]);

  const other = ctx?.profile || conversation.otherUser;
  const rel = ctx?.relationship;
  const name = displayName(other) || "Unknown";
  const role = roleLabel(other.role, other.displayRole, other);
  const path = profilePath(conversation);

  const lastInteraction =
    rel?.lastInteraction || conversation.lastMessageAt || null;

  const openProject = (projectId: string | number) => {
    const fn = (window as Window & { influnetOpenProject?: (id: number | string) => void })
      .influnetOpenProject;
    if (fn) fn(projectId);
    else import("../utils/nav").then(({ openNavSection }) => openNavSection("Collaborations"));
  };

  return (
    <aside className="infl-msgs-context flex flex-col min-h-0 h-full shrink-0">
      <div className="px-4 py-3 flex items-center justify-between gap-2 shrink-0 border-b border-[#f3f4f6] dark:border-gray-800">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 m-0">
          Collaboration Context
        </h2>
        {showClose && onClose && (
          <button type="button" className="infl-icon-btn" onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto infl-msgs-scroll min-h-0 p-4 space-y-5">
        {loading && <ContextPanelSkeleton />}

        {!loading && (
          <>
            <section>
              <div className="flex items-center gap-3 mb-3">
                <Avatar user={other} size={48} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 m-0 truncate">
                    {name}
                  </p>
                  <p className="text-[11px] text-gray-500 m-0">{role}</p>
                  {other.location ? (
                    <p className="text-[11px] text-gray-400 m-0 mt-0.5 truncate">
                      {other.location}
                    </p>
                  ) : null}
                </div>
              </div>

              {other.role === "business_owner" && other.companyName && (
                <p className="text-xs text-gray-600 dark:text-gray-300 m-0 mb-2">
                  {other.companyName}
                  {other.industry ? ` · ${other.industry}` : ""}
                </p>
              )}
              {other.role === "influencer" && other.niche && (
                <p className="text-xs text-gray-600 dark:text-gray-300 m-0 mb-2">
                  {Array.isArray(other.niche)
                    ? other.niche.filter(Boolean).join(", ")
                    : other.niche}
                </p>
              )}

              <div className="infl-msgs-context-card p-3 rounded-xl space-y-0.5">
                {metricRow(
                  "Connected since",
                  rel?.connectedSince ? connectedSinceLabel(rel.connectedSince) : null
                )}
                {metricRow("Active collaborations", rel?.activeCollaborations)}
                {metricRow("Completed collaborations", rel?.completedCollaborations)}
                {metricRow(
                  "Last interaction",
                  lastInteraction ? timeAgo(lastInteraction) : null
                )}
              </div>

              {path && (
                <button
                  type="button"
                  className="infl-msgs-btn-primary w-full mt-3 h-9 text-xs font-semibold"
                  onClick={() => window.open(path, "_blank", "noopener noreferrer")}
                >
                  View Profile
                </button>
              )}
            </section>

            {ctx?.activeProjects && ctx.activeProjects.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide m-0 mb-2">
                  Active Collaborations
                </h3>
                <div className="space-y-2">
                  {ctx.activeProjects.map((p) => (
                    <div
                      key={String(p.id)}
                      className="infl-msgs-collab-card p-3 rounded-xl border border-[#f3f4f6] dark:border-gray-700"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 m-0 truncate">
                        {p.title}
                      </p>
                      <p className="text-[11px] text-gray-500 m-0 mt-1">
                        Status:{" "}
                        <span className="text-infl-primary font-semibold">
                          {p.currentStageLabel || p.currentStage.replace(/_/g, " ")}
                        </span>
                      </p>
                      <button
                        type="button"
                        className="infl-msgs-btn-primary mt-3 w-full h-8 text-xs font-semibold"
                        onClick={() => openProject(p.id)}
                      >
                        Open Project
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {ctx?.activity && ctx.activity.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide m-0 mb-2">
                  Recent Activity
                </h3>
                <ul className="space-y-2 m-0 p-0 list-none">
                  {ctx.activity.map((item) => (
                    <li key={item.id} className="infl-msgs-context-card p-3 rounded-xl">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 m-0">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-gray-400 m-0 mt-1">{timeAgo(item.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {ctx?.sharedFiles && ctx.sharedFiles.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide m-0 mb-2">
                  Shared Files
                </h3>
                <ul className="space-y-1.5 m-0 p-0 list-none">
                  {ctx.sharedFiles.map((f) => (
                    <li key={`${f.url}-${f.name}`}>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="infl-msgs-context-file flex items-center gap-2 text-xs font-semibold no-underline px-3 py-2 rounded-lg"
                      >
                        <span aria-hidden>📄</span>
                        <span className="truncate">{f.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
