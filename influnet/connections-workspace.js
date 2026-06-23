/**
 * Connections hub — professional network for influencers and businesses.
 */
(function () {
  try {
    const MOUNT_ID = "influnet-connections-workspace-mount";

    const INFLUENCER_FILTERS = [
      { id: "all", label: "All" },
      { id: "active", label: "Active" },
      { id: "recent", label: "Recent" },
      { id: "collaborated", label: "Collaborated" },
      { id: "favorites", label: "Favorites" },
    ];

    const BUSINESS_FILTERS = [
      { id: "all", label: "All" },
      { id: "fashion", label: "Fashion" },
      { id: "beauty", label: "Beauty" },
      { id: "fitness", label: "Fitness" },
      { id: "technology", label: "Technology" },
      { id: "travel", label: "Travel" },
      { id: "food", label: "Food" },
      { id: "lifestyle", label: "Lifestyle" },
      { id: "favorites", label: "Favorites" },
    ];

    let connections = [];
    let metrics = {};
    let viewerRole = null;
    let filter = "all";
    let search = "";
    let searchTimer = 0;
    let loading = false;
    let selectedId = null;
    let detail = null;

    function getUser() {
      try {
        return JSON.parse(localStorage.getItem("influnet_user") || "null");
      } catch {
        return null;
      }
    }

    function isBusiness() {
      return getUser()?.role === "business_owner";
    }

    function normalizeNavText(text) {
      return String(text || "")
        .replace(/\d+/g, "")
        .replace(/\+/g, "")
        .trim();
    }

    function getMainEl() {
      return (
        document.querySelector(".flex.h-screen main.flex-1") ||
        document.querySelector("main.flex-1")
      );
    }

    function isConnectionsNavLabel(label) {
      return String(label || "").toLowerCase() === "connections";
    }

    function getActiveSection() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (nav) {
        const active = [...nav.querySelectorAll(":scope > button")].find(
          (b) =>
            b.classList.contains("bg-violet-100") ||
            /\bbg-violet-100\b/.test(b.className)
        );
        if (active) return normalizeNavText(active.textContent);
      }
      const crumb = document.querySelector(
        ".flex.h-screen header span.text-sm.font-semibold.text-gray-800"
      );
      return crumb ? normalizeNavText(crumb.textContent) : "";
    }

    function isConnectionsSectionActive() {
      return (
        document.body.classList.contains("infl-connections-workspace-active") &&
        isConnectionsNavLabel(getActiveSection())
      );
    }

    function escapeHtml(str) {
      return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    }

    function initials(name) {
      const p = String(name || "?").trim().split(/\s+/);
      return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
    }

    function timeAgo(iso) {
      if (!iso) return "—";
      const diff = Date.now() - new Date(iso).getTime();
      const days = Math.floor(diff / 86400000);
      if (days < 1) return "Today";
      if (days < 30) return `${days}d ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return `${months}mo ago`;
      return `${Math.floor(months / 12)}y ago`;
    }

    function formatDate(iso) {
      if (!iso) return "—";
      return new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    function strengthClass(status) {
      if (status === "top") return "infl-conn-strength--top";
      if (status === "trusted") return "infl-conn-strength--trusted";
      if (status === "active") return "infl-conn-strength--active";
      return "";
    }

    async function api(path, opts) {
      const res = await fetch(path, {
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
        ...opts,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    }

    function ensureMount() {
      const main = getMainEl();
      if (!main) return null;
      let mount = document.getElementById(MOUNT_ID);
      if (!mount) {
        mount = document.createElement("div");
        mount.id = MOUNT_ID;
        main.appendChild(mount);
      }
      return mount;
    }

    function teardown(reason) {
      loading = false;
      document.body.classList.remove("infl-connections-workspace-active");
      const mount = document.getElementById(MOUNT_ID);
      if (mount) {
        mount.style.display = "none";
      }
      closeDetail();
    }

    function mountShell() {
      document.body.classList.add("infl-connections-workspace-active");
      const mount = ensureMount();
      if (mount) {
        mount.style.display = "block";
        if (!mount.childElementCount) {
          mount.innerHTML = `<div class="infl-conn infl-conn-loading">Loading connections…</div>`;
        }
      }
    }

    window.influnetTeardownConnectionsWorkspace = teardown;

    function metricCards() {
      if (isBusiness()) {
        return [
          { label: "Total Creators Connected", value: metrics.totalConnections ?? 0 },
          { label: "Active Collaborations", value: metrics.activeConnections ?? 0 },
          { label: "Completed Campaigns", value: metrics.completedCollaborations ?? 0 },
          { label: "Saved Creators", value: metrics.savedCreators ?? 0 },
        ];
      }
      return [
        { label: "Total Connections", value: metrics.totalConnections ?? 0 },
        { label: "Active Connections", value: metrics.activeConnections ?? 0 },
        { label: "Completed Collaborations", value: metrics.completedCollaborations ?? 0 },
        { label: "Profile Views From Connections", value: metrics.profileViewsFromConnections ?? 0 },
      ];
    }

    function buildCard(c) {
      const p = c.partner || {};
      const avatar = p.avatarUrl
        ? `<img src="${escapeHtml(p.avatarUrl)}" alt="" />`
        : escapeHtml(initials(p.name));
      const username = p.username ? `@${escapeHtml(p.username)}` : "";
      return `
        <article class="infl-conn-card${c.favorite ? " favorite" : ""}" data-id="${escapeHtml(c.id)}">
          <div class="infl-conn-card-top">
            <div class="infl-conn-avatar">${avatar}</div>
            <div style="min-width:0;flex:1">
              <div style="display:flex;align-items:flex-start;gap:0.35rem">
                <h3>${escapeHtml(p.name || "Partner")}</h3>
                <button type="button" class="infl-conn-fav${c.favorite ? " on" : ""}" data-fav="${escapeHtml(c.id)}" title="Favorite">⭐</button>
              </div>
              <div class="infl-conn-card-meta">
                ${escapeHtml(p.industry || p.category || "")}${username ? ` · ${username}` : ""}<br>
                ${p.location ? `${escapeHtml(p.location)} · ` : ""}Connected ${timeAgo(c.connectedAt)}
              </div>
              <span class="infl-conn-strength ${strengthClass(c.relationshipStatus)}">${escapeHtml(c.strengthLabel || "New Connection")}</span>
            </div>
          </div>
          <div class="infl-conn-card-stats">
            <span>${c.projectsCompleted || 0} projects</span>
            <span>${escapeHtml(c.currentStatus || "Connected")}</span>
          </div>
          <div class="infl-conn-actions">
            <button type="button" class="infl-conn-btn" data-action="view" data-id="${escapeHtml(c.id)}">View Profile</button>
            <button type="button" class="infl-conn-btn" data-action="message" data-id="${escapeHtml(c.id)}">Message</button>
            <button type="button" class="infl-conn-btn infl-conn-btn--primary" data-action="collab" data-id="${escapeHtml(c.id)}">Start Collaboration</button>
            <button type="button" class="infl-conn-btn infl-conn-btn--danger" data-action="remove" data-id="${escapeHtml(c.id)}">Remove</button>
          </div>
        </article>`;
    }

    function render() {
      const mount = document.getElementById(MOUNT_ID);
      if (!mount) return;
      const filters = isBusiness() ? BUSINESS_FILTERS : INFLUENCER_FILTERS;
      const title = isBusiness() ? "My Creator Network" : "My Connections";
      const subtitle = isBusiness()
        ? "Creators you've connected and collaborated with."
        : "Businesses you've connected and collaborated with.";

      mount.innerHTML = `
        <div class="infl-conn">
          <div class="infl-conn-head">
            <h2>${title}</h2>
            <p>${subtitle}</p>
          </div>
          <div class="infl-conn-metrics">
            ${metricCards()
              .map(
                (m) =>
                  `<div class="infl-conn-metric"><strong>${escapeHtml(String(m.value))}</strong><span>${escapeHtml(m.label)}</span></div>`
              )
              .join("")}
          </div>
          <div class="infl-conn-toolbar">
            <div class="infl-conn-search">
              <input type="search" id="infl-conn-search" placeholder="Search name, industry, location…" value="${escapeHtml(search)}" />
            </div>
            <div class="infl-conn-filters">
              ${filters
                .map(
                  (f) =>
                    `<button type="button" class="infl-conn-filter${filter === f.id ? " active" : ""}" data-filter="${f.id}">${f.label}</button>`
                )
                .join("")}
            </div>
          </div>
          ${
            connections.length
              ? `<div class="infl-conn-grid">${connections.map(buildCard).join("")}</div>`
              : `<div class="infl-conn-empty">No connections yet. Accept collaboration requests or start a project to build your network.</div>`
          }
        </div>`;

      mount.querySelector("#infl-conn-search")?.addEventListener("input", (e) => {
        search = e.target.value;
        clearTimeout(searchTimer);
        searchTimer = window.setTimeout(refresh, 300);
      });

      mount.querySelectorAll("[data-filter]").forEach((btn) => {
        btn.addEventListener("click", () => {
          filter = btn.getAttribute("data-filter");
          refresh();
        });
      });

      mount.querySelectorAll(".infl-conn-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest("button")) return;
          openDetail(card.getAttribute("data-id"));
        });
      });

      mount.querySelectorAll("[data-fav]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute("data-fav");
          const conn = connections.find((c) => c.id === id);
          await toggleFavorite(id, !conn?.favorite);
        });
      });

      mount.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const id = btn.getAttribute("data-id");
          const action = btn.getAttribute("data-action");
          const conn = connections.find((c) => c.id === id);
          if (!conn) return;
          if (action === "view") viewProfile(conn);
          else if (action === "message") messagePartner(conn);
          else if (action === "collab") startCollaboration(conn);
          else if (action === "remove") removeConnection(id);
        });
      });
    }

    function viewProfile(conn) {
      const url = conn.partner?.profileUrl;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }

    function messagePartner(conn) {
      const name = conn.partner?.name || "Partner";
      const btn = [...document.querySelectorAll("aside nav button")].find(
        (b) => normalizeNavText(b.textContent).toLowerCase() === "messages"
      );
      btn?.click();
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("influnet-open-messages", { detail: { name } })
        );
      }, 400);
    }

    function startCollaboration(conn) {
      if (typeof window.influnetOpenProject === "function") {
        const btn = [...document.querySelectorAll("aside nav button")].find((b) =>
          /projects|collaborations/i.test(normalizeNavText(b.textContent))
        );
        btn?.click();
        window.setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("influnet-start-collaboration", {
              detail: { userId: conn.connectedUserId, name: conn.partner?.name },
            })
          );
        }, 400);
      } else {
        messagePartner(conn);
      }
    }

    async function toggleFavorite(id, favorite) {
      await api(`/api/connections/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ favorite }),
      });
      await refresh();
    }

    async function removeConnection(id) {
      if (!window.confirm("Remove this connection from your network?")) return;
      await api(`/api/connections/${id}`, { method: "DELETE" });
      closeDetail();
      await refresh();
    }

    function closeDetail() {
      document.querySelector(".infl-conn-detail-backdrop")?.remove();
      selectedId = null;
      detail = null;
    }

    async function openDetail(id) {
      selectedId = id;
      detail = await api(`/api/connections/${id}`);
      const p = detail.partner || {};
      const o = detail.overview || {};
      const backdrop = document.createElement("div");
      backdrop.className = "infl-conn-detail-backdrop";
      backdrop.innerHTML = `
        <div class="infl-conn-detail" role="dialog" aria-label="Connection details">
          <div style="display:flex;justify-content:space-between;gap:0.5rem;align-items:flex-start">
            <div>
              <h3>${escapeHtml(p.name || "Partner")}</h3>
              <p style="margin:0;font-size:0.8rem;color:#6b7280">${escapeHtml(detail.strengthLabel || "")}</p>
            </div>
            <button type="button" class="infl-conn-btn" data-close-detail>✕</button>
          </div>
          <div class="infl-conn-detail-grid">
            <div class="infl-conn-detail-stat"><span>Connected since</span><strong>${formatDate(o.connectedSince)}</strong></div>
            <div class="infl-conn-detail-stat"><span>Messages exchanged</span><strong>${o.messagesExchanged ?? 0}</strong></div>
            <div class="infl-conn-detail-stat"><span>Requests sent</span><strong>${o.requestsSent ?? 0}</strong></div>
            <div class="infl-conn-detail-stat"><span>Collaborations completed</span><strong>${o.collaborationsCompleted ?? 0}</strong></div>
            <div class="infl-conn-detail-stat"><span>Projects active</span><strong>${o.projectsActive ?? 0}</strong></div>
            <div class="infl-conn-detail-stat"><span>Last activity</span><strong>${timeAgo(o.lastActivity)}</strong></div>
          </div>
          <div class="infl-conn-notes">
            <label>Private notes</label>
            <textarea id="infl-conn-notes-input" placeholder="Good communication, fast payments…">${escapeHtml(detail.notes || "")}</textarea>
            <button type="button" class="infl-conn-btn infl-conn-btn--primary" style="margin-top:0.5rem" data-save-notes>Save notes</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop || e.target.closest("[data-close-detail]")) closeDetail();
      });
      backdrop.querySelector("[data-save-notes]")?.addEventListener("click", async () => {
        const notes = backdrop.querySelector("#infl-conn-notes-input")?.value || "";
        await api(`/api/connections/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ notes }),
        });
        await refresh();
      });
    }

    async function refresh() {
      if (!isConnectionsSectionActive() && !document.body.classList.contains("infl-connections-workspace-active")) {
        return;
      }
      if (loading) return;
      loading = true;
      try {
        const params = new URLSearchParams({ filter, search });
        const data = await api(`/api/connections?${params}`);
        connections = data.connections || [];
        metrics = data.metrics || {};
        viewerRole = data.viewerRole;
        render();
      } catch (err) {
        const mount = document.getElementById(MOUNT_ID);
        if (mount) {
          mount.innerHTML = `<div class="infl-conn infl-conn-empty">Could not load connections. ${escapeHtml(err.message)}</div>`;
        }
      } finally {
        loading = false;
      }
    }

    function onSectionChange(section) {
      const s = String(section || "").toLowerCase();
      if (s === "connections") {
        mountShell();
        refresh();
      } else {
        teardown("section:" + s);
      }
    }

    (function chain(name, handler) {
      const prev = window[name];
      window[name] = function (section) {
        if (typeof prev === "function") prev(section);
        handler(section);
      };
    })("influnetOnInfluencerSectionChange", onSectionChange);

    (function chain(name, handler) {
      const prev = window[name];
      window[name] = function (section) {
        if (typeof prev === "function") prev(section);
        handler(section);
      };
    })("influnetOnBusinessSectionChange", onSectionChange);

    function wireNavPreempt() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav || nav.dataset.inflConnPreempt) return;
      nav.dataset.inflConnPreempt = "1";
      nav.addEventListener(
        "click",
        (e) => {
          const btn = e.target.closest(`[data-infl-connections-nav], button`);
          if (!btn || !nav.contains(btn)) return;
          if (btn.getAttribute("data-infl-connections-nav")) {
            mountShell();
            window.setTimeout(refresh, 0);
          } else if (!isConnectionsNavLabel(normalizeNavText(btn.textContent))) {
            teardown("nav-click");
          }
        },
        true
      );
    }

    wireNavPreempt();
    window.addEventListener("influnet-notification", (e) => {
      const t = e.detail?.type || "";
      if (t.startsWith("connection_") && isConnectionsSectionActive()) refresh();
    });
    window.addEventListener("influnet-collab-accepted", () => {
      if (isConnectionsSectionActive()) window.setTimeout(refresh, 800);
    });
  } catch (e) {
    console.warn("[influnet] connections-workspace:", e);
  }
})();
