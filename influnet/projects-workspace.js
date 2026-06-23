/**
 * Projects hub — dedicated project workspace.
 */
(function () {
  try {
    const MOUNT_ID = "influnet-projects-workspace-mount";
    const STAGES = [
      { key: "collaboration_started", label: "Project Started" },
      { key: "project_discussion", label: "Project Discussion" },
      { key: "advance_payment", label: "Advance Payment" },
      { key: "content_planning", label: "Content Planning" },
      { key: "content_confirmation", label: "Content Confirmation" },
      { key: "shooting_in_progress", label: "Shooting In Progress" },
      { key: "editing_in_progress", label: "Editing In Progress" },
      { key: "sent_for_review", label: "Sent For Review" },
      { key: "revisions", label: "Revisions" },
      { key: "final_approval", label: "Final Approval" },
      { key: "final_payment", label: "Final Payment" },
      { key: "project_completed", label: "Project Completed" },
    ];

    let view = "list";
    let selectedId = null;
    let projects = [];
    let collaborators = [];
    let detail = null;
    let assets = [];
    let loading = false;
    let pollTimer = null;
    let lastSection = "";
    let createModalOpen = false;
    let modalKeydownHandler = null;

    const BUDGET_OPTIONS = [
      { value: "5000", label: "Under ₹10,000" },
      { value: "25000", label: "₹10,000 – ₹50,000" },
      { value: "100000", label: "₹50,000 – ₹2,00,000" },
      { value: "250000", label: "₹2,00,000+" },
    ];

    const DURATION_OPTIONS = [
      { value: "1 week", label: "1 week" },
      { value: "2 weeks", label: "2 weeks" },
      { value: "1 month", label: "1 month" },
      { value: "2 months", label: "2 months" },
      { value: "3 months", label: "3 months" },
      { value: "3+ months", label: "3+ months" },
    ];

    const CONTENT_TYPE_OPTIONS = [
      { value: "reel", label: "Reel" },
      { value: "video", label: "Video" },
      { value: "story", label: "Story" },
      { value: "post", label: "Post" },
      { value: "youtube", label: "YouTube Video" },
    ];

    function normalizeContentTypeLabel(value) {
      return String(value || "").trim().replace(/\s+/g, " ");
    }

    function contentTypeKey(value) {
      return normalizeContentTypeLabel(value).toLowerCase();
    }

    function resolveContentTypeLabel(value) {
      const key = contentTypeKey(value);
      const preset = CONTENT_TYPE_OPTIONS.find(
        (o) => o.value === key || contentTypeKey(o.label) === key
      );
      return preset?.label || normalizeContentTypeLabel(value);
    }

    function getSelectedContentTypes(root) {
      const chips = root?.querySelectorAll("#infl-proj-content-chips .infl-proj-content-chip");
      if (!chips?.length) return [];
      return [...chips].map((chip) => chip.getAttribute("data-label") || chip.textContent || "").filter(Boolean);
    }

    function renderContentTypeSuggestions(root, query) {
      const list = root.querySelector("#infl-proj-content-suggestions");
      if (!list) return;
      const selected = new Set(getSelectedContentTypes(root).map(contentTypeKey));
      const q = contentTypeKey(query);
      const matches = CONTENT_TYPE_OPTIONS.filter((o) => {
        if (selected.has(o.value) || selected.has(contentTypeKey(o.label))) return false;
        if (!q) return true;
        return o.value.includes(q) || contentTypeKey(o.label).includes(q);
      });
      const typed = normalizeContentTypeLabel(query);
      const typedKey = contentTypeKey(typed);
      const canAddCustom =
        typed.length >= 2 &&
        !selected.has(typedKey) &&
        !CONTENT_TYPE_OPTIONS.some(
          (o) => o.value === typedKey || contentTypeKey(o.label) === typedKey
        );

      if (!matches.length && !canAddCustom) {
        list.hidden = true;
        list.innerHTML = "";
        return;
      }

      const items = matches
        .map(
          (o) =>
            `<li><button type="button" class="infl-proj-content-suggestion" data-pick="${escapeHtml(o.label)}">${escapeHtml(o.label)}</button></li>`
        )
        .join("");
      const custom = canAddCustom
        ? `<li><button type="button" class="infl-proj-content-suggestion infl-proj-content-suggestion--custom" data-pick="${escapeHtml(typed)}">Add “${escapeHtml(typed)}”</button></li>`
        : "";
      list.innerHTML = items + custom;
      list.hidden = false;
    }

    function addContentType(root, rawValue) {
      const label = resolveContentTypeLabel(rawValue);
      if (!label || label.length < 2) return false;
      const key = contentTypeKey(label);
      const existing = getSelectedContentTypes(root).map(contentTypeKey);
      if (existing.includes(key)) return false;

      const chips = root.querySelector("#infl-proj-content-chips");
      const chip = document.createElement("span");
      chip.className = "infl-proj-content-chip";
      chip.setAttribute("data-label", label);
      chip.innerHTML = `${escapeHtml(label)}<button type="button" class="infl-proj-content-chip-remove" aria-label="Remove ${escapeHtml(label)}">×</button>`;
      chips?.appendChild(chip);
      return true;
    }

    function wireContentTypeCombo(form) {
      const combo = form.querySelector("#infl-proj-content-type");
      const input = form.querySelector("#infl-proj-content-type-input");
      if (!combo || !input || combo.dataset.inflWired === "1") return;
      combo.dataset.inflWired = "1";

      let blurTimer = 0;

      const sync = () => {
        renderContentTypeSuggestions(combo, input.value);
        updateCreateFormState(form);
      };

      const hideSuggestions = () => {
        const list = combo.querySelector("#infl-proj-content-suggestions");
        if (list) list.hidden = true;
      };

      input.addEventListener("input", sync);
      input.addEventListener("focus", sync);
      input.addEventListener("blur", () => {
        blurTimer = window.setTimeout(() => {
          hideSuggestions();
          validateCreateForm(form, true);
        }, 140);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (addContentType(combo, input.value)) {
            input.value = "";
            sync();
            clearFieldError(input);
          }
          return;
        }
        if (e.key === "," || e.key === ";") {
          e.preventDefault();
          if (addContentType(combo, input.value)) {
            input.value = "";
            sync();
            clearFieldError(input);
          }
          return;
        }
        if (e.key === "Backspace" && !input.value) {
          const chips = combo.querySelectorAll("#infl-proj-content-chips .infl-proj-content-chip");
          const last = chips[chips.length - 1];
          last?.remove();
          sync();
        }
        if (e.key === "Escape") hideSuggestions();
      });

      combo.querySelector("#infl-proj-content-suggestions")?.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      combo.addEventListener("click", (e) => {
        const pick = e.target.closest("[data-pick]");
        if (pick) {
          window.clearTimeout(blurTimer);
          if (addContentType(combo, pick.getAttribute("data-pick"))) {
            input.value = "";
            clearFieldError(input);
          }
          input.focus();
          sync();
          return;
        }
        const remove = e.target.closest(".infl-proj-content-chip-remove");
        if (remove) {
          remove.closest(".infl-proj-content-chip")?.remove();
          sync();
        }
      });
    }

    function parseBudgetNumber(raw) {
      const digits = String(raw || "").replace(/[^\d.]/g, "");
      if (!digits) return null;
      const n = Number(digits);
      return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    }

    function findBudgetOption(raw) {
      const text = String(raw || "").trim().toLowerCase();
      if (!text) return null;
      const exact = BUDGET_OPTIONS.find((o) => o.label.toLowerCase() === text);
      if (exact) return exact;
      const digits = text.replace(/[^\d]/g, "");
      if (digits) {
        const byValue = BUDGET_OPTIONS.find((o) => o.value === digits);
        if (byValue) return byValue;
      }
      return null;
    }

    function formatBudgetAmount(amount) {
      return `₹${Number(amount).toLocaleString("en-IN")}`;
    }

    function getBudgetValue(form) {
      const hidden = form.querySelector("#infl-proj-budget-value");
      if (hidden?.value && Number(hidden.value) > 0) return Number(hidden.value);
      const input = form.querySelector("#infl-proj-budget-input");
      const text = String(input?.value || "").trim();
      if (!text) return null;
      const preset = findBudgetOption(text);
      if (preset) return Number(preset.value);
      return parseBudgetNumber(text);
    }

    function setBudgetSelection(combo, { label, value }) {
      const input = combo.querySelector("#infl-proj-budget-input");
      const hidden = combo.querySelector("#infl-proj-budget-value");
      if (input) input.value = label;
      if (hidden) hidden.value = String(value);
    }

    function syncBudgetFromInput(combo, form) {
      const input = combo.querySelector("#infl-proj-budget-input");
      const hidden = combo.querySelector("#infl-proj-budget-value");
      const text = String(input?.value || "").trim();
      if (!text) {
        if (hidden) hidden.value = "";
        return;
      }
      const preset = findBudgetOption(text);
      if (preset) {
        setBudgetSelection(combo, preset);
        return;
      }
      const amount = parseBudgetNumber(text);
      if (amount) {
        if (hidden) hidden.value = String(amount);
      } else if (hidden) {
        hidden.value = "";
      }
    }

    function renderBudgetSuggestions(combo, query) {
      const list = combo.querySelector("#infl-proj-budget-suggestions");
      if (!list) return;
      const q = String(query || "").trim().toLowerCase();
      const digitQ = q.replace(/[^\d]/g, "");
      const matches = BUDGET_OPTIONS.filter((o) => {
        if (!q) return true;
        return (
          o.label.toLowerCase().includes(q) ||
          (digitQ && o.value.includes(digitQ))
        );
      });
      const typed = parseBudgetNumber(query);
      const canAddCustom =
        typed &&
        !BUDGET_OPTIONS.some((o) => Number(o.value) === typed) &&
        (!q || !findBudgetOption(query));

      if (!matches.length && !canAddCustom) {
        list.hidden = true;
        list.innerHTML = "";
        return;
      }

      const items = matches
        .map(
          (o) =>
            `<li><button type="button" class="infl-proj-content-suggestion" data-budget-value="${escapeHtml(o.value)}" data-budget-label="${escapeHtml(o.label)}">${escapeHtml(o.label)}</button></li>`
        )
        .join("");
      const custom = canAddCustom
        ? `<li><button type="button" class="infl-proj-content-suggestion infl-proj-content-suggestion--custom" data-budget-value="${typed}" data-budget-label="${escapeHtml(formatBudgetAmount(typed))}">Use ${escapeHtml(formatBudgetAmount(typed))}</button></li>`
        : "";
      list.innerHTML = items + custom;
      list.hidden = false;
    }

    function wireBudgetCombo(form) {
      const combo = form.querySelector("#infl-proj-budget");
      const input = form.querySelector("#infl-proj-budget-input");
      if (!combo || !input || combo.dataset.inflWired === "1") return;
      combo.dataset.inflWired = "1";

      let blurTimer = 0;

      const sync = () => {
        syncBudgetFromInput(combo, form);
        renderBudgetSuggestions(combo, input.value);
        updateCreateFormState(form);
      };

      const hideSuggestions = () => {
        const list = combo.querySelector("#infl-proj-budget-suggestions");
        if (list) list.hidden = true;
      };

      input.addEventListener("input", sync);
      input.addEventListener("focus", () => {
        renderBudgetSuggestions(combo, input.value);
      });
      input.addEventListener("blur", () => {
        blurTimer = window.setTimeout(() => {
          hideSuggestions();
          syncBudgetFromInput(combo, form);
          const amount = getBudgetValue(form);
          if (amount && !findBudgetOption(input.value)) {
            input.value = formatBudgetAmount(amount);
          }
          validateCreateForm(form, true);
          updateCreateFormState(form);
        }, 140);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hideSuggestions();
      });

      combo.querySelector("#infl-proj-budget-suggestions")?.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      combo.addEventListener("click", (e) => {
        const pick = e.target.closest("[data-budget-value]");
        if (!pick) return;
        window.clearTimeout(blurTimer);
        setBudgetSelection(combo, {
          label: pick.getAttribute("data-budget-label") || pick.textContent || "",
          value: pick.getAttribute("data-budget-value") || "",
        });
        clearFieldError(input);
        hideSuggestions();
        input.focus();
        updateCreateFormState(form);
      });
    }

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

    function sectionLabel() {
      return "Projects";
    }

    function renameCollaborationsNavLabel() {
      document.querySelectorAll(".flex.h-screen aside nav button").forEach((btn) => {
        const label = normalizeNavText(btn.textContent);
        if (label.toLowerCase() !== "collaborations") return;
        const textSpan =
          btn.querySelector("span.flex-1, span[class*='flex-1'], span.infl-conn-nav-label") ||
          [...btn.querySelectorAll("span")].find((el) => /collaborations/i.test(el.textContent));
        if (textSpan) {
          textSpan.textContent = "Projects";
        } else {
          [...btn.childNodes].forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && /collaborations/i.test(node.textContent)) {
              node.textContent = "Projects";
            }
          });
        }
        btn.setAttribute("aria-label", "Projects");
        btn.setAttribute("title", "Projects");
      });
      document.querySelectorAll(".flex.h-screen main h1, .flex.h-screen header h1").forEach((el) => {
        if (normalizeNavText(el.textContent).toLowerCase() === "collaborations") {
          el.textContent = "Projects";
        }
      });
      const crumb = document.querySelector(
        ".flex.h-screen header span.text-sm.font-semibold.text-gray-800, .flex.h-screen header .text-gray-800.font-semibold"
      );
      if (crumb && normalizeNavText(crumb.textContent).toLowerCase() === "collaborations") {
        crumb.textContent = "Projects";
      }
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

    function labelFromNavButton(btn) {
      if (!btn) return "";
      const label = normalizeNavText(btn.textContent);
      if (label) return label;
      const nav = btn.closest("aside nav");
      if (!nav) return "";
      const buttons = [...nav.querySelectorAll(":scope > button")];
      const idx = buttons.indexOf(btn);
      const businessLabels = [
        "Dashboard",
        "Messages",
        "Requests",
        "Connections",
        "Projects",
        "Saved Creators",
        "Analytics",
        "Invoices",
      ];
      const influencerLabels = [
        "Dashboard",
        "Messages",
        "Requests",
        "Connections",
        "Projects",
        "Analytics",
        "Subscription",
      ];
      const labels = isBusiness() ? businessLabels : influencerLabels;
      return idx >= 0 ? labels[idx] || "" : "";
    }

    function isProjectsNavLabel(label) {
      const l = String(label || "").toLowerCase();
      return l === "projects" || l === "collaborations";
    }

    function getActiveSection() {
      const crumb = document.querySelector(
        ".flex.h-screen header span.text-sm.font-semibold.text-gray-800, .flex.h-screen header .text-gray-800.font-semibold"
      );
      const crumbLabel = crumb ? normalizeNavText(crumb.textContent) : "";
      if (isProjectsNavLabel(crumbLabel)) return crumbLabel;

      const nav = document.querySelector(".flex.h-screen aside nav");
      if (nav) {
        const active = [...nav.querySelectorAll(":scope > button")].find(
          (b) =>
            b.classList.contains("bg-violet-100") ||
            /\bbg-violet-100\b/.test(b.className)
        );
        if (active) return labelFromNavButton(active) || normalizeNavText(active.textContent);
      }
      return crumbLabel;
    }

    function isProjectsSectionActive() {
      return isProjectsNavLabel(getActiveSection());
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

    function formatDateTime(iso) {
      if (!iso) return { date: "", time: "" };
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
        time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      };
    }

    function stageLabel(key) {
      return STAGES.find((s) => s.key === key)?.label || String(key || "").replace(/_/g, " ");
    }

    function normalizeStage(key) {
      const k = String(key || "");
      const legacy = {
        lead_received: "collaboration_started",
        start_project: "collaboration_started",
        discussion_started: "project_discussion",
        client_review: "sent_for_review",
        final_iteration: "revisions",
        project_done: "project_completed",
        content_creation: "shooting_in_progress",
        content_review: "sent_for_review",
        content_published: "final_approval",
        payment_received: "final_payment",
      };
      return legacy[k] || (STAGES.some((s) => s.key === k) ? k : "collaboration_started");
    }

    function isCompleted(p) {
      return (
        String(p.status).toLowerCase() === "completed" ||
        normalizeStage(p.currentStage) === "project_completed"
      );
    }

    function nextStageKey(current) {
      const key = normalizeStage(current);
      const idx = STAGES.findIndex((s) => s.key === key);
      if (idx < 0 || idx >= STAGES.length - 1) return null;
      return STAGES[idx + 1].key;
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

    function teardownProjectsShell(reason) {
      console.log("[influnet/projects] Projects unmounted", reason || "");
      loading = false;
      stopPoll();
      document.body.classList.remove("infl-projects-workspace-active");
      const mount = document.getElementById(MOUNT_ID);
      if (mount) {
        mount.style.display = "none";
        mount.style.visibility = "hidden";
        mount.style.pointerEvents = "none";
      }
    }

    function mountProjectsShell() {
      console.log("[influnet/projects] Projects mounted");
      document.body.classList.add("infl-projects-workspace-active");
      const main = getMainEl();
      if (!main) return;
      let mount = document.getElementById(MOUNT_ID);
      if (!mount) {
        mount = document.createElement("div");
        mount.id = MOUNT_ID;
        main.appendChild(mount);
      }
      mount.style.display = "block";
      mount.style.visibility = "visible";
      mount.style.pointerEvents = "auto";
      if (!mount.querySelector(".infl-proj-loading, .infl-proj, .infl-proj-error")) {
        mount.innerHTML = `<div class="infl-proj-loading">Loading projects…</div>`;
      }
    }

    function wireNavPreempt() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav || nav.dataset.inflProjNavWired === "1") return;
      nav.dataset.inflProjNavWired = "1";
      nav.addEventListener(
        "click",
        (e) => {
          const btn = e.target.closest("button");
          if (!btn || !nav.contains(btn)) return;
          const label = labelFromNavButton(btn);
          if (isProjectsNavLabel(label)) {
            mountProjectsShell();
            window.setTimeout(refresh, 0);
          } else {
            teardownProjectsShell("nav-click");
          }
        },
        true
      );
    }

    window.influnetTeardownProjectsWorkspace = teardownProjectsShell;
    window.influnetMountProjectsWorkspace = mountProjectsShell;
    window.influnetRefreshProjectsWorkspace = refresh;

    function hideStartProjectInChat() {
      document.querySelectorAll("button").forEach((btn) => {
        const t = btn.textContent || "";
        if (/start\s+project/i.test(t) && !btn.dataset.inflProjHidden) {
          btn.style.display = "none";
          btn.setAttribute("aria-hidden", "true");
          btn.dataset.inflProjHidden = "1";
        }
      });
    }

    function navToMessages() {
      const target = "Messages";
      const btn = [...document.querySelectorAll("aside nav button")].find(
        (b) => normalizeNavText(b.textContent).toLowerCase() === target.toLowerCase()
      );
      btn?.click();
    }

    function openProjectChat() {
      if (!detail?.counterparty?.name) {
        navToMessages();
        return;
      }
      navToMessages();
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("influnet-open-messages", {
            detail: { name: detail.counterparty.name },
          })
        );
      }, 400);
    }

    function buildListHtml() {
      const active = projects.filter((p) => !isCompleted(p));
      const done = projects.filter((p) => isCompleted(p));

      const card = (p) => {
        const stage = p.currentStageLabel || stageLabel(normalizeStage(p.currentStage));
        const badge = isCompleted(p)
          ? `<span class="infl-proj-badge infl-proj-badge-done">Completed</span>`
          : `<span class="infl-proj-badge infl-proj-badge-active">Active</span>`;
        return `
        <article class="infl-proj-card">
          <div style="display:flex;justify-content:space-between;gap:0.5rem;align-items:flex-start">
            <h3>${escapeHtml(p.title)}</h3>
            ${badge}
          </div>
          <div class="infl-proj-card-meta">
            with <strong>${escapeHtml(p.counterparty?.name || "Collaborator")}</strong><br>
            Current Stage: <strong>${escapeHtml(stage)}</strong><br>
            Last Updated: ${escapeHtml(timeAgo(p.updatedAt))}
          </div>
          <div class="infl-proj-card-foot">
            <span class="infl-proj-card-meta">${p.budget != null ? `Budget: ₹${Number(p.budget).toLocaleString()}` : ""}</span>
            <button type="button" class="infl-proj-btn infl-proj-btn-primary" data-action="open" data-id="${p.id}">Open Project</button>
          </div>
        </article>`;
      };

      return `
      <div class="infl-proj" data-infl-projects>
        <div class="infl-proj-head">
          <div>
            <h2>${escapeHtml(sectionLabel())}</h2>
            <p>Your dedicated projects hub — manage campaigns from start to finish.</p>
          </div>
          <button type="button" class="infl-proj-btn infl-proj-btn-primary" data-action="create">
            + Create Project
          </button>
        </div>

        <h4 class="infl-proj-section-title">Active Projects</h4>
        ${
          active.length
            ? `<div class="infl-proj-grid">${active.map(card).join("")}</div>`
            : `<div class="infl-proj-empty">No active projects yet. Connect in Connections, then create your first project.</div>`
        }

        ${
          done.length
            ? `<h4 class="infl-proj-section-title">Completed</h4><div class="infl-proj-grid">${done.map(card).join("")}</div>`
            : ""
        }
      </div>`;
    }

    function buildPipelineHtml(p) {
      const current = normalizeStage(p.currentStage);
      const currentIdx = STAGES.findIndex((s) => s.key === current);
      const next = nextStageKey(current);
      const items = STAGES.map((s, i) => {
        let cls = "";
        if (i < currentIdx) cls = "is-done";
        else if (i === currentIdx) cls = "is-current";
        const advance =
          i === currentIdx && next
            ? `<div class="infl-proj-advance-wrap">
                <button type="button" class="infl-proj-btn infl-proj-btn-primary" data-action="advance">
                  Advance to ${escapeHtml(stageLabel(next))}
                </button>
              </div>`
            : "";
        return `<li class="${cls}">
          <span class="infl-proj-pipeline-dot"></span>
          <div class="infl-proj-pipeline-label">${escapeHtml(s.label)}</div>
          ${advance}
        </li>`;
      }).join("");

      return `<ul class="infl-proj-pipeline">${items}</ul>`;
    }

    function buildActivityHtml(p) {
      const history = [...(p.history || [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      if (!history.length) {
        return `<p class="infl-proj-card-meta">Activity will appear as you progress through the pipeline.</p>`;
      }
      return `<ul class="infl-proj-activity">${history
        .map((h) => {
          const dt = formatDateTime(h.createdAt);
          const who = h.updatedByName || "User";
          const action = h.note || h.stageLabel || stageLabel(h.stage);
          return `<li>
            <strong>${escapeHtml(who)}</strong>
            <span>${escapeHtml(action)}</span>
            <time>${escapeHtml(dt.date)} · ${escapeHtml(dt.time)}</time>
          </li>`;
        })
        .join("")}</ul>`;
    }

    function buildAssetsHtml() {
      const rows = assets.length
        ? assets
            .map((a) => {
              const href = a.linkUrl || a.fileUrl;
              const label = a.fileName || "Asset";
              return `<div class="infl-proj-asset-row">
                <span>${escapeHtml(label)} · ${escapeHtml(a.uploadedByName || "User")}</span>
                ${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">Open</a>` : ""}
              </div>`;
            })
            .join("")
        : `<p class="infl-proj-card-meta">Upload images, videos, documents, or share links.</p>`;

      return `
      <div class="infl-proj-assets-list">${rows}</div>
      <div class="infl-proj-upload-row">
        <input type="file" id="infl-proj-file" accept="image/*,video/*,.pdf,.doc,.docx,.zip" />
        <button type="button" class="infl-proj-btn infl-proj-btn-ghost" data-action="upload-file">Upload File</button>
      </div>
      <div class="infl-proj-upload-row" style="margin-top:0.5rem">
        <input type="url" id="infl-proj-link" placeholder="https://drive.google.com/..." />
        <input type="text" id="infl-proj-link-name" placeholder="Link label" />
        <button type="button" class="infl-proj-btn infl-proj-btn-ghost" data-action="upload-link">Add Link</button>
      </div>`;
    }

    function buildDetailHtml(p) {
      const stage = p.currentStageLabel || stageLabel(normalizeStage(p.currentStage));
      const cp = p.counterparty || {};
      return `
      <div class="infl-proj" data-infl-projects>
        <button type="button" class="infl-proj-detail-back" data-action="back">← Back to projects</button>

        <div class="infl-proj-hero">
          <div class="infl-proj-hero-top">
            <div class="infl-proj-avatar">${escapeHtml(initials(cp.name))}</div>
            <div>
              <h2 style="margin:0;font-size:1.2rem;font-weight:800">${escapeHtml(p.title)}</h2>
              <p class="infl-proj-card-meta" style="margin-top:0.25rem">
                with ${escapeHtml(cp.name || "Collaborator")}
                · <span class="infl-proj-badge infl-proj-badge-active">${escapeHtml(stage)}</span>
              </p>
              <p class="infl-proj-card-meta">
                Budget: ${p.budget != null ? `₹${Number(p.budget).toLocaleString()}` : "—"}
                · Timeline: ${escapeHtml(p.timeline || "—")}
                · Updated ${escapeHtml(timeAgo(p.updatedAt))}
              </p>
            </div>
          </div>
          <div class="infl-proj-hero-actions">
            <button type="button" class="infl-proj-btn infl-proj-btn-primary" data-action="project-chat">Project Chat</button>
            <button type="button" class="infl-proj-btn infl-proj-btn-ghost" data-action="refresh">Refresh</button>
          </div>
        </div>

        <div class="infl-proj-layout">
          <div>
            <div class="infl-proj-panel">
              <h3>Pipeline</h3>
              ${buildPipelineHtml(p)}
            </div>
            <div class="infl-proj-panel">
              <h3>Project Assets</h3>
              ${buildAssetsHtml()}
            </div>
          </div>
          <div class="infl-proj-panel">
            <h3>Activity</h3>
            ${buildActivityHtml(p)}
          </div>
        </div>
      </div>`;
    }

    function counterpartyFieldLabel() {
      return isBusiness() ? "Select Creator" : "Select Business Owner";
    }

    function buildSelectOptions(options, placeholder) {
      const head = `<option value="">${escapeHtml(placeholder)}</option>`;
      const body = options
        .map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
        .join("");
      return head + body;
    }

    function buildCreateModalHtml() {
      const ownerSelect = collaborators.length
        ? `<select id="infl-proj-collab" name="counterpartyUserId" required aria-required="true">
            ${buildSelectOptions(
              collaborators.map((c) => ({ value: c.userId, label: c.name })),
              "Choose a connected partner"
            )}
          </select>`
        : `<select id="infl-proj-collab" name="counterpartyUserId" disabled aria-required="true">
            <option value="">No connected ${isBusiness() ? "creators" : "business owners"} yet</option>
          </select>
          <p class="infl-proj-field-hint">Connect with partners in Connections, then create a project.</p>`;

      return `
      <div class="infl-proj-modal-backdrop" data-infl-create-modal>
        <div class="infl-proj-modal infl-proj-modal--compact" role="dialog" aria-modal="true" aria-labelledby="infl-proj-modal-title">
          <header class="infl-proj-modal-header">
            <button type="button" class="infl-proj-modal-close" data-action="cancel-modal" aria-label="Close dialog">×</button>
            <h3 id="infl-proj-modal-title">Create Project</h3>
            <p>Fill in the details below to start a new collaboration.</p>
          </header>
          <div class="infl-proj-modal-body">
            <form id="infl-proj-create-form" novalidate>
              <div class="infl-proj-field">
                <label for="infl-proj-title">Project Name</label>
                <input id="infl-proj-title" name="title" required aria-required="true" autocomplete="off" placeholder="Summer Collection Campaign" />
              </div>
              <div class="infl-proj-field">
                <label for="infl-proj-collab">${escapeHtml(counterpartyFieldLabel())}</label>
                ${ownerSelect}
              </div>
              <div class="infl-proj-field" data-field-wrap="infl-proj-budget">
                <label for="infl-proj-budget-input">Budget</label>
                <div class="infl-proj-content-combo" id="infl-proj-budget">
                  <input
                    type="text"
                    id="infl-proj-budget-input"
                    autocomplete="off"
                    inputmode="numeric"
                    aria-required="true"
                    placeholder="Type amount or select range"
                  />
                  <input type="hidden" name="budget" id="infl-proj-budget-value" />
                  <ul class="infl-proj-content-suggestions" id="infl-proj-budget-suggestions" hidden></ul>
                </div>
                <p class="infl-proj-field-hint">Enter a custom amount (e.g. ₹50,000) or pick a range.</p>
              </div>
              <div class="infl-proj-field">
                <label for="infl-proj-timeline">Duration</label>
                <select id="infl-proj-timeline" name="timeline" required aria-required="true">
                  ${buildSelectOptions(DURATION_OPTIONS, "Select duration")}
                </select>
              </div>
              <div class="infl-proj-field" data-field-wrap="infl-proj-content-type">
                <label for="infl-proj-content-type-input">Content Type</label>
                <div class="infl-proj-content-combo" id="infl-proj-content-type">
                  <div class="infl-proj-content-chips" id="infl-proj-content-chips" aria-live="polite"></div>
                  <input
                    type="text"
                    id="infl-proj-content-type-input"
                    autocomplete="off"
                    aria-required="true"
                    placeholder="Type or select — Reel, Video, Story…"
                  />
                  <ul class="infl-proj-content-suggestions" id="infl-proj-content-suggestions" hidden></ul>
                </div>
                <p class="infl-proj-field-hint">Select multiple types or type your own. Press Enter to add.</p>
              </div>
              <div class="infl-proj-modal-actions">
                <button type="button" class="infl-proj-btn infl-proj-btn-secondary" data-action="cancel-modal">Cancel</button>
                <button type="submit" class="infl-proj-btn infl-proj-btn-primary" id="infl-proj-submit-btn" disabled>Create Project</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;
    }

    function clearFieldError(field) {
      if (!field) return;
      field.removeAttribute("aria-invalid");
      const wrap = field.closest(".infl-proj-field");
      wrap?.querySelector(".infl-proj-field-error")?.remove();
    }

    function setFieldError(field, message) {
      if (!field) return;
      field.setAttribute("aria-invalid", "true");
      const wrap = field.closest(".infl-proj-field");
      if (!wrap) return;
      let err = wrap.querySelector(".infl-proj-field-error");
      if (!err) {
        err = document.createElement("p");
        err.className = "infl-proj-field-error";
        wrap.appendChild(err);
      }
      err.textContent = message;
    }

    function validateCreateForm(form, showErrors) {
      const title = form.querySelector("#infl-proj-title");
      const collab = form.querySelector("#infl-proj-collab");
      const budgetInput = form.querySelector("#infl-proj-budget-input");
      const timeline = form.querySelector("#infl-proj-timeline");
      const contentInput = form.querySelector("#infl-proj-content-type-input");
      let valid = true;

      const checks = [
        {
          field: title,
          ok: () => String(title?.value || "").trim().length >= 2,
          message: "Enter a project name (at least 2 characters).",
        },
        {
          field: collab,
          ok: () => !collab?.disabled && !!String(collab?.value || "").trim(),
          message: collaborators.length
            ? `Select a connected ${isBusiness() ? "creator" : "business owner"}.`
            : `Connect with a ${isBusiness() ? "creator" : "business owner"} first.`,
        },
        {
          field: budgetInput,
          ok: () => {
            const value = getBudgetValue(form);
            return value != null && value > 0;
          },
          message: "Enter or select a budget.",
        },
        {
          field: timeline,
          ok: () => !!String(timeline?.value || "").trim(),
          message: "Select a duration.",
        },
        {
          field: contentInput,
          ok: () => getSelectedContentTypes(form).length > 0,
          message: "Add at least one content type.",
        },
      ];

      checks.forEach(({ field, ok, message }) => {
        if (showErrors) {
          if (ok()) clearFieldError(field);
          else {
            setFieldError(field, message);
            valid = false;
          }
        } else if (!ok()) {
          valid = false;
        }
      });

      return valid;
    }

    function updateCreateFormState(form) {
      const submitBtn = form?.querySelector("#infl-proj-submit-btn");
      if (!submitBtn) return;
      const valid = validateCreateForm(form, false);
      submitBtn.disabled = !valid;
    }

    function wireMount(mount) {
      mount.querySelectorAll("[data-action]").forEach((el) => {
        el.addEventListener("click", async (e) => {
          const action = el.getAttribute("data-action");
          if (action === "open") {
            selectedId = Number(el.getAttribute("data-id"));
            view = "detail";
            await loadDetail();
          } else if (action === "back") {
            view = "list";
            selectedId = null;
            detail = null;
            stopPoll();
            render();
          } else if (action === "create") {
            showCreateModal();
          } else if (action === "advance") {
            await advanceStage();
          } else if (action === "project-chat") {
            openProjectChat();
          } else if (action === "refresh") {
            await loadDetail();
          } else if (action === "upload-file") {
            await uploadFile();
          } else if (action === "upload-link") {
            await uploadLink();
          }
        });
      });
    }

    function handleCancel() {
      console.log("[influnet/projects] Cancel clicked");
      console.log("[influnet/projects] Closing modal");

      const backdrop = document.querySelector("[data-infl-create-modal]");
      const form = document.getElementById("infl-proj-create-form");
      if (form) {
        form.reset();
        form.querySelectorAll(".infl-proj-field-error").forEach((el) => el.remove());
        form.querySelectorAll("[aria-invalid='true']").forEach((el) => {
          el.removeAttribute("aria-invalid");
        });
        const submitBtn = document.getElementById("infl-proj-submit-btn");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Create Project";
        }
      }

      if (modalKeydownHandler) {
        document.removeEventListener("keydown", modalKeydownHandler);
        modalKeydownHandler = null;
      }

      backdrop?.remove();
      createModalOpen = false;
      console.log("[influnet/projects] Modal closed");
    }

    function wireCreateModal(backdrop) {
      const modal = backdrop.querySelector(".infl-proj-modal");
      const form = backdrop.querySelector("#infl-proj-create-form");

      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) handleCancel();
      });

      modal?.addEventListener("click", (e) => e.stopPropagation());

      backdrop.querySelectorAll('[data-action="cancel-modal"]').forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCancel();
        });
      });

      form?.querySelectorAll("input:not(#infl-proj-content-type-input):not(#infl-proj-budget-input), select").forEach((el) => {
        el.addEventListener("input", () => updateCreateFormState(form));
        el.addEventListener("change", () => updateCreateFormState(form));
        el.addEventListener("blur", () => validateCreateForm(form, true));
      });
      wireBudgetCombo(form);
      wireContentTypeCombo(form);
      updateCreateFormState(form);

      modalKeydownHandler = (e) => {
        if (e.key === "Escape" && createModalOpen) {
          e.preventDefault();
          handleCancel();
        }
      };
      document.addEventListener("keydown", modalKeydownHandler);

      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!validateCreateForm(form, true)) {
          updateCreateFormState(form);
          return;
        }

        const submitBtn = document.getElementById("infl-proj-submit-btn");
        const fd = new FormData(e.target);
        const raw = Object.fromEntries(fd.entries());
        const contentTypes = getSelectedContentTypes(form);
        const payload = {
          title: String(raw.title || "").trim(),
          counterpartyUserId: raw.counterpartyUserId,
          budget: getBudgetValue(form),
          timeline: raw.timeline,
          deliverables: contentTypes.join(", "),
        };

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Creating…";
        }

        try {
          const created = await api("/api/projects", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          handleCancel();
          projects = await api("/api/projects");
          selectedId = created.id;
          view = "detail";
          await loadDetail();
        } catch (err) {
          updateCreateFormState(form);
          if (submitBtn) submitBtn.textContent = "Create Project";
          alert(err.message);
        }
      });
    }

    async function showCreateModal() {
      if (createModalOpen) handleCancel();

      try {
        collaborators = await api("/api/projects/collaborators");
      } catch {
        collaborators = [];
      }

      const wrapper = document.createElement("div");
      wrapper.innerHTML = buildCreateModalHtml();
      const backdrop = wrapper.firstElementChild;
      if (!backdrop) return;

      document.body.appendChild(backdrop);
      createModalOpen = true;
      wireCreateModal(backdrop);

      const firstInput = backdrop.querySelector("#infl-proj-title");
      window.setTimeout(() => firstInput?.focus(), 50);
    }

    async function loadProjects() {
      projects = await api("/api/projects");
    }

    async function loadDetail() {
      if (!selectedId) return;
      loading = true;
      render();
      try {
        detail = await api(`/api/projects/${selectedId}`);
        try {
          assets = await api(`/api/projects/${selectedId}/assets`);
        } catch {
          assets = [];
        }
      } catch (err) {
        detail = { error: err.message };
      }
      loading = false;
      render();
      startPoll();
    }

    async function advanceStage() {
      if (!selectedId) return;
      const btn = document.querySelector('[data-action="advance"]');
      if (btn) btn.disabled = true;
      try {
        detail = await api(`/api/projects/${selectedId}/advance`, { method: "POST", body: "{}" });
        projects = await api("/api/projects");
        try {
          assets = await api(`/api/projects/${selectedId}/assets`);
        } catch {
          assets = [];
        }
        render();
      } catch (err) {
        alert(err.message);
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function uploadFile() {
      const input = document.getElementById("infl-proj-file");
      const file = input?.files?.[0];
      if (!file || !selectedId) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await api(`/api/projects/${selectedId}/assets`, {
            method: "POST",
            body: JSON.stringify({
              dataUrl: reader.result,
              fileName: file.name,
              contentType: file.type,
            }),
          });
          assets = await api(`/api/projects/${selectedId}/assets`);
          render();
        } catch (err) {
          alert(err.message);
        }
      };
      reader.readAsDataURL(file);
    }

    async function uploadLink() {
      const url = document.getElementById("infl-proj-link")?.value?.trim();
      const name = document.getElementById("infl-proj-link-name")?.value?.trim();
      if (!url || !selectedId) return;
      try {
        await api(`/api/projects/${selectedId}/assets`, {
          method: "POST",
          body: JSON.stringify({ linkUrl: url, fileName: name || url }),
        });
        assets = await api(`/api/projects/${selectedId}/assets`);
        render();
      } catch (err) {
        alert(err.message);
      }
    }

    function startPoll() {
      stopPoll();
      if (view !== "detail" || !selectedId) return;
      pollTimer = window.setInterval(() => {
        if (isProjectsSectionActive() && view === "detail") loadDetail();
      }, 12000);
    }

    function stopPoll() {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function render() {
      const mount = ensureMount();
      if (!mount) return;
      if (loading && view === "detail" && !detail) {
        mount.innerHTML = `<div class="infl-proj-loading">Loading project…</div>`;
        return;
      }
      if (detail?.error) {
        mount.innerHTML = `<div class="infl-proj-error">${escapeHtml(detail.error)}</div>`;
        return;
      }
      mount.innerHTML = view === "detail" && detail ? buildDetailHtml(detail) : buildListHtml();
      wireMount(mount);
    }

    async function refresh() {
      if (!isProjectsNavLabel(getActiveSection())) {
        teardownProjectsShell("refresh-inactive");
        return;
      }
      if (!document.body.classList.contains("infl-projects-workspace-active")) {
        return;
      }
      hideStartProjectInChat();
      const mount = ensureMount();
      if (!mount) return;

      if (lastSection !== getActiveSection()) {
        view = "list";
        selectedId = null;
        detail = null;
        stopPoll();
        lastSection = getActiveSection();
      }

      if (loading) return;
      loading = true;
      if (!mount.childElementCount) {
        mount.innerHTML = `<div class="infl-proj-loading">Loading projects…</div>`;
      }
      try {
        await loadProjects();
        if (view === "detail" && selectedId) {
          detail = await api(`/api/projects/${selectedId}`);
          try {
            assets = await api(`/api/projects/${selectedId}/assets`);
          } catch {
            assets = [];
          }
        }
        render();
      } catch (err) {
        mount.innerHTML = `<div class="infl-proj-error">Could not load projects. ${escapeHtml(err.message)}</div>`;
      } finally {
        loading = false;
      }
    }

    function onSectionChange(section) {
      const s = String(section || "").toLowerCase();
      if (s === "projects" || s === "collaborations") {
        mountProjectsShell();
        refresh();
      } else {
        teardownProjectsShell("section-change:" + s);
      }
    }

    (function chainSectionHook(name, handler) {
      const prev = window[name];
      window[name] = function (section) {
        if (typeof prev === "function") prev(section);
        handler(section);
      };
    })("influnetOnInfluencerSectionChange", onSectionChange);

    (function chainSectionHook(name, handler) {
      const prev = window[name];
      window[name] = function (section) {
        if (typeof prev === "function") prev(section);
        handler(section);
      };
    })("influnetOnBusinessSectionChange", onSectionChange);

    window.influnetOpenProject = function (projectId) {
      selectedId = Number(projectId);
      view = "detail";
      const navLabel = sectionLabel();
      const btn = [...document.querySelectorAll("aside nav button")].find((b) =>
        isProjectsNavLabel(normalizeNavText(b.textContent))
      );
      btn?.click();
      window.setTimeout(refresh, 300);
    };

    window.addEventListener("influnet-notification", (e) => {
      const d = e.detail || {};
      if (d.type === "project_update" && isProjectsSectionActive()) refresh();
    });

    wireNavPreempt();
    renameCollaborationsNavLabel();
    setInterval(() => {
      wireNavPreempt();
      renameCollaborationsNavLabel();
      hideStartProjectInChat();
      if (isProjectsSectionActive()) {
        if (!document.body.classList.contains("infl-projects-workspace-active")) {
          mountProjectsShell();
        }
        refresh();
      } else if (document.body.classList.contains("infl-projects-workspace-active")) {
        teardownProjectsShell("interval-stale");
      }
    }, 2500);

    window.addEventListener("influnet-nav-changed", () => {
      if (isProjectsSectionActive()) {
        mountProjectsShell();
        refresh();
      }
    });

    if (isProjectsNavLabel(getActiveSection())) {
      mountProjectsShell();
      refresh();
    }
  } catch (e) {
    console.warn("[influnet] projects-workspace:", e);
  }
})();
