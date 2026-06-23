import type { Conversation } from "../types";

/** Accept standard UUIDs and other non-empty string ids from the API. */
export function isValidConversationId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const t = id.trim();
  if (!t) return false;
  if (t.length > 128) return false;
  return /^[a-zA-Z0-9_-]+$/.test(t);
}

export function isValidConversation(
  conversation: Conversation | null | undefined
): conversation is Conversation {
  if (!conversation || typeof conversation !== "object") return false;
  if (!isValidConversationId(conversation.id)) return false;
  if (!conversation.otherUser || typeof conversation.otherUser !== "object") return false;
  if (typeof conversation.otherUser.id !== "string" || !conversation.otherUser.id.trim()) {
    return false;
  }
  return true;
}

export function findConversationById(
  conversations: Conversation[],
  id: string | null | undefined
): Conversation | null {
  if (!isValidConversationId(id)) return null;
  const found = conversations.find((c) => c.id === id);
  return isValidConversation(found) ? found : null;
}

function conversationActivityTs(row: Conversation): number {
  const t = row.lastMessageAt ? new Date(row.lastMessageAt).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

/** One row per peer — keeps the thread with the latest activity. */
export function dedupeConversationsByPeer(list: Conversation[]): Conversation[] {
  const seenConvIds = new Set<string>();
  const byPeer = new Map<string, Conversation>();

  for (const row of list) {
    if (!row?.id || seenConvIds.has(row.id)) continue;
    seenConvIds.add(row.id);

    const peerId = row.otherUser?.id;
    if (!peerId) {
      byPeer.set(`orphan:${row.id}`, row);
      continue;
    }

    const existing = byPeer.get(peerId);
    if (!existing) {
      byPeer.set(peerId, row);
      continue;
    }

    const keep =
      conversationActivityTs(row) >= conversationActivityTs(existing) ? row : existing;
    const drop = keep === row ? existing : row;
    byPeer.set(peerId, {
      ...keep,
      unreadCount: (keep.unreadCount || 0) + (drop.unreadCount || 0),
    });
  }

  return [...byPeer.values()].sort(
    (a, b) => conversationActivityTs(b) - conversationActivityTs(a)
  );
}
