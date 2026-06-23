import type { ConversationContext } from "../types";

function token(): string | null {
  return localStorage.getItem("influnet_token");
}

export async function fetchConversationContext(
  conversationId: string
): Promise<ConversationContext | null> {
  const res = await fetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/context`,
    {
      credentials: "same-origin",
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    }
  );
  if (!res.ok) return null;
  return res.json();
}
