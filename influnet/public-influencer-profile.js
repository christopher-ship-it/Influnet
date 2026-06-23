/**
 * LinkedIn-style professional creator public profile — /influnet/:slug
 */
(function () {
  const COLLAB_LABELS = {
    reel: "Instagram Reel",
    story: "Instagram Story",
    post: "Instagram Post",
    yt: "YouTube Video",
    yts: "YouTube Short",
    event: "Event Appearance",
    review: "Product Review",
    ugc: "UGC Content",
    ambassador: "Brand Ambassador",
    live: "Live Promotion",
  };

  const AVAILABILITY_LABELS = {
    open: "Available",
    available: "Available",
    limited: "Limited Availability",
    paused: "Unavailable",
    unavailable: "Unavailable",
  };

  const USERNAME_RE = /^[a-z0-9][a-z0-9._]{2,29}$/;

  function normalizeUserRole(role) {
    const r = String(role || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (["business_owner", "business", "brand", "businessowner"].includes(r)) {
      return "business_owner";
    }
    if (r === "influencer" || r === "creator") return "influencer";
    return r || null;
  }

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem("influnet_user") || "null");
    } catch {
      return null;
    }
  }

  function normalizeLegacySlug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function parsePathSegment(segment) {
    const raw = decodeURIComponent(segment || "").trim().toLowerCase();
    if (USERNAME_RE.test(raw)) return raw;
    return normalizeLegacySlug(raw) || null;
  }

  function parseSlug() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    const canonical = path.match(/^\/influnet\/([^/]+)$/i);
    if (canonical) return parsePathSegment(canonical[1]);
    const legacy = path.match(/^\/(influencer|profile)\/([^/]+)$/i);
    if (legacy) {
      const slug = parsePathSegment(legacy[2]);
      if (slug) window.location.replace(`/influnet/${encodeURIComponent(slug)}`);
      return null;
    }
    return null;
  }

  function resolveSlugFromProfile(profile) {
    const u = String(profile?.username || "").trim().toLowerCase();
    if (USERNAME_RE.test(u)) return u;
    const legacy = String(profile?.profileSlug || "").trim().toLowerCase();
    return legacy || null;
  }

  function initials(name) {
    const p = String(name || "?").trim().split(/\s+/);
    return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseJsonArray(raw) {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p.filter(Boolean) : raw ? [raw] : [];
      } catch {
        return raw ? [raw] : [];
      }
    }
    return [];
  }

  function nicheList(niche) {
    return [...new Set(parseJsonArray(niche).map((n) => String(n).trim()).filter(Boolean))];
  }

  function languageList(profile) {
    return [...new Set(parseJsonArray(profile.languages).map((l) => String(l).trim()).filter(Boolean))];
  }

  function collabList(profile) {
    return parseJsonArray(profile.collabTypes)
      .map((id) => COLLAB_LABELS[id] || id)
      .filter(Boolean);
  }

  function formatCount(n) {
    const num = Number(n) || 0;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return String(num);
  }

  function getFollowerCount(profile, platform) {
    const keys =
      platform === "instagram"
        ? ["instagramFollowers", "igFollowers", "instagramFollowerCount", "instaFollowers"]
        : ["facebookFollowers", "fbFollowers", "facebookFollowerCount"];
    const nested = [
      profile?.publicStats || null,
      profile?.audienceDemographics || null,
      profile?.metrics || null,
    ].filter(Boolean);
    for (const key of keys) {
      const values = [profile?.[key], ...nested.map((n) => n[key])];
      for (const val of values) {
        if (val == null || val === "") continue;
        const num = Number(String(val).replace(/,/g, ""));
        if (Number.isFinite(num) && num >= 0) return num;
      }
    }
    return null;
  }

  function buildHeroFollowerStats(profile, socialItems) {
    const hasInstagram = socialItems.some((s) => s.key === "instagram");
    const hasFacebook = socialItems.some((s) => s.key === "facebook");
    const ig = hasInstagram ? getFollowerCount(profile, "instagram") : null;
    const fb = hasFacebook ? getFollowerCount(profile, "facebook") : null;
    const cards = [];
    if (hasInstagram) {
      cards.push(`
        <div class="ipp-hero-social-card">
          <span class="ipp-hero-social-logo ipp-hero-social-logo--ig" aria-hidden>
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path fill="currentColor" d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6m9.9 1.5a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/></svg>
          </span>
          <div><div class="ipp-hero-social-name">Instagram</div><div class="ipp-hero-social-count">${ig != null ? `${escapeHtml(formatCount(ig))} followers` : "Followers hidden"}</div></div>
        </div>`);
    }
    if (hasFacebook) {
      cards.push(`
        <div class="ipp-hero-social-card">
          <span class="ipp-hero-social-logo ipp-hero-social-logo--fb" aria-hidden>
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path fill="currentColor" d="M13.8 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5H17V3.6c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.3v2.1H7.7V13h2.7v8h3.4z"/></svg>
          </span>
          <div><div class="ipp-hero-social-name">Facebook</div><div class="ipp-hero-social-count">${fb != null ? `${escapeHtml(formatCount(fb))} followers` : "Followers hidden"}</div></div>
        </div>`);
    }
    if (!cards.length) return "";
    return `<div class="ipp-hero-socials">${cards.join("")}</div>`;
  }

  function formatLocation(profile) {
    const city = String(profile.city || "").trim();
    const state = String(profile.state || "").trim();
    if (city && state) return `${city}, ${state}`;
    if (profile.location) return String(profile.location).trim();
    if (city) return city;
    if (state) return state;
    return null;
  }

  function formatMemberSince(value) {
    if (!value) return null;
    try {
      return new Date(value).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    } catch {
      return null;
    }
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(value);
    }
  }

  function availabilityLabel(status) {
    const key = String(status || "").toLowerCase();
    return AVAILABILITY_LABELS[key] || null;
  }

  function availabilityClass(status) {
    const key = String(status || "").toLowerCase();
    if (key === "open" || key === "available") return "ipp-badge--open";
    if (key === "limited") return "ipp-badge--limited";
    return "ipp-badge--paused";
  }

  function computeProfileCompletion(profile) {
    const checks = [
      !!profile.avatarUrl,
      !!String(profile.bio || "").trim(),
      !!String(profile.headline || "").trim(),
      nicheList(profile.niche).length > 0,
      languageList(profile).length > 0,
      collabList(profile).length > 0,
      !!profile.availabilityStatus,
      parsePortfolio(profile.portfolio).length > 0,
      !!(profile.instagramHandle || profile.youtubeHandle || profile.linkedinHandle),
      !!formatLocation(profile),
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }

  function socialUrl(platform, handle) {
    const h = String(handle || "").trim().replace(/^@/, "");
    if (!h) return null;
    if (/^https?:\/\//i.test(h)) return h;
    switch (platform) {
      case "instagram":
        return `https://instagram.com/${h}`;
      case "youtube":
        return h.startsWith("UC") || h.includes("/")
          ? `https://youtube.com/${h}`
          : `https://youtube.com/@${h}`;
      case "tiktok":
        return `https://tiktok.com/@${h}`;
      case "linkedin":
        return `https://linkedin.com/in/${h}`;
      case "facebook":
        return `https://facebook.com/${h}`;
      default:
        return h.includes(".") ? `https://${h.replace(/^https?:\/\//, "")}` : null;
    }
  }

  function getSocialItems(profile) {
    const platforms = [
      { key: "instagram", handle: profile.instagramHandle, label: "Instagram", cls: "ig" },
      { key: "youtube", handle: profile.youtubeHandle, label: "YouTube", cls: "yt" },
      { key: "facebook", handle: profile.facebookHandle, label: "Facebook", cls: "fb" },
      { key: "linkedin", handle: profile.linkedinHandle, label: "LinkedIn", cls: "li" },
      { key: "tiktok", handle: profile.tiktokHandle, label: "TikTok", cls: "tt" },
    ];
    const items = platforms
      .map((p) => {
        const url = socialUrl(p.key, p.handle);
        if (!url) return null;
        return { ...p, url, handle: String(p.handle).replace(/^@/, "") };
      })
      .filter(Boolean);

    parseJsonArray(profile.extraSocialLinks).forEach((item) => {
      if (!item) return;
      const url = String(item.url || item.handle || "").trim();
      if (!url) return;
      const id = String(item.id || item.platform || "web").toLowerCase();
      if (id === "website" || id === "web" || id === "site") {
        items.push({
          key: "website",
          label: "Website",
          cls: "web",
          url: socialUrl("website", url),
          handle: url.replace(/^https?:\/\//, ""),
        });
      }
    });
    return items;
  }

  function isVideoUrl(url) {
    const u = String(url || "").toLowerCase();
    return (
      u.includes("youtube.com") ||
      u.includes("youtu.be") ||
      u.includes("tiktok.com") ||
      u.includes("vimeo.com") ||
      u.includes("/reel/") ||
      u.includes("/reels/")
    );
  }

  function isDriveOrShareUrl(url) {
    const u = String(url || "").toLowerCase();
    return (
      u.includes("drive.google.com") ||
      u.includes("docs.google.com") ||
      u.includes("dropbox.com") ||
      u.includes("onedrive.live.com") ||
      u.includes("sharepoint.com") ||
      u.includes("box.com")
    );
  }

  function parsePortfolio(raw) {
    return parseJsonArray(raw)
      .map((item) => {
        if (typeof item === "string") return { url: item, title: null, brand: null, date: null, description: null };
        if (item && typeof item === "object") {
          return {
            url: item.url || item.link || item.src || "",
            title: item.title || item.caption || null,
            brand: item.brand || item.brandName || null,
            date: item.date || item.year || null,
            description: item.description || null,
            type: item.type || null,
          };
        }
        return null;
      })
      .filter((x) => x && x.url);
  }

  function parsePastCollabs(raw) {
    return parseJsonArray(raw)
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        return {
          brandName: item.brandName || item.brand || item.name || null,
          campaignName: item.projectType || item.campaign || item.title || item.name || null,
          category: item.category || item.niche || null,
          date: item.date || item.year || null,
          status: item.status || "Completed",
          logoUrl: item.logoUrl || item.logo || null,
        };
      })
      .filter((c) => c && c.brandName);
  }

  function parseReviews(profile) {
    return parseJsonArray(profile.testimonials || profile.reviews)
      .map((t) => {
        if (!t || typeof t !== "object") return null;
        const review = String(t.quote || t.text || t.review || "").trim();
        if (!review) return null;
        return {
          reviewer: t.author || t.reviewer || t.name || "Business",
          business: t.company || t.businessName || t.business || "",
          rating: t.rating != null ? Number(t.rating) : null,
          review,
          date: t.date || t.createdAt || null,
        };
      })
      .filter(Boolean);
  }

  function hasAudienceData(profile, niches, languages) {
    const demo =
      profile.audienceDemographics && typeof profile.audienceDemographics === "object"
        ? profile.audienceDemographics
        : {};
    const cities = parseJsonArray(demo.topCities || demo.cities).filter(Boolean);
    const ages = parseJsonArray(demo.ageRanges || demo.ages).filter(Boolean);
    const regions = parseJsonArray(demo.regions).filter(Boolean);
    return (
      cities.length > 0 ||
      ages.length > 0 ||
      regions.length > 0 ||
      (profile.engagementRate != null && profile.engagementRate !== "") ||
      niches.length > 0 ||
      languages.length > 0 ||
      !!formatLocation(profile)
    );
  }

  function buildStatsBar(profile) {
    const s = profile.publicStats || {};
    const completed =
      s.completedCollaborations ??
      s.projectsCompleted ??
      s.completedProjects ??
      0;
    const cells = [
      { value: formatCount(s.profileViews || 0), label: "Profile Views" },
      { value: formatCount(s.businessConnections || 0), label: "Connections" },
      { value: formatCount(completed || 0), label: "Completed Collaborations" },
      {
        value:
          s.responseRate != null && s.responseRate !== ""
            ? `${s.responseRate}%`
            : "—",
        label: "Response Rate",
      },
    ];

    return `
      <div class="ipp-stats-bar">
        <div class="ipp-stats-track">
          ${cells
            .map(
              (c) => `
            <div class="ipp-stat-cell">
              <div class="ipp-stat-value${c.isText ? " is-text" : ""}">${escapeHtml(c.value)}</div>
              <div class="ipp-stat-label">${escapeHtml(c.label)}</div>
            </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  function buildHeroActions(profile, slug) {
    const viewer = profile.viewer;
    const own = !!viewer?.isOwner;
    const loginNext = encodeURIComponent(slug ? `/influnet/${slug}` : "/");

    if (own) {
      return `
        <a href="/dashboard/influencer" class="ipp-btn ipp-btn--back">← Back to Dashboard</a>
        <button type="button" class="ipp-btn ipp-btn--primary" id="ipp-edit-profile">Edit Profile</button>
        <button type="button" class="ipp-btn ipp-btn--outline" id="ipp-share-profile">Share Profile</button>`;
    }

    if (viewer?.isBusiness) {
      return `
        <button type="button" class="ipp-btn ipp-btn--primary" id="ipp-hero-collab">Send Collaboration Request</button>
        <button type="button" class="ipp-btn ipp-btn--outline" id="ipp-hero-message">Message Creator</button>
        <button type="button" class="ipp-btn ipp-btn--ghost" id="ipp-hero-save">Save Creator</button>`;
    }

    if (viewer?.id) {
      return `<p class="ipp-login-prompt">Log in with a <a href="/login?next=${loginNext}">business account</a> to collaborate with this creator.</p>`;
    }

    return `
      <a href="/login?next=${loginNext}" class="ipp-btn ipp-btn--primary">Log in to collaborate</a>
      <a href="/signup/business" class="ipp-btn ipp-btn--outline">Join as business</a>`;
  }

  function buildCollabWidget(profile, slug, cssClass) {
    const viewer = profile.viewer;
    if (!viewer?.isBusiness || viewer?.isOwner) return "";

    const loginNext = encodeURIComponent(slug ? `/influnet/${slug}` : "/");
    if (!viewer.id) {
      return `
        <div class="ipp-side-card ipp-collab-widget ${cssClass}">
          <h3>Request Collaboration</h3>
          <p class="ipp-login-prompt">
            <a href="/login?next=${loginNext}">Log in</a> as a business owner to send a collaboration request.
          </p>
        </div>`;
    }

    const first = escapeHtml((profile.name || "there").split(" ")[0]);
    return `
      <div class="ipp-side-card ipp-collab-widget ${cssClass}" id="ipp-collab-widget">
        <h3>Request Collaboration</h3>
        <div class="ipp-field">
          <label for="ipp-connect-msg">Project summary</label>
          <textarea id="ipp-connect-msg" placeholder="Hi ${first}, we'd love to discuss a brand collaboration…"></textarea>
        </div>
        <div class="ipp-field">
          <label for="ipp-connect-budget">Proposed budget (₹, optional)</label>
          <input type="number" id="ipp-connect-budget" min="0" step="1000" placeholder="e.g. 15000" />
        </div>
        <button type="button" class="ipp-btn ipp-btn--primary" id="ipp-connect-submit" style="width:100%;">
          Submit Request
        </button>
        <div id="ipp-connect-feedback" hidden></div>
      </div>`;
  }

  function renderAboutPanel(profile, niches, collabs, languages) {
    const loc = formatLocation(profile);
    const avail = availabilityLabel(profile.availabilityStatus);
    const gridItems = [];

    if (profile.headline && profile.headline !== profile.bio) {
      gridItems.push({ label: "Short Bio", value: profile.headline });
    }
    if (niches.length) {
      gridItems.push({ label: "Content Style", value: niches.join(", ") });
    }
    if (collabs.length) {
      gridItems.push({ label: "Collaboration Interests", value: collabs.join(", ") });
    }
    if (languages.length) {
      gridItems.push({ label: "Languages", value: languages.join(", ") });
    }
    if (niches.length) {
      gridItems.push({ label: "Preferred Industries", value: niches.join(", ") });
    }
    if (loc) {
      gridItems.push({ label: "Preferred Locations", value: loc });
    }

    return `
      <div class="ipp-card">
        <h2>About</h2>
        ${
          profile.bio
            ? `<p class="ipp-bio">${escapeHtml(profile.bio)}</p>`
            : `<p class="ipp-bio">${escapeHtml(profile.name || "Creator")} is on Influnet.</p>`
        }
        ${
          avail
            ? `<div style="margin-top:14px"><span class="ipp-badge ${availabilityClass(profile.availabilityStatus)}">${escapeHtml(avail)}</span></div>`
            : ""
        }
        ${
          gridItems.length
            ? `<div class="ipp-about-grid">${gridItems
                .map(
                  (d) => `
              <div class="ipp-detail">
                <div class="ipp-detail-label">${escapeHtml(d.label)}</div>
                <div class="ipp-detail-value">${escapeHtml(d.value)}</div>
              </div>`
                )
                .join("")}</div>`
            : ""
        }
      </div>`;
  }

  function renderPortfolioPanel(profile) {
    const items = parsePortfolio(profile.portfolio);
    if (!items.length) return "";

    return `
      <div class="ipp-card">
        <h2>Portfolio</h2>
        <p class="ipp-sub">Campaign creatives, reels, and brand work.</p>
        <div class="ipp-portfolio-grid">
          ${items
            .map((item) => {
              const drive = isDriveOrShareUrl(item.url);
              const video = !drive && isVideoUrl(item.url);
              const thumb = drive
                ? `<div class="ipp-portfolio-drive" aria-hidden="true">📁</div>`
                : video
                  ? `<div class="ipp-portfolio-video">▶</div>`
                  : `<img src="${escapeHtml(item.url)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'ipp-portfolio-drive\\'>🔗</div>'" />`;
              const linkLabel = drive ? "Open drive folder →" : "View full →";
              const displayTitle =
                item.title || item.brand || (drive ? "Past collaboration" : "Portfolio item");
              return `
              <article class="ipp-portfolio-card${drive ? " ipp-portfolio-card--drive" : ""}">
                <div class="ipp-portfolio-thumb">${thumb}</div>
                <div class="ipp-portfolio-body">
                  <h3>${escapeHtml(displayTitle)}</h3>
                  ${item.brand && item.title && item.brand !== item.title ? `<p>${escapeHtml(item.brand)}</p>` : ""}
                  ${item.date ? `<p>${escapeHtml(String(item.date))}</p>` : ""}
                  ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
                  ${drive ? `<p class="ipp-portfolio-drive-note">Shared collaboration files</p>` : ""}
                  <a href="${escapeHtml(item.url)}" class="ipp-portfolio-link" target="_blank" rel="noopener noreferrer">${linkLabel}</a>
                </div>
              </article>`;
            })
            .join("")}
        </div>
        ${
          profile.mediaKitUrl
            ? `<a href="${escapeHtml(profile.mediaKitUrl)}" class="ipp-btn ipp-btn--outline" style="margin-top:16px" target="_blank" rel="noopener noreferrer">Download Media Kit</a>`
            : ""
        }
      </div>`;
  }

  function renderCollaborationsPanel(profile) {
    const items = parsePastCollabs(profile.pastCollaborations);
    if (!items.length) {
      return `
        <div class="ipp-card">
          <h2>Collaborations</h2>
          <p class="ipp-sub">No collaborations yet.</p>
        </div>`;
    }

    return `
      <div class="ipp-card">
        <h2>Collaborations</h2>
        <p class="ipp-sub">Previous brand partnerships.</p>
        ${items
          .map((c) => {
            const status = String(c.status || "Completed");
            const statusCls =
              /ongoing|active/i.test(status) ? "ipp-status-pill--ongoing" : "";
            return `
            <div class="ipp-collab-row">
              <div class="ipp-collab-logo">${
                c.logoUrl
                  ? `<img src="${escapeHtml(c.logoUrl)}" alt="" loading="lazy" />`
                  : escapeHtml(c.brandName.charAt(0))
              }</div>
              <div class="ipp-collab-info">
                <h3>${escapeHtml(c.brandName)}</h3>
                <p>${escapeHtml(c.campaignName || "Brand collaboration")}${c.category ? ` · ${escapeHtml(c.category)}` : ""}${c.date ? ` · ${escapeHtml(String(c.date))}` : ""}</p>
              </div>
              <span class="ipp-status-pill ${statusCls}">${escapeHtml(status)}</span>
            </div>`;
          })
          .join("")}
      </div>`;
  }

  function renderReviewsPanel(profile) {
    const reviews = parseReviews(profile);
    if (!reviews.length) return "";

    const ratings = reviews.map((r) => r.rating).filter((r) => r != null && !Number.isNaN(r));
    const avg =
      ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : null;

    return `
      <div class="ipp-card">
        <h2>Reviews</h2>
        ${
          avg
            ? `<div class="ipp-rating-summary"><div class="ipp-rating-big">${escapeHtml(avg)}/5</div><div><div class="ipp-stars">${"★".repeat(Math.round(Number(avg)))}</div><div style="font-size:0.78rem;color:#6b7280">${reviews.length} review${reviews.length === 1 ? "" : "s"}</div></div></div>`
            : ""
        }
        ${reviews
          .map(
            (r) => `
          <div class="ipp-review-card">
            ${r.rating != null ? `<div class="ipp-stars">${"★".repeat(Math.min(5, Math.round(r.rating)))}</div>` : ""}
            <p style="margin:8px 0;font-size:0.9rem;line-height:1.55">"${escapeHtml(r.review)}"</p>
            <p style="margin:0;font-size:0.78rem;color:#6b7280;font-weight:600">${escapeHtml(r.reviewer)}${r.business ? ` · ${escapeHtml(r.business)}` : ""}${r.date ? ` · ${escapeHtml(formatDate(r.date))}` : ""}</p>
          </div>`
          )
          .join("")}
      </div>`;
  }

  function renderServicesPanel(collabs) {
    if (!collabs.length) return "";
    return `
      <div class="ipp-card">
        <h2>Services</h2>
        <p class="ipp-sub">Content and collaboration formats offered.</p>
        <div class="ipp-services">
          ${collabs.map((s) => `<div class="ipp-service-chip">${escapeHtml(s)}</div>`).join("")}
        </div>
      </div>`;
  }

  function renderAudiencePanel(profile, niches, languages) {
    const demo =
      profile.audienceDemographics && typeof profile.audienceDemographics === "object"
        ? profile.audienceDemographics
        : {};
    const cities = parseJsonArray(demo.topCities || demo.cities).filter(Boolean);
    const ages = parseJsonArray(demo.ageRanges || demo.ages).filter(Boolean);
    const regions = parseJsonArray(demo.regions).filter(Boolean);
    const loc = formatLocation(profile);

    const rows = [];
    if (cities.length) rows.push({ label: "Primary Audience Location", value: cities.join(", ") });
    else if (loc) rows.push({ label: "Primary Audience Location", value: loc });
    if (regions.length) rows.push({ label: "Regions", value: regions.join(", ") });
    if (languages.length) rows.push({ label: "Languages", value: languages.join(", ") });
    if (niches.length) rows.push({ label: "Categories", value: niches.join(", ") });
    if (ages.length) rows.push({ label: "Age Demographics", value: ages.join(", ") });
    if (profile.engagementRate != null && profile.engagementRate !== "") {
      rows.push({ label: "Engagement Rate", value: `${profile.engagementRate}%` });
    }

    if (!rows.length) return "";

    return `
      <div class="ipp-card">
        <h2>Audience</h2>
        <div class="ipp-about-grid">
          ${rows
            .map(
              (r) => `
            <div class="ipp-detail">
              <div class="ipp-detail-label">${escapeHtml(r.label)}</div>
              <div class="ipp-detail-value">${escapeHtml(r.value)}</div>
            </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  function buildFeaturedBrands(profile) {
    const items = parsePastCollabs(profile.pastCollaborations);
    if (!items.length) return "";

    return `
      <div class="ipp-card ipp-featured">
        <h2>Featured Collaborations</h2>
        <p class="ipp-sub">Brands this creator has worked with.</p>
        <div class="ipp-brand-logos">
          ${items
            .slice(0, 8)
            .map(
              (c) => `
            <div class="ipp-brand-logo" title="${escapeHtml(c.brandName)}">${
              c.logoUrl
                ? `<img src="${escapeHtml(c.logoUrl)}" alt="${escapeHtml(c.brandName)}" loading="lazy" />`
                : escapeHtml(c.brandName)
            }</div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  function socialIconSvg(cls) {
    switch (cls) {
      case "ig":
        return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path fill="currentColor" d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6m9.9 1.5a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/></svg>`;
      case "fb":
        return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path fill="currentColor" d="M13.8 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5H17V3.6c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.3v2.1H7.7V13h2.7v8h3.4z"/></svg>`;
      case "li":
        return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path fill="currentColor" d="M6.94 8.5A1.56 1.56 0 1 1 6.9 5.4a1.56 1.56 0 0 1 .04 3.1M5.5 9.8h2.9V19H5.5V9.8m4.5 0h2.8v1.3h.04c.39-.73 1.35-1.5 2.77-1.5 2.97 0 3.51 1.95 3.51 4.48V19h-2.9v-4.1c0-.98-.02-2.24-1.37-2.24-1.37 0-1.58 1.07-1.58 2.17V19H10V9.8z"/></svg>`;
      case "yt":
        return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path fill="currentColor" d="M23 12s0-3.6-.46-5.33a2.8 2.8 0 0 0-1.97-1.98C18.84 4.22 12 4.22 12 4.22s-6.84 0-8.57.47A2.8 2.8 0 0 0 1.46 6.67 20.4 20.4 0 0 0 1 12c0 1.8.15 3.58.46 5.33a2.8 2.8 0 0 0 1.97 1.98c1.73.47 8.57.47 8.57.47s6.84 0 8.57-.47a2.8 2.8 0 0 0 1.97-1.98C23 15.6 23 12 23 12M10 15.5v-7l6 3.5-6 3.5z"/></svg>`;
      case "tt":
        return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path fill="currentColor" d="M14.6 3h2.8c.2 1.6 1.1 3.1 2.6 3.9v2.9c-1.2 0-2.3-.3-3.4-.9v5.6c0 3.2-2.6 5.8-5.8 5.8S5 17.7 5 14.5 7.6 8.7 10.8 8.7c.3 0 .7 0 1 .1v3a2.8 2.8 0 0 0-1-.2A2.9 2.9 0 1 0 13.7 14V3h.9z"/></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m7.9 9h-3.1a15.8 15.8 0 0 0-1.2-5 8 8 0 0 1 4.3 5M12 4.1c.9 1.2 1.6 3.1 1.9 5.9h-3.8c.3-2.8 1-4.7 1.9-5.9M8.4 6a15.8 15.8 0 0 0-1.2 5H4.1a8 8 0 0 1 4.3-5M4.1 13h3.1c.1 1.8.5 3.6 1.2 5a8 8 0 0 1-4.3-5m5.9 0h4c-.3 2.8-1 4.7-2 5.9-.9-1.2-1.6-3.1-2-5.9m0-2c.3-2.8 1-4.7 2-5.9.9 1.2 1.6 3.1 2 5.9h-4m5.6 7c.7-1.4 1.1-3.2 1.2-5h3.1a8 8 0 0 1-4.3 5"/></svg>`;
    }
  }

  function buildSidebar(profile, slug, completionPct, socialItems) {
    const s = profile.publicStats || {};
    const avail = availabilityLabel(profile.availabilityStatus);

    const verifyItems = [];
    if (profile.isVerified) verifyItems.push({ label: "Influnet Verified", on: true });
    verifyItems.push({ label: "Email Verified", on: !!profile.emailVerified });
    verifyItems.push({ label: "Phone Verified", on: !!profile.phoneVerified });

    const socialHtml = socialItems.length
      ? socialItems
          .map(
            (item) => `
          <a href="${escapeHtml(item.url)}" class="ipp-social-row" target="_blank" rel="noopener noreferrer" data-social="${escapeHtml(item.key)}">
            <span class="ipp-social-icon ipp-social-icon--${item.cls}" aria-hidden="true">${socialIconSvg(item.cls)}</span>
            <span><strong>${escapeHtml(item.label)}</strong>${item.handle ? `<small>@${escapeHtml(item.handle)}</small>` : ""}</span>
          </a>`
          )
          .join("")
      : "";

    return `
      <aside class="ipp-sidebar">
        ${
          verifyItems.some((v) => v.on)
            ? `
        <div class="ipp-side-card">
          <h3>Verification</h3>
          <ul class="ipp-verify-list">
            ${verifyItems.map((v) => `<li class="${v.on ? "is-on" : ""}">${v.on ? "✓" : "○"} ${escapeHtml(v.label)}</li>`).join("")}
          </ul>
        </div>`
            : ""
        }
        ${
          socialHtml
            ? `
        <div class="ipp-side-card">
          <h3>Social Platforms</h3>
          <div class="ipp-social-list">${socialHtml}</div>
        </div>`
            : ""
        }
        ${
          s.responseRate != null || avail
            ? `
        <div class="ipp-side-card">
          <h3>Contact Availability</h3>
          ${s.responseRate != null && s.responseRate !== "" ? `<div class="ipp-detail" style="margin-bottom:8px"><div class="ipp-detail-label">Response Rate</div><div class="ipp-detail-value">${escapeHtml(String(s.responseRate))}%</div></div>` : ""}
          ${avail ? `<div class="ipp-detail"><div class="ipp-detail-label">Availability</div><div class="ipp-detail-value"><span class="ipp-badge ${availabilityClass(profile.availabilityStatus)}">${escapeHtml(avail)}</span></div></div>` : ""}
        </div>`
            : ""
        }
        ${buildCollabWidget(profile, slug, "ipp-collab-widget-desktop")}
      </aside>`;
  }

  async function sendConnectionRequest(userId, message, budget) {
    const res = await fetch("/api/collab-requests", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toUserId: userId,
        message: message || "Hi, we'd love to collaborate with you on Influnet!",
        budget: budget || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  async function saveCreator(userId, btn) {
    const res = await fetch("/api/shortlists", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ influencerUserId: userId }),
    });
    if (res.ok) {
      btn.textContent = "Saved";
      btn.classList.add("ipp-btn--saved");
      btn.disabled = true;
    }
  }

  async function messageCreator(userId, name) {
    const res = await fetch("/api/conversations", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otherUserId: userId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403) {
      alert(
        data.error ||
          "Messaging opens after the creator accepts your collaboration request. Submit a request first."
      );
      scrollToCollabWidget();
      return;
    }
    if (!res.ok) {
      alert(data.error || "Could not open messages.");
      return;
    }
    sessionStorage.setItem("influnet_open_messages", name || "Creator");
    window.location.href = "/dashboard";
  }

  function scrollToCollabWidget() {
    const widget = document.getElementById("ipp-collab-widget");
    if (!widget) return false;
    widget.scrollIntoView({ behavior: "smooth", block: "start" });
    widget.classList.add("ipp-collab-widget--highlight");
    window.setTimeout(() => widget.classList.remove("ipp-collab-widget--highlight"), 1400);
    const msg = widget.querySelector("#ipp-connect-msg");
    if (msg) window.setTimeout(() => msg.focus(), 220);
    return true;
  }

  function wireCollabSubmit(root, profile) {
    const submitBtn = root.querySelector("#ipp-connect-submit");
    if (!submitBtn || !profile.userId) return;

    submitBtn.addEventListener("click", async () => {
      const viewer = profile.viewer;
      const storedUser = getStoredUser();
      const role = normalizeUserRole(viewer?.role || storedUser?.role);

      console.info("[influnet] collab request (client)", {
        userId: viewer?.id || storedUser?.id,
        userRole: storedUser?.role || viewer?.role,
        profileRole: viewer?.profileRole || storedUser?.role,
        authMetaRole: viewer?.authMetaRole ?? null,
      });

      const feedback = root.querySelector("#ipp-connect-feedback");
      if (!viewer?.id && !storedUser?.id) {
        if (feedback) {
          feedback.hidden = false;
          feedback.className = "ipp-msg ipp-msg--err";
          feedback.textContent = "Please log in with a business owner account.";
        }
        return;
      }
      if (role === "influencer") {
        if (feedback) {
          feedback.hidden = false;
          feedback.className = "ipp-msg ipp-msg--err";
          feedback.textContent = "Influencer accounts cannot send collaboration requests.";
        }
        return;
      }
      if (role !== "business_owner") {
        if (feedback) {
          feedback.hidden = false;
          feedback.className = "ipp-msg ipp-msg--err";
          feedback.textContent = "Only business owner accounts can send requests.";
        }
        return;
      }

      const message = root.querySelector("#ipp-connect-msg")?.value?.trim() || "";
      const budgetVal = root.querySelector("#ipp-connect-budget")?.value?.trim() || "";

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
      if (feedback) feedback.hidden = true;

      try {
        const result = await sendConnectionRequest(profile.userId, message, budgetVal);
        if (feedback) {
          feedback.hidden = false;
          if (result.ok || result.status === 200) {
            feedback.className = "ipp-msg ipp-msg--ok";
            feedback.textContent = result.data?.alreadyConnected
              ? "Already connected — open Messages in your dashboard."
              : "Collaboration request sent successfully.";
            submitBtn.textContent = "Request sent";
          } else {
            feedback.className = "ipp-msg ipp-msg--err";
            feedback.textContent = result.data?.error || "Could not send request.";
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Request";
          }
        }
      } catch {
        if (feedback) {
          feedback.hidden = false;
          feedback.className = "ipp-msg ipp-msg--err";
          feedback.textContent = "Network error. Try again.";
        }
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Request";
      }
    });
  }

  function wirePage(root, profile, slug) {
    const tabs = [...root.querySelectorAll(".ipp-tab")];
    const panels = [...root.querySelectorAll(".ipp-tab-panel")];

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const id = tab.getAttribute("data-tab");
        tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
        panels.forEach((p) => p.classList.toggle("is-active", p.id === `ipp-panel-${id}`));
      });
    });

    root.querySelector("#ipp-edit-profile")?.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof window.influnetNavigateToEditProfile === "function") {
        window.influnetNavigateToEditProfile();
      } else {
        sessionStorage.setItem("influnet_open_edit_profile", "1");
        window.location.href = "/dashboard/influencer";
      }
    });
    root.querySelector("#ipp-share-profile")?.addEventListener("click", async () => {
      const shareUrl = `${window.location.origin}/influnet/${encodeURIComponent(slug || profile.username || "")}`;
      const shareText = `Check out ${profile.name || "this creator"} on Influnet`;
      try {
        if (navigator.share) {
          await navigator.share({ title: profile.name || "Influnet Creator", text: shareText, url: shareUrl });
          return;
        }
      } catch {
        /* fall through clipboard */
      }
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
    });

    async function handleCollabCta(e) {
      const btn = e?.currentTarget;
      if (btn?.dataset?.inflCollabSending === "1" || btn?.disabled) return;

      if (btn) {
        btn.dataset.inflCollabSending = "1";
        btn.disabled = true;
      }

      // Best-effort: keep the previous UX (scroll to widget) but do not block the actual request.
      try {
        scrollToCollabWidget();
      } catch {
        /* ignore scroll errors */
      }

      if (!profile?.userId) {
        if (btn) btn.dataset.inflCollabSending = "0";
        if (btn) btn.disabled = false;
        return;
      }

      try {
        const result = await sendConnectionRequest(
          profile.userId,
          `Hi ${profile.name || "there"}, we'd love to collaborate with you on Influnet!`
        );
        if (result.ok || result.status === 200) {
          alert("Collaboration request sent successfully.");
        } else {
          alert(result.data?.error || "Could not send request right now.");
        }
      } catch {
        alert("Could not send request right now. Please try again.");
      } finally {
        if (btn) {
          btn.dataset.inflCollabSending = "0";
          btn.disabled = false;
        }
      }
    }

    root.querySelector("#ipp-hero-collab")?.addEventListener("click", handleCollabCta);
    root.querySelector("#ipp-mobile-collab")?.addEventListener("click", handleCollabCta);

    root.querySelector("#ipp-hero-message")?.addEventListener("click", () => {
      messageCreator(profile.userId, profile.name);
    });

    const saveBtn = root.querySelector("#ipp-hero-save");
    saveBtn?.addEventListener("click", () => saveCreator(profile.userId, saveBtn));

    wireCollabSubmit(root, profile);

    root.querySelectorAll("[data-social]").forEach((link) => {
      link.addEventListener("click", () => {
        if (!slug) return;
        fetch(`/api/public/influencer/${encodeURIComponent(slug)}/click`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkType: link.getAttribute("data-social") }),
        }).catch(() => {});
      });
    });
  }

  function renderPage(profile) {
    document.getElementById("influnet-public-profile")?.remove();
    const rootEl = document.getElementById("root");
    if (rootEl) rootEl.style.display = "none";

    const slug = resolveSlugFromProfile(profile);
    const username = profile.username || slug || "";
    const niches = nicheList(profile.niche);
    const collabs = collabList(profile);
    const languages = languageList(profile);
    const location = formatLocation(profile);
    const own = !!profile.viewer?.isOwner;

    const category =
      profile.headline ||
      (niches.length ? `${niches.slice(0, 2).join(" & ")} Creator` : null);

    const completionPct = computeProfileCompletion(profile);
    const socialItems = getSocialItems(profile);
    const portfolioItems = parsePortfolio(profile.portfolio);
    const pastCollabs = parsePastCollabs(profile.pastCollaborations);
    const reviews = parseReviews(profile);

    const avail = availabilityLabel(profile.availabilityStatus);
    const heroFollowerStats = buildHeroFollowerStats(profile, socialItems);

    const tabs = [{ id: "about", label: "About" }];
    if (portfolioItems.length) tabs.push({ id: "portfolio", label: "Portfolio" });
    tabs.push({ id: "collaborations", label: "Collaborations" });
    if (reviews.length) tabs.push({ id: "reviews", label: "Reviews" });
    if (collabs.length) tabs.push({ id: "services", label: "Services" });
    if (hasAudienceData(profile, niches, languages)) tabs.push({ id: "audience", label: "Audience" });

    const coverClass = profile.coverImageUrl ? "ipp-banner has-cover" : "ipp-banner";
    const coverInner = profile.coverImageUrl
      ? `<div class="ipp-banner-img" style="background-image:url('${String(profile.coverImageUrl).replace(/'/g, "%27")}')"></div>`
      : "";

    const root = document.createElement("div");
    root.id = "influnet-public-profile";
    root.className = "infl-public-page";

    root.innerHTML = `
      <div class="${coverClass}">${coverInner}</div>

      <div class="ipp-hero-card">
        <div class="ipp-hero-panel">
          <div class="ipp-hero-grid">
            <div class="ipp-avatar-wrap">
              <div class="ipp-avatar">${
                profile.avatarUrl
                  ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="" />`
                  : escapeHtml(initials(profile.name))
              }</div>
              ${profile.isVerified ? `<span class="ipp-verified-badge" title="Verified">✓</span>` : ""}
            </div>
            <div class="ipp-identity">
              <h1>${escapeHtml(profile.name || "Creator")}</h1>
              ${username ? `<p class="ipp-username">@${escapeHtml(username)}</p>` : ""}
              ${category ? `<p class="ipp-category">${escapeHtml(category)}</p>` : ""}
              ${
                avail
                  ? `<div style="margin-top:6px"><span class="ipp-badge ${availabilityClass(profile.availabilityStatus)}">Available for Collaborations</span></div>`
                  : ""
              }
              <div class="ipp-meta-row">
                ${location ? `<span>📍 ${escapeHtml(location)}</span>` : ""}
                ${profile.isVerified ? `<span>✓ Verified Creator</span>` : ""}
                ${languages.length ? `<span>🌐 ${escapeHtml(languages.join(" • "))}</span>` : ""}
              </div>
              ${
                niches.length
                  ? `<div class="ipp-hero-cats"><strong>Primary Categories:</strong> ${escapeHtml(niches.slice(0, 4).join(" • "))}</div>`
                  : ""
              }
              ${heroFollowerStats}
            </div>
            <div class="ipp-hero-actions">${buildHeroActions(profile, slug)}</div>
          </div>
        </div>
      </div>

      ${buildStatsBar(profile)}

      <div class="ipp-layout">
        <div class="ipp-main-col">
          <div class="ipp-tabs-wrap">
            <nav class="ipp-tabs" aria-label="Profile sections">
              ${tabs.map((t, i) => `<button type="button" class="ipp-tab${i === 0 ? " is-active" : ""}" data-tab="${t.id}">${escapeHtml(t.label)}</button>`).join("")}
            </nav>
          </div>

          <div class="ipp-tab-panel is-active" id="ipp-panel-about">${renderAboutPanel(profile, niches, collabs, languages)}</div>
          ${portfolioItems.length ? `<div class="ipp-tab-panel" id="ipp-panel-portfolio">${renderPortfolioPanel(profile)}</div>` : ""}
          <div class="ipp-tab-panel" id="ipp-panel-collaborations">${renderCollaborationsPanel(profile)}</div>
          ${reviews.length ? `<div class="ipp-tab-panel" id="ipp-panel-reviews">${renderReviewsPanel(profile)}</div>` : ""}
          ${collabs.length ? `<div class="ipp-tab-panel" id="ipp-panel-services">${renderServicesPanel(collabs)}</div>` : ""}
          ${hasAudienceData(profile, niches, languages) ? `<div class="ipp-tab-panel" id="ipp-panel-audience">${renderAudiencePanel(profile, niches, languages)}</div>` : ""}

          ${buildFeaturedBrands(profile)}

          ${buildCollabWidget(profile, slug, "ipp-collab-widget-mobile")}

          <p class="ipp-share-line">influnet.io/influnet/${escapeHtml(username || slug || "")}</p>
        </div>

        ${buildSidebar(profile, slug, completionPct, socialItems)}
      </div>

      ${
        profile.viewer?.isBusiness && !profile.viewer?.isOwner
          ? `<div class="ipp-mobile-bar"><button type="button" class="ipp-btn ipp-btn--primary" id="ipp-mobile-collab">Send Collaboration Request</button></div>`
          : ""
      }
    `;

    document.body.appendChild(root);
    wirePage(root, profile, slug);
  }

  function renderError(message) {
    document.getElementById("root")?.style && (document.getElementById("root").style.display = "none");
    const root = document.createElement("div");
    root.id = "influnet-public-profile";
    root.className = "infl-public-page";
    root.style.cssText = "display:flex;align-items:center;justify-content:center;min-height:100vh";
    root.innerHTML = `
      <div style="text-align:center;padding:24px">
        <h1 style="font-size:22px;margin:0 0 8px">Profile not found</h1>
        <p style="color:#6b7280">${escapeHtml(message)}</p>
        <a href="/" style="color:#ee3e96;font-weight:700;text-decoration:none">Go to Influnet home</a>
      </div>`;
    document.body.appendChild(root);
  }

  async function fetchProfile(slug) {
    const res = await fetch(`/api/public/influencer/${encodeURIComponent(slug)}`, {
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Profile not found");
    return data;
  }

  function showLoading() {
    document.getElementById("root")?.style && (document.getElementById("root").style.display = "none");
    if (document.getElementById("influnet-public-profile")) return;
    const root = document.createElement("div");
    root.id = "influnet-public-profile";
    root.className = "infl-public-page";
    root.style.cssText = "display:flex;align-items:center;justify-content:center;min-height:100vh";
    root.textContent = "Loading profile…";
    document.body.appendChild(root);
  }

  async function init() {
    if (window.__influnet_public_profile_handled) return;
    const slug = parseSlug();
    if (!slug) return;
    showLoading();
    try {
      const profile = await fetchProfile(slug);
      window.__influnet_public_profile_handled = true;
      renderPage(profile);
    } catch (err) {
      if (!window.__influnet_public_profile_handled) renderError(err.message || "Profile unavailable.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
