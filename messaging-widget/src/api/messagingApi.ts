import type { Conversation, Message } from "../types";

function token(): string | null {
  return localStorage.getItem("influnet_token");
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
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

export async function fetchConversations(): Promise<Conversation[]> {
  return api<Conversation[]>("/api/conversations");
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  return api<Message[]>(`/api/conversations/${encodeURIComponent(conversationId)}/messages`);
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  return api<Message>(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function sendTyping(conversationId: string): Promise<void> {
  await api(`/api/conversations/${encodeURIComponent(conversationId)}/typing`, {
    method: "POST",
  });
}

export async function fetchConversationStatus(conversationId: string): Promise<{
  isOnline?: boolean;
  lastSeenAt?: string | null;
  typing?: boolean;
}> {
  return api(`/api/conversations/${encodeURIComponent(conversationId)}/status`);
}

export async function hideConversation(conversationId: string): Promise<void> {
  await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: token() ? { Authorization: `Bearer ${token()}` } : {},
  });
}

export function connectEvents(onEvent: (data: Record<string, unknown>) => void): () => void {
  const es = new EventSource("/api/events");
  es.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      /* ignore */
    }
  };
  return () => es.close();
}

const ARCHIVED_KEY = "influnet_messenger_archived_v1";

export function loadArchivedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(ARCHIVED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function saveArchivedIds(ids: Set<string>) {
  localStorage.setItem(ARCHIVED_KEY, JSON.stringify([...ids]));
}
