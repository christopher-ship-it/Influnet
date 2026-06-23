/**
 * Premium public business profile: /influnet/:slug
 * Trust-focused brand page for influencers evaluating collaboration partners.
 */
(function () {
  const CREATOR_PREF_LABELS = {
    fashion: "Fashion Influencers",
    beauty: "Beauty Creators",
    lifestyle: "Lifestyle Creators",
    fitness: "Fitness Creators",
    travel: "Travel Creators",
    tech: "Technology Creators",
    food: "Food Creators",
    gaming: "Gaming Creators",
    micro: "Micro Influencers",
    macro: "Macro Influencers",
    regional: "Regional Influencers",
    ugc: "UGC Creators",
    youtube: "YouTube Creators",
    instagram: "Instagram Creators",
    tiktok: "TikTok Creators",
  };

  const USERNAME_RE = /^[a-z0-9][a-z0-9._]{2,29}$/;

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
    const m = path.match(/^\/influnet\/([^/]+)$/i);
    return m ? parsePathSegment(m[1]) : null;
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initials(name) {
    const p = String(name || "?").trim().split(/\s+/);
    return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
  }

  function parseJsonArray(raw) {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  function parseJsonObject(raw) {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const p = JSON.parse(raw);
        return p && typeof p === "object" ? p : {};
      } catch {
        return {};
      }
    }
    return {};
  }

  function formatLocation(profile) {
    const city = String(profile.city || "").trim();
    const state = String(profile.state || "").trim();
    if (city && state) return `${city}, ${state}`;
    if (profile.location) return String(profile.location).trim();
    return city || state || null;
  }

  function formatWebsite(url) {
    if (!url) return null;
    const u = String(url).trim();
    if (!u) return null;
    const href = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    const display = u.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    return { href, display };
  }

  function formatMemberSince(value) {
    if (!value) return null;
    try {
      return new Date(value).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    } catch {
      return null;
    }
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    } catch {
      return "";
    }
  }

  function stars(rating, max) {
    const r = Math.min(max || 5, Math.max(0, Number(rating) || 0));
    const full = Math.floor(r);
    const half = r - full >= 0.5 ? 1 : 0;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
  }

  function prefLabels(raw) {
    return parseJsonArray(raw).map((id) => {
      const key = String(id).toLowerCase().replace(/\s+/g, "_");
      return CREATOR_PREF_LABELS[key] || CREATOR_PREF_LABELS[id] || String(id);
    });
  }

  function socialUrl(platform, handle) {
    const h = String(handle || "").trim().replace(/^@/, "");
    if (!h) return null;
    if (/^https?:\/\//i.test(h)) return h;
    switch (platform) {
      case "instagram":
        return `https://instagram.com/${h}`;
      case "facebook":
        return `https://facebook.com/${h}`;
      case "linkedin":
        return `https://linkedin.com/company/${h}`;
      default:
        return null;
    }
  }

  async function fetchBusinessProfile(slug) {
    const res = await fetch(`/api/public/business/${encodeURIComponent(slug)}`, {
      credentials: "same-origin",
    });
    if (res.status === 404) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Profile not found");
    return data;
  }

  async function startConversation(otherUserId) {
    const res = await fetch("/api/conversations", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otherUserId }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  function buildTrustBar(profile) {
    const t = profile.trust || {};
    const rep = profile.reputation || {};
    const items = [
      { label: "Verified Mobile", on: t.phoneVerified },
      { label: "Website Verified", on: t.websiteVerified },
      { label: "Verified Business Email", on: t.emailVerified },
      { label: "GST Verified", on: t.gstVerified },
      { label: "Influnet Verified", on: t.influnetVerified },
      { label: "Trusted Partner", on: t.trustedPartner },
    ];
    const memberSince = formatMemberSince(t.memberSince || rep.memberSince);
    const completion =
      rep.campaignCompletionRate != null ? `${rep.campaignCompletionRate}% Campaign Completion` : null;

    return `
      <div class="bpp-trust-bar">
        <div class="bpp-trust-card">
          ${items
            .map(
              (item) => `
            <div class="bpp-trust-item ${item.on ? "bpp-trust-item--on" : "bpp-trust-item--off"}">
              <span class="bpp-trust-check ${item.on ? "bpp-trust-check--on" : "bpp-trust-check--off"}">${item.on ? "✓" : "—"}</span>
              ${escapeHtml(item.label)}
            </div>`
            )
            .join("")}
          ${memberSince ? `<div class="bpp-trust-item bpp-trust-item--on"><span class="bpp-trust-check bpp-trust-check--on">✓</span>Member Since ${escapeHtml(memberSince.split(" ").pop())}</div>` : ""}
          ${completion ? `<div class="bpp-trust-item bpp-trust-item--on"><span class="bpp-trust-check bpp-trust-check--on">✓</span>${escapeHtml(completion)}</div>` : ""}
        </div>
      </div>`;
  }

  function buildAbout(profile) {
    const blocks = [
      { label: "Company Overview", text: profile.companyDescription },
      { label: "Mission", text: profile.mission },
      { label: "Products", text: profile.products },
      { label: "Services", text: profile.services },
      { label: "Brand Story", text: profile.brandStory },
      { label: "Why Creators Work With Us", text: profile.whyCreators },
    ].filter((b) => b.text && String(b.text).trim());

    if (!blocks.length && !profile.tagline) return "";

    return `
      <section class="bpp-section">
        <h2 class="bpp-section-title">About Company</h2>
        ${profile.tagline ? `<p class="bpp-text" style="font-weight:600;color:#1e3a5f;">${escapeHtml(profile.tagline)}</p>` : ""}
        ${blocks
          .map(
            (b) => `
          <div class="bpp-block">
            <span class="bpp-label">${escapeHtml(b.label)}</span>
            <p class="bpp-text">${escapeHtml(b.text)}</p>
          </div>`
          )
          .join("")}
      </section>`;
  }

  function buildCompanyDetails(profile) {
    const web = formatWebsite(profile.website);
    const socials = [
      { label: "Instagram", url: socialUrl("instagram", profile.instagramHandle) },
      { label: "Facebook", url: socialUrl("facebook", profile.facebookHandle) },
      { label: "LinkedIn", url: socialUrl("linkedin", profile.linkedinHandle) },
    ].filter((s) => s.url);

    const hasAny =
      profile.industry ||
      profile.businessType ||
      profile.foundedYear ||
      formatLocation(profile) ||
      web ||
      profile.teamSize ||
      socials.length;

    if (!hasAny) return "";

    return `
      <section class="bpp-section">
        <h2 class="bpp-section-title">Company Details</h2>
        <div class="bpp-details-grid">
          ${profile.industry ? `<div class="bpp-detail"><span class="bpp-label">Industry</span><strong>${escapeHtml(profile.industry)}</strong></div>` : ""}
          ${profile.businessType ? `<div class="bpp-detail"><span class="bpp-label">Business Type</span><strong>${escapeHtml(profile.businessType)}</strong></div>` : ""}
          ${profile.foundedYear ? `<div class="bpp-detail"><span class="bpp-label">Founded</span><strong>${escapeHtml(profile.foundedYear)}</strong></div>` : ""}
          ${formatLocation(profile) ? `<div class="bpp-detail"><span class="bpp-label">Headquarters</span><strong>${escapeHtml(formatLocation(profile))}</strong></div>` : ""}
          ${web ? `<div class="bpp-detail"><span class="bpp-label">Website</span><strong><a href="${escapeHtml(web.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(web.display)}</a></strong></div>` : ""}
          ${profile.teamSize ? `<div class="bpp-detail"><span class="bpp-label">Team Size</span><strong>${escapeHtml(profile.teamSize)}</strong></div>` : ""}
          ${profile.marketingBudget ? `<div class="bpp-detail"><span class="bpp-label">Marketing Budget</span><strong>${escapeHtml(profile.marketingBudget)}</strong></div>` : ""}
        </div>
        ${
          socials.length
            ? `<div class="bpp-block" style="margin-top:16px;"><span class="bpp-label">Social Media</span><div class="bpp-social-grid">${socials
                .map(
                  (s) =>
                    `<a class="bpp-social-link" href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)} ↗</a>`
                )
                .join("")}</div></div>`
            : ""
        }
      </section>`;
  }

  function buildCreatorPrefs(profile) {
    const prefs = [
      ...prefLabels(profile.collabPreferences),
      ...prefLabels(profile.preferredCreatorNiches),
    ];
    const unique = [...new Set(prefs)];
    if (!unique.length) return "";

    return `
      <section class="bpp-section">
        <h2 class="bpp-section-title">Creator Collaboration Preferences</h2>
        <p class="bpp-section-subtitle">What creators does this business typically work with?</p>
        <div class="bpp-tags">${unique.map((p) => `<span class="bpp-tag">${escapeHtml(p)}</span>`).join("")}</div>
      </section>`;
  }

  function buildCreatorRequirements(profile) {
    const req = parseJsonObject(profile.creatorRequirements);
    const audience = parseJsonObject(profile.targetAudience);
    const rows = [];

    if (req.audienceSize || audience.audienceSize) {
      rows.push({ label: "Preferred Audience Size", value: req.audienceSize || audience.audienceSize });
    }
    const categories = parseJsonArray(req.categories || req.niches || audience.niches);
    if (categories.length) {
      rows.push({ label: "Preferred Categories", value: categories.join(", ") });
    }
    const locations = parseJsonArray(req.locations || audience.locations || audience.topCities);
    if (locations.length) {
      rows.push({ label: "Preferred Locations", value: locations.join(", ") });
    }
    const platforms = parseJsonArray(req.platforms || audience.platforms);
    if (platforms.length) {
      rows.push({ label: "Preferred Platforms", value: platforms.join(", ") });
    }
    const campaignTypes = parseJsonArray(req.campaignTypes || profile.collabPreferences);
    if (campaignTypes.length) {
      rows.push({ label: "Campaign Types", value: campaignTypes.join(", ") });
    }
    if (req.budgetRange || profile.marketingBudget) {
      rows.push({ label: "Budget Range", value: req.budgetRange || profile.marketingBudget });
    }
    const languages = parseJsonArray(req.languages || audience.languages);
    if (languages.length) {
      rows.push({ label: "Languages Preferred", value: languages.join(", ") });
    }

    if (!rows.length) return "";

    return `
      <section class="bpp-section">
        <h2 class="bpp-section-title">Creator Requirements</h2>
        <div class="bpp-details-grid">
          ${rows
            .map(
              (r) => `
            <div class="bpp-detail"><span class="bpp-label">${escapeHtml(r.label)}</span><strong>${escapeHtml(r.value)}</strong></div>`
            )
            .join("")}
        </div>
      </section>`;
  }

  function buildReputation(profile) {
    const rep = profile.reputation || {};
    const items = [
      { label: "Projects Completed", value: rep.projectsCompleted ?? "—" },
      { label: "Creators Worked With", value: rep.creatorsWorkedWith ?? "—" },
      { label: "Average Rating", value: rep.averageRating != null ? rep.averageRating : "—" },
      {
        label: "Repeat Creator Rate",
        value: rep.repeatCreatorRate != null ? `${rep.repeatCreatorRate}%` : "—",
      },
      { label: "Campaign Completion", value: rep.campaignCompletionRate != null ? `${rep.campaignCompletionRate}%` : "—" },
      { label: "Total Reviews", value: rep.totalReviews ?? "—" },
      { label: "Member Since", value: formatMemberSince(rep.memberSince || profile.trust?.memberSince) || "—", isText: true },
    ];

    return `
      <section class="bpp-section">
        <h2 class="bpp-section-title">Business Reputation</h2>
        <div class="bpp-stats-grid">
          ${items
            .map(
              (s) => `
            <div class="bpp-stat">
              <div class="bpp-stat-value">${escapeHtml(String(s.value))}</div>
              <div class="bpp-stat-label">${escapeHtml(s.label)}</div>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
  }

  function buildRatingsReviews(profile) {
    const rep = profile.reputation || {};
    const reviews = parseJsonArray(profile.reviews);
    const breakdown = rep.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const total = rep.totalReviews || reviews.length || 0;
    const avg = rep.averageRating;

    if (!total && !reviews.length) {
      return `
        <section class="bpp-section bpp-section--highlight">
          <h2 class="bpp-section-title">Ratings &amp; Reviews</h2>
          <div class="bpp-empty">No public reviews yet. Reviews from creators appear here after completed collaborations.</div>
        </section>`;
    }

    const maxCount = Math.max(...[5, 4, 3, 2, 1].map((n) => breakdown[n] || 0), 1);

    return `
      <section class="bpp-section bpp-section--highlight">
        <h2 class="bpp-section-title">Ratings &amp; Reviews</h2>
        <div class="bpp-rating-summary">
          <div class="bpp-rating-big">
            <div class="bpp-rating-big-num">${avg != null ? escapeHtml(String(avg)) : "—"}</div>
            <div class="bpp-rating-big-stars">${stars(avg)}</div>
            <div class="bpp-review-count">${total} Review${total === 1 ? "" : "s"}</div>
          </div>
          <div class="bpp-rating-bars">
            ${[5, 4, 3, 2, 1]
              .map((n) => {
                const count = breakdown[n] || 0;
                const pct = Math.round((count / maxCount) * 100);
                return `
              <div class="bpp-rating-row">
                <span>${stars(n, n).slice(0, 5)}</span>
                <div class="bpp-rating-bar"><div class="bpp-rating-bar-fill" style="width:${pct}%"></div></div>
                <span>${count}</span>
              </div>`;
              })
              .join("")}
          </div>
        </div>
        <h3 class="bpp-section-title" style="margin-top:8px;font-size:12px;">Influencer Reviews</h3>
        ${reviews.length ? reviews.map((r) => buildReviewCard(r)).join("") : `<div class="bpp-empty">Detailed reviews will appear as creators share feedback.</div>`}
      </section>`;
  }

  function buildReviewCard(r) {
    const rating = Number(r.rating) || 5;
    return `
      <div class="bpp-review-card">
        <div class="bpp-review-stars">${stars(rating)}</div>
        <p class="bpp-review-quote">"${escapeHtml(r.reviewText || r.text || "")}"</p>
        <p class="bpp-review-author">${escapeHtml(r.reviewerName || r.author || "Creator")}</p>
        <p class="bpp-review-meta">${escapeHtml([r.reviewerTitle, r.campaignName ? `Campaign: ${r.campaignName}` : ""].filter(Boolean).join(" · "))}</p>
      </div>`;
  }

  function buildPastCollaborations(profile) {
    const manual = parseJsonArray(profile.pastCampaigns).map((item) => {
      if (!item || typeof item !== "object") return null;
      return {
        creatorName: item.creatorName || item.creator || "Creator",
        campaignName: item.campaignName || item.name || item.title || "Campaign",
        campaignType: item.campaignType || item.type || "Brand Campaign",
        status: item.status || "Completed",
        rating: item.rating || null,
      };
    }).filter(Boolean);

    const computed = Array.isArray(profile.computedCollaborations)
      ? profile.computedCollaborations
      : [];
    const items = manual.length ? manual : computed;

    if (!items.length) {
      return `
        <section class="bpp-section">
          <h2 class="bpp-section-title">Past Collaborations</h2>
          <div class="bpp-empty">Completed collaborations with creators will be listed here.</div>
        </section>`;
    }

    return `
      <section class="bpp-section">
        <h2 class="bpp-section-title">Past Collaborations</h2>
        ${items
          .map(
            (c) => `
          <div class="bpp-collab-item">
            <div class="bpp-collab-main">
              <p class="bpp-collab-name">${escapeHtml(c.creatorName)}</p>
              <p class="bpp-collab-campaign">${escapeHtml(c.campaignName)} · ${escapeHtml(c.campaignType)}</p>
            </div>
            <span class="bpp-collab-status">${escapeHtml(c.status || "Completed")}</span>
            ${c.rating ? `<span class="bpp-review-stars">${stars(c.rating)}</span>` : ""}
          </div>`
          )
          .join("")}
      </section>`;
  }

  function buildPortfolio(profile) {
    const items = parseJsonArray(profile.portfolio).map((item) => {
      if (typeof item === "string") return { url: item, title: null };
      if (item && typeof item === "object") {
        return { url: item.url || item.link || "", title: item.title || item.caption || null };
      }
      return null;
    }).filter((x) => x && x.url);

    if (!items.length) return "";

    return `
      <section class="bpp-section">
        <h2 class="bpp-section-title">Portfolio</h2>
        <p class="bpp-section-subtitle">Campaign images, marketing creatives, and brand assets.</p>
        <div class="bpp-portfolio-grid">
          ${items
            .map(
              (item) => `
            <div class="bpp-portfolio-item">
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
                <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title || "Brand asset")}" loading="lazy" onerror="this.parentElement.textContent='View asset'" />
              </a>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
  }

  function buildOpenOpportunities(profile) {
    const opps = parseJsonArray(profile.openCampaigns);
    if (!opps.length) {
      return `
        <section class="bpp-section" id="bpp-opportunities">
          <h2 class="bpp-section-title">Open Opportunities</h2>
          <div class="bpp-empty">No open campaigns listed. Message this business to ask about upcoming collaboration opportunities.</div>
        </section>`;
    }

    return `
      <section class="bpp-section" id="bpp-opportunities">
        <h2 class="bpp-section-title">Open Opportunities</h2>
        ${opps
          .map((o) => {
            if (!o || typeof o !== "object") return "";
            return `
          <div class="bpp-opp-card">
            <p class="bpp-opp-title">${escapeHtml(o.title || o.name || "Collaboration Opening")}</p>
            <div class="bpp-opp-meta">
              ${o.budget ? `<div>Budget: ${escapeHtml(o.budget)}</div>` : ""}
              ${o.deadline ? `<div>Deadline: ${escapeHtml(o.deadline)}</div>` : ""}
              ${o.deliverables ? `<div>Deliverables: ${escapeHtml(o.deliverables)}</div>` : ""}
              ${o.requirements ? `<div>Requirements: ${escapeHtml(o.requirements)}</div>` : ""}
              ${o.description ? `<div style="margin-top:6px;">${escapeHtml(o.description)}</div>` : ""}
            </div>
          </div>`;
          })
          .join("")}
      </section>`;
  }

  function buildVerification(profile) {
    const t = profile.trust || {};
    const badges = [
      { label: "Verified Mobile", on: t.phoneVerified },
      { label: "Verified Website", on: t.websiteVerified },
      { label: "Verified Business Email", on: t.emailVerified },
      { label: "GST Verified", on: t.gstVerified },
      { label: "Influnet Verified", on: t.influnetVerified },
      { label: "Trusted Partner", on: t.trustedPartner },
    ];
    const verifiedDate = formatDate(t.verifiedAt);
    const level = [t.influnetVerified, t.gstVerified, t.phoneVerified, t.websiteVerified].filter(Boolean).length;

    return `
      <section class="bpp-section">
        <h2 class="bpp-section-title">Verification</h2>
        <div class="bpp-verify-grid">
          ${badges
            .map(
              (b) => `
            <div class="bpp-verify-badge ${b.on ? "bpp-verify-badge--on" : "bpp-verify-badge--off"}">
              ${b.on ? "✓" : "—"} ${escapeHtml(b.label)}
            </div>`
            )
            .join("")}
        </div>
        ${verifiedDate ? `<p class="bpp-text" style="margin-top:14px;font-size:13px;">Verified on: <strong>${escapeHtml(verifiedDate)}</strong></p>` : ""}
        <p class="bpp-text" style="font-size:13px;color:#64748b;">Verification level: ${level} of 6 trust signals confirmed</p>
      </section>`;
  }

  function buildActivity(profile) {
    const act = profile.activity || {};
    const rows = [
      { label: "Last Active", value: act.lastActive ? formatDate(act.lastActive) : "—" },
      { label: "Campaigns Posted", value: act.campaignsPosted ?? "—" },
      { label: "Campaigns Completed", value: act.campaignsCompleted ?? "—" },
      { label: "Creators Hired", value: act.creatorsHired ?? "—" },
      {
        label: "Repeat Collaborations",
        value: act.repeatCollaborations != null ? `${act.repeatCollaborations}%` : "—",
      },
    ];

    return `
      <section class="bpp-section">
        <h2 class="bpp-section-title">Business Activity</h2>
        <div class="bpp-activity-list">
          ${rows
            .map(
              (r) => `
            <div class="bpp-activity-item">
              <span class="bpp-activity-label">${escapeHtml(r.label)}</span>
              <span class="bpp-activity-value">${escapeHtml(String(r.value))}</span>
            </div>`
          )
            .join("")}
        </div>
      </section>`;
  }

  function buildHeroCta(profile) {
    const viewer = profile.viewer;
    const own = !!viewer?.isOwner;
    const slug = profile.username || profile.profileSlug || "";

    if (own) {
      return `
        <a href="/dashboard" class="bpp-btn bpp-btn--outline">Back to Dashboard</a>
        <a href="/dashboard" id="bpp-edit-profile" class="bpp-btn bpp-btn--gold">Edit Profile</a>`;
    }

    if (viewer?.isInfluencer) {
      return `
        <button type="button" class="bpp-btn bpp-btn--gold" id="bpp-message-btn">Message Business</button>
        <button type="button" class="bpp-btn bpp-btn--outline" id="bpp-share-btn">Share Profile</button>`;
    }

    const loginNext = encodeURIComponent(slug ? `/influnet/${slug}` : "/");
    return `
      <a href="/login?next=${loginNext}" class="bpp-btn bpp-btn--gold">Log in to message</a>
      <button type="button" class="bpp-btn bpp-btn--outline" id="bpp-share-btn">Share Profile</button>`;
  }

  function wirePage(root, profile) {
    const slug = profile.username || profile.profileSlug || "";
    const shareUrl = `${window.location.origin}/influnet/${encodeURIComponent(slug)}`;

    function shareProfile() {
      if (navigator.share) {
        navigator.share({
          title: profile.companyName || "Business on Influnet",
          url: shareUrl,
        }).catch(() => {});
        return;
      }
      navigator.clipboard?.writeText(shareUrl).then(() => {
        const fb = root.querySelector("#bpp-share-feedback");
        if (fb) {
          fb.hidden = false;
          fb.className = "bpp-msg bpp-msg--ok";
          fb.textContent = "Profile link copied to clipboard.";
          setTimeout(() => { fb.hidden = true; }, 3000);
        }
      });
    }

    root.querySelectorAll("#bpp-share-btn, .bpp-share-trigger").forEach((btn) => {
      btn.addEventListener("click", shareProfile);
    });

    function scrollOpportunities() {
      document.getElementById("bpp-opportunities")?.scrollIntoView({ behavior: "smooth" });
    }
    root.querySelectorAll("#bpp-campaigns-btn, .bpp-campaigns-trigger").forEach((btn) => {
      btn.addEventListener("click", scrollOpportunities);
    });

    async function messageBusiness() {
      const btn = root.querySelector("#bpp-message-btn") || root.querySelector(".bpp-message-trigger");
      if (!profile.userId) return;
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Opening chat…";
      }
      try {
        const result = await startConversation(profile.userId);
        if (result.ok && result.data?.id) {
          window.location.href = `/dashboard/influencer?conversation=${encodeURIComponent(result.data.id)}`;
          return;
        }
        const fb = root.querySelector("#bpp-action-feedback");
        if (fb) {
          fb.hidden = false;
          fb.className = "bpp-msg bpp-msg--err";
          fb.textContent = result.data?.error || "Could not start conversation. Try again from your dashboard.";
        }
      } catch {
        const fb = root.querySelector("#bpp-action-feedback");
        if (fb) {
          fb.hidden = false;
          fb.className = "bpp-msg bpp-msg--err";
          fb.textContent = "Network error. Please try again.";
        }
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Message Business";
      }
    }

    root.querySelectorAll("#bpp-message-btn, .bpp-message-trigger").forEach((btn) => {
      btn.addEventListener("click", messageBusiness);
    });
  }

  function renderPage(profile) {
    document.getElementById("influnet-public-business")?.remove();
    const rootEl = document.getElementById("root");
    if (rootEl) rootEl.style.display = "none";

    const name = profile.companyName || "Business";
    const slug = profile.username || profile.profileSlug || "";
    const location = formatLocation(profile);
    const web = formatWebsite(profile.website);
    const rep = profile.reputation || {};
    const avg = rep.averageRating;
    const totalReviews = rep.totalReviews || 0;
    const own = !!profile.viewer?.isOwner;
    const backHref = own ? "/dashboard" : profile.viewer?.isInfluencer ? "/dashboard/influencer" : "/";
    const backLabel = profile.viewer ? "Back to Dashboard" : "Back to Influnet";

    const coverStyle = profile.coverImageUrl
      ? `background-image:url('${String(profile.coverImageUrl).replace(/'/g, "%27")}')`
      : "";

    const root = document.createElement("div");
    root.id = "influnet-public-business";
    root.className = "bpp-page";

    root.innerHTML = `
      <header class="bpp-hero">
        <div class="bpp-cover" style="${coverStyle}"></div>
        <div class="bpp-hero-inner">
          <div class="bpp-topbar">
            <a href="${backHref}" class="bpp-back">← ${escapeHtml(backLabel)}</a>
            ${own ? `<p class="bpp-preview-note">Preview — how creators see your business profile</p>` : ""}
          </div>
          <div class="bpp-identity">
            <div class="bpp-logo">${
              profile.logoUrl
                ? `<img src="${escapeHtml(profile.logoUrl)}" alt="" />`
                : escapeHtml(initials(name))
            }</div>
            <div class="bpp-identity-text">
              <div class="bpp-name-row">
                <h1 class="bpp-name">${escapeHtml(name)}</h1>
                ${profile.isVerified ? `<span class="bpp-verified">✓ Verified Business</span>` : ""}
              </div>
              ${profile.industry ? `<p class="bpp-industry">${escapeHtml(profile.industry)}</p>` : ""}
              ${location ? `<p class="bpp-location">📍 ${escapeHtml(location)}</p>` : ""}
              ${web ? `<a class="bpp-website" href="${escapeHtml(web.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(web.display)} ↗</a>` : ""}
              ${
                avg != null && totalReviews > 0
                  ? `<div class="bpp-rating-hero">
                      <span class="bpp-stars">${stars(avg)}</span>
                      <span class="bpp-rating-num">${escapeHtml(String(avg))}</span>
                      <span class="bpp-review-count">(${totalReviews} Review${totalReviews === 1 ? "" : "s"})</span>
                    </div>`
                  : ""
              }
              <div class="bpp-hero-cta">${buildHeroCta(profile)}</div>
              <div id="bpp-share-feedback" hidden></div>
              <div id="bpp-action-feedback" hidden></div>
            </div>
          </div>
        </div>
      </header>

      ${buildTrustBar(profile)}

      <main class="bpp-main">
        <div class="bpp-grid">
          <div class="bpp-col-primary">
            ${buildAbout(profile)}
            ${buildRatingsReviews(profile)}
            ${buildPastCollaborations(profile)}
            ${buildPortfolio(profile)}
            ${buildOpenOpportunities(profile)}
            ${buildCreatorRequirements(profile)}
          </div>
          <div class="bpp-col-side">
            ${buildReputation(profile)}
            ${buildCompanyDetails(profile)}
            ${buildCreatorPrefs(profile)}
            ${buildVerification(profile)}
            ${buildActivity(profile)}
          </div>
        </div>
      </main>

      <div class="bpp-footer-cta">
        <div class="bpp-footer-card">
          <h2>Interested in working with this business?</h2>
          <p>Connect directly to discuss campaigns, deliverables, and partnership terms.</p>
          <div class="bpp-footer-actions">
            ${
              profile.viewer?.isInfluencer && !own
                ? `<button type="button" class="bpp-btn bpp-btn--gold bpp-message-trigger">Message Business</button>
                   <button type="button" class="bpp-btn bpp-btn--ghost bpp-campaigns-trigger">View Open Campaigns</button>`
                : own
                  ? `<a href="/dashboard" class="bpp-btn bpp-btn--gold">Edit Profile</a>`
                  : `<a href="/login?next=${encodeURIComponent(`/influnet/${slug}`)}" class="bpp-btn bpp-btn--gold">Log in to message</a>`
            }
          </div>
        </div>
        <p class="bpp-share">Share this profile · <strong>influnet.io/influnet/${escapeHtml(slug)}</strong></p>
      </div>

      <div class="bpp-sticky-cta">
        ${
          profile.viewer?.isInfluencer && !own
            ? `<button type="button" class="bpp-btn bpp-btn--navy bpp-message-trigger">Message Business</button>`
            : `<button type="button" class="bpp-btn bpp-btn--navy bpp-share-trigger">Share Profile</button>`
        }
      </div>
    `;

    document.body.appendChild(root);
    wirePage(root, profile);
  }

  async function init() {
    const slug = parseSlug();
    if (!slug) return;

    try {
      const profile = await fetchBusinessProfile(slug);
      if (!profile) return;
      window.__influnet_public_profile_handled = true;
      renderPage(profile);
    } catch (err) {
      console.warn("[influnet] business public profile:", err.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
