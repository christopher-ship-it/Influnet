/**
 * Post-login profile completion wizard (influencer + business).
 */
(function () {
  try {
    const OVERLAY_ID = "infl-profile-completion-overlay";
    const DISMISS_KEY = "influnet_profile_completion_dismissed";
    const NICHES = [
      "Fashion & Beauty", "Tech & Gadgets", "Food & Cooking", "Travel",
      "Fitness & Health", "Gaming", "Finance", "Lifestyle", "Education",
      "Entertainment", "Sports", "Parenting", "Home Decor", "Art & Design",
      "Music", "Comedy", "Business", "Environment",
    ];
    const AGE_RANGES = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];

    let wizardData = null;
    let stepIndex = 0;
    let steps = [];
    let open = false;

    function isDashboard() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      return path === "/dashboard" || path === "/dashboard/influencer";
    }

    function authHeaders() {
      const token = localStorage.getItem("influnet_token");
      return token
        ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
        : { "Content-Type": "application/json" };
    }

    async function fetchCompletion() {
      const res = await fetch("/api/profile/completion", {
        credentials: "same-origin",
        headers: authHeaders(),
      });
      if (!res.ok) return null;
      return res.json();
    }

    function buildInfluencerSteps(profile, pending) {
      const s = [];
      if (pending.some((p) => p.key === "headline")) {
        s.push({
          id: "headline",
          title: "Profile headline",
          hint: "A short line brands see in search results.",
          render: () => `
            <div class="infl-pcw-field">
              <label>Headline</label>
              <input type="text" id="pcw-headline" maxlength="120"
                value="${esc(profile?.headline || "")}"
                placeholder="e.g. Mumbai-based fashion creator | 120K IG" />
            </div>`,
          collect: () => ({
            headline: document.getElementById("pcw-headline")?.value?.trim() || null,
          }),
        });
      }
      if (pending.some((p) => p.key === "availability")) {
        s.push({
          id: "availability",
          title: "Availability",
          hint: "Let brands know if you are open for collaborations.",
          render: () => `
            <div class="infl-pcw-field">
              <label>Status</label>
              <select id="pcw-availability">
                <option value="">Select…</option>
                <option value="open" ${profile?.availabilityStatus === "open" ? "selected" : ""}>Open for collaborations</option>
                <option value="limited" ${profile?.availabilityStatus === "limited" ? "selected" : ""}>Limited availability</option>
                <option value="paused" ${profile?.availabilityStatus === "paused" ? "selected" : ""}>Paused / not taking work</option>
              </select>
            </div>`,
          collect: () => ({
            availabilityStatus: document.getElementById("pcw-availability")?.value || null,
          }),
        });
      }
      if (pending.some((p) => p.key === "portfolio")) {
        s.push({
          id: "portfolio",
          title: "Portfolio links",
          hint: "Add links to your best work (one per line).",
          render: () => {
            const lines = (profile?.portfolio || [])
              .map((x) => (typeof x === "string" ? x : x.url || ""))
              .filter(Boolean)
              .join("\n");
            return `
            <div class="infl-pcw-field">
              <label>Portfolio URLs</label>
              <textarea id="pcw-portfolio" rows="4" placeholder="https://...">${esc(lines)}</textarea>
            </div>`;
          },
          collect: () => {
            const lines = (document.getElementById("pcw-portfolio")?.value || "")
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            return { portfolio: lines.map((url) => ({ url })) };
          },
        });
      }
      if (pending.some((p) => p.key === "mediaKit")) {
        s.push({
          id: "mediaKit",
          title: "Media kit",
          hint: "Link to your media kit or rate card.",
          render: () => `
            <div class="infl-pcw-field">
              <label>Media kit URL</label>
              <input type="url" id="pcw-media-kit" value="${esc(profile?.mediaKitUrl || "")}" placeholder="https://..." />
            </div>`,
          collect: () => ({
            mediaKitUrl: document.getElementById("pcw-media-kit")?.value?.trim() || null,
          }),
        });
      }
      if (pending.some((p) => p.key === "audience")) {
        s.push({
          id: "audience",
          title: "Audience demographics",
          hint: "Helps brands match campaigns to your audience.",
          render: () => {
            const demo = profile?.audienceDemographics || {};
            const selected = Array.isArray(demo.ageRanges) ? demo.ageRanges : [];
            const cities = Array.isArray(demo.topCities) ? demo.topCities.join(", ") : "";
            return `
            <div class="infl-pcw-field">
              <label>Age ranges</label>
              <div class="infl-pcw-chips" id="pcw-ages">
                ${AGE_RANGES.map(
                  (a) =>
                    `<button type="button" class="infl-pcw-chip${selected.includes(a) ? " active" : ""}" data-age="${a}">${a}</button>`
                ).join("")}
              </div>
            </div>
            <div class="infl-pcw-field">
              <label>Top cities (comma-separated)</label>
              <input type="text" id="pcw-cities" value="${esc(cities)}" placeholder="Mumbai, Delhi, Bangalore" />
            </div>`;
          },
          wire: (root) => {
            root.querySelector("#pcw-ages")?.addEventListener("click", (e) => {
              const btn = e.target.closest("[data-age]");
              if (!btn) return;
              btn.classList.toggle("active");
            });
          },
          collect: () => {
            const ages = [...document.querySelectorAll("#pcw-ages .infl-pcw-chip.active")].map(
              (b) => b.getAttribute("data-age")
            );
            const cities = (document.getElementById("pcw-cities")?.value || "")
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean);
            return { audienceDemographics: { ageRanges: ages, topCities: cities } };
          },
        });
      }
      return s;
    }

    function buildBusinessSteps(profile, pending) {
      const s = [];
      if (pending.some((p) => p.key === "username")) {
        s.push({
          id: "username",
          title: "Business username",
          hint: "Your public URL: influnet/yourbrand",
          render: () => `
            <div class="infl-pcw-field">
              <label>Username</label>
              <input type="text" id="pcw-biz-username" maxlength="30"
                value="${esc(profile?.businessUsername || profile?.username || "")}"
                placeholder="nexusapparel" />
              <p id="pcw-biz-user-status" class="infl-pcw-msg"></p>
            </div>`,
          wire: (root) => {
            const input = root.querySelector("#pcw-biz-username");
            const status = root.querySelector("#pcw-biz-user-status");
            let timer;
            input?.addEventListener("input", () => {
              clearTimeout(timer);
              timer = setTimeout(async () => {
                const u = input.value.trim().toLowerCase();
                if (!status) return;
                if (!u) {
                  status.textContent = "";
                  return;
                }
                try {
                  const res = await fetch(
                    `/api/business-profile/username/check?username=${encodeURIComponent(u)}`,
                    { credentials: "same-origin" }
                  );
                  const data = await res.json().catch(() => ({}));
                  if (data.available) {
                    status.textContent = "Username available";
                    status.className = "infl-pcw-msg ok";
                  } else {
                    status.textContent = data.error || "Username already taken";
                    status.className = "infl-pcw-msg err";
                  }
                } catch {
                  status.textContent = "";
                }
              }, 400);
            });
          },
          collect: () => ({
            businessUsername:
              document.getElementById("pcw-biz-username")?.value?.trim().toLowerCase() || null,
          }),
        });
      }
      if (pending.some((p) => p.key === "tagline")) {
        s.push({
          id: "tagline",
          title: "Tagline",
          render: () => `
            <div class="infl-pcw-field">
              <label>Tagline</label>
              <input type="text" id="pcw-tagline" maxlength="160" value="${esc(profile?.tagline || "")}"
                placeholder="Premium streetwear for Gen Z India" />
            </div>`,
          collect: () => ({
            tagline: document.getElementById("pcw-tagline")?.value?.trim() || null,
          }),
        });
      }
      if (pending.some((p) => p.key === "description")) {
        s.push({
          id: "description",
          title: "Company description",
          render: () => `
            <div class="infl-pcw-field">
              <label>About your brand</label>
              <textarea id="pcw-description" rows="4">${esc(profile?.companyDescription || "")}</textarea>
            </div>`,
          collect: () => ({
            companyDescription: document.getElementById("pcw-description")?.value?.trim() || null,
          }),
        });
      }
      if (pending.some((p) => p.key === "logo")) {
        s.push({
          id: "logo",
          title: "Company logo",
          render: () => `
            <div class="infl-pcw-field">
              <label>Upload logo</label>
              <input type="file" id="pcw-logo" accept="image/*" />
              ${profile?.logoUrl ? `<p class="infl-pcw-msg">Current logo on file.</p>` : ""}
            </div>`,
          collect: () => ({}),
          afterSave: async () => {
            const file = document.getElementById("pcw-logo")?.files?.[0];
            if (file && window.influnetUploadBusinessLogo) {
              await window.influnetUploadBusinessLogo(file);
            }
          },
        });
      }
      if (pending.some((p) => p.key === "niches")) {
        s.push({
          id: "niches",
          title: "Preferred creator niches",
          render: () => {
            const selected = profile?.preferredCreatorNiches || [];
            return `
            <div class="infl-pcw-chips" id="pcw-niches">
              ${NICHES.map(
                (n) =>
                  `<button type="button" class="infl-pcw-chip${selected.includes(n) ? " active" : ""}" data-niche="${esc(n)}">${esc(n)}</button>`
              ).join("")}
            </div>`;
          },
          wire: (root) => {
            root.querySelector("#pcw-niches")?.addEventListener("click", (e) => {
              const btn = e.target.closest("[data-niche]");
              if (!btn) return;
              btn.classList.toggle("active");
            });
          },
          collect: () => ({
            preferredCreatorNiches: [
              ...document.querySelectorAll("#pcw-niches .infl-pcw-chip.active"),
            ].map((b) => b.getAttribute("data-niche")),
          }),
        });
      }
      if (pending.some((p) => p.key === "audience")) {
        s.push({
          id: "audience",
          title: "Target audience",
          render: () => {
            const ta = profile?.targetAudience || {};
            const selected = Array.isArray(ta.ageRanges) ? ta.ageRanges : [];
            const regions = Array.isArray(ta.regions) ? ta.regions.join(", ") : "";
            return `
            <div class="infl-pcw-field">
              <label>Target age ranges</label>
              <div class="infl-pcw-chips" id="pcw-ta-ages">
                ${AGE_RANGES.map(
                  (a) =>
                    `<button type="button" class="infl-pcw-chip${selected.includes(a) ? " active" : ""}" data-age="${a}">${a}</button>`
                ).join("")}
              </div>
            </div>
            <div class="infl-pcw-field">
              <label>Target regions (comma-separated)</label>
              <input type="text" id="pcw-regions" value="${esc(regions)}" placeholder="Maharashtra, Karnataka" />
            </div>`;
          },
          wire: (root) => {
            root.querySelector("#pcw-ta-ages")?.addEventListener("click", (e) => {
              const btn = e.target.closest("[data-age]");
              if (!btn) return;
              btn.classList.toggle("active");
            });
          },
          collect: () => {
            const ages = [...document.querySelectorAll("#pcw-ta-ages .infl-pcw-chip.active")].map(
              (b) => b.getAttribute("data-age")
            );
            const regions = (document.getElementById("pcw-regions")?.value || "")
              .split(",")
              .map((r) => r.trim())
              .filter(Boolean);
            return { targetAudience: { ageRanges: ages, regions } };
          },
        });
      }
      return s;
    }

    function esc(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    }

    function renderStep() {
      const overlay = document.getElementById(OVERLAY_ID);
      if (!overlay || !steps.length) return;
      const step = steps[stepIndex];
      const pct = Math.round(((stepIndex + 1) / steps.length) * 100);
      overlay.innerHTML = `
        <div class="infl-pcw-card" role="dialog" aria-modal="true">
          <h2>${step.title}</h2>
          <p class="sub">${step.hint || ""}</p>
          <div class="infl-pcw-progress"><div style="width:${pct}%"></div></div>
          <div id="pcw-body">${step.render()}</div>
          <p id="pcw-error" class="infl-pcw-msg err" style="display:none"></p>
          <div class="infl-pcw-actions">
            <button type="button" class="infl-pcw-btn infl-pcw-btn-ghost" id="pcw-skip">Later</button>
            <button type="button" class="infl-pcw-btn infl-pcw-btn-primary" id="pcw-next">
              ${stepIndex === steps.length - 1 ? "Finish" : "Save & continue"}
            </button>
          </div>
        </div>`;
      step.wire?.(overlay);
      overlay.querySelector("#pcw-skip")?.addEventListener("click", dismiss);
      overlay.querySelector("#pcw-next")?.addEventListener("click", saveStep);
    }

    function dismiss() {
      try {
        sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      closeWizard();
    }

    function closeWizard() {
      open = false;
      document.getElementById(OVERLAY_ID)?.remove();
    }

    async function saveStep() {
      const step = steps[stepIndex];
      const errEl = document.getElementById("pcw-error");
      const btn = document.getElementById("pcw-next");
      if (!step || !btn) return;
      btn.disabled = true;
      if (errEl) errEl.style.display = "none";
      try {
        const payload = step.collect();
        const res = await fetch("/api/profile/completion", {
          method: "PATCH",
          credentials: "same-origin",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not save");
        if (step.afterSave) await step.afterSave();
        const saved = data.user || data.profile;
        if (saved) {
          const u = JSON.parse(localStorage.getItem("influnet_user") || "{}");
          localStorage.setItem("influnet_user", JSON.stringify({ ...u, ...saved }));
        }
        stepIndex += 1;
        if (stepIndex >= steps.length) {
          closeWizard();
          window.dispatchEvent(new CustomEvent("influnet-profile-updated"));
          return;
        }
        wizardData = await fetchCompletion();
        renderStep();
      } catch (err) {
        if (errEl) {
          errEl.style.display = "block";
          errEl.textContent = err.message || "Save failed";
        }
      } finally {
        btn.disabled = false;
      }
    }

    async function maybeOpen() {
      if (!isDashboard() || open) return;
      if (!localStorage.getItem("influnet_token")) return;
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path === "/dashboard/influencer") {
        if (localStorage.getItem("influnet_needs_progressive_setup") === "1") return;
        try {
          const dismissed = Number(
            sessionStorage.getItem("influnet_progressive_onboarding_dismissed") || 0
          );
          if (dismissed && Date.now() - dismissed < 1000 * 60 * 60 * 2) return;
        } catch (_) {}
      }
      try {
        const dismissed = Number(sessionStorage.getItem(DISMISS_KEY) || 0);
        if (dismissed && Date.now() - dismissed < 1000 * 60 * 60 * 4) return;
      } catch {
        /* ignore */
      }

      const data = await fetchCompletion();
      if (!data?.completion || data.completion.postSignupComplete) return;
      const pending = data.completion.postSignupPending || [];
      if (!pending.length) return;

      wizardData = data;
      steps =
        data.role === "business_owner"
          ? buildBusinessSteps(data.profile, pending)
          : buildInfluencerSteps(data.profile, pending);
      if (!steps.length) return;

      stepIndex = 0;
      open = true;
      const overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      document.body.appendChild(overlay);
      renderStep();
    }

    // Profile completion is opened from Profile Settings when needed — not on dashboard login.
    window.influnetOpenProfileCompletion = maybeOpen;
  } catch (e) {
    console.warn("[influnet] profile-completion-wizard:", e);
  }
})();
