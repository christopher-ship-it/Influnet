/**
 * Full influencer profile edit — all fields from signup flow.
 */
(function () {
  try {
    const ROOT_ID = "influnet-profile-edit-root";

    const NICHES = [
      "Fashion & Beauty", "Tech & Gadgets", "Food & Cooking", "Travel",
      "Fitness & Health", "Gaming", "Finance", "Lifestyle", "Education",
      "Entertainment", "Sports", "Parenting", "Home Decor", "Art & Design",
      "Music", "Comedy", "Business", "Environment",
    ];

    const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];

    const LANGUAGES = [
      "English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
      "Marathi", "Bengali", "Gujarati", "Punjabi",
    ];

    const COLLAB_TYPES = [
      { id: "reel", label: "Reel", desc: "Short-form vertical video" },
      { id: "story", label: "Story", desc: "24-hour audience update" },
      { id: "post", label: "Post", desc: "Static image/grid content" },
      { id: "yt", label: "YouTube Video", desc: "In-depth dedicated video" },
      { id: "event", label: "Event Appearance", desc: "In-person brand representation" },
    ];

    const PRICE_RANGES = [
      { id: "entry", label: "Entry", range: "₹1k – ₹5k" },
      { id: "standard", label: "Standard", range: "₹5k – ₹10k" },
      { id: "premium", label: "Premium", range: "₹10k – ₹25k" },
      { id: "pro", label: "Pro", range: "₹25k+" },
    ];

    const EXTRA_PLATFORMS = [
      { id: "tiktok", label: "TikTok" },
      { id: "twitter", label: "X (Twitter)" },
      { id: "snapchat", label: "Snapchat" },
      { id: "pinterest", label: "Pinterest" },
      { id: "website", label: "Website" },
    ];

    const INDIAN_STATES = [
      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
      "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
      "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
      "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
      "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
      "Andaman and Nicobar Islands", "Chandigarh",
      "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
      "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
    ];

    let profileData = null;
    let extraLinks = [];
    let selectedLanguages = [];
    let selectedCollabs = [];
    let priceRange = "";
    let rendered = false;

    function isEditProfilePage() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path !== "/dashboard/influencer") return false;
      if (document.getElementById(ROOT_ID)) return true;
      return [...document.querySelectorAll("h1")].some(
        (h) => h.textContent.trim() === "Edit Profile"
      );
    }

    function getUser() {
      try {
        return JSON.parse(localStorage.getItem("influnet_user") || "null");
      } catch {
        return null;
      }
    }

    function parseLocation(location, city, state) {
      if (city || state) return { city: city || "", state: state || "" };
      const loc = String(location || "").trim();
      if (!loc) return { city: "", state: "" };
      const parts = loc.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { city: parts[0], state: parts.slice(1).join(", ") };
      }
      return { city: loc, state: "" };
    }

    function nicheArray(niche) {
      if (Array.isArray(niche)) return niche.filter(Boolean);
      return [];
    }

    function parseExtraLinks(raw) {
      if (Array.isArray(raw)) return raw.filter((x) => x && x.id);
      if (typeof raw === "string") {
        try {
          const p = JSON.parse(raw);
          return Array.isArray(p) ? p : [];
        } catch {
          return [];
        }
      }
      return [];
    }

    function buildExtraFromProfile(p) {
      const links = parseExtraLinks(p.extraSocialLinks);
      const ids = new Set(links.map((l) => l.id));
      if (p.tiktokHandle && !ids.has("tiktok")) {
        links.push({ id: "tiktok", url: p.tiktokHandle });
      }
      if (p.twitterHandle && !ids.has("twitter")) {
        links.push({ id: "twitter", url: p.twitterHandle });
      }
      return links;
    }

    async function loadProfile() {
      const res = await fetch("/api/influencer-profile/me", { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load profile");
      return data;
    }

    async function saveProfile(payload) {
      const res = await fetch("/api/influencer-profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      return data;
    }

    function hideNativeForm(container) {
      container.classList.add("influnet-profile-edit-enhanced");
    }

    function optionHtml(list, value, emptyLabel) {
      return (
        `<option value="">${emptyLabel || "Select"}</option>` +
        list.map((o) => {
          const v = typeof o === "string" ? o : o.id;
          const l = typeof o === "string" ? o : o.label || o;
          return `<option value="${v}"${v === value ? " selected" : ""}>${l}</option>`;
        }).join("")
      );
    }

    function renderForm(root, p) {
      const user = getUser();
      const loc = parseLocation(p.location, p.city, p.state);
      const niches = nicheArray(p.niche);
      extraLinks = buildExtraFromProfile(p);
      selectedLanguages = Array.isArray(p.languages) ? [...p.languages] : [];
      selectedCollabs = Array.isArray(p.collabTypes) ? [...p.collabTypes] : [];
      priceRange = p.priceRange || "";

      root.innerHTML = `
        <div class="infl-edit-header">
          <div>
            <h1>Edit Profile</h1>
            <p>Update everything brands see — same details as when you signed up.</p>
          </div>
          <button type="button" class="infl-edit-save" id="infl-edit-save-btn">Save Changes</button>
        </div>
        <div id="infl-edit-msg" class="infl-edit-msg" style="display:none"></div>

        <section class="infl-edit-card">
          <h2>Contact</h2>
          <p class="sub">How businesses reach you</p>
          <div class="infl-edit-grid-2">
            <div class="infl-edit-field">
              <label>Name</label>
              <input type="text" value="${esc(p.name || user?.name || "")}" disabled />
            </div>
            <div class="infl-edit-field">
              <label>Phone Number</label>
              <input type="tel" id="infl-phone" value="${esc(p.phone || "")}" placeholder="+91 98765 43210" />
            </div>
          </div>
          <div class="infl-edit-field">
            <label>Email</label>
            <input type="email" value="${esc(p.email || user?.email || "")}" disabled />
          </div>
        </section>

        <section class="infl-edit-card">
          <h2>Profile Details</h2>
          <p class="sub">Location, gender, and languages</p>
          <div class="infl-edit-grid-2">
            <div class="infl-edit-field">
              <label>Gender</label>
              <select id="infl-gender">${optionHtml(GENDERS, p.gender || "", "Select gender")}</select>
            </div>
            <div class="infl-edit-field">
              <label>City</label>
              <input type="text" id="infl-city" value="${esc(loc.city)}" placeholder="e.g. Mumbai" />
            </div>
          </div>
          <div class="infl-edit-field">
            <label>State / Province</label>
            <select id="infl-state">${optionHtml(INDIAN_STATES, loc.state, "Select state")}</select>
          </div>
          <div class="infl-edit-field">
            <label>Languages</label>
            <div class="infl-edit-chips" id="infl-languages">
              ${LANGUAGES.map(
                (lang) =>
                  `<button type="button" class="infl-edit-chip${selectedLanguages.includes(lang) ? " active" : ""}" data-lang="${lang}">${lang}</button>`
              ).join("")}
            </div>
          </div>
        </section>

        <section class="infl-edit-card">
          <h2>Creator &amp; Social Platforms</h2>
          <p class="sub">Niches, bio, handles, and audience sizes you enter manually</p>
          <div class="infl-edit-grid-2">
            <div class="infl-edit-field">
              <label>Primary Niche</label>
              <select id="infl-niche1">${optionHtml(NICHES, niches[0] || "", "Select niche")}</select>
            </div>
            <div class="infl-edit-field">
              <label>Secondary Niche</label>
              <select id="infl-niche2">${optionHtml(NICHES, niches[1] || "", "Optional")}</select>
            </div>
          </div>
          <div class="infl-edit-field">
            <label>Bio / About</label>
            <textarea id="infl-bio" rows="4" placeholder="Tell brands about your creative journey...">${esc(p.bio || "")}</textarea>
          </div>
          <div class="infl-edit-social-row">
            <label>Instagram</label>
            <input type="text" id="infl-ig" value="${esc(p.instagramHandle || "")}" placeholder="instagram.com/yourprofile" />
          </div>
          <div class="infl-edit-social-row">
            <label>IG Followers</label>
            <input type="number" id="infl-ig-followers" min="0" value="${num(p.instagramFollowers)}" placeholder="Your entry" />
          </div>
          <div class="infl-edit-social-row">
            <label>Facebook</label>
            <input type="text" id="infl-fb" value="${esc(p.facebookHandle || "")}" placeholder="facebook.com/yourprofile" />
          </div>
          <div class="infl-edit-social-row">
            <label>FB Followers</label>
            <input type="number" id="infl-fb-followers" min="0" value="${num(p.facebookFollowers)}" placeholder="Your entry" />
          </div>
          <div class="infl-edit-social-row">
            <label>YouTube</label>
            <input type="text" id="infl-yt" value="${esc(p.youtubeHandle || "")}" placeholder="youtube.com/@channel" />
          </div>
          <div class="infl-edit-social-row">
            <label>YT Subscribers</label>
            <input type="number" id="infl-yt-subs" min="0" value="${num(p.youtubeSubscribers)}" placeholder="Your entry" />
          </div>
          <div class="infl-edit-social-row">
            <label>LinkedIn</label>
            <input type="text" id="infl-li" value="${esc(p.linkedinHandle || "")}" placeholder="linkedin.com/in/you" />
          </div>
          <div class="infl-edit-social-row">
            <label>TikTok</label>
            <input type="text" id="infl-tiktok" value="${esc(p.tiktokHandle || "")}" placeholder="tiktok.com/@username" />
          </div>
          <div class="infl-edit-social-row">
            <label>TikTok Followers</label>
            <input type="number" id="infl-tiktok-followers" min="0" value="${num(p.tiktokFollowers)}" placeholder="Your entry" />
          </div>
          <div class="infl-edit-field" style="margin-top:0.75rem">
            <label>Other Platforms</label>
            <div id="infl-extra-links"></div>
            <button type="button" class="infl-edit-add-btn" id="infl-add-platform">+ Add platform</button>
          </div>
        </section>

        <section class="infl-edit-card">
          <h2>Collaboration Preferences</h2>
          <p class="sub">Types of collaborations and typical pricing</p>
          <div class="infl-edit-collab-grid" id="infl-collab-types">
            ${COLLAB_TYPES.map(
              (c) => `
              <button type="button" class="infl-edit-collab-card${selectedCollabs.includes(c.id) ? " active" : ""}" data-collab="${c.id}">
                <strong>${c.label}</strong>
                <span>${c.desc}</span>
              </button>`
            ).join("")}
          </div>
          <div class="infl-edit-field" style="margin-top:1rem">
            <label>Typical Price Range</label>
            <div class="infl-edit-price-grid" id="infl-price-range">
              ${PRICE_RANGES.map(
                (pr) => `
                <button type="button" class="infl-edit-price-btn${priceRange === pr.id ? " active" : ""}" data-price="${pr.id}">
                  <div class="tier">${pr.label}</div>
                  <div class="range">${pr.range}</div>
                </button>`
              ).join("")}
            </div>
          </div>
        </section>

        <section class="infl-edit-card">
          <h2>Portfolio &amp; Media Kit</h2>
          <p class="sub">Links to your work and media kit</p>
          <div class="infl-edit-field">
            <label>Media Kit URL</label>
            <input type="url" id="infl-media-kit" value="${esc(p.mediaKitUrl || "")}" placeholder="https://..." />
          </div>
          <div class="infl-edit-field">
            <label>Portfolio Links (one per line)</label>
            <textarea id="infl-portfolio" rows="3" placeholder="https://instagram.com/p/...">${esc(
              (Array.isArray(p.portfolio) ? p.portfolio : [])
                .map((x) => (typeof x === "string" ? x : x.url || ""))
                .filter(Boolean)
                .join("\n")
            )}</textarea>
          </div>
        </section>
      `;

      wireForm(root);
    }

    function esc(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    }

    function num(n) {
      const v = Number(n);
      return Number.isFinite(v) && v > 0 ? v : "";
    }

    function renderExtraLinks() {
      const host = document.getElementById("infl-extra-links");
      if (!host) return;
      host.innerHTML = extraLinks
        .map(
          (link, i) => `
        <div class="infl-edit-extra-row">
          <select data-extra-idx="${i}" class="infl-extra-id">
            ${EXTRA_PLATFORMS.map(
              (pl) =>
                `<option value="${pl.id}"${link.id === pl.id ? " selected" : ""}>${pl.label}</option>`
            ).join("")}
          </select>
          <input type="text" data-extra-idx="${i}" class="infl-extra-url" value="${esc(link.url || "")}" placeholder="Profile URL" />
          <button type="button" class="infl-edit-remove-btn" data-remove-extra="${i}">Remove</button>
        </div>`
        )
        .join("");
    }

    function wireForm(root) {
      renderExtraLinks();

      root.querySelector("#infl-languages")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-lang]");
        if (!btn) return;
        const lang = btn.getAttribute("data-lang");
        if (selectedLanguages.includes(lang)) {
          selectedLanguages = selectedLanguages.filter((l) => l !== lang);
          btn.classList.remove("active");
        } else {
          selectedLanguages.push(lang);
          btn.classList.add("active");
        }
      });

      root.querySelector("#infl-collab-types")?.addEventListener("click", (e) => {
        const card = e.target.closest("[data-collab]");
        if (!card) return;
        const id = card.getAttribute("data-collab");
        if (selectedCollabs.includes(id)) {
          selectedCollabs = selectedCollabs.filter((c) => c !== id);
          card.classList.remove("active");
        } else {
          selectedCollabs.push(id);
          card.classList.add("active");
        }
      });

      root.querySelector("#infl-price-range")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-price]");
        if (!btn) return;
        priceRange = btn.getAttribute("data-price");
        root.querySelectorAll("[data-price]").forEach((el) => {
          el.classList.toggle("active", el.getAttribute("data-price") === priceRange);
        });
      });

      root.querySelector("#infl-add-platform")?.addEventListener("click", () => {
        const used = new Set(extraLinks.map((l) => l.id));
        const next = EXTRA_PLATFORMS.find((p) => !used.has(p.id));
        if (!next) return;
        extraLinks.push({ id: next.id, url: "" });
        renderExtraLinks();
        wireExtraRows();
      });

      function wireExtraRows() {
        document.querySelectorAll("[data-remove-extra]").forEach((btn) => {
          btn.onclick = () => {
            const i = Number(btn.getAttribute("data-remove-extra"));
            extraLinks.splice(i, 1);
            renderExtraLinks();
            wireExtraRows();
          };
        });
        document.querySelectorAll(".infl-extra-id").forEach((sel) => {
          sel.onchange = () => {
            const i = Number(sel.getAttribute("data-extra-idx"));
            extraLinks[i].id = sel.value;
          };
        });
        document.querySelectorAll(".infl-extra-url").forEach((inp) => {
          inp.oninput = () => {
            const i = Number(inp.getAttribute("data-extra-idx"));
            extraLinks[i].url = inp.value;
          };
        });
      }
      wireExtraRows();

      root.querySelector("#infl-edit-save-btn")?.addEventListener("click", onSave);
    }

    function showMsg(text, ok) {
      const el = document.getElementById("infl-edit-msg");
      if (!el) return;
      el.style.display = "block";
      el.className = `infl-edit-msg ${ok ? "ok" : "err"}`;
      el.textContent = text;
    }

    async function onSave() {
      const btn = document.getElementById("infl-edit-save-btn");
      if (!btn) return;
      btn.disabled = true;
      btn.textContent = "Saving…";

      const niche = [
        document.getElementById("infl-niche1")?.value,
        document.getElementById("infl-niche2")?.value,
      ].filter(Boolean);

      const tiktokVal = document.getElementById("infl-tiktok")?.value?.trim() || "";
      const extras = extraLinks
        .filter((l) => l.url?.trim() && !["tiktok", "twitter"].includes(l.id))
        .map((l) => ({ id: l.id, url: l.url.trim() }));

      const twitterExtra = extraLinks.find((l) => l.id === "twitter");
      const portfolioLines = (document.getElementById("infl-portfolio")?.value || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const payload = {
        phone: document.getElementById("infl-phone")?.value?.trim() || null,
        gender: document.getElementById("infl-gender")?.value || null,
        city: document.getElementById("infl-city")?.value?.trim() || null,
        state: document.getElementById("infl-state")?.value?.trim() || null,
        languages: selectedLanguages,
        bio: document.getElementById("infl-bio")?.value?.trim() || null,
        niche,
        instagramHandle: document.getElementById("infl-ig")?.value?.trim() || null,
        facebookHandle: document.getElementById("infl-fb")?.value?.trim() || null,
        youtubeHandle: document.getElementById("infl-yt")?.value?.trim() || null,
        linkedinHandle: document.getElementById("infl-li")?.value?.trim() || null,
        tiktokHandle: tiktokVal || null,
        instagramFollowers: document.getElementById("infl-ig-followers")?.value || 0,
        facebookFollowers: document.getElementById("infl-fb-followers")?.value || 0,
        youtubeSubscribers: document.getElementById("infl-yt-subs")?.value || 0,
        tiktokFollowers: document.getElementById("infl-tiktok-followers")?.value || 0,
        twitterHandle: twitterExtra?.url?.trim() || null,
        extraSocialLinks: extras.length ? JSON.stringify(extras) : null,
        collabTypes: selectedCollabs,
        priceRange: priceRange || null,
        mediaKitUrl: document.getElementById("infl-media-kit")?.value?.trim() || null,
        portfolio: portfolioLines.map((url) => ({ url })),
      };

      try {
        await saveProfile(payload);
        profileData = await loadProfile();
        showMsg("Profile saved successfully.", true);
        window.dispatchEvent(new CustomEvent("influnet-profile-updated"));
      } catch (err) {
        showMsg(err.message || "Could not save profile.", false);
      } finally {
        btn.disabled = false;
        btn.textContent = "Save Changes";
      }
    }

    async function mount() {
      if (!isEditProfilePage()) {
        rendered = false;
        return;
      }

      const container = document.querySelector(".max-w-2xl.mx-auto");
      if (!container) return;

      let root = document.getElementById(ROOT_ID);
      if (!root) {
        root = document.createElement("div");
        root.id = ROOT_ID;
        const photoCard = document.getElementById("influnet-profile-photo-card");
        if (photoCard) photoCard.insertAdjacentElement("afterend", root);
        else container.prepend(root);
      }

      hideNativeForm(container);

      if (rendered && root.childElementCount) return;

      try {
        profileData = await loadProfile();
        renderForm(root, profileData);
        rendered = true;
      } catch (err) {
        root.innerHTML = `<div class="infl-edit-msg err">${esc(err.message)}</div>`;
      }
    }

    function tick() {
      if (!isEditProfilePage()) {
        document.querySelector(".influnet-profile-edit-enhanced")?.classList.remove(
          "influnet-profile-edit-enhanced"
        );
        rendered = false;
        return;
      }
      mount();
    }

    tick();
    setInterval(tick, 2000);
    window.addEventListener("popstate", tick);
    window.addEventListener("load", tick);
    window.addEventListener("influnet-profile-updated", () => {
      rendered = false;
      tick();
    });
  } catch (e) {
    console.warn("[influnet] influencer-profile-full-edit:", e);
  }
})();
