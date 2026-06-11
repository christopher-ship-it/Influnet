export type OtherUser = {
  id: string;
  name?: string | null;
  companyName?: string | null;
  industry?: string | null;
  niche?: string | string[] | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  isTyping?: boolean;
};

export type Conversation = {
  id: string;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  otherUser: OtherUser;
};

export type Message = {
  id: string;
  body: string;
  senderUserId: string;
  createdAt: string;
  deleted?: boolean;
  /** Client-side delivery state for future WebSocket acks */
  status?: "sending" | "sent" | "delivered" | "read";
};

export type ToastNotification = {
  id: string;
  title: string;
  body: string;
  kind: "message" | "collab" | "response";
  createdAt: number;
  conversationId?: string;
  requestId?: string;
  actionLabel?: string;
};

export type ConversationTab = "active" | "archived";

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
};
