import { useEffect, useState } from "react";
import { fetchCollabRequests } from "../api/activityApi";
import { timeAgo } from "../utils/dates";
import type { AuthUser, CollabRequest } from "../types";
import { Avatar } from "./Avatar";

type Props = {
  currentUser: AuthUser | null;
};

export function RequestsPanel({ currentUser }: Props) {
  const [incoming, setIncoming] = useState<CollabRequest[]>([]);
  const [outgoing, setOutgoing] = useState<CollabRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [inc, out] = await Promise.all([
        fetchCollabRequests("incoming"),
        fetchCollabRequests("outgoing"),
      ]);
      if (!cancelled) {
        setIncoming(inc);
        setOutgoing(out);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = [
    ...incoming.filter((r) => String(r.status).toLowerCase() === "pending"),
    ...outgoing.filter((r) => String(r.status).toLowerCase() === "pending"),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl infl-msgs-skeleton" />
        ))}
      </div>
    );
  }

  if (!pending.length) {
    return (
      <p className="p-6 text-sm text-gray-400 text-center m-0">
        No pending collaboration requests.
      </p>
    );
  }

  return (
    <div className="divide-y divide-[#f3f4f6] dark:divide-gray-800">
      {pending.map((req) => {
        const isIncoming = req.toUserId === currentUser?.id;
        const other = isIncoming ? req.fromUser : req.toUser;
        const name =
          other?.companyName || other?.name || other?.username || "Unknown";
        return (
          <div key={req.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <Avatar
                user={{
                  id: isIncoming ? req.fromUserId : req.toUserId,
                  name,
                  companyName: other?.companyName,
                }}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 m-0 truncate">
                  {name}
                </p>
                <p className="text-[11px] text-gray-500 m-0 mt-0.5">
                  {isIncoming ? "Incoming request" : "Outgoing request"} ·{" "}
                  {timeAgo(req.createdAt)}
                </p>
                {req.message ? (
                  <p className="text-xs text-gray-400 m-0 mt-1 line-clamp-2">
                    {req.message}
                  </p>
                ) : null}
                {isIncoming && (
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-infl-primary border-0 bg-transparent cursor-pointer p-0"
                    onClick={() =>
                      import("../utils/nav").then(({ openNavSection }) =>
                        openNavSection("Requests")
                      )
                    }
                  >
                    Review in Requests →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
