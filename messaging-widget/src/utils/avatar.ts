const GRADIENTS: [string, string][] = [
  ["#ee3e96", "#f26e59"],
  ["#8b5cf6", "#a78bfa"],
  ["#3b82f6", "#60a5fa"],
  ["#10b981", "#34d399"],
  ["#f59e0b", "#fbbf24"],
];

export function displayName(user?: {
  name?: string | null;
  companyName?: string | null;
  username?: string | null;
}): string {
  if (user?.companyName?.trim()) return user.companyName.trim();
  if (user?.name?.trim()) return user.name.trim();
  if (user?.username?.trim()) return `@${user.username.trim()}`;
  return "";
}

export function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

export function gradientFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[h];
}

export function userSubtitle(user?: {
  presenceEnabled?: boolean;
  isTyping?: boolean;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  niche?: string | string[] | null;
  industry?: string | null;
}): string {
  if (!user) return "";
  if (user.presenceEnabled === false) {
    const niche = Array.isArray(user.niche)
      ? user.niche.filter(Boolean).join(", ")
      : user.niche;
    if (niche) return niche;
    if (user.industry) return user.industry;
    return "";
  }
  if (user.isTyping) return "Typing…";
  if (user.isOnline) return "Active now";
  if (user.lastSeenAt) {
    const diff = Date.now() - new Date(user.lastSeenAt).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `Active ${mins} min${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Active ${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Active yesterday";
    return `Active ${days} days ago`;
  }
  return "Last seen recently";
}
