/**
 * Influencer dashboard home — premium layout using creator-provided profile data only.
 */
(function () {
  try {
    const MOUNT_ID = "influnet-influencer-dashboard-mount";
    const API = "/api/influencer/dashboard";

    let lastRenderKey = "";

    function getUser() {
      try {
        const raw = localStorage.getItem("influnet_user");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function isInfluencerRoute() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/dashboard/influencer";
    }

    function normalizeNavText(text) {
      return String(text || "")
        .replace(/\d+/g, "")
        .replace(/\+/g, "")
        .trim();
    }

    function getMainEl() {
      return (
        document.querySelector(".flex.h-screen main.flex-1.overflow-y-auto") ||
        document.querySelector("main.flex-1.overflow-y-auto")
      );
    }

    function getActiveNavLabel() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return "Dashboard";
      const buttons = [...nav.querySelectorAll(":scope > button")];
      const active = buttons.find(
        (b) =>
          b.classList.contains("bg-violet-100") ||
          /\bbg-violet-100\b/.test(b.className)
      );
      if (active) return normalizeNavText(active.textContent);
      return "Dashboard";
    }

    function isHomeSectionActive() {
      return getActiveNavLabel() === "Dashboard";
    }

    /** Show custom home only on Dashboard tab; restore React panels for Requests, etc. */
    function syncMainPanelVisibility() {
      if (!isInfluencerRoute()) return;
      const main = getMainEl();
      if (!main) return;

      const isHome = isHomeSectionActive();
      const mount = document.getElementById(MOUNT_ID);
      const preserved = new Set([
        MOUNT_ID,
        "influnet-profile-link-mount",
        "influnet-influencer-account-mount",
      ]);

      main.querySelectorAll(":scope > *").forEach((el) => {
        if (preserved.has(el.id)) {
          if (el.id === MOUNT_ID) {
            if (isHome) el.style.removeProperty("display");
            else el.style.setProperty("display", "none", "important");
          }
          return;
        }
        if (isHome) {
          el.setAttribute("data-infl-old-dash-hidden", "1");
          el.style.setProperty("display", "none", "important");
        } else {
          el.removeAttribute("data-infl-old-dash-hidden");
          el.style.removeProperty("display");
        }
      });
    }

    function isInfluencerDashboardHome() {
      if (!isInfluencerRoute()) return false;
      syncMainPanelVisibility();
      if (!isHomeSectionActive()) return false;
      ensureDashboardMount();
      return !!document.getElementById(MOUNT_ID);
    }

    /** Hide bundled $C home if mount patch missing (e.g. old deploy). */
    function ensureDashboardMount() {
      if (!isInfluencerRoute()) return null;

      let mount = document.getElementById(MOUNT_ID);
      const main = getMainEl();
      if (!main) return mount;

      if (!mount) {
        mount = document.createElement("div");
        mount.id = MOUNT_ID;
        mount.className = "w-full";
        main.prepend(mount);
      }

      syncMainPanelVisibility();
      return mount;
    }

    function wireNavSync() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav || nav.dataset.inflNavSync) return;
      nav.dataset.inflNavSync = "1";
      nav.addEventListener("click", () => {
        window.setTimeout(syncMainPanelVisibility, 0);
        window.setTimeout(syncMainPanelVisibility, 80);
      });
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

    function formatCount(n) {
      const num = Number(n) || 0;
      if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}K`;
      return String(num);
    }

    function formatBudget(budget, pricingMin, pricingMax) {
      if (budget != null && !Number.isNaN(Number(budget))) {
        return `₹${Number(budget).toLocaleString("en-IN")}`;
      }
      if (pricingMin != null && pricingMax != null) {
        return `₹${Number(pricingMin).toLocaleString("en-IN")} – ₹${Number(pricingMax).toLocaleString("en-IN")}`;
      }
      return "Budget not specified";
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

    function getGreeting() {
      const hour = new Date().getHours();
      if (hour < 12) return "Good Morning";
      if (hour < 17) return "Good Afternoon";
      return "Good Evening";
    }

    function navToSection(label) {
      const target = normalizeNavText(label).toLowerCase();
      const btn = [...document.querySelectorAll("aside nav button")].find(
        (b) => normalizeNavText(b.textContent).toLowerCase() === target
      );
      if (btn) {
        btn.click();
        window.setTimeout(syncMainPanelVisibility, 0);
        window.setTimeout(syncMainPanelVisibility, 80);
      }
    }

    function goToProfile() {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === "Edit Profile"
      );
      if (btn) btn.click();
      else navToSection("Settings");
    }

    function trackLinkClick(slug) {
      if (!slug) return;
      fetch(`/api/public/influencer/${encodeURIComponent(slug)}/click`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkType: "share" }),
      }).catch(() => {});
    }

    function shareProfile(url, slug) {
      trackLinkClick(slug);
      const text = `Check out my creator profile on Influnet: ${url}`;
      if (navigator.share) {
        navigator.share({ title: "My Influnet Profile", url, text }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          if (window.showToast) window.showToast("Profile link copied.", "ok");
        });
      }
    }

    function copyText(text) {
      navigator.clipboard?.writeText(text).then(() => {
        if (window.showToast) window.showToast("Copied to clipboard.", "ok");
      });
    }

    function nicheTags(niche) {
      const list = Array.isArray(niche) ? niche.filter(Boolean) : [];
      if (!list.length) return `<span class="infl-idash-tag">Add categories</span>`;
      return list
        .slice(0, 4)
        .map((t) => `<span class="infl-idash-tag">${escapeHtml(t)}</span>`)
        .join("");
    }

    function buildRequestsHtml(requests, profile) {
      if (!requests?.length) {
        return `<div class="infl-idash-empty">No incoming requests yet. Complete your profile to attract more brand collaborations.</div>`;
      }
      return requests
        .map((r) => {
          const letter = initials(r.businessName);
          return `
          <article class="infl-idash-request">
            <div class="infl-idash-request-logo">${escapeHtml(letter)}</div>
            <div>
              <h4>${escapeHtml(r.businessName)}</h4>
              <p>${escapeHtml(r.title)}</p>
              <p>${escapeHtml(formatBudget(r.budget, profile.pricingMin, profile.pricingMax))} · ${escapeHtml(timeAgo(r.createdAt))}</p>
            </div>
            <div class="infl-idash-request-actions">
              <button type="button" class="infl-idash-btn infl-idash-btn-outline" data-action="view-request">View Request</button>
              <button type="button" class="infl-idash-btn infl-idash-btn-primary" data-action="respond-request">Respond</button>
            </div>
          </article>`;
        })
        .join("");
    }

    function buildSocialHtml(platforms) {
      if (!platforms?.length) {
        return `<div class="infl-idash-empty">Add your social handles and follower counts in Edit Profile.</div>`;
      }
      return `<div class="infl-idash-social-grid">${platforms
        .map((p) => {
          const hasMetric = p.metricLabel && Number(p.metric) > 0;
          const metricBlock = hasMetric
            ? `<div class="metric">${escapeHtml(formatCount(p.metric))}</div><div class="metric-label">${escapeHtml(p.metricLabel)} (your entry)</div>`
            : p.metricLabel
              ? `<div class="metric metric--empty">—</div><div class="metric-label">${escapeHtml(p.metricLabel)} (your entry)</div>`
              : "";
          return `
          <div class="infl-idash-social-card">
            <div class="platform">${escapeHtml(p.label)}</div>
            <div class="handle" title="${escapeHtml(p.handle)}">${escapeHtml(p.handle)}</div>
            ${metricBlock}
          </div>`;
        })
        .join("")}</div>`;
    }

    function buildRecentViewsHtml(views) {
      if (!views?.length) {
        return `<div class="infl-idash-empty">When businesses view your public profile, they will appear here.</div>`;
      }
      return views
        .map(
          (v) => `
        <div class="infl-idash-view-row">
          <div class="infl-idash-view-dot">${escapeHtml(initials(v.businessName))}</div>
          <div>
            <strong>${escapeHtml(v.businessName)}</strong>
            <span>${escapeHtml(v.industry || "Business")} · ${escapeHtml(timeAgo(v.viewedAt))}</span>
          </div>
        </div>`
        )
        .join("");
    }

    function buildChecklistHtml(checks) {
      return `<ul class="infl-idash-checklist">${checks
        .map(
          (c) =>
            `<li class="${c.done ? "done" : "missing"}">${c.done ? "✓" : "○"} ${escapeHtml(c.label)}</li>`
        )
        .join("")}</ul>`;
    }

    function buildPortfolioPreview(portfolio) {
      const items = Array.isArray(portfolio) ? portfolio.slice(0, 3) : [];
      if (!items.length) return "";
      return `<p style="margin:0.5rem 0 0;font-size:0.72rem;color:var(--infl-muted)">${items.length} portfolio highlight${items.length === 1 ? "" : "s"} added</p>`;
    }

    function nicheLabel(niche) {
      const list = Array.isArray(niche) ? niche.filter(Boolean) : [];
      return list[0] || "Creator";
    }

    function socialCountLabel(count) {
      const n = Number(count) || 0;
      return n > 0 ? formatCount(n) : "—";
    }

    function iconInstagram() {
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`;
    }

    function iconYoutube() {
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18 5 12 5 12 5s-6 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 9 2 12 2 12s0 3 .4 4.8a2.5 2.5 0 0 0 1.8 1.8C6 19 12 19 12 19s6 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.8.4-4.8.4-4.8s0-3-.4-4.8zM10 15.5V8.5l6 3.5-6 3.5z"/></svg>`;
    }

    function iconTiktok() {
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16.5 3c.4 2.1 1.8 3.8 3.8 4.4v3.2c-1.4 0-2.7-.4-3.8-1.1v6.6c0 3.4-2.8 5.9-6 5.9S4.5 19.5 4.5 16 7.3 10.1 10.5 10.1c.3 0 .7 0 1 .1v3.4c-.3-.1-.6-.2-1-.2-1.5 0-2.7 1.2-2.7 2.7s1.2 2.7 2.7 2.7 2.7-1.2 2.7-2.7V3h3.3z"/></svg>`;
    }

    function iconCopy() {
      return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    }

    function iconExternal() {
      return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6"/></svg>`;
    }

    function iconShare() {
      return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.6 11l6.3-3.5M8.6 13l6.3 3.5"/></svg>`;
    }

    function iconPin() {
      return `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
    }

    function buildHeroSocials(p) {
      const items = [
        { id: "instagram", icon: iconInstagram(), count: p.instagramFollowers },
        { id: "youtube", icon: iconYoutube(), count: p.youtubeSubscribers },
        { id: "tiktok", icon: iconTiktok(), count: p.tiktokFollowers },
      ];
      return `${items
        .map(
          (item) => `
        <div class="infl-idash-hero-social-item">
          <button type="button" class="infl-idash-hero-social-btn infl-idash-hero-social-btn--${item.id}" data-action="edit-profile" aria-label="${item.id}">
            ${item.icon}
          </button>
          <span class="infl-idash-hero-social-count">${socialCountLabel(item.count)}</span>
        </div>`
        )
        .join("")}
        <div class="infl-idash-hero-social-item">
          <button type="button" class="infl-idash-hero-social-btn infl-idash-hero-social-add" data-action="edit-profile" aria-label="Add platform">
            <span aria-hidden="true">+</span>
          </button>
        </div>`;
    }

    function buildHtml(data) {
      const p = data.profile || {};
      const stats = data.stats || {};
      const completion = data.completion || { percent: 0, checks: [] };
      const publicPath = data.publicPath || `influnet/${data.profileSlug || "your-profile"}`;
      const publicUrl = p.profileUrl || `${window.location.origin}/influnet/${data.profileSlug || ""}`;
      const firstName = (p.name || "Creator").split(" ")[0];
      const avatarHtml = p.avatarUrl
        ? `<img class="infl-idash-avatar" src="${escapeHtml(p.avatarUrl)}" alt="" />`
        : `<div class="infl-idash-avatar">${escapeHtml(initials(p.name))}</div>`;

      const category = nicheLabel(p.niche);
      const location = p.location || "Add location";

      return `
      <div class="infl-idash" data-infl-dashboard>
        <section class="infl-idash-hero" aria-label="Profile overview">
          <div class="infl-idash-hero-layout">
            <div class="infl-idash-hero-left">
              <h1>${escapeHtml(getGreeting())}, ${escapeHtml(firstName)}! 👋</h1>
              <p class="infl-idash-hero-sub">Let's grow your influence and build amazing brand collaborations.</p>
              <div class="infl-idash-strength">
                <div class="infl-idash-strength-label">
                  <span>Profile Strength</span>
                  <span>${completion.percent}%</span>
                </div>
                <div class="infl-idash-strength-bar">
                  <div class="infl-idash-strength-fill" style="width:${completion.percent}%"></div>
                </div>
                <p class="infl-idash-strength-hint">Complete your profile to get more discovery and opportunities.</p>
              </div>
            </div>

            <div class="infl-idash-hero-profile-block">
              <div class="infl-idash-avatar-wrap">
                ${avatarHtml}
                <span class="infl-idash-online" title="Online"></span>
              </div>
              <div class="infl-idash-hero-right">
                <div class="infl-idash-hero-handle">
                  <strong>${escapeHtml(publicPath)}</strong>
                  <button type="button" class="infl-idash-hero-copy" data-action="copy-url" title="Copy profile link">${iconCopy()}</button>
                </div>
                <p class="infl-idash-hero-category">${escapeHtml(category)}</p>
                <p class="infl-idash-hero-loc-line">${iconPin()} ${escapeHtml(location)}</p>
                <div class="infl-idash-hero-socials">${buildHeroSocials(p)}</div>
                <div class="infl-idash-hero-actions">
                  <button type="button" class="infl-idash-btn infl-idash-btn-view" data-action="view-public">
                    ${iconExternal()} View Public Profile
                  </button>
                  <button type="button" class="infl-idash-btn infl-idash-btn-share" data-action="share-profile">
                    ${iconShare()} Share Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="infl-idash-opp-head">
          <h3>Opportunities at a Glance</h3>
          <a data-action="all-requests">View All Requests →</a>
        </div>
        <div class="infl-idash-opp-grid">
          <div class="infl-idash-stat-card">
            <div class="label">Requests Received</div>
            <div class="value">${stats.requestsReceived ?? 0}</div>
            <div class="sub">Pending collaboration requests</div>
          </div>
          <div class="infl-idash-stat-card">
            <div class="label">Active Discussions</div>
            <div class="value">${stats.activeDiscussions ?? 0}</div>
            <div class="sub">Ongoing conversations</div>
          </div>
          <div class="infl-idash-stat-card">
            <div class="label">Profile Views</div>
            <div class="value">${stats.profileViews ?? 0}</div>
            <div class="sub">On Influnet</div>
          </div>
          <div class="infl-idash-stat-card">
            <div class="label">Saved By Businesses</div>
            <div class="value">${stats.savedByBusinesses ?? 0}</div>
            <div class="sub">Shortlisted creators</div>
          </div>
        </div>

        <div class="infl-idash-grid">
          <div class="infl-idash-col-left">
            <div class="infl-idash-card">
              <div class="infl-idash-card-head">
                <h3>Recent Business Requests</h3>
              </div>
              ${buildRequestsHtml(data.requests, p)}
            </div>
          </div>

          <div class="infl-idash-col-mid">
            <div class="infl-idash-card">
              <h3>Social Platforms</h3>
              ${buildSocialHtml(data.socialPlatforms)}
            </div>
            <div class="infl-idash-card">
              <h3>Recently Viewed By</h3>
              ${buildRecentViewsHtml(data.recentViews)}
            </div>
          </div>

          <div class="infl-idash-col-right">
            <div class="infl-idash-card">
              <h3>Public Profile Preview</h3>
              <div class="infl-idash-preview">
                <div class="infl-idash-preview-banner"></div>
                <div class="infl-idash-preview-body">
                  <div class="infl-idash-preview-avatar">
                    ${p.avatarUrl ? `<img src="${escapeHtml(p.avatarUrl)}" alt="" />` : escapeHtml(initials(p.name))}
                  </div>
                  <strong style="display:block;margin-top:0.5rem;font-size:0.85rem">${escapeHtml(p.name || "Creator")}</strong>
                  <span style="font-size:0.72rem;color:var(--infl-muted)">${escapeHtml(p.location || "Add location")}</span>
                  <div class="infl-idash-tags">${nicheTags(p.niche)}</div>
                  ${buildPortfolioPreview(p.portfolio)}
                  <button type="button" class="infl-idash-btn infl-idash-btn-outline" style="margin-top:0.75rem;width:100%" data-action="view-public">View Full Profile</button>
                </div>
              </div>
            </div>

            <div class="infl-idash-card">
              <h3>Profile Completion</h3>
              <div class="infl-idash-completion">
                <div class="infl-idash-ring" style="--pct:${completion.percent}%" data-label="${completion.percent}% Done"></div>
                ${buildChecklistHtml(completion.checks || [])}
              </div>
            </div>

            <div class="infl-idash-card">
              <h3>Quick Actions</h3>
              <div class="infl-idash-actions-grid">
                <button type="button" class="infl-idash-action-btn" data-action="edit-profile">Edit Profile</button>
                <button type="button" class="infl-idash-action-btn" data-action="edit-profile">Update Portfolio</button>
                <button type="button" class="infl-idash-action-btn" data-action="edit-profile">Upload Media Kit</button>
                <button type="button" class="infl-idash-action-btn" data-action="share-profile">Share Profile</button>
                <button type="button" class="infl-idash-action-btn" data-action="edit-profile">Update Social Links</button>
                <button type="button" class="infl-idash-action-btn" data-action="edit-profile">Update Contact Info</button>
              </div>
            </div>

            <div class="infl-idash-card">
              <h3>Your Analytics</h3>
              <div class="infl-idash-analytics-row"><span>Profile Views</span><strong>${stats.profileViews ?? 0}</strong></div>
              <div class="infl-idash-analytics-row"><span>Link Clicks</span><strong>${stats.linkClicks ?? 0}</strong></div>
              <div class="infl-idash-analytics-row"><span>Requests Received</span><strong>${stats.requestsReceived ?? 0}</strong></div>
              <div class="infl-idash-analytics-row"><span>Saved By Businesses</span><strong>${stats.savedByBusinesses ?? 0}</strong></div>
            </div>
          </div>
        </div>
      </div>`;
    }

    function wireActions(mount, data) {
      const slug = data.profileSlug || data.profile?.profileSlug;
      const publicPath =
        data.publicPath || (slug ? `influnet/${slug}` : "influnet/your-profile");
      const publicUrl =
        data.profile?.profileUrl ||
        (slug ? `${window.location.origin}/influnet/${slug}` : window.location.origin);
      mount.querySelectorAll("[data-action]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          const action = el.getAttribute("data-action");
          if (action === "edit-profile") goToProfile();
          else if (action === "view-public") {
            const path = slug ? `/influnet/${encodeURIComponent(slug)}` : publicUrl;
            window.open(path, "_blank", "noopener,noreferrer");
          }
          else if (action === "share-profile") shareProfile(publicUrl, slug);
          else if (action === "copy-url") copyText(publicPath);
          else if (action === "all-requests" || action === "view-request" || action === "respond-request") {
            navToSection("Requests");
          }
        });
      });
    }

    async function loadDashboard() {
      const mount = document.getElementById(MOUNT_ID);
      if (!mount) return;

      const key = `${getUser()?.id || ""}:${mount.childElementCount}`;
      if (mount.dataset.loading === "1" && key === lastRenderKey) return;

      mount.dataset.loading = "1";
      if (!mount.childElementCount) {
        mount.innerHTML = '<div class="infl-idash-loading">Loading your dashboard…</div>';
      }

      try {
        const res = await fetch(API, { credentials: "same-origin" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load dashboard");

        const renderKey = JSON.stringify({
          id: data.profile?.userId,
          stats: data.stats,
          requests: (data.requests || []).length,
          percent: data.completion?.percent,
        });
        if (renderKey === lastRenderKey && mount.querySelector("[data-infl-dashboard]")) {
          mount.dataset.loading = "0";
          return;
        }
        lastRenderKey = renderKey;

        mount.innerHTML = buildHtml(data);
        wireActions(mount, data);
      } catch (err) {
        mount.innerHTML = `<div class="infl-idash-loading">Could not load dashboard. ${escapeHtml(err.message)}</div>`;
      }
      mount.dataset.loading = "0";
    }

    function tick() {
      wireNavSync();
      syncMainPanelVisibility();
      if (!isInfluencerDashboardHome()) return;
      loadDashboard();
    }

    window.addEventListener("influnet-profile-updated", () => {
      lastRenderKey = "";
      tick();
    });

    window.addEventListener("influnet-user-updated", () => {
      lastRenderKey = "";
      tick();
    });

    tick();
    setInterval(tick, 3000);
    window.addEventListener("popstate", tick);
    window.addEventListener("load", tick);
  } catch (e) {
    console.warn("[influnet] influencer-dashboard-home:", e);
  }
})();
