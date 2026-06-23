/**
 * Influencer dashboard home — premium layout using creator-provided profile data only.
 */
(function () {
  try {
    const MOUNT_ID = "influnet-influencer-dashboard-mount";
    const PROJECTS_MOUNT_ID = "influnet-projects-workspace-mount";
    const API = "/api/influencer/dashboard";
    let dashboardLoadGeneration = 0;

    const SECTION_LABELS = {
      home: "Dashboard",
      messages: "Messages",
      requests: "Requests",
      connections: "Connections",
      projects: "Projects",
      analytics: "Analytics",
      subscription: "Subscription",
      profile: "Profile",
      settings: "Settings",
      support: "Support",
    };

    const NAV_MAIN_LABELS = [
      "Dashboard",
      "Messages",
      "Requests",
      "Connections",
      "Projects",
      "Analytics",
      "Subscription",
    ];

    let lastRenderKey = "";
    let dashboardNeedsRefresh = false;
    let pendingNavSection = "";
    let pendingNavUntil = 0;

    function markDashboardStale() {
      dashboardNeedsRefresh = true;
      lastRenderKey = "";
    }

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
        document.querySelector(".flex.h-screen main.flex-1") ||
        document.querySelector("main.flex-1")
      );
    }

    function getHeaderSectionLabel() {
      const crumb = document.querySelector(
        ".flex.h-screen header span.text-sm.font-semibold.text-gray-800, .flex.h-screen header .text-gray-800.font-semibold"
      );
      if (!crumb) return "";
      return normalizeNavText(crumb.textContent);
    }

    function getActiveNavLabelFromNav() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return "";
      const active = [...nav.querySelectorAll(":scope > button")].find(
        (b) =>
          b.classList.contains("bg-violet-100") ||
          /\bbg-violet-100\b/.test(b.className)
      );
      return active ? normalizeNavText(active.textContent) : "";
    }

    function rememberNavSection(label) {
      if (!label) return;
      pendingNavSection = label;
      pendingNavUntil = Date.now() + 3000;
    }

    /** Nav + header both say Dashboard — beats stale Messages DOM during tab switches. */
    function isDefinitelyDashboard() {
      if (pendingNavSection === "Dashboard" && Date.now() < pendingNavUntil) {
        return true;
      }
      const header = getHeaderSectionLabel();
      const nav = getActiveNavLabelFromNav();
      return header === "Dashboard" && nav === "Dashboard";
    }

    /** Prefer clicked nav + DOM over stale highlights during tab transitions. */
    function getActiveSectionLabel() {
      if (isDefinitelyDashboard()) return "Dashboard";
      if (pendingNavSection && Date.now() < pendingNavUntil) {
        return pendingNavSection;
      }

      const main = getMainEl();
      if (main?.querySelector(".influnet-react-messages-root")) return "Messages";
      if (isProfileSectionOpen()) return "Profile";

      const header = getHeaderSectionLabel();
      const nav = getActiveNavLabelFromNav();

      if (nav && nav !== "Dashboard") return nav;
      if (header && header !== "Dashboard") return header;
      return header || nav || "Dashboard";
    }

    function getActiveNavLabel() {
      return getActiveSectionLabel();
    }

    function isProfileSectionOpen() {
      if (document.body.classList.contains("infl-profile-nav-pending")) return true;
      const main = getMainEl();
      if (!main) return false;
      const dash = document.getElementById(MOUNT_ID);
      if (document.getElementById("influnet-profile-edit-root")) return true;
      if (document.getElementById("ips-root-inner")) return true;
      if (document.getElementById("infl-profile-transition-shell")) return true;
      const nav = getActiveNavLabelFromNav();
      if (nav && normalizeNavText(nav).toLowerCase() === "settings") return true;
      return [...main.querySelectorAll("h1")].some((h) => {
        const title = h.textContent.trim();
        if (
          title !== "Edit Profile" &&
          title !== "Profile Settings" &&
          title !== "Settings"
        ) {
          return false;
        }
        return !dash?.contains(h);
      });
    }

    function isHomeSectionActive() {
      if (isProfileSectionOpen()) return false;
      if (isDefinitelyDashboard()) return true;
      if (pendingNavSection && pendingNavSection !== "Dashboard" && Date.now() < pendingNavUntil) {
        return false;
      }
      const main = getMainEl();
      if (main?.querySelector(".influnet-react-messages-root")) return false;
      const nav = getActiveNavLabelFromNav();
      if (nav && nav !== "Dashboard") return false;
      const header = getHeaderSectionLabel();
      if (header && header !== "Dashboard") return false;
      return true;
    }

    function isMsgsWorkspaceActive() {
      return (
        document.body.classList.contains("infl-msgs-workspace-active") ||
        !!document.getElementById("infl-msgs-workspace-root")
      );
    }

    function shouldKeepMainChildHidden(el) {
      if (!el) return false;
      if (el.id === "infl-msgs-workspace-root") return false;
      if (el.hasAttribute("data-infl-ws-guard-hidden")) return true;
      if (!isMessagesSection()) return false;
      if (el.classList.contains("influnet-react-messages-root")) return true;
      if (isMsgsWorkspaceActive() && el.id !== MOUNT_ID && el.id !== PROJECTS_MOUNT_ID) {
        return true;
      }
      return false;
    }

    function forceShowReactPanels() {
      const main = getMainEl();
      if (!main) return;
      main.style.removeProperty("visibility");
      main.style.removeProperty("pointer-events");
      const keepHidden = new Set([MOUNT_ID, PROJECTS_MOUNT_ID]);
      main.querySelectorAll(":scope > *").forEach((el) => {
        if (el.hasAttribute("data-infl-old-dash-hidden")) {
          el.removeAttribute("data-infl-old-dash-hidden");
        }
        if (keepHidden.has(el.id)) return;
        if (shouldKeepMainChildHidden(el)) return;
        el.style.removeProperty("display");
        el.style.removeProperty("visibility");
        el.style.removeProperty("pointer-events");
      });
    }

    function cancelDashboardLoad() {
      dashboardLoadGeneration += 1;
      const mount = document.getElementById(MOUNT_ID);
      if (!mount) return;
      mount.dataset.loading = "0";
    }

    /** Never .remove() — React owns this node; removing it causes removeChild errors. */
    function hideHomeMount() {
      const mount = document.getElementById(MOUNT_ID);
      if (!mount) return;
      mount.style.setProperty("display", "none", "important");
      mount.style.setProperty("visibility", "hidden", "important");
      mount.style.setProperty("pointer-events", "none", "important");
    }

    function revealHomeMount() {
      const mount = document.getElementById(MOUNT_ID);
      if (!mount) return;
      mount.style.removeProperty("display");
      mount.style.removeProperty("visibility");
      mount.style.removeProperty("pointer-events");
    }

    function isMessagesSection() {
      if (isDefinitelyDashboard()) return false;
      const header = getHeaderSectionLabel();
      const nav = getActiveNavLabelFromNav();
      const main = getMainEl();
      return (
        getActiveSectionLabel() === "Messages" ||
        header === "Messages" ||
        nav === "Messages" ||
        !!main?.querySelector(".influnet-react-messages-root")
      );
    }

    function isNonDashboardTab() {
      if (isDefinitelyDashboard()) return false;
      const label = getActiveSectionLabel();
      if (label !== "Dashboard") return true;
      const header = getHeaderSectionLabel();
      const nav = getActiveNavLabelFromNav();
      if (header && header !== "Dashboard") return true;
      if (nav && nav !== "Dashboard") return true;
      return false;
    }

    function restoreHomeDashboardOverlay() {
      if (!isInfluencerRoute()) return;
      document.body.classList.remove("infl-influencer-messages-view");
      revealHomeMount();
      const mount = document.getElementById(MOUNT_ID);
      if (!mount) return;
      mount.querySelectorAll(".infl-idash, [data-infl-dashboard], .infl-idash-loading").forEach((el) => {
        el.style.removeProperty("display");
        el.style.removeProperty("visibility");
        el.style.removeProperty("pointer-events");
      });
    }

    function ensureDashboardContent() {
      if (!isHomeSectionActive()) return;
      restoreHomeDashboardOverlay();
      const mount = document.getElementById(MOUNT_ID);
      if (!mount || !getMainEl()?.contains(mount)) return;
      const hasContent = !!mount.querySelector("[data-infl-dashboard]");
      if (hasContent && !dashboardNeedsRefresh) {
        mount.dataset.loading = "0";
        return;
      }
      if (mount.dataset.loading === "1") return;
      loadDashboard();
    }

    /**
     * Header/nav can say Messages while stale .infl-idash home HTML is still visible.
     * Hide the custom home overlay whenever any non-Dashboard tab is active.
     */
    function isProjectsSectionLabel(label) {
      const l = String(label || "").toLowerCase();
      return l === "projects" || l === "collaborations";
    }

    function suppressHomeDashboardOverlay() {
      if (!isInfluencerRoute()) return;
      const main = getMainEl();
      const onMessages = isMessagesSection();
      const onNonDashboard = isNonDashboardTab() || onMessages;
      const section = getActiveSectionLabel();

      document.body.classList.toggle("infl-influencer-messages-view", onMessages);

      if (!onNonDashboard) return;

      cancelDashboardLoad();
      if (isProjectsSectionLabel(section)) {
        window.influnetMountProjectsWorkspace?.();
        window.influnetRefreshProjectsWorkspace?.();
        hideHomeMount();
        return;
      }
      if (typeof window.influnetTeardownProjectsWorkspace === "function") {
        window.influnetTeardownProjectsWorkspace("influencer-overlay");
      }
      if (onMessages) {
        console.log("[influnet/dashboard] Messages mounted");
      }

      hideHomeMount();
      main?.querySelectorAll(".infl-idash, [data-infl-dashboard], .infl-idash-loading").forEach((el) => {
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.style.setProperty("pointer-events", "none", "important");
      });
      forceShowReactPanels();
    }

    /**
     * Custom home mount only on Dashboard tab.
     */
    function syncMainPanelVisibility() {
      if (!isInfluencerRoute()) return;
      if (isHomeSectionActive()) {
        ensureDashboardContent();
      } else {
        suppressHomeDashboardOverlay();
      }
    }

    function onInfluencerSectionChange(sectionId) {
      if (!isInfluencerRoute()) return;
      const label = SECTION_LABELS[sectionId] || sectionId;
      rememberNavSection(label);
      if (sectionId === "home") {
        restoreHomeDashboardOverlay();
        ensureDashboardContent();
        window.setTimeout(ensureDashboardContent, 150);
      } else {
        suppressHomeDashboardOverlay();
      }
      schedulePanelSync();
    }

    window.influnetSyncInfluencerMainPanel = syncMainPanelVisibility;
    (function chainInflSectionHook(handler) {
      const prev = window.influnetOnInfluencerSectionChange;
      window.influnetOnInfluencerSectionChange = function (sectionId) {
        if (typeof prev === "function") prev(sectionId);
        handler(sectionId);
      };
    })(onInfluencerSectionChange);

    function isInfluencerDashboardHome() {
      if (!isInfluencerRoute() || !isHomeSectionActive()) return false;
      const main = getMainEl();
      const mount = document.getElementById(MOUNT_ID);
      return !!(mount && main?.contains(mount));
    }

    function schedulePanelSync() {
      [0, 150].forEach((ms) => {
        window.setTimeout(syncMainPanelVisibility, ms);
      });
    }

    function labelFromNavButton(btn) {
      if (!btn) return "";
      const label = normalizeNavText(btn.textContent);
      if (label) return label;
      const nav = btn.closest("aside nav");
      if (!nav) return "";
      const buttons = [...nav.querySelectorAll(":scope > button")];
      const idx = buttons.indexOf(btn);
      return idx >= 0 ? NAV_MAIN_LABELS[idx] || "" : "";
    }

    function onNavClick(e) {
      const btn = e.target.closest?.("button");
      const label = labelFromNavButton(btn);
      if (!label) return;
      rememberNavSection(label);
      if (label !== "Settings" && typeof window.influnetEndInfluencerProfileNavigation === "function") {
        window.influnetEndInfluencerProfileNavigation();
      }
      if (label === "Dashboard") {
        restoreHomeDashboardOverlay();
        ensureDashboardContent();
        window.setTimeout(ensureDashboardContent, 150);
      } else {
        cancelDashboardLoad();
        if (isProjectsSectionLabel(label)) {
          window.influnetMountProjectsWorkspace?.();
          window.influnetRefreshProjectsWorkspace?.();
        } else if (typeof window.influnetTeardownProjectsWorkspace === "function") {
          window.influnetTeardownProjectsWorkspace("nav-click");
        }
        if (label !== "Connections" && typeof window.influnetTeardownConnectionsWorkspace === "function") {
          window.influnetTeardownConnectionsWorkspace("nav-click");
        }
        suppressHomeDashboardOverlay();
      }
      window.dispatchEvent(new CustomEvent("influnet-nav-changed"));
      schedulePanelSync();
    }

    function wireNavSync() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav || nav.dataset.inflNavSync) return;
      nav.dataset.inflNavSync = "1";
      nav.addEventListener("click", onNavClick, true);
      const footer = nav.parentElement?.querySelector(":scope > div:last-of-type");
      footer?.addEventListener("click", onNavClick, true);
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

    const AVATAR_ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

    function validateAvatarFile(file) {
      if (!file) return "No file selected.";
      if (!AVATAR_ALLOWED.includes(file.type)) {
        return "Use a JPEG, PNG, WebP, or GIF image.";
      }
      if (file.size > AVATAR_MAX_BYTES) return "Image must be under 5 MB.";
      return null;
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read image file"));
        reader.readAsDataURL(file);
      });
    }

    function authHeaders() {
      const token = localStorage.getItem("influnet_token");
      return token ? { Authorization: `Bearer ${token}` } : {};
    }

    function updateRailAvatar(mount, url) {
      const avatarEl = mount.querySelector(".infl-idash-rail-avatar-btn .infl-idash-rail-avatar");
      if (!avatarEl || !url) return;
      if (avatarEl.tagName === "IMG") {
        avatarEl.src = url;
        return;
      }
      const img = document.createElement("img");
      img.className = "infl-idash-rail-avatar";
      img.src = url;
      img.alt = "";
      avatarEl.replaceWith(img);
    }

    function wireAvatarUpload(mount) {
      const fileInput = mount.querySelector("#infl-idash-avatar-file");
      const trigger = mount.querySelector("[data-action='change-avatar']");
      if (!fileInput || !trigger || fileInput.dataset.inflWired === "1") return;
      fileInput.dataset.inflWired = "1";

      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (trigger.classList.contains("is-uploading")) return;
        fileInput.click();
      });

      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        fileInput.value = "";
        if (!file) return;

        const validationError = validateAvatarFile(file);
        if (validationError) {
          window.alert(validationError);
          return;
        }

        trigger.classList.add("is-uploading");
        trigger.setAttribute("aria-busy", "true");
        try {
          const dataUrl = await fileToDataUrl(file);
          const res = await fetch("/api/influencer-profile/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            credentials: "same-origin",
            body: JSON.stringify({ dataUrl }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Upload failed");

          const url = data.avatarUrl || data.url;
          if (url) {
            updateRailAvatar(mount, url);
            try {
              const stored = JSON.parse(localStorage.getItem("influnet_user") || "{}");
              localStorage.setItem(
                "influnet_user",
                JSON.stringify({ ...stored, avatarUrl: url })
              );
            } catch (_) {}
          }
          window.dispatchEvent(
            new CustomEvent("influnet-profile-updated", { detail: { soft: true, avatarUrl: url } })
          );
        } catch (err) {
          window.alert(err.message || "Could not upload photo.");
        } finally {
          trigger.classList.remove("is-uploading");
          trigger.removeAttribute("aria-busy");
        }
      });
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
      const section = normalizeNavText(label);
      rememberNavSection(section);
      const target = section.toLowerCase();
      const btn = [...document.querySelectorAll("aside nav button")].find((b) => {
        const t = normalizeNavText(b.textContent).toLowerCase();
        return t === target || (target === "projects" && t === "collaborations");
      });
      if (btn) {
        btn.click();
        if (target !== "dashboard") {
          hideHomeMount();
          forceShowReactPanels();
          document.body.classList.toggle("infl-influencer-messages-view", target === "messages");
        }
        window.dispatchEvent(new CustomEvent("influnet-nav-changed"));
        schedulePanelSync();
      }
    }

    function goToProfile() {
      try {
        const until = String(Date.now() + 1000 * 60 * 60 * 2);
        sessionStorage.setItem("influnet_progressive_onboarding_suppress_until", until);
        localStorage.setItem("influnet_progressive_onboarding_suppress_until", until);
        localStorage.removeItem("influnet_needs_progressive_setup");
      } catch (_) {}
      if (typeof window.influnetCloseProgressiveOnboarding === "function") {
        window.influnetCloseProgressiveOnboarding();
      }

      if (typeof window.influnetRouteToAccountSettings === "function") {
        window.influnetRouteToAccountSettings("/dashboard/settings");
        return;
      }

      rememberNavSection("Settings");
      cancelDashboardLoad();
      hideHomeMount();
      suppressHomeDashboardOverlay();
      if (typeof window.influnetBeginInfluencerProfileNavigation === "function") {
        window.influnetBeginInfluencerProfileNavigation();
      }

      const settingsBtn = [...document.querySelectorAll("aside nav button")].find(
        (b) => normalizeNavText(b.textContent).toLowerCase() === "settings"
      );
      if (settingsBtn) {
        settingsBtn.click();
        window.dispatchEvent(new CustomEvent("influnet-nav-changed"));
        window.influnetOnInfluencerSectionChange?.("settings");
        if (typeof window.influnetMountInfluencerProfileEdit === "function") {
          window.influnetMountInfluencerProfileEdit();
          [60, 180, 400].forEach((ms) => {
            window.setTimeout(() => window.influnetMountInfluencerProfileEdit?.(), ms);
          });
        }
        return;
      }
      onInfluencerSectionChange("settings");
      if (typeof window.influnetNavigateToEditProfile === "function") {
        window.influnetNavigateToEditProfile();
        return;
      }
      const dash = document.getElementById(MOUNT_ID);
      const menuBtn = document.querySelector(
        ".flex.h-screen header .border-l.border-gray-100 button"
      );
      if (menuBtn) menuBtn.click();
      window.setTimeout(() => {
        const editBtn = [...document.querySelectorAll("button")].find((b) => {
          if (!b.textContent.includes("Edit Profile")) return false;
          return !dash?.contains(b);
        });
        editBtn?.click();
        window.influnetMountInfluencerProfileEdit?.();
      }, 150);
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
      const shortLabel = slug ? `influnet.io/${slug}` : url;
      const text = `Check out my creator profile on Influnet: ${shortLabel}`;
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

    function kpiProgressPercent(value, trendKey, trends) {
      const v = Number(value) || 0;
      const week = Number(trends?.[trendKey]?.week) || 0;
      if (week > 0) return Math.min(95, 35 + week * 8);
      if (v <= 0) return 0;
      if (v < 5) return 28;
      if (v < 20) return 48;
      if (v < 50) return 62;
      if (v < 100) return 78;
      return 88;
    }

    function kpiAccentClass(index) {
      return ["teal", "blue", "amber", "violet", "emerald"][index] || "teal";
    }

    function iconKpiEye() {
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }

    function iconKpiHandshake() {
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12l3 3 4-4 3 3 6-6"/><path d="M14 8l2-2a2 2 0 1 1 3 3l-2 2"/></svg>`;
    }

    function iconKpiChat() {
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-1.1 4.2 8.5 8.5 0 0 1-7.4 4.3 8.4 8.4 0 0 1-4.2-1.1L3 21l1.1-5.3A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 11.5 3 8.4 8.4 0 0 1 15.7 4.1 8.5 8.5 0 0 1 21 11.5z"/></svg>`;
    }

    function iconKpiRocket() {
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4.5 16.5c-1.5 4.5 0 4.5 0 4.5s0 1.5 4.5 0L14 15"/><path d="M12 12l7-7 3 3-7 7-3-3z"/><path d="M15 5l4 4"/></svg>`;
    }

    function iconKpiStar() {
      return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 18.8 5.8 21.1 7 14.2 2 9.3l6.9-1L12 2z"/></svg>`;
    }

    function iconSearch() {
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
    }

    function formatTableDate(iso) {
      if (!iso) return "—";
      try {
        return new Date(iso).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } catch {
        return "—";
      }
    }

    function buildRequestsTableHtml(requests, profile) {
      if (!requests?.length) {
        return `<div class="infl-idash-empty">No incoming requests yet. Complete your profile to attract more brand collaborations.</div>`;
      }
      const rows = requests
        .map((r) => {
          const letter = initials(r.businessName);
          return `
          <tr>
            <td>
              <div class="infl-idash-table-brand">
                <span class="infl-idash-table-logo">${escapeHtml(letter)}</span>
                <div>
                  <strong>${escapeHtml(r.businessName)}</strong>
                  <span>${escapeHtml(r.title || "Collaboration request")}</span>
                </div>
              </div>
            </td>
            <td>${escapeHtml(formatTableDate(r.createdAt))}</td>
            <td><span class="infl-idash-pill">${escapeHtml(nicheLabel(profile.niche))}</span></td>
            <td>${escapeHtml(formatBudget(r.budget, profile.pricingMin, profile.pricingMax))}</td>
            <td>
              <div class="infl-idash-table-actions">
                <button type="button" class="infl-idash-btn infl-idash-btn-accept" data-action="respond-request">Accept</button>
                <button type="button" class="infl-idash-btn infl-idash-btn-decline" data-action="view-request">Decline</button>
              </div>
            </td>
          </tr>`;
        })
        .join("");
      return `
        <div class="infl-idash-table-wrap">
          <table class="infl-idash-table">
            <thead>
              <tr>
                <th>Brand Name</th>
                <th>Date</th>
                <th>Category</th>
                <th>Budget</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }

    function buildRecentViewsHtml(views) {
      if (!views?.length) {
        return `<div class="infl-idash-empty">When businesses view your public profile, they will appear here.</div>`;
      }
      return views
        .map((v) => {
          const logo = v.logoUrl
            ? `<img class="infl-idash-view-logo" src="${escapeHtml(v.logoUrl)}" alt="" />`
            : `<div class="infl-idash-view-dot">${escapeHtml(initials(v.businessName))}</div>`;
          return `
        <div class="infl-idash-view-row">
          ${logo}
          <div class="infl-idash-view-meta">
            <strong>${escapeHtml(v.businessName)}</strong>
            <span>${escapeHtml(v.industry || "Business")} · ${escapeHtml(timeAgo(v.viewedAt))}</span>
          </div>
        </div>`;
        })
        .join("");
    }

    function buildTrendBadge(trendKey, trends, total) {
      const t = trends?.[trendKey] || {};
      let text = "";
      let variant = "up";
      if (t.week > 0) {
        text = `+${t.week} this week`;
      } else if (t.month > 0) {
        text = `+${t.month} this month`;
      } else if (Number(total) > 0 && (t.isNew || t.new)) {
        text = "New";
        variant = "new";
      }
      if (!text) return "";
      return `<span class="infl-idash-kpi-trend infl-idash-kpi-trend--${variant}">${escapeHtml(text)}</span>`;
    }

    function buildKpiGridHtml(stats, trends) {
      const cards = [
        {
          key: "profileViews",
          action: "kpi-views",
          icon: iconKpiEye(),
          title: "Profile Views",
          value: stats.profileViews ?? 0,
          label: "Businesses discovered you",
        },
        {
          key: "collaborationRequests",
          action: "kpi-requests",
          icon: iconKpiHandshake(),
          title: "Collaboration Requests",
          value: stats.collaborationRequests ?? 0,
          label: "Brands reached out",
        },
        {
          key: "activeDiscussions",
          action: "kpi-discussions",
          icon: iconKpiChat(),
          title: "Active Discussions",
          value: stats.activeDiscussions ?? 0,
          label: "Conversations in progress",
        },
        {
          key: "activeProjects",
          action: "kpi-projects-active",
          icon: iconKpiRocket(),
          title: "Active Projects",
          value: stats.activeProjects ?? 0,
          label: "Collaboration underway",
        },
        {
          key: "savedByBusinesses",
          action: "kpi-saved",
          icon: iconKpiStar(),
          title: "Saved By Businesses",
          value: stats.savedByBusinesses ?? 0,
          label: "Added to brand watchlists",
        },
      ];
      return cards
        .map((c, i) => {
          const trend = buildTrendBadge(c.key, trends, c.value);
          const progress = kpiProgressPercent(c.value, c.key, trends);
          const accent = kpiAccentClass(i);
          return `
        <button type="button" class="infl-idash-kpi-card infl-idash-kpi-card--${accent}" data-action="${c.action}" aria-label="${escapeHtml(c.title)}: ${escapeHtml(String(c.value))}">
          <div class="infl-idash-kpi-top">
            <span class="infl-idash-kpi-icon" aria-hidden="true">${c.icon}</span>
            <span class="infl-idash-kpi-name">${escapeHtml(c.title)}</span>
          </div>
          <div class="infl-idash-kpi-metric">${escapeHtml(formatCount(c.value))}</div>
          <div class="infl-idash-kpi-label">${escapeHtml(c.label)}</div>
          <div class="infl-idash-kpi-progress" aria-hidden="true">
            <div class="infl-idash-kpi-progress-fill" style="width:${progress}%"></div>
          </div>
          ${trend ? `<div class="infl-idash-kpi-trend-row">${trend}</div>` : ""}
        </button>`;
        })
        .join("");
    }

    function buildGrowthChartHtml(stats, trends) {
      const series = [
        { label: "Views", value: Number(stats.profileViews) || 0 },
        { label: "Requests", value: Number(stats.collaborationRequests) || 0 },
        { label: "Chats", value: Number(stats.activeDiscussions) || 0 },
        { label: "Active", value: Number(stats.activeProjects) || 0 },
        { label: "Done", value: Number(stats.completedProjects) || 0 },
        { label: "Saved", value: Number(stats.savedByBusinesses) || 0 },
      ];
      const max = Math.max(...series.map((s) => s.value), 1);
      const w = 520;
      const h = 180;
      const padX = 24;
      const padY = 20;
      const innerW = w - padX * 2;
      const innerH = h - padY * 2;
      const step = innerW / (series.length - 1 || 1);

      const coords = series.map((s, i) => {
        const x = padX + step * i;
        const y = padY + innerH - (s.value / max) * innerH;
        return { x, y, ...s };
      });

      const line = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
      const area = `${line} L${coords[coords.length - 1].x.toFixed(1)} ${(padY + innerH).toFixed(1)} L${coords[0].x.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;
      const weekViews = trends?.profileViews?.week || 0;

      return `
        <div class="infl-idash-chart-head">
          <div>
            <h3>Profile Growth</h3>
            <p>Audience & collaboration momentum</p>
          </div>
          <span class="infl-idash-chart-badge">${weekViews > 0 ? `+${weekViews} views this week` : "Last 30 days"}</span>
        </div>
        <div class="infl-idash-chart-body">
          <svg class="infl-idash-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="infl-idash-chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ee3e96" stop-opacity="0.48"/>
                <stop offset="45%" stop-color="#ee3e96" stop-opacity="0.16"/>
                <stop offset="100%" stop-color="#ee3e96" stop-opacity="0"/>
              </linearGradient>
              <filter id="infl-idash-node-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2.5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path d="${area}" fill="url(#infl-idash-chart-grad)"/>
            <path d="${line}" fill="none" stroke="#ee3e96" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${coords
              .map(
                (p) => `
              <g class="infl-idash-chart-node-glow" filter="url(#infl-idash-node-glow)">
                <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="7" fill="#ee3e96" fill-opacity="0.14"/>
                <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#fff" stroke="#ee3e96" stroke-width="2.25"/>
              </g>`
              )
              .join("")}
          </svg>
          <div class="infl-idash-chart-labels">
            ${series.map((s) => `<span>${escapeHtml(s.label)}</span>`).join("")}
          </div>
        </div>`;
    }

    function buildAudienceDonutHtml(completion) {
      const done = Math.max(0, Math.min(100, Number(completion.percent) || 0));
      const remaining = 100 - done;
      return `
        <div class="infl-idash-widget infl-idash-widget--compact">
          <div class="infl-idash-widget-head">
            <h4>Profile Strength</h4>
          </div>
          <div class="infl-idash-donut-row">
            <div class="infl-idash-donut infl-idash-donut--teal" style="--seg-a:${done}%; --seg-b:${remaining}%">
              <span class="infl-idash-donut-center">${done}%</span>
            </div>
            <div class="infl-idash-donut-legend">
              <div><span class="dot dot-teal"></span> Complete ${done}%</div>
              <div><span class="dot dot-slate"></span> Remaining ${remaining}%</div>
            </div>
          </div>
        </div>`;
    }

    function buildAudienceReachHtml(profile) {
      const ig = Number(profile.instagramFollowers) || 0;
      const yt = Number(profile.youtubeSubscribers) || 0;
      const fb = Number(profile.facebookFollowers) || 0;
      const tt = Number(profile.tiktokFollowers) || 0;
      const total = ig + yt + fb + tt;
      if (total <= 0) {
        return `
          <div class="infl-idash-widget infl-idash-widget--compact">
            <div class="infl-idash-widget-head"><h4>Audience Reach</h4></div>
            <p class="infl-idash-widget-muted">Add social follower counts in your profile to see reach breakdown.</p>
          </div>`;
      }
      const segments = [
        { label: "Instagram", value: ig, color: "pink" },
        { label: "YouTube", value: yt, color: "red" },
        { label: "Facebook", value: fb, color: "blue" },
        { label: "TikTok", value: tt, color: "slate" },
      ].filter((s) => s.value > 0);
      const top = segments[0];
      const topPct = Math.round((top.value / total) * 100);
      return `
        <div class="infl-idash-widget infl-idash-widget--compact">
          <div class="infl-idash-widget-head"><h4>Audience Reach</h4></div>
          <div class="infl-idash-donut-row">
            <div class="infl-idash-donut infl-idash-donut--multi" style="--seg-a:${topPct}%; --seg-b:${100 - topPct}%">
              <span class="infl-idash-donut-center">${formatCount(total)}</span>
            </div>
            <div class="infl-idash-donut-legend">
              ${segments
                .slice(0, 3)
                .map(
                  (s) =>
                    `<div><span class="dot dot-${s.color}"></span> ${escapeHtml(s.label)} ${formatCount(s.value)}</div>`
                )
                .join("")}
            </div>
          </div>
        </div>`;
    }

    function buildCountriesWidgetHtml(recentViews) {
      const items = (recentViews || []).slice(0, 5);
      if (!items.length) {
        return `
          <div class="infl-idash-widget infl-idash-widget--compact">
            <div class="infl-idash-widget-head"><h4>Brand Interest</h4></div>
            <p class="infl-idash-widget-muted">Businesses that view your profile will appear here.</p>
          </div>`;
      }
      const max = Math.max(...items.map((v) => v.viewCount || 1), 1);
      return `
        <div class="infl-idash-widget infl-idash-widget--compact">
          <div class="infl-idash-widget-head"><h4>Brand Interest</h4></div>
          <ul class="infl-idash-rank-list">
            ${items
              .map((v, i) => {
                const pct = Math.round(((v.viewCount || 1) / max) * 100);
                return `
              <li>
                <span class="infl-idash-rank-num">${i + 1}</span>
                <div class="infl-idash-rank-meta">
                  <strong>${escapeHtml(v.businessName)}</strong>
                  <span>${escapeHtml(v.industry || "Business")}</span>
                  <div class="infl-idash-rank-bar"><div style="width:${pct}%"></div></div>
                </div>
                <span class="infl-idash-rank-val">${escapeHtml(String(v.viewCount || 1))}</span>
              </li>`;
              })
              .join("")}
          </ul>
        </div>`;
    }

    function socialPlatformLabel(id) {
      const labels = {
        instagram: "Instagram",
        facebook: "Facebook",
        youtube: "YouTube",
        linkedin: "LinkedIn",
        tiktok: "TikTok",
        twitter: "Twitter",
        snapchat: "Snapchat",
        pinterest: "Pinterest",
        website: "Website",
      };
      return labels[id] || id;
    }

    function buildProfileRailSocials(p) {
      const items = HERO_SOCIAL_DEFS.filter((def) => heroSocialIsSet(p, def)).map((def) => ({
        id: def.id,
        icon: def.icon(),
      }));
      if (!items.length) {
        return `<p class="infl-idash-rail-muted infl-idash-rail-socials-empty">Add social links in your profile</p>`;
      }
      return `<div class="infl-idash-rail-socials">${items
        .map(
          (item) =>
            `<span class="infl-idash-rail-social infl-idash-rail-social--${item.id}" aria-label="${escapeHtml(socialPlatformLabel(item.id))}">${item.icon}</span>`
        )
        .join("")}</div>`;
    }

    function buildProfileRailMetrics(p) {
      const items = HERO_SOCIAL_DEFS.filter(
        (def) => heroSocialIsSet(p, def) && resolveSocialCount(p, def) > 0
      ).slice(0, 4);
      if (!items.length) return "";
      return `<div class="infl-idash-rail-metrics">${items
        .map((def) => {
          const count = resolveSocialCount(p, def);
          return `
        <div class="infl-idash-rail-metric">
          <strong>${socialCountLabel(count)}</strong>
          <span>${escapeHtml(socialPlatformLabel(def.id))}</span>
        </div>`;
        })
        .join("")}</div>`;
    }

    function buildProfileRailHtml(data) {
      const p = data.profile || {};
      const stats = data.stats || {};
      const completion = data.completion || { percent: 0, checks: [] };
      const signupComplete = !!completion.isProfileComplete;
      const onboardingStep = Number(completion.onboardingStep) || 2;
      const publicSlug = data.username || data.profile?.username || data.profileSlug || "";
      const displayName = p.name || "Creator";
      const username = data.username || data.profile?.username || publicSlug || "";
      const avatarInner = p.avatarUrl
        ? `<img class="infl-idash-rail-avatar" src="${escapeHtml(p.avatarUrl)}" alt="" />`
        : `<div class="infl-idash-rail-avatar infl-idash-rail-avatar--initials">${escapeHtml(initials(p.name))}</div>`;
      const avatarHtml = `
            <button type="button" class="infl-idash-rail-avatar-btn" data-action="change-avatar" aria-label="Change profile photo">
              ${avatarInner}
              <span class="infl-idash-rail-avatar-overlay" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>Change photo</span>
              </span>
            </button>
            <input type="file" id="infl-idash-avatar-file" class="infl-idash-avatar-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden />`;
      const category =
        signupComplete || onboardingStep >= 3 ? nicheLabel(p.niche) : "Add your category";
      const location =
        signupComplete || onboardingStep >= 4 ? p.location || "Add location" : "Add location";
      const langList = Array.isArray(p.languages) ? p.languages.filter(Boolean).map(String) : [];
      const languages = formatLanguagesLabel(p.languages, signupComplete, onboardingStep);
      const memberSince = formatMemberSince(stats.memberSince || p.memberSince || p.createdAt);
      const availability = availabilityText(p.availabilityStatus);
      const categoryClass =
        signupComplete || onboardingStep >= 3
          ? "infl-idash-rail-category"
          : "infl-idash-rail-category infl-idash-rail-muted";
      const locationClass =
        signupComplete || onboardingStep >= 4
          ? "infl-idash-rail-loc"
          : "infl-idash-rail-loc infl-idash-rail-muted";
      const languagesClass =
        langList.length
          ? "infl-idash-rail-loc"
          : signupComplete || onboardingStep >= 4
            ? "infl-idash-rail-loc infl-idash-rail-muted"
            : "infl-idash-rail-loc infl-idash-rail-muted";
      const primaryAction = `<button type="button" class="infl-idash-btn infl-idash-btn-rail-primary" data-action="view-public">
                ${iconExternal()} View Public Profile
              </button>`;

      return `
        <aside class="infl-idash-rail" aria-label="Profile sidebar">
          <div class="infl-idash-rail-card infl-idash-rail-card--profile">
            <div class="infl-idash-rail-avatar-wrap">
              ${avatarHtml}
              <span class="infl-idash-online" title="Online"></span>
            </div>
            <h2 class="infl-idash-rail-name">${escapeHtml(displayName)}</h2>
            <p class="infl-idash-rail-handle">@${escapeHtml(username || "username")}</p>
            ${buildProfileRailSocials(p)}
            <p class="${categoryClass}">${escapeHtml(category)}</p>
            ${buildProfileRailMetrics(p)}
            <p class="${locationClass}">${iconPin()} ${escapeHtml(location)}</p>
            <p class="${languagesClass}">${iconGlobe()} ${escapeHtml(languages)}</p>
            ${p.isVerified ? '<span class="infl-idash-verified-creator">✓ Verified Creator</span>' : ""}
            ${availability ? `<p class="infl-idash-rail-meta">${escapeHtml(availability)}</p>` : ""}
            ${memberSince ? `<p class="infl-idash-rail-meta">Member since ${escapeHtml(memberSince)}</p>` : ""}
            <div class="infl-idash-rail-actions">
              ${primaryAction}
              <button type="button" class="infl-idash-btn infl-idash-btn-rail-ghost" data-action="share-profile"${signupComplete ? "" : " disabled"}>
                ${iconShare()} Share
              </button>
              <button type="button" class="infl-idash-btn infl-idash-btn-rail-soft" data-action="edit-profile">Edit Profile</button>
            </div>
          </div>

          <div class="infl-idash-rail-card">
            <h3>Profile Completion</h3>
            <div class="infl-idash-completion infl-idash-completion--rail">
              <div class="infl-idash-ring" style="--pct:${completion.percent}%" data-label="${completion.percent}%"></div>
              ${buildChecklistHtml(completion.checks || [])}
            </div>
          </div>

          ${buildAudienceDonutHtml(completion)}
          ${buildAudienceReachHtml(p)}
          ${buildCountriesWidgetHtml(data.recentViews)}

          <div class="infl-idash-rail-card">
            <h3>Quick Actions</h3>
            <div class="infl-idash-actions-grid infl-idash-actions-grid--rail">
              <button type="button" class="infl-idash-action-btn" data-action="edit-profile">Edit Profile</button>
              <button type="button" class="infl-idash-action-btn" data-action="share-profile">Share Profile</button>
              <button type="button" class="infl-idash-action-btn" data-action="edit-profile">Update Portfolio</button>
              <button type="button" class="infl-idash-action-btn" data-action="edit-profile">Social Links</button>
            </div>
          </div>
        </aside>`;
    }

    function buildInterestedBusinessesHtml(items) {
      if (!items?.length) {
        return `<div class="infl-idash-empty">When brands save you to their watchlist, they will appear here.</div>`;
      }
      return items
        .map((b) => {
          const logo = b.logoUrl
            ? `<img class="infl-idash-view-logo" src="${escapeHtml(b.logoUrl)}" alt="" />`
            : `<div class="infl-idash-view-dot">${escapeHtml(initials(b.businessName))}</div>`;
          return `
        <div class="infl-idash-view-row">
          ${logo}
          <div class="infl-idash-view-meta">
            <strong>${escapeHtml(b.businessName)}</strong>
            <span>${escapeHtml(b.industry || "Business")} · Saved ${escapeHtml(timeAgo(b.savedAt))}</span>
          </div>
        </div>`;
        })
        .join("");
    }

    function scrollToDashSection(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.classList.add("infl-idash-section-highlight");
      window.setTimeout(() => el.classList.remove("infl-idash-section-highlight"), 1800);
    }

    function buildChecklistHtml(checks) {
      return `<ul class="infl-idash-checklist">${checks
        .map(
          (c) =>
            `<li class="${c.done ? "done" : "missing"}">${c.done ? "✓" : "○"} ${escapeHtml(c.label)}</li>`
        )
        .join("")}</ul>`;
    }

    async function refreshCompletionRail() {
      const mount = document.getElementById(MOUNT_ID);
      if (!mount || !isHomeSectionActive()) return;
      if (!mount.querySelector("[data-infl-dashboard]")) return;
      try {
        const res = await fetch("/api/profile/completion", { credentials: "same-origin" });
        const data = await res.json();
        if (!res.ok || !data.completion) return;
        const completion = data.completion;
        const pct = Math.max(0, Math.min(100, Number(completion.percent) || 0));
        mount.querySelectorAll(".infl-idash-ring").forEach((ring) => {
          ring.style.setProperty("--pct", `${pct}%`);
          ring.setAttribute("data-label", `${pct}%`);
        });
        mount.querySelectorAll(".infl-idash-donut").forEach((donut) => {
          donut.style.setProperty("--seg-a", `${pct}%`);
          donut.style.setProperty("--seg-b", `${100 - pct}%`);
        });
        mount.querySelectorAll(".infl-idash-donut-center").forEach((el) => {
          el.textContent = `${pct}%`;
        });
        const checklist = mount.querySelector(".infl-idash-checklist");
        if (checklist) {
          checklist.outerHTML = buildChecklistHtml(completion.checks || []);
        }
      } catch (_) {}
    }

    window.influnetRefreshProfileCompletionRail = refreshCompletionRail;

    function nicheLabel(niche) {
      const list = Array.isArray(niche) ? niche.filter(Boolean) : [];
      return list[0] || "Creator";
    }

    function socialCountLabel(count) {
      const n = Number(count) || 0;
      return n > 0 ? formatCount(n) : "—";
    }

    function socialAudienceLabel(id) {
      if (id === "youtube") return "subscribers";
      return "followers";
    }

    function formatMemberSince(value) {
      if (!value) return "";
      try {
        return new Date(value).toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
        });
      } catch {
        return "";
      }
    }

    function availabilityText(status) {
      const s = String(status || "").trim().toLowerCase();
      if (s === "open" || s === "available") return "Available for Collaborations";
      if (s === "limited") return "Limited Availability";
      if (s === "paused" || s === "unavailable") return "Not Available";
      return "";
    }

    function iconInstagram() {
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`;
    }

    function iconFacebook() {
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M13.5 3H10a2 2 0 0 0-2 2v3H5v4h3v9h4v-9h3.1L16 8h-3V5.5c0-.8.2-1 1.1-1H16V3h-2.5z"/></svg>`;
    }

    function iconYoutube() {
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18 5 12 5 12 5s-6 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 9 2 12 2 12s0 3 .4 4.8a2.5 2.5 0 0 0 1.8 1.8C6 19 12 19 12 19s6 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.8.4-4.8.4-4.8s0-3-.4-4.8zM10 15.5V8.5l6 3.5-6 3.5z"/></svg>`;
    }

    function iconTiktok() {
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16.5 3c.4 2.1 1.8 3.8 3.8 4.4v3.2c-1.4 0-2.7-.4-3.8-1.1v6.6c0 3.4-2.8 5.9-6 5.9S4.5 19.5 4.5 16 7.3 10.1 10.5 10.1c.3 0 .7 0 1 .1v3.4c-.3-.1-.6-.2-1-.2-1.5 0-2.7 1.2-2.7 2.7s1.2 2.7 2.7 2.7 2.7-1.2 2.7-2.7V3h3.3z"/></svg>`;
    }

    function iconLinkedin() {
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6.5 8.7v12.3H2.2V8.7h4.3zM4.3 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM20 21h-4.3v-5.8c0-1.4 0-3.2-2-3.2-2 0-2.3 1.5-2.3 3.1V21H7.1V8.7h4.1v1.6h.1c.6-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6v6.7z"/></svg>`;
    }

    function iconTwitter() {
      return `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.3 3H20l-6.5 7.4L21 21h-6.2l-4.9-6.4L4.5 21H2l7-8L3 3h6.4l4.4 5.8L17.3 3zm-2.2 16h1.7L8.9 4.9H7.1l8 14.1z"/></svg>`;
    }

    function iconSnapchat() {
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2c-2.8 0-3.2 2-3.2 2.2 0 .5-.1 1.1-.5 1.5-.6.6-1.7.5-2.2.9-.4.4-.3 1.1-.3 1.6 0 .8.4 1.2.8 1.5.7.5 1.8.4 2.3.8.4.3.3 1.1.6 1.8.2.5.7 1.4 2.2 1.4s2-.9 2.2-1.4c.3-.7.2-1.5.6-1.8.5-.4 1.6-.3 2.3-.8.4-.3.8-.7.8-1.5 0-.5.1-1.2-.3-1.6-.5-.4-1.6-.3-2.2-.9-.4-.4-.5-1-.5-1.5C15.2 4 14.8 2 12 2z"/></svg>`;
    }

    function iconPinterest() {
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12c0 4.1 2.5 7.6 6.1 9.1-.1-.8-.2-2 .1-2.9.2-.8 1.5-5.2 1.5-5.2s-.4-.8-.4-1.9c0-1.8 1-3.1 2.4-3.1 1.1 0 1.7.8 1.7 1.8 0 1.1-.7 2.7-1.1 4.2-.3 1.2.6 2.2 1.8 2.2 2.2 0 3.9-2.3 3.9-5.6 0-2.9-2.1-5-5.1-5-3.5 0-5.5 2.6-5.5 5.3 0 1 .4 2.1.9 2.7.1.1.1.2.1.3l-.3 1.3c0 .1 0 .2.1.3.1.1.2.1.3.1.4-.1 1.6-.7 2.1-1.2.8-.9 1.4-2.1 1.4-3.5 0-2.7-2-4.8-4.8-4.8-3.3 0-5.2 2.5-5.2 5.4 0 1 .4 2.1 1 2.7.1.1.1.3 0 .4l-.4 1.5c0 .2-.1.3-.3.2-1-.5-1.6-2-1.6-3.2 0-2.6 1.9-5.6 5.6-5.6 2.9 0 5.2 2.1 5.2 5.1 0 2.9-1.8 5.3-4.4 5.3-.9 0-1.7-.5-2-.9 0 0-.4 1.7-.5 2-.2.7-.6 1.4-1 1.9 1.2.4 2.4.6 3.7.6 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>`;
    }

    function iconWebsite() {
      return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9z"/></svg>`;
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

    function iconGlobe() {
      return `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
    }

    function formatLanguagesLabel(langs, signupComplete, onboardingStep) {
      const list = Array.isArray(langs) ? langs.filter(Boolean).map(String) : [];
      if (list.length) return list.join(", ");
      if (signupComplete || onboardingStep >= 4) return "Add languages";
      return "Add languages";
    }

    function hasSocialHandle(profile, field) {
      const v = profile?.[field];
      return !!(v && String(v).trim());
    }

    function parseExtraSocialLinks(raw) {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    }

    function getExtraSocialUrl(profile, platformId) {
      const link = parseExtraSocialLinks(profile?.extraSocialLinks).find(
        (item) => item && String(item.id || "").toLowerCase() === platformId
      );
      const url = link?.url != null ? String(link.url).trim() : "";
      return url || null;
    }

    function getExtraSocialFollowers(profile, id) {
      const links = Array.isArray(profile?.extraSocialLinks) ? profile.extraSocialLinks : [];
      const hit = links.find((l) => l && String(l.id || "").toLowerCase() === id);
      const n = Number(hit?.followers);
      return Number.isFinite(n) && n > 0 ? n : null;
    }

    function resolveSocialCount(profile, def) {
      if (def.countKey) {
        const n = Number(profile[def.countKey]) || 0;
        if (n > 0) return n;
      }
      const extraId = def.metricExtraId || def.extraId || def.id;
      return getExtraSocialFollowers(profile, extraId);
    }

    const HERO_SOCIAL_DEFS = [
      { id: "instagram", field: "instagramHandle", countKey: "instagramFollowers", icon: iconInstagram },
      { id: "facebook", field: "facebookHandle", countKey: "facebookFollowers", icon: iconFacebook },
      { id: "youtube", field: "youtubeHandle", countKey: "youtubeSubscribers", icon: iconYoutube },
      { id: "linkedin", field: "linkedinHandle", metricExtraId: "linkedin", icon: iconLinkedin },
      { id: "tiktok", field: "tiktokHandle", countKey: "tiktokFollowers", icon: iconTiktok },
      { id: "twitter", field: "twitterHandle", metricExtraId: "twitter", icon: iconTwitter },
      { id: "snapchat", extraId: "snapchat", metricExtraId: "snapchat", icon: iconSnapchat },
      { id: "pinterest", extraId: "pinterest", metricExtraId: "pinterest", icon: iconPinterest },
      { id: "website", extraId: "website", icon: iconWebsite },
    ];

    function heroSocialIsSet(profile, def) {
      if (def.field) return hasSocialHandle(profile, def.field);
      if (def.extraId) return !!getExtraSocialUrl(profile, def.extraId);
      return false;
    }

    function buildHeroSocials(p) {
      const items = HERO_SOCIAL_DEFS.filter((def) => heroSocialIsSet(p, def)).map((def) => ({
        id: def.id,
        icon: def.icon(),
        count: resolveSocialCount(p, def),
        label: socialAudienceLabel(def.id),
      }));

      return items
        .slice(0, 3)
        .map(
          (item) => `
        <div class="infl-idash-hero-social-item">
          <span class="infl-idash-hero-social-btn infl-idash-hero-social-btn--${item.id}" aria-hidden="true">
            ${item.icon}
          </span>
          <span class="infl-idash-hero-social-count">${socialCountLabel(item.count)} ${item.label}</span>
        </div>`
        )
        .join("");
    }

    function buildHtml(data) {
      const p = data.profile || {};
      const stats = data.stats || {};
      const displayName = p.name || "Creator";

      return `
      <div class="infl-idash" data-infl-dashboard>
        <div class="infl-idash-layout">
          <div class="infl-idash-main">
            <header class="infl-idash-topbar">
              <div class="infl-idash-topbar-title">
                <h1>Dashboard</h1>
                <p>${escapeHtml(getGreeting())}, ${escapeHtml(displayName.split(" ")[0])} — here's your growth overview</p>
              </div>
              <div class="infl-idash-search" role="search">
                <span class="infl-idash-search-icon" aria-hidden="true">${iconSearch()}</span>
                <input type="search" class="infl-idash-search-input" placeholder="Search brands, requests, collaborations…" aria-label="Search dashboard" data-infl-dash-search />
              </div>
            </header>

            <section class="infl-idash-kpi-section" aria-label="Key metrics">
              <div class="infl-idash-kpi-grid">
                ${buildKpiGridHtml(stats, data.trends)}
              </div>
            </section>

            <section class="infl-idash-widgets-row">
              <div class="infl-idash-card infl-idash-card--chart">
                ${buildGrowthChartHtml(stats, data.trends)}
              </div>
              <div class="infl-idash-card infl-idash-card--side" id="infl-idash-interested-businesses">
                <div class="infl-idash-card-head">
                  <h3>Interested Businesses</h3>
                </div>
                ${buildInterestedBusinessesHtml(data.interestedBusinesses)}
              </div>
            </section>

            <section class="infl-idash-card infl-idash-card--table">
              <div class="infl-idash-card-head">
                <div>
                  <h3>Recent Business Requests</h3>
                  <p class="infl-idash-card-sub">Incoming collaboration opportunities</p>
                </div>
                <button type="button" class="infl-idash-link-btn" data-action="all-requests">View all</button>
              </div>
              ${buildRequestsTableHtml(data.requests, p)}
            </section>

            <section class="infl-idash-card infl-idash-scroll-target" id="infl-idash-recent-views">
              <div class="infl-idash-card-head">
                <h3>Recently Viewed By</h3>
              </div>
              ${buildRecentViewsHtml(data.recentViews)}
            </section>
          </div>

          ${buildProfileRailHtml(data)}
        </div>
      </div>`;
    }

    function wireActions(mount, data) {
      const slug = data.username || data.profile?.username || data.profileSlug || data.profile?.profileSlug;
      const publicPath =
        data.publicPath || (slug ? `influnet/${slug}` : "influnet/your-profile");
      const publicUrl =
        data.profile?.profileUrl ||
        (slug ? `${window.location.origin}/influnet/${slug}` : window.location.origin);

      const searchInput = mount.querySelector("[data-infl-dash-search]");
      if (searchInput) {
        searchInput.addEventListener("input", () => {
          const q = searchInput.value.trim().toLowerCase();
          mount.querySelectorAll(".infl-idash-table tbody tr").forEach((row) => {
            const text = row.textContent.toLowerCase();
            row.style.display = !q || text.includes(q) ? "" : "none";
          });
        });
      }

      mount.querySelectorAll("[data-action]").forEach((el) => {
        el.addEventListener("click", (e) => {
          if (el.getAttribute("data-action") === "change-avatar") return;
          e.preventDefault();
          const action = el.getAttribute("data-action");
          if (action === "edit-profile") goToProfile();
          else if (action === "view-public") {
            const path = slug ? `/influnet/${encodeURIComponent(slug)}` : publicUrl;
            window.open(path, "_blank", "noopener,noreferrer");
          }
          else if (action === "share-profile") shareProfile(publicUrl, slug);
          else if (action === "copy-url") copyText(publicUrl);
          else if (action === "all-requests" || action === "view-request" || action === "respond-request") {
            navToSection("Requests");
          }
          else if (action === "kpi-views") scrollToDashSection("infl-idash-recent-views");
          else if (action === "kpi-saved") scrollToDashSection("infl-idash-interested-businesses");
          else if (action === "kpi-requests") navToSection("Requests");
          else if (action === "kpi-discussions") navToSection("Messages");
          else if (action === "kpi-projects-active" || action === "kpi-projects-completed") {
            navToSection("Projects");
          }
        });
      });

      wireAvatarUpload(mount);
    }

    async function loadDashboard() {
      if (!isHomeSectionActive()) return;
      const mount = document.getElementById(MOUNT_ID);
      if (!mount || !getMainEl()?.contains(mount)) return;
      if (!isHomeSectionActive()) return;

      const hasContent = !!mount.querySelector("[data-infl-dashboard]");
      if (hasContent && !dashboardNeedsRefresh) {
        restoreHomeDashboardOverlay();
        mount.dataset.loading = "0";
        return;
      }
      if (mount.dataset.loading === "1") return;

      const loadGen = ++dashboardLoadGeneration;
      mount.dataset.loading = "1";
      if (!hasContent) {
        mount.innerHTML = '<div class="infl-idash-loading">Loading your dashboard…</div>';
      } else {
        restoreHomeDashboardOverlay();
      }

      try {
        const res = await fetch(API, { credentials: "same-origin" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load dashboard");
        if (!isHomeSectionActive() || loadGen !== dashboardLoadGeneration) {
          mount.dataset.loading = "0";
          hideHomeMount();
          return;
        }

        const renderKey = JSON.stringify({
          id: data.profile?.userId,
          stats: data.stats,
          trends: data.trends,
          interested: (data.interestedBusinesses || []).length,
          requests: (data.requests || []).length,
          percent: data.completion?.percent,
          social: data.socialPlatforms,
          profile: {
            bio: data.profile?.bio,
            location: data.profile?.location,
            niche: data.profile?.niche,
            username: data.profile?.username,
            profileSlug: data.profileSlug,
            instagramFollowers: data.profile?.instagramFollowers,
            facebookFollowers: data.profile?.facebookFollowers,
            youtubeSubscribers: data.profile?.youtubeSubscribers,
            tiktokFollowers: data.profile?.tiktokFollowers,
            instagramHandle: data.profile?.instagramHandle,
            youtubeHandle: data.profile?.youtubeHandle,
            tiktokHandle: data.profile?.tiktokHandle,
            facebookHandle: data.profile?.facebookHandle,
            linkedinHandle: data.profile?.linkedinHandle,
            twitterHandle: data.profile?.twitterHandle,
            extraSocialLinks: data.profile?.extraSocialLinks,
          },
        });
        if (
          renderKey === lastRenderKey &&
          mount.querySelector("[data-infl-dashboard]")
        ) {
          dashboardNeedsRefresh = false;
          mount.dataset.loading = "0";
          restoreHomeDashboardOverlay();
          return;
        }
        if (!isHomeSectionActive() || loadGen !== dashboardLoadGeneration) {
          mount.dataset.loading = "0";
          hideHomeMount();
          return;
        }
        lastRenderKey = renderKey;
        dashboardNeedsRefresh = false;

        mount.innerHTML = buildHtml(data);
        if (!isHomeSectionActive() || loadGen !== dashboardLoadGeneration) {
          mount.innerHTML = "";
          hideHomeMount();
          mount.dataset.loading = "0";
          return;
        }
        wireActions(mount, data);
      } catch (err) {
        if (isHomeSectionActive() && loadGen === dashboardLoadGeneration) {
          mount.innerHTML = `<div class="infl-idash-loading">Could not load dashboard. ${escapeHtml(err.message)}</div>`;
        } else {
          hideHomeMount();
        }
      }
      if (loadGen === dashboardLoadGeneration) {
        mount.dataset.loading = "0";
      }
    }

    function tick() {
      wireNavSync();
      if (isHomeSectionActive()) {
        ensureDashboardContent();
      } else {
        suppressHomeDashboardOverlay();
      }
    }

    window.addEventListener("influnet-profile-updated", () => {
      refreshCompletionRail();
      markDashboardStale();
      tick();
    });

    window.addEventListener("influnet-user-updated", () => {
      markDashboardStale();
      tick();
    });

    window.addEventListener("influnet-influencer-open-profile", () => {
      onInfluencerSectionChange("settings");
    });

    function onDashboardDataEvent() {
      markDashboardStale();
      tick();
    }

    window.addEventListener("influnet-collab-accepted", onDashboardDataEvent);
    window.addEventListener("influnet-dashboard-stale", onDashboardDataEvent);
    window.addEventListener("influnet-notification", (e) => {
      const t = e.detail?.type || "";
      if (/REQUEST_|project_update|NEW_REQUEST|collab_|conversation/.test(t)) {
        onDashboardDataEvent();
      }
    });

    window.influnetReloadInfluencerDashboard = () => {
      markDashboardStale();
      tick();
    };

    tick();
    setInterval(tick, 3000);
    window.addEventListener("popstate", tick);
    window.addEventListener("load", tick);
  } catch (e) {
    console.warn("[influnet] influencer-dashboard-home:", e);
  }
})();
