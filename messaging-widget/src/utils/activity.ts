import { timeAgo } from "./dates";

/** Last known interaction from conversation message activity — never fakes online status. */
export function lastInteractionLabel(lastMessageAt?: string | null): string {
  if (!lastMessageAt) return "";
  return `Last interaction ${timeAgo(lastMessageAt)}`;
}

export function connectedSinceLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
