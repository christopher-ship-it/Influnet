/**

 * Public influencer profile: /influnet/:slug

 * Business owners see follower stats, niche, budget, content types, and can send connection requests.

 */

(function () {

  const COLLAB_LABELS = {

    reel: "Reels",

    story: "Stories",

    post: "Posts",

    yt: "YouTube Video",

    event: "Event Appearance",

  };



  const PRICE_LABELS = {

    entry: "₹1k – ₹5k",

    standard: "₹5k – ₹10k",

    premium: "₹10k – ₹25k",

    pro: "₹25k+",

  };



  function normalizeSlug(value) {

    return String(value || "")

      .toLowerCase()

      .replace(/[^a-z0-9]+/g, "-")

      .replace(/^-|-$/g, "");

  }



  function parseSlug() {

    const path = window.location.pathname.replace(/\/$/, "") || "/";

    const canonical = path.match(/^\/influnet\/([^/]+)$/i);

    if (canonical) return normalizeSlug(decodeURIComponent(canonical[1]));



    const legacy = path.match(/^\/(influencer|profile)\/([^/]+)$/i);

    if (legacy) {

      const slug = normalizeSlug(decodeURIComponent(legacy[2]));

      if (slug) window.location.replace(`/influnet/${encodeURIComponent(slug)}`);

      return null;

    }

    return null;

  }



  function slugify(name) {

    return normalizeSlug(name);

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



  function nicheList(niche) {

    let list = [];

    if (Array.isArray(niche)) list = niche.filter(Boolean);

    else if (typeof niche === "string") {

      try {

        const p = JSON.parse(niche);

        list = Array.isArray(p) ? p.filter(Boolean) : niche ? [niche] : [];

      } catch {

        list = niche ? [niche] : [];

      }

    }

    return [...new Set(list.map((n) => String(n).trim()).filter(Boolean))];

  }



  function collabList(profile) {

    const raw = profile.collabTypes;

    let list = [];

    if (Array.isArray(raw)) list = raw;

    else if (typeof raw === "string") {

      try {

        const p = JSON.parse(raw);

        list = Array.isArray(p) ? p : [];

      } catch {

        list = [];

      }

    }

    return list.map((id) => COLLAB_LABELS[id] || id).filter(Boolean);

  }



  function formatCount(n) {

    const num = Number(n) || 0;

    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;

    if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;

    return num > 0 ? String(num) : "—";

  }



  function budgetLabel(profile) {

    if (profile.priceRange && PRICE_LABELS[profile.priceRange]) {

      return PRICE_LABELS[profile.priceRange];

    }

    const min = profile.pricingMin != null ? Number(profile.pricingMin) : null;

    const max = profile.pricingMax != null ? Number(profile.pricingMax) : null;

    if (min != null && max != null && min > 0) {

      return `₹${formatCount(min)} – ₹${formatCount(max)}`;

    }

    if (min != null && min > 0) return `From ₹${formatCount(min)}`;

    if (max != null && max > 0) return `Up to ₹${formatCount(max)}`;

    return "On request";

  }



  function buildStats(profile) {

    const items = [

      {

        label: "Instagram",

        value: profile.instagramFollowers,

        handle: profile.instagramHandle,

      },

      {

        label: "YouTube",

        value: profile.youtubeSubscribers,

        handle: profile.youtubeHandle,

      },

      {

        label: "TikTok",

        value: profile.tiktokFollowers,

        handle: profile.tiktokHandle,

      },

      {

        label: "Facebook",

        value: profile.facebookFollowers,

        handle: profile.facebookHandle,

      },

    ].filter((item) => Number(item.value) > 0 || item.handle);



    if (!items.length) return "";



    return `

      <div class="infl-public-section-title">Audience reach</div>

      <div class="infl-public-stats">

        ${items

          .map(

            (item) => `

          <div class="infl-public-stat">

            <div class="infl-public-stat-label">${escapeHtml(item.label)}</div>

            <div class="infl-public-stat-value">${formatCount(item.value)}</div>

            ${item.handle ? `<div class="infl-public-stat-handle">@${escapeHtml(String(item.handle).replace(/^@/, ""))}</div>` : ""}

          </div>`

          )

          .join("")}

      </div>`;

  }



  async function fetchProfile(slug) {

    const res = await fetch(`/api/public/influencer/${encodeURIComponent(slug)}`, {

      credentials: "same-origin",

    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || "Profile not found");

    return data;

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



  function buildConnectSection(profile) {

    const viewer = profile.viewer;

    if (!viewer?.isBusiness || viewer?.isOwner) return "";



    const slug = profile.profileSlug || slugify(profile.name);

    const loginNext = encodeURIComponent(`/influnet/${slug}`);



    if (!viewer.id) {

      return `

        <div class="infl-public-connect">

          <h3>Send a connection request</h3>

          <p>Log in as a business to invite this creator to collaborate.</p>

          <div class="infl-public-actions">

            <a href="/login?next=${loginNext}" class="infl-public-btn infl-public-btn--primary">Log in to connect</a>

            <a href="/signup/business" class="infl-public-btn infl-public-btn--ghost">Join as business</a>

          </div>

        </div>`;

    }



    return `

      <div class="infl-public-connect" id="infl-public-connect">

        <h3>Send a connection request</h3>

        <p>Introduce your brand and propose a collaboration. The creator will see this in their Requests inbox.</p>

        <div class="infl-public-field">

          <label for="infl-connect-msg">Your message</label>

          <textarea id="infl-connect-msg" placeholder="Hi ${escapeHtml((profile.name || "there").split(" ")[0])}, we love your content and would like to discuss a brand collaboration…"></textarea>

        </div>

        <div class="infl-public-field">

          <label for="infl-connect-budget">Proposed budget (₹, optional)</label>

          <input type="number" id="infl-connect-budget" min="0" step="1000" placeholder="e.g. 15000" />

        </div>

        <button type="button" class="infl-public-btn infl-public-btn--primary" id="infl-connect-submit">

          Send Connection Request

        </button>

        <div id="infl-connect-feedback" hidden></div>

      </div>`;

  }



  function buildActions(profile) {

    const viewer = profile.viewer;



    if (viewer?.isOwner) {

      return `

        <a href="/dashboard/influencer" class="infl-public-btn infl-public-btn--primary">Back to Dashboard</a>

        <a href="/dashboard/influencer" id="infl-public-edit-profile" class="infl-public-btn infl-public-btn--outline">Edit Profile</a>

      `;

    }



    if (viewer?.isBusiness) {

      return `<a href="/dashboard" class="infl-public-btn infl-public-btn--ghost">Back to Dashboard</a>`;

    }



    if (viewer?.isInfluencer) {

      return `<a href="/dashboard/influencer" class="infl-public-btn infl-public-btn--primary">Back to Dashboard</a>`;

    }



    if (viewer?.id) {

      const dash = viewer.role === "influencer" ? "/dashboard/influencer" : "/dashboard";

      return `<a href="${dash}" class="infl-public-btn infl-public-btn--primary">Go to Dashboard</a>`;

    }



    const slug = profile.profileSlug || slugify(profile.name);

    const loginNext = encodeURIComponent(`/influnet/${slug}`);

    return `

      <a href="/login?next=${loginNext}" class="infl-public-btn infl-public-btn--primary">Log in to contact</a>

      <a href="/signup/business" class="infl-public-btn infl-public-btn--ghost">Join as business</a>

    `;

  }



  function renderPage(profile) {

    document.getElementById("influnet-public-profile")?.remove();



    const rootEl = document.getElementById("root");

    if (rootEl) rootEl.style.display = "none";



    const slug = profile.profileSlug || slugify(profile.name);

    const publicPath = `influnet/${slug}`;

    const niches = nicheList(profile.niche);

    const collabs = collabList(profile);

    const budget = budgetLabel(profile);

    const own = !!profile.viewer?.isOwner;

    const backHref =

      own || profile.viewer?.isInfluencer

        ? "/dashboard/influencer"

        : profile.viewer

          ? "/dashboard"

          : "/";

    const backLabel = profile.viewer ? "Back to Dashboard" : "Back to Influnet";



    const root = document.createElement("div");

    root.id = "influnet-public-profile";

    root.className = "infl-public-page";

    root.innerHTML = `

      <div class="infl-public-wrap">

        <a href="${backHref}" class="infl-public-back">← ${backLabel}</a>

        ${own ? `<p class="infl-public-preview-note">This is how brands see your public profile</p>` : ""}

        <div class="infl-public-banner"></div>

        <div class="infl-public-card">

          <div class="infl-public-head">

            <div class="infl-public-avatar">${

              profile.avatarUrl

                ? `<img src="${escapeHtml(profile.avatarUrl)}" alt="" />`

                : escapeHtml(initials(profile.name))

            }</div>

            <div style="flex:1;min-width:180px;">

              <h1 class="infl-public-name">${escapeHtml(profile.name || "Creator")}</h1>

              <p class="infl-public-loc">${escapeHtml(profile.location || "Creator on Influnet")}</p>

              <p class="infl-public-handle">${escapeHtml(publicPath)}</p>

            </div>

          </div>



          ${niches.length ? `<div class="infl-public-tags">${niches.map((n) => `<span class="infl-public-tag">${escapeHtml(n)}</span>`).join("")}</div>` : ""}



          ${profile.bio ? `<p class="infl-public-bio">${escapeHtml(profile.bio)}</p>` : ""}



          ${buildStats(profile)}



          <div class="infl-public-meta-row">

            <div class="infl-public-meta-item">

              <span class="infl-public-section-title" style="margin:0;">Typical budget</span>

              <strong>${escapeHtml(budget)}</strong>

            </div>

            ${collabs.length ? `

            <div class="infl-public-meta-item">

              <span class="infl-public-section-title" style="margin:0;">Creates</span>

              <div class="infl-public-tags" style="margin:8px 0 0;">

                ${collabs.map((c) => `<span class="infl-public-tag infl-public-tag--muted">${escapeHtml(c)}</span>`).join("")}

              </div>

            </div>` : ""}

          </div>



          <div class="infl-public-actions">${buildActions(profile)}</div>



          ${buildConnectSection(profile)}

        </div>

        <p class="infl-public-share">Share this page: <strong>${escapeHtml(publicPath)}</strong></p>

      </div>

    `;

    document.body.appendChild(root);



    root.querySelector("#infl-public-edit-profile")?.addEventListener("click", (e) => {

      e.preventDefault();

      window.location.href = "/dashboard/influencer";

      setTimeout(() => {

        const btn = [...document.querySelectorAll("button")].find(

          (b) => b.textContent.trim() === "Edit Profile"

        );

        btn?.click();

      }, 800);

    });



    const submitBtn = root.querySelector("#infl-connect-submit");

    if (submitBtn && profile.userId) {

      submitBtn.addEventListener("click", async () => {

        const msgEl = root.querySelector("#infl-connect-msg");

        const budgetEl = root.querySelector("#infl-connect-budget");

        const feedback = root.querySelector("#infl-connect-feedback");

        const message = msgEl?.value?.trim() || "";

        const budgetVal = budgetEl?.value?.trim() || "";



        submitBtn.disabled = true;

        submitBtn.textContent = "Sending…";

        if (feedback) feedback.hidden = true;



        try {

          const result = await sendConnectionRequest(profile.userId, message, budgetVal);

          if (feedback) {

            feedback.hidden = false;

            if (result.ok || result.status === 200) {

              feedback.className = "infl-public-msg infl-public-msg--ok";

              feedback.textContent = result.data?.alreadyConnected
                ? "You are already connected. Open Messages in your dashboard to chat."
                : "Connection request sent";

              submitBtn.textContent = result.data?.alreadyConnected
                ? "Already connected"
                : "Connection request sent";

            } else {

              feedback.className = "infl-public-msg infl-public-msg--err";

              feedback.textContent = result.data?.error || "Could not send request. Please try again.";

              submitBtn.disabled = false;

              submitBtn.textContent = "Send Connection Request";

            }

          }

        } catch {

          if (feedback) {

            feedback.hidden = false;

            feedback.className = "infl-public-msg infl-public-msg--err";

            feedback.textContent = "Network error. Check your connection and try again.";

          }

          submitBtn.disabled = false;

          submitBtn.textContent = "Send Connection Request";

        }

      });

    }

  }



  function renderError(message) {

    const rootEl = document.getElementById("root");

    if (rootEl) rootEl.style.display = "none";



    const root = document.createElement("div");

    root.id = "influnet-public-profile";

    root.className = "infl-public-page";

    root.style.display = "flex";

    root.style.alignItems = "center";

    root.style.justifyContent = "center";

    root.innerHTML = `

      <div style="text-align:center;padding:24px;">

        <h1 style="font-size:22px;margin:0 0 8px;">Profile not found</h1>

        <p style="color:#6b7280;margin:0 0 16px;">${escapeHtml(message)}</p>

        <a href="/" style="color:#7c3aed;font-weight:700;text-decoration:none;">Go to Influnet home</a>

      </div>

    `;

    document.body.appendChild(root);

  }



  async function init() {

    const slug = parseSlug();

    if (!slug) return;



    try {

      const profile = await fetchProfile(slug);

      renderPage(profile);

    } catch (err) {

      renderError(err.message || "This creator profile is not available.");

    }

  }



  if (document.readyState === "loading") {

    document.addEventListener("DOMContentLoaded", init);

  } else {

    init();

  }

})();


