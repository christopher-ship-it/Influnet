/**
 * Business dashboard home — CRM layout (hero search stays in business-dashboard-header.js).
 */
(function () {
  try {
    const RUN_ID = `biz-layout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.__inflBizLayoutRunId = RUN_ID;
    function isLive() {
      return window.__inflBizLayoutRunId === RUN_ID;
    }
    const HERO_ID = "influnet-dashboard-hero";
    const CRM_ROOT_ID = "influnet-dash-crm-root";
    const HERO_MOUNT = "influnet-dashboard-hero-mount";
    const API = "/api/business/dashboard";

    const KEEP_MAIN_IDS = new Set([
      "influnet-dashboard-greeting-mount",
      HERO_MOUNT,
      CRM_ROOT_ID,
    ]);

    const LEGACY_HIDE_IDS = new Set([
      "influnet-dashboard-pipeline-row-mount",
      "influnet-dashboard-footer-mount",
      "influnet-dashboard-overview-top-mount",
    ]);

    let lastRenderKey = "";
    let cachedDashboardData = null;
    let loading = false;
    let refreshing = false;
    let wiredRoot = null;
    let refreshTimer = null;
    let revalidateTimer = null;

    function dashLog(...args) {
      console.log("[influnet/dashboard]", ...args);
    }

    function getUser() {
      try {
        const raw = localStorage.getItem("influnet_user");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function normalizeNavText(text) {
      return String(text || "")
        .replace(/\d+/g, "")
        .replace(/\+/g, "")
        .trim();
    }

    function getActiveNavLabel() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return "Dashboard";
      const active = [...nav.querySelectorAll(":scope > button")].find(
        (b) =>
          b.classList.contains("bg-violet-100") ||
          /\bbg-violet-100\b/.test(b.className)
      );
      return active ? normalizeNavText(active.textContent) : "Dashboard";
    }

    function isDashboardHome() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      const user = getUser();
      if (path !== "/dashboard" || user?.role === "influencer") return false;
      if (document.getElementById("influnet-settings-mount")?.childElementCount) return false;
      if (window.influnetBizIsDefinitelyDashboard?.()) return true;
      return getActiveNavLabel() === "Dashboard";
    }

    function getMainEl() {
      return (
        document.querySelector(".flex.h-screen main.flex-1") ||
        document.querySelector("main.flex-1")
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
      if (!iso) return "";
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }

    function creatorPath(slug) {
      if (!slug) return null;
      return `/influnet/${encodeURIComponent(slug)}`;
    }

    function navToSection(label) {
      const target = normalizeNavText(label).toLowerCase();
      const btn = [...document.querySelectorAll("aside nav button")].find((b) => {
        const t = normalizeNavText(b.textContent).toLowerCase();
        return t === target || (target === "projects" && t === "collaborations");
      });
      btn?.click();
    }

    function focusHeroSearch() {
      const input =
        document.querySelector("#influnet-dashboard-hero input[type='search']") ||
        document.querySelector("#influnet-dashboard-hero input") ||
        document.querySelector(".influnet-dash-hero-search input");
      input?.focus();
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function restoreLegacyPanels() {
      const main = getMainEl();
      main?.querySelectorAll("[data-infl-biz-hidden]").forEach((el) => {
        el.removeAttribute("data-infl-biz-hidden");
        el.style.removeProperty("display");
        el.style.removeProperty("visibility");
      });
      const shell = main?.querySelector(".p-6.space-y-6");
      if (shell) {
        shell.removeAttribute("data-infl-biz-hidden");
        shell.style.removeProperty("display");
        shell.style.removeProperty("visibility");
      }
      document.getElementById(CRM_ROOT_ID)?.remove();
      lastRenderKey = "";
      cachedDashboardData = null;
    }

    /** Hide only legacy React mount points — never the p-6 wrapper that contains hero + CRM. */
    function hideLegacyPanels() {
      const main = getMainEl();
      if (!main) return;

      revealDashboardShell();

      LEGACY_HIDE_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.setAttribute("data-infl-biz-hidden", "1");
        el.style.setProperty("display", "none", "important");
      });

      document.getElementById("influnet-dashboard-overview-row")?.remove();
      document.getElementById("influnet-dashboard-overview-top-row")?.remove();
      document.getElementById("influnet-dashboard-bottom-row")?.remove();
    }

    function revealDashboardShell() {
      const main = getMainEl();
      if (!main) return;
      const shell =
        main.querySelector(".p-6.space-y-6") ||
        main.querySelector(":scope > div");
      if (!shell) return;
      shell.removeAttribute("data-infl-biz-hidden");
      shell.style.removeProperty("display");
      shell.style.removeProperty("visibility");
      shell.classList.add("infl-bdash-shell-visible");
    }

    function ensureCrmMount() {
      const main = getMainEl();
      if (!main) return null;

      revealDashboardShell();

      let root = document.getElementById(CRM_ROOT_ID);
      if (!root) {
        root = document.createElement("div");
        root.id = CRM_ROOT_ID;
      }

      const hero = document.getElementById(HERO_MOUNT);
      if (hero?.parentNode) {
        if (root.parentNode !== hero.parentNode) {
          hero.insertAdjacentElement("afterend", root);
        }
      } else {
        const shell = main.querySelector(".p-6.space-y-6") || main;
        if (!shell.contains(root)) shell.appendChild(root);
      }
      return root;
    }

    function renderSkeleton() {
      return `
        <div class="infl-bdash infl-bdash-bento infl-bdash-skeleton" data-infl-biz-dashboard aria-busy="true">
          <div class="infl-bdash-sk-block infl-bdash-sk-hero"></div>
          <div class="infl-bdash-master-grid">
            <div class="infl-bdash-sk-block infl-bdash-sk-brand"></div>
            <div class="infl-bdash-sk-block infl-bdash-sk-panel"></div>
            <div class="infl-bdash-sk-block infl-bdash-sk-chart"></div>
            <div class="infl-bdash-sk-block infl-bdash-sk-bottom"></div>
          </div>
        </div>`;
    }

    function renderErrorState(message) {
      return `
        <div class="infl-bdash infl-bdash-error-state" data-infl-biz-dashboard>
          <div class="infl-bdash-error-icon" aria-hidden="true">⚠</div>
          <h3>Unable to load dashboard</h3>
          <p>${escapeHtml(message || "We couldn't load your dashboard data.")}</p>
          <button type="button" class="infl-bdash-btn infl-bdash-btn-primary" data-retry>Retry</button>
        </div>`;
    }

    function iconEye() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
    function iconSend() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7Z"/></svg>`;
    }
    function iconCheck() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
    }
    function iconChat() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>`;
    }
    function iconBriefcase() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`;
    }
    function iconStar() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 2 3.1 6.3L22 9.3l-5 4.9 1.2 6.9L12 17.8 5.8 21.1 7 14.2 2 9.3l6.9-1 3.1-6.3Z"/></svg>`;
    }
    function iconUsers() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`;
    }
    function iconPin() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
    }
    function iconLink() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    }
    function iconPencil() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
    }
    function iconChart() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 17V9"/><path d="M12 17V5"/><path d="M17 17v-7"/></svg>`;
    }
    function iconExternal() {
      return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6"/></svg>`;
    }
    function iconDownload() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`;
    }
    function iconArrowUpRight() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`;
    }
    function iconDots() {
      return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`;
    }
    function iconCamera() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h3l1.3-2h7.4L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></svg>`;
    }

    function getFirstName(profile) {
      const user = getUser();
      const name = user?.name?.trim() || profile?.companyName || "there";
      return name.split(/\s+/)[0];
    }
    function getBusinessLogo(profile) {
      const user = getUser();
      return profile?.logoUrl || user?.logoUrl || user?.avatarUrl || "";
    }

    function formatMoney(amount) {
      const n = Number(amount) || 0;
      if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
      if (n >= 1_000) return `₹${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
      return `₹${Math.round(n).toLocaleString("en-IN")}`;
    }

    function formatCount(n) {
      const num = Number(n) || 0;
      if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
      if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
      return String(num);
    }

    function distributeAcrossMonths(total, months) {
      const n = Math.max(0, Number(total) || 0);
      const len = months;
      if (n === 0) return Array(len).fill(0);
      const weights = Array.from({ length: len }, (_, i) => 0.55 + (i / (len - 1 || 1)) * 0.9);
      const sum = weights.reduce((a, b) => a + b, 0);
      const raw = weights.map((w) => (w / sum) * n);
      const rounded = raw.map((v) => Math.round(v));
      const diff = n - rounded.reduce((a, b) => a + b, 0);
      if (diff !== 0) rounded[len - 1] += diff;
      return rounded;
    }

    function portalHeroSearch(root) {
      const slot = root?.querySelector(".infl-bdash-search-slot");
      if (!slot) return;

      document.querySelectorAll(`[id="${HERO_ID}"]`).forEach((el, idx) => {
        if (idx > 0) el.remove();
      });

      const hero = document.getElementById(HERO_ID);
      if (!hero) return;
      if (hero.parentNode !== slot) slot.appendChild(hero);
    }

    function renderStatusPills(profile) {
      const showVerify =
        profile.approvalStatus !== "approved" && profile.approvalStatus !== "rejected";

      return `
        <div class="infl-bdash-status-pills" role="list">
          ${
            showVerify
              ? `<span class="infl-bdash-status-pill infl-bdash-status-pill--warn" role="listitem">Verification · pending review</span>`
              : `<span class="infl-bdash-status-pill infl-bdash-status-pill--pink" role="listitem">Account · active</span>`
          }
        </div>`;
    }

    function renderHeaderMetrics(stats) {
      return `
        <div class="infl-bdash-header-metrics" aria-label="Quick stats">
          <div class="infl-bdash-header-metric-chip" tabindex="0" role="group" aria-label="${formatCount(stats.savedCreators ?? 0)} saved creators">
            <span class="infl-bdash-header-metric-value">${formatCount(stats.savedCreators ?? 0)}</span>
            <span class="infl-bdash-header-metric-label">${iconStar()} Saved</span>
          </div>
          <div class="infl-bdash-header-metric-chip" tabindex="0" role="group" aria-label="${formatCount(stats.requestsSent ?? 0)} requests sent">
            <span class="infl-bdash-header-metric-value">${formatCount(stats.requestsSent ?? 0)}</span>
            <span class="infl-bdash-header-metric-label">${iconSend()} Requests</span>
          </div>
          <div class="infl-bdash-header-metric-chip" tabindex="0" role="group" aria-label="${formatCount(stats.activeProjects ?? 0)} active projects">
            <span class="infl-bdash-header-metric-value">${formatCount(stats.activeProjects ?? 0)}</span>
            <span class="infl-bdash-header-metric-label">${iconBriefcase()} Projects</span>
          </div>
        </div>`;
    }

    function renderMetricTile(label, value, sub, subTone, variant) {
      return `
        <article class="infl-bdash-tile infl-bdash-tile--${variant || "light"}">
          <div class="infl-bdash-tile-value">${escapeHtml(String(value))}</div>
          ${sub ? `<div class="infl-bdash-tile-sub infl-bdash-tile-sub--${subTone || "neutral"}">${escapeHtml(sub)}</div>` : ""}
          <div class="infl-bdash-tile-label">${escapeHtml(label)}</div>
        </article>`;
    }

    function renderSpendGauge(stats, insights) {
      const spend = Number(stats.projectSpend) || 0;
      const sent = Number(stats.requestsSent) || 0;
      const accepted = Number(stats.requestsAccepted) || 0;
      const rate = sent > 0 ? Math.round((accepted / sent) * 100) : insights?.acceptanceRate || 0;
      const pct = Math.min(100, Math.max(0, rate));
      const arcLen = 126;
      const offset = arcLen - (arcLen * pct) / 100;
      return `
        <article class="infl-bdash-tile infl-bdash-tile--dark infl-bdash-tile--gauge">
          <div class="infl-bdash-gauge-wrap" aria-hidden="true">
            <svg viewBox="0 0 120 70" class="infl-bdash-gauge-svg">
              <defs>
                <linearGradient id="infl-bdash-gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#ee3e96"/>
                  <stop offset="100%" stop-color="#f26e59"/>
                </linearGradient>
              </defs>
              <path class="infl-bdash-gauge-track" d="M12 58 A48 48 0 0 1 108 58" fill="none" stroke-width="10" stroke-linecap="round"/>
              <path class="infl-bdash-gauge-fill" d="M12 58 A48 48 0 0 1 108 58" fill="none" stroke-width="10" stroke-linecap="round"
                stroke="url(#infl-bdash-gauge-grad)"
                stroke-dasharray="${arcLen}" stroke-dashoffset="${offset.toFixed(1)}"/>
            </svg>
          </div>
          <div class="infl-bdash-tile-value infl-bdash-tile-value--accent">${formatMoney(spend)}</div>
          <div class="infl-bdash-tile-sub infl-bdash-tile-sub--muted">${rate}% acceptance · campaign spend</div>
          <div class="infl-bdash-tile-label">Total Spend</div>
        </article>`;
    }

    function renderCategoryBars(insights) {
      const cats = (insights?.topCategories || []).filter(Boolean).slice(0, 3);
      const patterns = ["pink", "coral", "dots"];
      if (!cats.length) {
        return `
          <article class="infl-bdash-tile infl-bdash-tile--chart infl-bdash-tile--categories">
            <div class="infl-bdash-tile-label infl-bdash-tile-label--top">Top categories</div>
            <p class="infl-bdash-tile-empty">Add preferences in Settings</p>
          </article>`;
      }
      const total = cats.length;
      const rows = cats
        .map((cat, i) => {
          const pct = Math.max(12, Math.round(((total - i) / (total * (total + 1) / 2)) * 100));
          return `
            <div class="infl-bdash-bar-row">
              <span class="infl-bdash-bar-label">${escapeHtml(cat)}</span>
              <div class="infl-bdash-bar-track">
                <div class="infl-bdash-bar-fill infl-bdash-bar-fill--${patterns[i % patterns.length]}" style="width:${pct}%"></div>
              </div>
              <span class="infl-bdash-bar-pct">${pct}%</span>
            </div>`;
        })
        .join("");
      return `
        <article class="infl-bdash-tile infl-bdash-tile--chart infl-bdash-tile--categories">
          <div class="infl-bdash-tile-label infl-bdash-tile-label--top">Top 3 categories</div>
          <div class="infl-bdash-bar-stack">${rows}</div>
        </article>`;
    }

    function renderPipelineBreakdown(pipeline) {
      const stages = [
        { key: "viewed", label: "Viewed", pattern: "dots" },
        { key: "contacted", label: "Contacted", pattern: "solid-dark" },
        { key: "discussing", label: "Discussing", pattern: "diagonal" },
        { key: "negotiation", label: "Negotiation", pattern: "stripes" },
        { key: "active", label: "Active", pattern: "pink" },
        { key: "completed", label: "Completed", pattern: "solid" },
      ];
      const max = Math.max(1, ...stages.map((s) => Number(pipeline[s.key]) || 0));
      const bars = stages
        .map((s) => {
          const count = Number(pipeline[s.key]) || 0;
          const pct = Math.max(8, Math.round((count / max) * 100));
          return `
            <div class="infl-bdash-vbar">
              <div class="infl-bdash-vbar-fill infl-bdash-bar-fill--${s.pattern}" style="height:${pct}%"></div>
              <span class="infl-bdash-vbar-count">${count}</span>
              <span class="infl-bdash-vbar-label">${escapeHtml(s.label)}</span>
            </div>`;
        })
        .join("");
      return `
        <article class="infl-bdash-tile infl-bdash-tile--chart infl-bdash-tile--pipeline">
          <div class="infl-bdash-tile-label infl-bdash-tile-label--top">Collaboration pipeline</div>
          <div class="infl-bdash-vbar-chart">${bars}</div>
        </article>`;
    }

    function renderAnalyzingGrid(stats, pipeline, insights) {
      const sent = Number(stats.requestsSent) || 0;
      const accepted = Number(stats.requestsAccepted) || 0;
      const discussions = Number(stats.activeDiscussions) || 0;
      const rate = insights?.acceptanceRate ?? (sent > 0 ? Math.round((accepted / sent) * 100) : 0);
      const views = Number(stats.profileViews) || 0;

      return `
        <section class="infl-bdash-bento-panel infl-bdash-analyzing">
          <div class="infl-bdash-panel-head">
            <h2>Campaign analyzing</h2>
            <div class="infl-bdash-panel-tools">
              <span class="infl-bdash-panel-pill">This week</span>
              <button type="button" class="infl-bdash-icon-btn" aria-label="More options">${iconDots()}</button>
            </div>
          </div>
          <div class="infl-bdash-analyzing-grid">
            ${renderMetricTile("Total spend", formatMoney(stats.projectSpend), `${accepted} completed campaigns`, "up", "light")}
            ${renderMetricTile("Requests sent", formatCount(sent), `${rate}% acceptance rate`, rate >= 50 ? "up" : "down", "light")}
            ${renderMetricTile("Requests accepted", formatCount(accepted), `${discussions} active discussions`, "up", "light")}
            ${renderSpendGauge(stats, insights)}
            ${renderCategoryBars(insights)}
            ${renderPipelineBreakdown(pipeline)}
            ${renderMetricTile("Profile views", formatCount(views), `${formatCount(stats.savedCreators ?? 0)} saved creators`, "neutral", "light")}
            ${renderMetricTile("Active projects", formatCount(stats.activeProjects ?? 0), `${formatCount(stats.pendingApprovals ?? 0)} pending approvals`, "neutral", "light")}
          </div>
        </section>`;
    }

    function renderSummaryChart(stats, pipeline) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const collabTotal =
        (Number(stats.requestsSent) || 0) +
        (Number(stats.activeProjects) || 0) +
        (Number(stats.completedProjects) || 0);
      const reachTotal = Number(stats.profileViews) || Number(pipeline.viewed) || 0;
      const sales = distributeAcrossMonths(collabTotal, 12);
      const insight = distributeAcrossMonths(reachTotal, 12);
      const max = Math.max(...sales, ...insight, 1);
      const w = 640;
      const h = 200;
      const padX = 28;
      const padY = 24;
      const innerW = w - padX * 2;
      const innerH = h - padY * 2;
      const step = innerW / (months.length - 1);

      const toCoords = (series) =>
        series.map((v, i) => ({
          x: padX + step * i,
          y: padY + innerH - (v / max) * innerH,
          v,
        }));

      const salesPts = toCoords(sales);
      const insightPts = toCoords(insight);
      const line = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
      const area = (pts) =>
        `${line(pts)} L${pts[pts.length - 1].x.toFixed(1)} ${(padY + innerH).toFixed(1)} L${pts[0].x.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;
      const peakIdx = salesPts.reduce((best, p, i) => (p.v > salesPts[best].v ? i : best), 0);
      const peak2 = insightPts.reduce((best, p, i) => (p.v > insightPts[best].v ? i : best), 0);

      return `
        <section class="infl-bdash-bento-panel infl-bdash-summary">
          <div class="infl-bdash-panel-head">
            <div>
              <h2>Collaboration summary</h2>
              <p class="infl-bdash-panel-sub">Creator reach & active campaigns over time</p>
            </div>
            <div class="infl-bdash-panel-tools">
              <span class="infl-bdash-panel-pill">This year</span>
              <button type="button" class="infl-bdash-icon-btn" aria-label="More options">${iconDots()}</button>
            </div>
          </div>
          <div class="infl-bdash-chart-legend">
            <span><i class="infl-bdash-legend-line infl-bdash-legend-line--pink"></i> Projects</span>
            <span><i class="infl-bdash-legend-line infl-bdash-legend-line--dash"></i> Creator reach</span>
          </div>
          <div class="infl-bdash-chart-body">
            <svg class="infl-bdash-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="infl-bdash-pink-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ee3e96" stop-opacity="0.35"/>
                  <stop offset="100%" stop-color="#ee3e96" stop-opacity="0.03"/>
                </linearGradient>
              </defs>
              <path d="${area(salesPts)}" fill="url(#infl-bdash-pink-grad)"/>
              <path d="${line(salesPts)}" fill="none" class="infl-bdash-chart-line infl-bdash-chart-line--pink"/>
              <path d="${line(insightPts)}" fill="none" class="infl-bdash-chart-line infl-bdash-chart-line--dash"/>
              <g class="infl-bdash-chart-tip" transform="translate(${salesPts[peakIdx].x - 36} ${salesPts[peakIdx].y - 28})">
                <rect width="72" height="22" rx="6" class="infl-bdash-tip-bg"/>
                <text x="36" y="15" text-anchor="middle" class="infl-bdash-tip-text">${formatCount(salesPts[peakIdx].v)}</text>
              </g>
              <g class="infl-bdash-chart-tip infl-bdash-chart-tip--dark" transform="translate(${insightPts[peak2].x - 36} ${insightPts[peak2].y + 8})">
                <rect width="72" height="22" rx="6" class="infl-bdash-tip-bg"/>
                <text x="36" y="15" text-anchor="middle" class="infl-bdash-tip-text">${formatCount(insightPts[peak2].v)}</text>
              </g>
            </svg>
            <div class="infl-bdash-chart-months">
              ${months.map((m) => `<span>${m}</span>`).join("")}
            </div>
          </div>
        </section>`;
    }

    function renderBrandBentoCard(profile, stats) {
      const name = profile.companyName || "Your Brand";
      const tagline = profile.tagline || "Partner with creators that match your niche.";
      const logoUrl = getBusinessLogo(profile);
      const handle = profile.businessUsername ? `@${profile.businessUsername}` : "@brand";
      const websiteText = profile.website ? profile.website.replace(/^https?:\/\//i, "") : "";
      const websiteHref = profile.website
        ? (profile.website.match(/^https?:\/\//i) ? profile.website : `https://${profile.website}`)
        : "";
      return `
        <article class="infl-bdash-brand-bento" aria-label="Brand profile">
          <button type="button" class="infl-bdash-brand-bento-action" data-action="discover" aria-label="Find creators">${iconArrowUpRight()}</button>
          <div class="infl-bdash-brand-bento-visual">
            <button type="button" class="infl-bdash-brand-logo-frame" data-action="logo-upload-open" aria-label="Upload business logo">
              ${
                logoUrl
                  ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name)} logo" class="infl-bdash-brand-logo-img" />`
                  : `<span class="infl-bdash-brand-logo-fallback">${escapeHtml(initials(name).charAt(0) || "B")}</span>`
              }
              <span class="infl-bdash-brand-logo-overlay">${iconCamera()} Upload logo</span>
            </button>
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" class="infl-bdash-profile-logo-input" data-logo-input hidden />
          <div class="infl-bdash-brand-bento-body">
            <h2 class="infl-bdash-brand-name">${escapeHtml(name)}</h2>
            <p class="infl-bdash-brand-tagline">${escapeHtml(tagline)}</p>
            <div class="infl-bdash-profile-pills">
              ${profile.industry ? `<span class="infl-bdash-pill">${escapeHtml(profile.industry)}</span>` : ""}
            </div>
            <div class="infl-bdash-brand-meta">
              ${profile.location ? `<span>${iconPin()} ${escapeHtml(profile.location)}</span>` : ""}
              ${websiteHref ? `<a href="${escapeHtml(websiteHref)}" target="_blank" rel="noopener noreferrer">${iconLink()} ${escapeHtml(websiteText)}</a>` : ""}
              <span>${iconUsers()} ${escapeHtml(handle)}</span>
            </div>
            <button type="button" class="infl-bdash-brand-cta" data-action="discover">Analyze creators &amp; compare reach, niche, and brand fit.</button>
          </div>
        </article>`;
    }

    function renderFindCreatorsWidget(profile) {
      return renderBrandBentoCard(profile, {});
    }

    function activityIcon(badgeClass) {
      if (badgeClass === "accepted" || badgeClass === "ongoing") return iconBriefcase();
      if (badgeClass === "completed") return iconCheck();
      return iconSend();
    }

    function renderActivityTimeline(items) {
      if (!items?.length) {
        return `<p class="infl-bdash-empty">Your collaboration activity will show up here as you connect with creators.</p>`;
      }
      const monthGrowth =
        items.length >= 3 ? `+${Math.min(99, items.length * 3)}% this month` : "Live updates";
      return `
        <section class="infl-bdash-bento-card infl-bdash-activity-card">
          <div class="infl-bdash-bento-card-head">
            <div>
              <h3>Recent activity</h3>
              <span class="infl-bdash-growth-badge">${escapeHtml(monthGrowth)}</span>
            </div>
            <button type="button" class="infl-bdash-icon-btn infl-bdash-icon-btn--light" data-nav="Requests" aria-label="View all activity">${iconArrowUpRight()}</button>
          </div>
          <div class="infl-bdash-timeline">
            ${items
              .slice(0, 6)
              .map(
                (a) => `
              <article class="infl-bdash-timeline-item">
                <span class="infl-bdash-timeline-icon infl-bdash-timeline-icon--${escapeHtml(a.badgeClass || "pending")}">${activityIcon(a.badgeClass)}</span>
                <div class="infl-bdash-timeline-copy">
                  <strong>${escapeHtml(a.title)}</strong>
                  <span>${escapeHtml(a.subtitle)} · ${escapeHtml(timeAgo(a.createdAt))}</span>
                </div>
                <span class="infl-bdash-badge infl-bdash-badge--${escapeHtml(a.badgeClass || "pending")}">${escapeHtml(a.badge)}</span>
              </article>`
              )
              .join("")}
          </div>
        </section>`;
    }

    function renderAudienceStatCards(profile, stats) {
      const budget = profile.marketingBudget || "Set budget in Settings";
      const spend = formatMoney(stats.projectSpend);
      const categories = (profile.collabPreferences || []).slice(0, 2).join(" · ") || profile.industry || "All niches";
      return `
        <div class="infl-bdash-stat-stack">
          <article class="infl-bdash-stat-card infl-bdash-stat-card--volt">
            <div class="infl-bdash-stat-pattern" aria-hidden="true"></div>
            <span class="infl-bdash-stat-label">Marketing budget</span>
            <strong class="infl-bdash-stat-value">${escapeHtml(budget)}</strong>
            <span class="infl-bdash-stat-meta">${escapeHtml(categories)}</span>
          </article>
          <article class="infl-bdash-stat-card infl-bdash-stat-card--dark">
            <div class="infl-bdash-stat-pattern infl-bdash-stat-pattern--volt" aria-hidden="true"></div>
            <span class="infl-bdash-stat-label">Campaign spend</span>
            <strong class="infl-bdash-stat-value">${escapeHtml(spend)}</strong>
            <span class="infl-bdash-stat-meta">${formatCount(stats.completedProjects ?? 0)} completed · ${formatCount(stats.activeProjects ?? 0)} active</span>
          </article>
          <button type="button" class="infl-bdash-stat-nav" data-action="edit-profile" aria-label="Update audience preferences">${iconArrowUpRight()}</button>
        </div>`;
    }

    function renderTags(items, emptyLabel) {
      const list = (items || []).filter(Boolean);
      if (!list.length) {
        return `<span class="infl-bdash-tag infl-bdash-tag--muted">${escapeHtml(emptyLabel)}</span>`;
      }
      return list
        .slice(0, 6)
        .map((t) => `<span class="infl-bdash-tag">${escapeHtml(t)}</span>`)
        .join("");
    }

    function renderKpiCard(label, value, iconClass, iconSvg) {
      return `
        <article class="infl-bdash-kpi">
          <span class="infl-bdash-kpi-icon ${iconClass}">${iconSvg}</span>
          <div class="infl-bdash-kpi-value">${escapeHtml(String(value))}</div>
          <div class="infl-bdash-kpi-label">${escapeHtml(label)}</div>
        </article>`;
    }

    function renderProfileSummary(profile) {
      const name = profile.companyName || "Your Brand";
      const website = profile.website
        ? profile.website.replace(/^https?:\/\//i, "")
        : "";
      const websiteHref = profile.website
        ? profile.website.match(/^https?:\/\//i)
          ? profile.website
          : `https://${profile.website}`
        : "";

    const publicPath = profile.businessUsername
      ? `/influnet/${encodeURIComponent(String(profile.businessUsername).toLowerCase())}`
      : profile.profileUrl
        ? profile.profileUrl.replace(/^https?:\/\/[^/]+/i, "")
        : "";

      return `
        <section class="infl-bdash-profile" aria-label="Business profile summary">
          <div class="infl-bdash-profile-accent"></div>
          <div class="infl-bdash-profile-body">
            <div class="infl-bdash-profile-left">
              <div class="infl-bdash-profile-avatar-wrap">
                <div class="infl-bdash-profile-avatar">${escapeHtml(initials(name))}</div>
                ${profile.isVerified ? '<span class="infl-bdash-profile-verified" title="Verified">✓</span>' : ""}
              </div>
              <div class="infl-bdash-profile-info">
                <h2 class="infl-bdash-profile-name">${escapeHtml(name)}</h2>
                <p class="infl-bdash-profile-tagline">${escapeHtml(profile.tagline || "")}</p>
                <div class="infl-bdash-profile-meta">
                  ${profile.industry ? `<span class="infl-bdash-pill">${escapeHtml(profile.industry)}</span>` : ""}
                  ${
                    profile.phoneVerified
                      ? '<span class="infl-bdash-verified-mobile">✓ Verified Mobile</span>'
                      : ""
                  }
                  ${profile.location ? `<span class="infl-bdash-meta-item">${iconPin()} ${escapeHtml(profile.location)}</span>` : ""}
                  ${website ? `<a class="infl-bdash-meta-item infl-bdash-meta-link" href="${escapeHtml(websiteHref)}" target="_blank" rel="noopener noreferrer">${iconLink()} ${escapeHtml(website)}</a>` : ""}
                  ${publicPath ? `<span class="infl-bdash-meta-item">@${escapeHtml(profile.businessUsername || "")}</span>` : ""}
                </div>
              </div>
            </div>
            <div class="infl-bdash-profile-actions">
              <button type="button" class="infl-bdash-btn infl-bdash-btn-view" data-action="view-public"${publicPath ? ` data-public-path="${escapeHtml(publicPath)}"` : ""}>${iconExternal()} View Public Profile</button>
              <button type="button" class="infl-bdash-btn infl-bdash-btn-outline" data-action="edit-profile">${iconPencil()} Edit Profile</button>
              <button type="button" class="infl-bdash-btn infl-bdash-btn-primary" data-action="discover">${iconSend()} Find Creators</button>
            </div>
          </div>
        </section>`;
    }

    function renderPipeline(pipeline) {
      const stages = [
        { key: "viewed", label: "Viewed" },
        { key: "contacted", label: "Contacted" },
        { key: "discussing", label: "Discussing" },
        { key: "negotiation", label: "Negotiation" },
        { key: "active", label: "Active" },
        { key: "completed", label: "Completed" },
      ];
      const max = Math.max(1, ...stages.map((s) => Number(pipeline[s.key]) || 0));

      return `
        <section class="infl-bdash-card infl-bdash-pipeline-card">
          <div class="infl-bdash-card-head">
            <h3>Collaboration Pipeline</h3>
            <button type="button" class="infl-bdash-link" data-nav="Projects">View pipeline →</button>
          </div>
          <div class="infl-bdash-pipeline">
            ${stages
              .map((s, i) => {
                const count = Number(pipeline[s.key]) || 0;
                const pct = Math.round((count / max) * 100);
                return `
              <div class="infl-bdash-pipeline-stage ${s.key}" style="--stage-fill:${pct}%">
                <div class="infl-bdash-pipeline-count">${count}</div>
                <div class="infl-bdash-pipeline-label">${escapeHtml(s.label)}</div>
                ${i < stages.length - 1 ? '<span class="infl-bdash-pipeline-arrow" aria-hidden="true">→</span>' : ""}
              </div>`;
              })
              .join("")}
          </div>
        </section>`;
    }

    function renderActivity(items) {
      if (!items?.length) {
        return `<p class="infl-bdash-empty">Your collaboration activity will show up here as you connect with creators.</p>`;
      }
      return `<div class="infl-bdash-activity-list">${items
        .map(
          (a) => `
        <article class="infl-bdash-activity-row">
          <div class="infl-bdash-activity-main">
            <strong>${escapeHtml(a.title)}</strong>
            <span>${escapeHtml(a.subtitle)} · ${escapeHtml(timeAgo(a.createdAt))}</span>
          </div>
          <span class="infl-bdash-badge infl-bdash-badge--${escapeHtml(a.badgeClass || "pending")}">${escapeHtml(a.badge)}</span>
        </article>`
        )
        .join("")}</div>`;
    }

    function renderSavedCreators(creators) {
      if (!creators?.length) {
        return `<p class="infl-bdash-empty">Save creators from Discover to build your shortlist.</p>`;
      }
      return `<div class="infl-bdash-creator-grid">${creators
        .map((c) => {
          const path = creatorPath(c.profileSlug || c.username);
          const handle = c.username ? `@${c.username}` : c.name;
          return `
        <article class="infl-bdash-creator-card">
          <div class="infl-bdash-creator-avatar">${escapeHtml(initials(c.name))}</div>
          <div class="infl-bdash-creator-meta">
            <strong>${escapeHtml(c.name)}</strong>
            <span>${escapeHtml(handle)}${c.niche ? ` · ${escapeHtml(c.niche)}` : ""}</span>
          </div>
          ${
            path
              ? `<a class="infl-bdash-creator-link" href="${escapeHtml(path)}" data-creator-slug="${escapeHtml(c.profileSlug || c.username || "")}">View</a>`
              : ""
          }
        </article>`;
        })
        .join("")}</div>`;
    }

    function renderRecentViews(views) {
      if (!views?.length) {
        return `<p class="infl-bdash-empty">Creators you view will appear here for quick follow-up.</p>`;
      }
      return `<div class="infl-bdash-views-list">${views
        .map((v) => {
          const path = creatorPath(v.profileSlug || v.username);
          const handle = v.username ? `@${v.username}` : v.name;
          return `
        <article class="infl-bdash-view-row">
          <div class="infl-bdash-creator-avatar">${escapeHtml(initials(v.name))}</div>
          <div class="infl-bdash-creator-meta">
            <strong>${escapeHtml(v.name)}</strong>
            <span>${escapeHtml(handle)}${v.niche ? ` · ${escapeHtml(v.niche)}` : ""} · ${escapeHtml(timeAgo(v.viewedAt))}</span>
          </div>
          ${path ? `<a class="infl-bdash-creator-link" href="${escapeHtml(path)}">Open</a>` : ""}
        </article>`;
        })
        .join("")}</div>`;
    }

    function renderPreferences(profile) {
      const budget = profile.marketingBudget || "Set your budget range";
      const categories = profile.collabPreferences || [];
      const locations = profile.location ? [profile.location] : [];

      return `
        <section class="infl-bdash-card infl-bdash-prefs-card">
          <div class="infl-bdash-card-head">
            <h3>${iconUsers()} Who we work with</h3>
          </div>
          <div class="infl-bdash-prefs-block">
            <div class="infl-bdash-prefs-label">Audience &amp; budget</div>
            <div class="infl-bdash-prefs-value">${escapeHtml(budget)}</div>
          </div>
          <div class="infl-bdash-prefs-block">
            <div class="infl-bdash-prefs-label">Preferred categories</div>
            <div class="infl-bdash-tags">${renderTags(categories, "Add preferences in Settings")}</div>
          </div>
          <div class="infl-bdash-prefs-block">
            <div class="infl-bdash-prefs-label">Location focus</div>
            <div class="infl-bdash-tags">${renderTags(locations, "Add location in Settings")}</div>
          </div>
          <button type="button" class="infl-bdash-link infl-bdash-prefs-edit" data-action="edit-profile">Update preferences →</button>
        </section>`;
    }

    function renderInsights(insights, stats) {
      return `
        <section class="infl-bdash-card infl-bdash-insights-card">
          <div class="infl-bdash-card-head">
            <h3>${iconChart()} Performance Insights</h3>
          </div>
          <div class="infl-bdash-insight-rows">
            <div class="infl-bdash-insight-row">
              <span>Request acceptance rate</span>
              <strong>${escapeHtml(String(insights.acceptanceRate || 0))}%</strong>
            </div>
            <div class="infl-bdash-insight-row">
              <span>Response time</span>
              <strong>${escapeHtml(insights.responseLabel || "—")}</strong>
            </div>
            <div class="infl-bdash-insight-row">
              <span>Active pipeline</span>
              <strong>${escapeHtml(String((stats.activeProjects || 0) + (stats.activeDiscussions || 0)))}</strong>
            </div>
          </div>
          ${
            insights.topCategories?.length
              ? `<div class="infl-bdash-prefs-block">
            <div class="infl-bdash-prefs-label">Top creator categories</div>
            <div class="infl-bdash-tags">${renderTags(insights.topCategories, "")}</div>
          </div>`
              : ""
          }
        </section>`;
    }

    function safeSection(name, renderFn) {
      try {
        dashLog("Rendering", name);
        return renderFn();
      } catch (err) {
        console.warn(`[influnet/dashboard] section failed: ${name}`, err);
        return `<section class="infl-bdash-card infl-bdash-section-error"><p class="infl-bdash-empty">Could not load ${escapeHtml(name)}.</p></section>`;
      }
    }

    function buildHtml(data) {
      const profile = data?.profile || {};
      const stats = data?.stats || {};
      const pipeline = data?.pipeline || {};
      const insights = data?.insights || {};
      const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : [];
      const savedCreators = Array.isArray(data?.savedCreators) ? data.savedCreators : [];
      const recentViews = Array.isArray(data?.recentViews) ? data.recentViews : [];
      const firstName = getFirstName(profile);

      return `
      <div class="infl-bdash infl-bdash-bento" data-infl-biz-dashboard>
        <header class="infl-bdash-hero-header">
          <div class="infl-bdash-hero-intro">
            <p class="infl-bdash-hero-eyebrow">Brand dashboard</p>
            <h1>Welcome back, ${escapeHtml(firstName)}</h1>
            ${renderStatusPills(profile)}
          </div>
          <div class="infl-bdash-hero-tools">
            ${renderHeaderMetrics(stats)}
            <div class="infl-bdash-hero-actions-row">
              <div class="infl-bdash-search-slot" data-infl-bdash-search-slot></div>
              <button type="button" class="infl-bdash-export-btn" data-action="export-data">${iconDownload()} Export data</button>
            </div>
          </div>
        </header>

        <div class="infl-bdash-master-grid">
          ${safeSection("Brand", () => renderBrandBentoCard(profile, stats))}
          ${safeSection("Campaign analyzing", () => renderAnalyzingGrid(stats, pipeline, insights))}
          ${safeSection("Collaboration summary", () => renderSummaryChart(stats, pipeline))}

          <div class="infl-bdash-bottom-bento">
            ${safeSection("Recent Activity", () => renderActivityTimeline(recentActivity))}
            ${safeSection("Saved Creators", () => `
              <section class="infl-bdash-bento-card infl-bdash-compact-panel">
                <div class="infl-bdash-bento-card-head">
                  <h3>Saved creators</h3>
                  <button type="button" class="infl-bdash-link" data-action="discover">Find more →</button>
                </div>
                ${renderSavedCreators(savedCreators)}
              </section>`)}
            ${safeSection("Recently Viewed", () => `
              <section class="infl-bdash-bento-card infl-bdash-compact-panel">
                <div class="infl-bdash-bento-card-head">
                  <h3>Recently viewed</h3>
                </div>
                ${renderRecentViews(recentViews)}
              </section>`)}
            ${safeSection("Audience & Budget", () => renderAudienceStatCards(profile, stats))}
          </div>
        </div>
      </div>`;
    }

    function exportDashboardData(root) {
      const dash = root?.querySelector("[data-infl-biz-dashboard]");
      if (!dash) return;
      const payload = dash.__inflDashData;
      if (!payload) return;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `influnet-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function wireActions(root) {
      if (root.dataset.influnetWired === "1") return;
      root.dataset.influnetWired = "1";

      root.addEventListener("click", (e) => {
        const nav = e.target.closest("[data-nav]");
        if (nav) {
          e.preventDefault();
          navToSection(nav.getAttribute("data-nav"));
          return;
        }
        const actionEl = e.target.closest("[data-action]");
        if (actionEl) {
          e.preventDefault();
          const action = actionEl.getAttribute("data-action");
          if (action === "edit-profile") navToSection("Settings");
          else if (action === "view-public") {
            const path = actionEl.getAttribute("data-public-path");
            if (path) {
              window.open(path, "_blank", "noopener,noreferrer");
            } else {
              window.alert("Set your Business Username in Settings to enable your public profile URL.");
              navToSection("Settings");
            }
          }
          else if (action === "discover") focusHeroSearch();
          else if (action === "export-data") exportDashboardData(root);
          else if (action === "logo-upload-open") {
            root.querySelector("[data-logo-input]")?.click();
          }
        }
      });

      root.addEventListener("change", async (e) => {
        const input = e.target.closest?.("[data-logo-input]");
        if (!input) return;
        const file = input.files?.[0];
        if (!file) return;
        try {
          if (typeof window.influnetUploadBusinessLogo === "function") {
            await window.influnetUploadBusinessLogo(file);
          } else {
            throw new Error("Logo uploader is unavailable. Please try from Settings.");
          }
          window.influnetReloadBusinessDashboard?.();
        } catch (err) {
          window.alert(err?.message || "Logo upload failed. Please try again.");
        } finally {
          input.value = "";
        }
      });
    }

    function buildRenderKey(data) {
      return JSON.stringify({
        stats: data?.stats,
        pipeline: data?.pipeline,
        activity: (data?.recentActivity || []).length,
        saved: (data?.savedCreators || []).length,
        views: (data?.recentViews || []).length,
        profile: data?.profile?.companyName,
      });
    }

    function hasCachedDashboard(root) {
      return !!root?.querySelector(
        "[data-infl-biz-dashboard]:not(.infl-bdash-skeleton):not(.infl-bdash-error-state)"
      );
    }

    function setRefreshingState(root, on) {
      refreshing = on;
      const dash = root?.querySelector("[data-infl-biz-dashboard]");
      if (!dash) return;
      dash.classList.toggle("infl-bdash-refreshing", on);
      if (on) dash.setAttribute("aria-busy", "true");
      else dash.removeAttribute("aria-busy");
    }

    function parseLoadOptions(options, root) {
      const hasCache = hasCachedDashboard(root);
      if (options === true) {
        return { mode: hasCache ? "background" : "initial", revalidate: true };
      }
      if (options === false) {
        return {
          mode: hasCache ? "background" : "initial",
          revalidate: !hasCache || !lastRenderKey,
        };
      }
      const o = options && typeof options === "object" ? options : {};
      return {
        mode: o.mode || (hasCache ? "background" : "initial"),
        revalidate: o.revalidate !== false,
      };
    }

    function applyDashboardData(root, data, gen) {
      const renderKey = buildRenderKey(data);
      const heroEl = document.getElementById(HERO_ID);
      if (heroEl) heroEl.remove();
      root.innerHTML = buildHtml(data);
      root.dataset.inflDashMountGen = String(gen);
      const dash = root.querySelector("[data-infl-biz-dashboard]");
      if (dash) dash.__inflDashData = data;
      cachedDashboardData = data;
      const slot = root.querySelector(".infl-bdash-search-slot");
      if (heroEl && slot) {
        slot.appendChild(heroEl);
      } else {
        portalHeroSearch(root);
        window.influnetEnsureBizHeroSearch?.();
      }
      lastRenderKey = renderKey;
      wireActions(root);
    }

    function scheduleBackgroundRevalidate() {
      if (!isLive()) return;
      if (revalidateTimer) return;
      revalidateTimer = window.setTimeout(() => {
        revalidateTimer = null;
        if (!isDashboardHome()) return;
        loadDashboard({ mode: "background", revalidate: true });
      }, 280);
    }

    function needsDashboardReload() {
      const root = document.getElementById(CRM_ROOT_ID);
      if (!root || !root.isConnected) return true;
      return !hasCachedDashboard(root);
    }

    let loadGeneration = 0;

    async function loadDashboard(options) {
      if (!isLive()) return;
      if (!isDashboardHome()) return;

      const root = ensureCrmMount();
      if (!root) {
        dashLog("CRM mount unavailable — main element missing");
        return;
      }

      hideLegacyPanels();

      const { mode, revalidate } = parseLoadOptions(options, root);
      const isInitialLoad = mode === "initial";
      const hasCache = hasCachedDashboard(root);

      if (!revalidate && hasCache && lastRenderKey) {
        return;
      }

      const gen = ++loadGeneration;
      loading = isInitialLoad;
      if (isInitialLoad) {
        root.innerHTML = renderSkeleton();
      } else {
        setRefreshingState(root, true);
      }

      try {
        dashLog(
          isInitialLoad ? "Fetching dashboard API (initial):" : "Revalidating dashboard API:",
          API
        );
        const res = await fetch(API, { credentials: "same-origin" });
        const data = await res.json().catch(() => ({}));
        dashLog("Dashboard API Response", { status: res.status, ok: res.ok, data });

        if (gen !== loadGeneration) return;

        if (!res.ok) {
          const msg =
            res.status === 401
              ? "Please sign in again to view your dashboard."
              : res.status === 403
                ? "This dashboard is only available for business accounts."
                : data.error || `Failed to load dashboard (${res.status})`;
          throw new Error(msg);
        }

        if (!isDashboardHome() || !root.isConnected) {
          dashLog("Dashboard tab changed before render — aborting");
          return;
        }

        dashLog("Role check passed for business dashboard");

        const renderKey = buildRenderKey(data);
        if (!isInitialLoad && renderKey === lastRenderKey && hasCache) {
          dashLog("Dashboard data unchanged — skip DOM swap");
          cachedDashboardData = data;
          return;
        }

        dashLog("Dashboard Data:", data);
        applyDashboardData(root, data, gen);
        dashLog(isInitialLoad ? "Dashboard render complete" : "Dashboard background refresh complete");
      } catch (err) {
        if (gen !== loadGeneration || !root.isConnected) return;
        console.warn("[influnet] business dashboard:", err);
        if (isInitialLoad) {
          root.innerHTML = renderErrorState(
            err instanceof Error ? err.message : "We couldn't load your dashboard data."
          );
          root.querySelector("[data-retry]")?.addEventListener("click", () => {
            lastRenderKey = "";
            cachedDashboardData = null;
            loadDashboard({ mode: "initial", revalidate: true });
          });
        } else {
          dashLog("Background refresh failed — keeping cached dashboard");
        }
      } finally {
        if (gen === loadGeneration) {
          loading = false;
          setRefreshingState(root, false);
        }
      }
    }

    function scheduleRefresh() {
      if (!isLive()) return;
      if (refreshTimer) return;
      refreshTimer = window.setInterval(() => {
        if (!isLive()) return;
        if (!isDashboardHome()) return;
        loadDashboard({ mode: "background", revalidate: true });
      }, 45000);
    }

    function enhance() {
      if (!isLive()) return;
      if (!isDashboardHome()) {
        restoreLegacyPanels();
        loadGeneration += 1;
        cachedDashboardData = null;
        if (refreshTimer) {
          clearInterval(refreshTimer);
          refreshTimer = null;
        }
        wiredRoot = null;
        return;
      }
      dashLog("Dashboard enhance — home tab active");
      if (needsDashboardReload()) {
        lastRenderKey = "";
        loadDashboard({ mode: "initial", revalidate: true });
      } else {
        loadDashboard({ mode: "background", revalidate: true });
      }
      scheduleRefresh();
    }

    window.influnetReloadBusinessDashboard = () => {
      loadDashboard({ mode: "background", revalidate: true });
    };

    window.influnetSyncBusinessDashboardLayout = function (force) {
      if (force) lastRenderKey = "";
      scheduleEnhance({ force: !!force });
    };

    window.influnetPortalBizSearch = () => {
      const root = document.getElementById(CRM_ROOT_ID);
      if (root) portalHeroSearch(root);
    };

    let enhanceTimer = null;
    function scheduleEnhance(options) {
      if (!isLive()) return;
      const force = options?.force === true;
      if (force) {
        if (enhanceTimer) window.clearTimeout(enhanceTimer);
        enhanceTimer = null;
        lastRenderKey = "";
      }
      if (enhanceTimer) return;
      enhanceTimer = window.setTimeout(() => {
        if (!isLive()) return;
        enhanceTimer = null;
        enhance();
      }, force ? 0 : 120);
    }

    window.addEventListener("load", () => scheduleEnhance());
    document.addEventListener("DOMContentLoaded", () => scheduleEnhance());
    window.addEventListener("influnet-user-updated", () => {
      scheduleBackgroundRevalidate();
    });
    window.addEventListener("influnet-nav-changed", () => {
      if (needsDashboardReload()) {
        scheduleEnhance({ force: true });
      } else {
        scheduleBackgroundRevalidate();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") scheduleBackgroundRevalidate();
    });
    window.addEventListener("focus", () => scheduleBackgroundRevalidate());
    function onDashboardDataEvent() {
      if (isDashboardHome()) loadDashboard({ mode: "background", revalidate: true });
    }
    window.addEventListener("influnet-collab-accepted", onDashboardDataEvent);
    window.addEventListener("influnet-dashboard-stale", onDashboardDataEvent);
    window.addEventListener("influnet-notification", (e) => {
      const t = e.detail?.type || "";
      if (/REQUEST_|project_update|NEW_REQUEST|collab_|conversation/.test(t)) {
        onDashboardDataEvent();
      }
    });
    scheduleEnhance();
  } catch (err) {
    console.warn("[influnet] dashboard layout:", err);
  }
})();
