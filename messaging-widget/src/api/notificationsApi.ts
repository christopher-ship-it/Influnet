export type NotificationSummary = {
  unreadMessagesCount: number;
  pendingRequestsCount: number;
};

export async function fetchNotificationSummary(): Promise<NotificationSummary> {
  const token = localStorage.getItem("influnet_token");
  const res = await fetch("/api/notifications/summary", {
    credentials: "same-origin",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { unreadMessagesCount: 0, pendingRequestsCount: 0 };
  }
  return {
    unreadMessagesCount: Number(data.unreadMessagesCount) || 0,
    pendingRequestsCount: Number(data.pendingRequestsCount) || 0,
  };
}
