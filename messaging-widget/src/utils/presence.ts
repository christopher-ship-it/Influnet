import type { OtherUser } from "../types";

export function roleLabel(
  role?: string | null,
  displayRole?: string | null,
  user?: Partial<OtherUser> | null
): string {
  if (displayRole?.trim()) return displayRole.trim();
  if (role === "business_owner") return "Business Owner";
  if (role === "influencer") {
    if (user?.headline?.trim()) return user.headline.trim();
    const niche = Array.isArray(user?.niche)
      ? user.niche.filter(Boolean).join(", ")
      : user?.niche;
    if (niche && niche !== "Creator") return `${niche} Creator`;
    return "Influencer";
  }
  return "";
}

/** Legacy drawer only — workspace uses lastInteractionLabel instead. */
export function presenceLabel(user?: OtherUser | null): string {
  if (!user?.presenceEnabled) return "";
  if (user.isTyping) return "Typing…";
  if (user.lastSeenAt) {
    const diff = Date.now() - new Date(user.lastSeenAt).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `Last active ${mins} min${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Last active ${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Last active yesterday";
    return `Last active ${days} days ago`;
  }
  return "";
}
