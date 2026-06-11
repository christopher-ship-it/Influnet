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
}): string {
  return user?.name || user?.companyName || "User";
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
  isTyping?: boolean;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  niche?: string | string[] | null;
  industry?: string | null;
}): string {
  if (!user) return "";
  if (user.isTyping) return "Typing…";
  if (user.isOnline) return "Active now";
  if (user.lastSeenAt) {
    const t = Date.now() - new Date(user.lastSeenAt).getTime();
    if (t < 90000) return "Active now";
    const m = Math.floor(t / 60000);
    if (m < 60) return `Last seen ${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Last seen ${h}h ago`;
    return `Last seen ${Math.floor(h / 24)}d ago`;
  }
  const niche = Array.isArray(user.niche)
    ? user.niche.filter(Boolean).join(", ")
    : user.niche;
  if (niche) return niche;
  if (user.industry) return user.industry;
  return "On Influnet";
}
