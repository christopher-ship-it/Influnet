export type OtherUser = {
  id: string;
  name?: string | null;
  companyName?: string | null;
  industry?: string | null;
  niche?: string | string[] | null;
  role?: string | null;
  displayRole?: string | null;
  username?: string | null;
  profileSlug?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  isVerified?: boolean;
  availabilityStatus?: string | null;
  headline?: string | null;
  presenceEnabled?: boolean;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  isTyping?: boolean;
};

export type MessageAttachment = {
  name: string;
  url: string;
  mime: string;
  size?: number;
};

export type PendingAttachment = {
  file: File;
  name: string;
  mime: string;
  size: number;
  previewUrl?: string;
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
  status?: "sending" | "sent" | "delivered" | "read";
  attachments?: MessageAttachment[];
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

export type ConversationTab =
  | "all"
  | "requests"
  | "collaborations"
  | "unread"
  | "archived";

export type WorkspacePane = "list" | "chat" | "context";

export type ConversationContext = {
  profile: OtherUser & { location?: string | null };
  relationship?: {
    connectedSince?: string | null;
    requestsSent?: number;
    requestsAccepted?: number;
    activeCollaborations?: number;
    completedCollaborations?: number;
    lastInteraction?: string | null;
  };
  activeProjects: Array<{
    id: string | number;
    title: string;
    currentStage: string;
    currentStageLabel?: string;
    status: string;
    updatedAt?: string;
  }>;
  completedProjects?: Array<{
    id: string | number;
    title: string;
    currentStage: string;
    currentStageLabel?: string;
    status: string;
    updatedAt?: string;
  }>;
  activity: Array<{
    id: string;
    kind: string;
    title: string;
    createdAt: string;
    projectId?: string | number;
  }>;
  sharedFiles: Array<{
    name: string;
    url: string;
    mime: string;
    createdAt: string;
  }>;
};

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
};

export type CollabRequest = {
  id: string;
  message?: string;
  status: string;
  createdAt: string;
  fromUserId: string;
  toUserId: string;
  fromUser?: { id: string; name?: string; companyName?: string | null };
  toUser?: { id: string; name?: string; companyName?: string | null };
};

export type DiscoverRecipient = {
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
};

export type ActivityItem = {
  id: string;
  kind:
    | "message"
    | "collab_request"
    | "request_accepted"
    | "request_rejected"
    | "profile_view";
  title: string;
  body: string;
  createdAt: string;
  conversationId?: string;
  requestId?: string;
};

export type MessagingPrefs = {
  notifyMessages: boolean;
  notifyRequests: boolean;
  notifyResponses: boolean;
  muteAll: boolean;
};

export const DEFAULT_MESSAGING_PREFS: MessagingPrefs = {
  notifyMessages: true,
  notifyRequests: true,
  notifyResponses: true,
  muteAll: false,
};
