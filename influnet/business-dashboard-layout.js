/**
 * Business dashboard home: Collaboration Overview sidebar + footer panels.
 */
(function () {
  try {
  const RECENT_KEY = "influnet_recent_profile_links";
  const HERO_MOUNT = "influnet-dashboard-hero-mount";
  const OVERVIEW_TOP_MOUNT = "influnet-dashboard-overview-top-mount";
  const PIPELINE_MOUNT = "influnet-dashboard-pipeline-row-mount";
  const FOOTER_MOUNT = "influnet-dashboard-footer-mount";

  const NEGOTIATION_STAGES = [
    "lead_received",
    "discussion_started",
    "requirements_finalized",
    "budget_confirmed",
    "agreement_approved",
  ];
  const ACTIVE_STAGES = [
    "content_creation",
    "content_review",
    "content_published",
    "payment_received",
  ];

  function getUser() {
    try {
      const raw = localStorage.getItem("influnet_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getActiveNavLabel() {
    const nav = document.querySelector(".flex.h-screen aside nav");
    if (!nav) return "Dashboard";
    const active = [...nav.querySelectorAll(":scope > button")].find(
      (b) =>
        b.classList.contains("bg-violet-100") ||
        /\bbg-violet-100\b/.test(b.className)
    );
    if (!active) return "Dashboard";
    return active.textContent.replace(/\d+/g, "").replace(/\+/g, "").trim();
  }

  function isDashboardHome() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (path !== "/dashboard" || getUser()?.role === "influencer") return false;
    if (document.getElementById("influnet-settings-mount")?.childElementCount) return false;
    if (window.influnetBizIsDefinitelyDashboard?.()) {
      const hero = document.getElementById(HERO_MOUNT);
      return !!(hero && hero.isConnected);
    }
    if (getActiveNavLabel() !== "Dashboard") return false;
    const hero = document.getElementById(HERO_MOUNT);
    if (!hero || !hero.isConnected) return false;
    return true;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function initials(name) {
    return (name || "?").trim().charAt(0).toUpperCase();
  }

  function timeAgo(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `Accessed ${mins} min${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Accessed ${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `Accessed ${days} day${days === 1 ? "" : "s"} ago`;
  }

  function getRecentLinks() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function recordProfileAccess(name, label) {
    if (!label) return;
    const list = getRecentLinks().filter((x) => x.label !== label);
    list.unshift({ name: name || "Creator", label, accessedAt: new Date().toISOString() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 12)));
  }

  function ensureOverviewMount() {
    const heroMount = document.getElementById(HERO_MOUNT);
    if (!heroMount) return null;

    document.getElementById("influnet-dashboard-overview-top-row")?.remove();

    let row = document.getElementById("influnet-dashboard-overview-row");
    if (!row) {
      row = document.createElement("div");
      row.id = "influnet-dashboard-overview-row";
      row.className = "influnet-dash-overview-section";
      row.innerHTML = `<div id="${OVERVIEW_TOP_MOUNT}"></div>`;
      heroMount.insertAdjacentElement("afterend", row);
    }
    return document.getElementById(OVERVIEW_TOP_MOUNT);
  }

  function ensureBottomRow() {
    const pipelineMount = document.getElementById(PIPELINE_MOUNT);
    const footer = document.getElementById(FOOTER_MOUNT);
    if (!pipelineMount || !footer) return null;

    let row = document.getElementById("influnet-dashboard-bottom-row");
    if (!row) {
      row = document.createElement("div");
      row.id = "influnet-dashboard-bottom-row";
      row.className = "influnet-dash-bottom-row";
      pipelineMount.parentNode.insertBefore(row, pipelineMount);
      row.appendChild(footer);
      row.appendChild(pipelineMount);
    }
    return row;
  }

  function navToSection(label) {
    const btn = [...document.querySelectorAll("aside nav button")].find(
      (b) => b.textContent.replace(/\d+/g, "").trim() === label
    );
    btn?.click();
  }

  async function fetchJson(url) {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async function loadDashboardData() {
    const [requests, conversations, projects] = await Promise.all([
      fetchJson("/api/collab-requests?direction=outgoing"),
      fetchJson("/api/conversations"),
      fetchJson("/api/projects"),
    ]);

    const accepted = requests.filter((r) => r.status === "accepted");
    const pending = requests.filter((r) => r.status === "pending");
    const activeConversations = conversations.filter(
      (c) => c.lastMessage || (c.unreadCount || 0) > 0
    );

    const negotiation = projects.filter(
      (p) =>
        NEGOTIATION_STAGES.includes(p.currentStage) &&
        p.status !== "completed" &&
        p.currentStage !== "project_completed"
    );
    const active = projects.filter(
      (p) => ACTIVE_STAGES.includes(p.currentStage) && p.status !== "completed"
    );
    const completed = projects.filter(
      (p) => p.currentStage === "project_completed" || p.status === "completed"
    );

    return {
      overview: {
        profilesViewed: getRecentLinks().length,
        requestsSent: requests.length,
        repliesReceived: accepted.length,
        activeDiscussions: activeConversations.length || conversations.length,
        ongoingCollaborations: active.length + negotiation.length,
      },
      pipeline: {
        requested: pending,
        discussing: accepted.filter(
          (r) => !projects.some((p) => p.counterpartyUserId === r.toUserId)
        ),
        negotiation,
        active,
        completed,
      },
    };
  }

  function iconEye() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
  function iconSend() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>`;
  }
  function iconChat() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>`;
  }
  function iconUsers() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  }
  function iconHandshake() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m11 17 2 2a1 1 0 0 0 1.4 0l2-2"/><path d="M14 14l1.5-1.5a2.1 2.1 0 0 1 3 0l1 1"/><path d="M9.5 12.5 8 11a2.1 2.1 0 0 0-3 0l-1 1"/></svg>`;
  }
  function iconCopy() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  }
  function iconChart() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 17V9"/><path d="M12 17V5"/><path d="M17 17v-7"/></svg>`;
  }

  function overviewRow(label, value, iconClass, iconSvg) {
    return `
      <div class="influnet-dash-overview-stat">
        <div class="influnet-dash-overview-left">
          <span class="influnet-dash-overview-icon ${iconClass}">${iconSvg}</span>
          <span class="influnet-dash-overview-label">${escapeHtml(label)}</span>
        </div>
        <span class="influnet-dash-overview-value">${escapeHtml(String(value))}</span>
      </div>`;
  }

  function renderSidebar(overview) {
    return `
      <div class="influnet-dash-card influnet-dash-overview-card">
        <div class="influnet-dash-card-head">
          <h3 class="influnet-dash-card-title">${iconChart()} Collaboration Overview</h3>
        </div>
        <div class="influnet-dash-overview-list">
          ${overviewRow("Profiles Viewed", overview.profilesViewed, "purple", iconEye())}
          ${overviewRow("Requests Sent", overview.requestsSent, "purple", iconSend())}
          ${overviewRow("Replies Received", overview.repliesReceived, "green", iconChat())}
          ${overviewRow("Active Discussions", overview.activeDiscussions, "pink", iconUsers())}
          ${overviewRow("Ongoing Collaborations", overview.ongoingCollaborations, "orange", iconHandshake())}
        </div>
        <div class="influnet-dash-card-foot">
          <button type="button" class="influnet-dash-link" data-nav="Requests">View all →</button>
        </div>
      </div>`;
  }

  function pipelinePerson(item, type) {
    if (type === "requested" || type === "discussing") return item?.toUser;
    return item?.counterparty ? { name: item.counterparty.name } : null;
  }

  function renderPipelineCol(key, label, items, type) {
    const person = items.length ? pipelinePerson(items[0], type) : null;
    const avatar = person
      ? `<div class="influnet-dash-pipeline-avatar" title="${escapeHtml(person.name)}">${escapeHtml(initials(person.name))}</div>`
      : `<div class="influnet-dash-pipeline-avatar is-empty" aria-hidden="true"></div>`;

    return `
      <div class="influnet-dash-pipeline-col ${key}">
        <div class="influnet-dash-pipeline-label">${escapeHtml(label)}</div>
        <div class="influnet-dash-pipeline-count">${items.length}</div>
        ${avatar}
        <button type="button" class="influnet-dash-pipeline-add" data-nav="Collaborations" aria-label="View collaborations">+</button>
      </div>`;
  }

  function renderRecentLinks(recentLinks) {
    const recentHtml = recentLinks.length
      ? `<div class="influnet-dash-recent-grid">${recentLinks
          .slice(0, 6)
          .map(
            (item) => `
        <div class="influnet-dash-recent-item">
          <span class="influnet-dash-recent-avatar">${escapeHtml(initials(item.name))}</span>
          <div class="influnet-dash-recent-meta">
            <div class="influnet-dash-recent-label">${escapeHtml(item.label)}</div>
            <div class="influnet-dash-recent-time">${escapeHtml(timeAgo(item.accessedAt))}</div>
          </div>
          <button type="button" class="influnet-dash-copy-btn" data-copy="${escapeHtml(item.label)}" aria-label="Copy link">${iconCopy()}</button>
        </div>`
          )
          .join("")}</div>`
      : `<p class="influnet-dash-empty">Profile links you open will appear here.</p>`;

    return `
      <div class="influnet-dash-card">
        <div class="influnet-dash-card-head">
          <h3 class="influnet-dash-card-title">Recent Accessed Links</h3>
          <button type="button" class="influnet-dash-link" data-nav="Saved Creators">View all →</button>
        </div>
        ${recentHtml}
      </div>`;
  }

  function renderPipeline(pipeline) {
    return `
      <div class="influnet-dash-card influnet-dash-pipeline-card">
        <div class="influnet-dash-card-head">
          <h3 class="influnet-dash-card-title">Collaboration Pipeline</h3>
          <button type="button" class="influnet-dash-link" data-nav="Collaborations">View all →</button>
        </div>
        <div class="influnet-dash-pipeline">
          ${renderPipelineCol("requested", "Requested", pipeline.requested, "requested")}
          ${renderPipelineCol("discussing", "Discussing", pipeline.discussing, "discussing")}
          ${renderPipelineCol("negotiation", "Negotiation", pipeline.negotiation, "negotiation")}
          ${renderPipelineCol("active", "Active", pipeline.active, "active")}
          ${renderPipelineCol("completed", "Completed", pipeline.completed, "completed")}
        </div>
        <div class="influnet-dash-pipeline-foot">
          <button type="button" data-nav="Collaborations">View Full Pipeline</button>
        </div>
      </div>`;
  }

  function wireClicks(root) {
    if (root.dataset.influnetWired === "1") return;
    root.dataset.influnetWired = "1";
    root.addEventListener("click", (e) => {
      const nav = e.target.closest("[data-nav]");
      if (nav) {
        e.preventDefault();
        navToSection(nav.getAttribute("data-nav"));
        return;
      }
      const copyBtn = e.target.closest("[data-copy]");
      if (copyBtn) {
        const text = copyBtn.getAttribute("data-copy");
        if (text && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
      }
      const profileBtn = e.target.closest("button");
      if (profileBtn?.textContent?.trim() === "View Profile") {
        const name = profileBtn.closest(".bg-white.rounded-2xl")?.querySelector(".font-bold.text-sm")?.textContent?.trim();
        if (name) {
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
          recordProfileAccess(name, `influnet/${slug || "creator"}`);
          refreshPanels();
        }
      }
    });
  }

  let applying = false;
  let enhanceTimer = null;
  let refreshTimer = null;
  let wiredRoot = null;

  async function refreshPanels(force) {
    if (!isDashboardHome() || applying) return;
    const overviewMount = ensureOverviewMount();
    ensureBottomRow();
    const pipelineMount = document.getElementById(PIPELINE_MOUNT);
    const footer = document.getElementById(FOOTER_MOUNT);
    if (!overviewMount || !pipelineMount || !footer) return;
    if (
      !force &&
      overviewMount.dataset.rendered === "1" &&
      pipelineMount.dataset.rendered === "1" &&
      footer.dataset.rendered === "1"
    ) {
      return;
    }

    applying = true;
    try {
      const data = await loadDashboardData();
      overviewMount.innerHTML = renderSidebar(data.overview);
      pipelineMount.innerHTML = renderPipeline(data.pipeline);
      pipelineMount.className = "influnet-dash-pipeline-col-mount";
      footer.innerHTML = renderRecentLinks(getRecentLinks());
      footer.className = "influnet-dash-recent-col-mount";
      overviewMount.dataset.rendered = "1";
      pipelineMount.dataset.rendered = "1";
      footer.dataset.rendered = "1";

      const root =
        overviewMount.closest(".flex-1.flex.flex-col") ||
        footer.closest(".p-6") ||
        document.body;
      if (wiredRoot !== root) {
        wiredRoot = root;
        wireClicks(root);
      }
    } finally {
      applying = false;
    }
  }

  function scheduleRefresh() {
    if (refreshTimer) return;
    refreshTimer = window.setInterval(() => {
      if (!isDashboardHome()) return;
      const overview = document.getElementById(OVERVIEW_TOP_MOUNT);
      const pipeline = document.getElementById(PIPELINE_MOUNT);
      const footer = document.getElementById(FOOTER_MOUNT);
      if (overview) delete overview.dataset.rendered;
      if (pipeline) delete pipeline.dataset.rendered;
      if (footer) delete footer.dataset.rendered;
      refreshPanels(true);
    }, 30000);
  }

  function enhance() {
    if (applying) return;
    if (!isDashboardHome()) {
      wiredRoot = null;
      document.getElementById("influnet-dashboard-overview-row")?.remove();
      document.getElementById("influnet-dashboard-overview-top-row")?.remove();
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      return;
    }
    refreshPanels(false);
    scheduleRefresh();
  }

  function scheduleEnhance() {
    if (enhanceTimer) return;
    enhanceTimer = window.setTimeout(() => {
      enhanceTimer = null;
      enhance();
    }, 120);
  }

  window.addEventListener("load", scheduleEnhance);
  document.addEventListener("DOMContentLoaded", scheduleEnhance);
  scheduleEnhance();
  window.setInterval(() => {
    if (window.location.pathname.replace(/\/$/, "") !== "/dashboard") return;
    if (getActiveNavLabel() !== "Dashboard") return;
    scheduleEnhance();
  }, 3000);
  } catch (err) {
    console.warn("[influnet] dashboard layout:", err);
  }
})();
