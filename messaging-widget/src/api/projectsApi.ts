export type ProjectRow = {
  id: string | number;
  title?: string;
  status?: string;
  currentStage?: string;
  ownerUserId?: string;
  counterpartyUserId?: string;
  owner_user_id?: string;
  counterparty_user_id?: string;
};

function token(): string | null {
  return localStorage.getItem("influnet_token");
}

export async function fetchProjects(): Promise<ProjectRow[]> {
  const res = await fetch("/api/projects", {
    credentials: "same-origin",
    headers: token() ? { Authorization: `Bearer ${token()}` } : {},
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function activeCollaborationPartnerIds(
  projects: ProjectRow[],
  myUserId: string
): Set<string> {
  const ids = new Set<string>();
  for (const p of projects) {
    const owner = p.ownerUserId || p.owner_user_id;
    const counter = p.counterpartyUserId || p.counterparty_user_id;
    const stage = String(p.currentStage || "");
    const status = String(p.status || "active");
    const completed = status === "completed" || stage === "project_completed";
    if (completed || status !== "active") continue;
    if (owner && owner !== myUserId) ids.add(owner);
    if (counter && counter !== myUserId) ids.add(counter);
  }
  return ids;
}
