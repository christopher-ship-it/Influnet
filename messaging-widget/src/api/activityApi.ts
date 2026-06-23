import type {
  ActivityItem,
  AuthUser,
  CollabRequest,
  Conversation,
  DiscoverRecipient,
  MessagingPrefs,
  DEFAULT_MESSAGING_PREFS as DefaultPrefs,
} from "../types";
import { DEFAULT_MESSAGING_PREFS } from "../types";
import { displayName } from "../utils/avatar";

const SEEN_KEY = "infl_msgs_notifications_seen_at";
const PREFS_KEY = "infl_messenger_prefs_v1";

function token(): string | null {
  return localStorage.getItem("influnet_token");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function getNotificationsSeenAt(): number {
  return Number(localStorage.getItem(SEEN_KEY) || 0);
}

export function markNotificationsSeen(): void {
  localStorage.setItem(SEEN_KEY, String(Date.now()));
}

export function countUnreadActivity(items: ActivityItem[]): number {
  const seenAt = getNotificationsSeenAt();
  return items.filter((item) => new Date(item.createdAt).getTime() > seenAt).length;
}

export async function fetchCollabRequests(
  direction: "incoming" | "outgoing"
): Promise<CollabRequest[]> {
  try {
    return await api<CollabRequest[]>(`/api/collab-requests/${direction}`);
  } catch {
    return [];
  }
}

export async function fetchActivityFeed(user: AuthUser | null): Promise<ActivityItem[]> {
  const [conversations, incoming, outgoing] = await Promise.all([
    api<Conversation[]>("/api/conversations").catch(() => []),
    fetchCollabRequests("incoming"),
    fetchCollabRequests("outgoing"),
  ]);

  const items: ActivityItem[] = [];
  const myId = user?.id;

  for (const conv of conversations) {
    if ((conv.unreadCount || 0) <= 0) continue;
    const name = displayName(conv.otherUser);
    items.push({
      id: `msg-${conv.id}`,
      kind: "message",
      title: "New Message",
      body: `${name}: ${conv.lastMessage || "Sent you a message"}`,
      createdAt: conv.lastMessageAt || new Date().toISOString(),
      conversationId: conv.id,
    });
  }

  for (const req of incoming) {
    const status = String(req.status).toLowerCase();
    const from = req.fromUser?.companyName || req.fromUser?.name || "A business";
    if (status === "pending") {
      items.push({
        id: `req-${req.id}`,
        kind: "collab_request",
        title: "New Collaboration Request",
        body: `${from} wants to collaborate`,
        createdAt: req.createdAt,
        requestId: req.id,
      });
    } else if (status === "accepted") {
      items.push({
        id: `acc-${req.id}`,
        kind: "request_accepted",
        title: "Request Accepted",
        body: `You accepted a request from ${from}`,
        createdAt: req.createdAt,
        requestId: req.id,
      });
    } else if (status === "rejected") {
      items.push({
        id: `rej-${req.id}`,
        kind: "request_rejected",
        title: "Request Declined",
        body: `You declined a request from ${from}`,
        createdAt: req.createdAt,
        requestId: req.id,
      });
    }
  }

  for (const req of outgoing) {
    const status = String(req.status).toLowerCase();
    const to = req.toUser?.name || "Creator";
    if (status === "accepted") {
      items.push({
        id: `out-acc-${req.id}`,
        kind: "request_accepted",
        title: "Request Accepted",
        body: `${to} accepted your collaboration request`,
        createdAt: req.createdAt,
        requestId: req.id,
      });
    } else if (status === "rejected") {
      items.push({
        id: `out-rej-${req.id}`,
        kind: "request_rejected",
        title: "Request Declined",
        body: `${to} declined your collaboration request`,
        createdAt: req.createdAt,
        requestId: req.id,
      });
    }
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return items.slice(0, 30);
}

export async function searchRecipients(
  query: string,
  user: AuthUser | null
): Promise<DiscoverRecipient[]> {
  const q = query.trim().toLowerCase();
  const role = user?.role || "";

  if (role === "business_owner") {
    const path = q
      ? `/api/discover/influencers?q=${encodeURIComponent(q)}`
      : "/api/discover/influencers";
    const list = await api<
      Array<{ id: string; name?: string; niche?: string[] }>
    >(path).catch(() => []);
    return list.map((row) => ({
      id: row.id,
      name: row.name || "Creator",
      subtitle: Array.isArray(row.niche) ? row.niche.slice(0, 2).join(" · ") : "Influencer",
    }));
  }

  const [incoming, outgoing] = await Promise.all([
    fetchCollabRequests("incoming"),
    fetchCollabRequests("outgoing"),
  ]);

  const map = new Map<string, DiscoverRecipient>();
  const add = (id: string, name: string, subtitle: string) => {
    if (!id || id === user?.id || map.has(id)) return;
    map.set(id, { id, name, subtitle });
  };

  for (const req of [...incoming, ...outgoing]) {
    if (req.fromUserId && req.fromUserId !== myId) {
      add(
        req.fromUserId,
        req.fromUser?.companyName || req.fromUser?.name || "Business",
        "Business partner"
      );
    }
    if (req.toUserId && req.toUserId !== myId) {
      add(req.toUserId, req.toUser?.name || "Creator", "Collaborator");
    }
  }

  let results = [...map.values()];
  if (q) {
    results = results.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.subtitle || "").toLowerCase().includes(q)
    );
  }
  return results.slice(0, 20);
}

export async function startConversation(otherUserId: string): Promise<Conversation> {
  return api<Conversation>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ otherUserId }),
  });
}

export function loadMessagingPrefs(): MessagingPrefs {
  try {
    return {
      ...DEFAULT_MESSAGING_PREFS,
      ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"),
    };
  } catch {
    return { ...DEFAULT_MESSAGING_PREFS };
  }
}

export function saveMessagingPrefs(prefs: Partial<MessagingPrefs>): MessagingPrefs {
  const next = { ...loadMessagingPrefs(), ...prefs };
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  return next;
}
