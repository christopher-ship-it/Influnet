import type { Conversation, Message, MessageAttachment } from "../types";
import { parseMessageBody } from "../utils/messageBody";

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

function normalizeMessage(raw: Message): Message {
  const { text, attachments } = parseMessageBody(raw.body);
  return { ...raw, body: text, attachments };
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const rows = await api<Message[]>(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`
  );
  return rows.map(normalizeMessage);
}

export async function sendMessage(
  conversationId: string,
  body: string,
  attachments?: MessageAttachment[]
): Promise<Message> {
  const saved = await api<Message>(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ body, attachments }),
    }
  );
  return normalizeMessage(saved);
}

export async function uploadMessageAttachment(
  conversationId: string,
  file: File
): Promise<MessageAttachment> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
  return api<MessageAttachment>(
    `/api/conversations/${encodeURIComponent(conversationId)}/attachments`,
    {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        dataUrl,
      }),
    }
  );
}

export async function markConversationUnread(conversationId: string): Promise<void> {
  await api(`/api/conversations/${encodeURIComponent(conversationId)}/unread`, {
    method: "POST",
  });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: token() ? { Authorization: `Bearer ${token()}` } : {},
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
  presenceEnabled?: boolean;
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

const MUTED_KEY = "influnet_messenger_muted_v1";

export function loadMutedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(MUTED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function saveMutedIds(ids: Set<string>) {
  localStorage.setItem(MUTED_KEY, JSON.stringify([...ids]));
}
