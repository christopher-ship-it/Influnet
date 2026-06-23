/**
 * Intercepts /api/* from the React app.
 * - /api/auth/* → Supabase Auth
 * - other /api/* → empty JSON stubs or Supabase data (so dashboard loads)
 */
(function () {
  const cfg = window.INFLUNET_SUPABASE;
  if (!cfg?.url || !cfg?.key) {
    console.warn("[influnet] Missing INFLUNET_SUPABASE config");
    return;
  }

  let supabase = null;
  let tablesReady = null;
  let collabReady = null;
  let messagingReady = null;
  let presenceReady = null;
  let projectReady = null;
  let dashboardMetricsReady = null;
  let connectionsReady = null;

  const ONLINE_MS = 2 * 60 * 1000;
  const TYPING_MS = 2000;
  const DUMMY_OTP_ENABLED = true;
  const DUMMY_OTP_CODE = "12345678";
  const BUSINESS_PENDING_REVIEW_MESSAGE =
    "Thank you for completing registration. We will verify your account information—including your business name—and get back to you once your account is approved.";
  const BUSINESS_REJECTED_MESSAGE =
    "Your business account could not be approved at this time. Please contact Influnet support for assistance.";
  /** @type {Map<string, number>} */
  const typingUntil = new Map();
  /** @type {Set<{ onmessage: ((ev: { data: string }) => void) | null, userId: string | null }>} */
  const sseClients = new Set();
  /** @type {Map<string, { lastSeenAt: string, isOnline: boolean }>} */
  const presenceCache = new Map();
  let profileEnsureCache = { uid: null, ok: false, at: 0 };
  const PROFILE_ENSURE_FAIL_MS = 300000;
  let sessionSyncInflight = null;
  let collabSyncInflight = null;
  let collabSyncDoneAt = 0;
  const COLLAB_SYNC_COOLDOWN_MS = 45000;

  const supabaseReady = import(
    "https://esm.sh/@supabase/supabase-js@2.49.4"
  ).then(({ createClient }) => {
    supabase = createClient(cfg.url, cfg.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return supabase;
  });

  async function ensureClient() {
    await supabaseReady;
    return supabase;
  }

  window.influnetEnsureSupabase = ensureClient;

  const PROGRESSIVE_SETUP_KEY = "influnet_needs_progressive_setup";

  function markProgressiveSetupIfNeeded(profile) {
    try {
      if (
        !profile ||
        !isInfluencerRole(profile.role, { hasInfluencerProfile: !!profile.username })
      ) {
        return;
      }
      if (profile.onboardingCompleted === true) {
        localStorage.removeItem(PROGRESSIVE_SETUP_KEY);
        return;
      }
      const step =
        profile.onboardingStep != null ? Number(profile.onboardingStep) : null;
      const complete = profile.isProfileComplete === true;
      if (step == null || step < 5 || !complete) {
        localStorage.setItem(PROGRESSIVE_SETUP_KEY, "1");
      }
    } catch (_) {}
  }

  function sessionFromStoredJwt() {
    const access = localStorage.getItem("influnet_token");
    if (!access) return null;
    try {
      const payload = JSON.parse(
        atob(access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      if (!payload?.sub) return null;
      return {
        access_token: access,
        refresh_token: localStorage.getItem("influnet_refresh_token"),
        user: {
          id: payload.sub,
          email: payload.email || null,
        },
      };
    } catch {
      return null;
    }
  }

  function persistSession(session) {
    if (!session) return;
    localStorage.setItem("influnet_token", session.access_token);
    if (session.refresh_token) {
      localStorage.setItem("influnet_refresh_token", session.refresh_token);
    }
  }

  /** Keep Supabase client session in sync with influnet_token (needed for DB / discover). */
  function isInvalidAuthError(message) {
    return /sub claim in JWT does not exist|user from sub claim|invalid JWT|jwt expired|invalid claim|session not found|refresh token not found|refresh_token/i.test(
      String(message || "")
    );
  }

  async function clearStaleAuth(reason) {
    console.warn("[influnet] clearing stale auth:", reason || "session invalid");
    try {
      const sb = await ensureClient();
      await sb.auth.signOut();
    } catch (_) {}
    localStorage.removeItem("influnet_token");
    localStorage.removeItem("influnet_refresh_token");
    localStorage.removeItem("influnet_user");
    profileEnsureCache = { uid: null, ok: false, at: 0 };
    window.dispatchEvent(new CustomEvent("influnet-auth-cleared"));
    showToast("Your session expired. Please sign in again.");
  }

  async function syncSessionFromStorage() {
    if (sessionSyncInflight) return sessionSyncInflight;
    sessionSyncInflight = syncSessionFromStorageCore().finally(() => {
      sessionSyncInflight = null;
    });
    return sessionSyncInflight;
  }

  async function syncSessionFromStorageCore() {
    const sb = await ensureClient();
    const access = localStorage.getItem("influnet_token");
    const refresh = localStorage.getItem("influnet_refresh_token");

    // Prefer existing in-memory/persisted Supabase session first.
    // Calling setSession repeatedly can trigger refresh-token storms.
    const {
      data: { session: existingSession },
    } = await sb.auth.getSession();
    if (existingSession?.user) {
      persistSession(existingSession);
      return existingSession;
    }

    if (access && refresh) {
      const { data: setData, error: setErr } = await sb.auth.setSession({
        access_token: access,
        refresh_token: refresh,
      });
      if (!setErr && setData?.session?.user) {
        persistSession(setData.session);
        return setData.session;
      }
      if (setErr) {
        if (isInvalidAuthError(setErr.message)) {
          await clearStaleAuth(setErr.message);
          return null;
        }
        console.warn("[influnet] session sync:", setErr.message);
      }
    }

    if (access) {
      if (!refresh) {
        // Missing refresh token: avoid calling setSession with invalid fallback token.
        // This prevents 429 loops against /auth/v1/token.
        console.warn("[influnet] session sync: missing refresh token");
        return null;
      }
      const { data: userData, error: userErr } = await sb.auth.getUser(access);
      if (userErr) {
        if (isInvalidAuthError(userErr.message)) {
          await clearStaleAuth(userErr.message);
        }
        return null;
      }
      if (userData?.user) {
        const { data: setData, error: setErr } = await sb.auth.setSession({
          access_token: access,
          refresh_token: refresh,
        });
        if (!setErr && setData?.session?.user) {
          persistSession(setData.session);
          return setData.session;
        }
        return null;
      }
    }
    return null;
  }

  function getStoredInflunetUser() {
    try {
      return JSON.parse(localStorage.getItem("influnet_user") || "null");
    } catch {
      return null;
    }
  }

  /** Complete magic-link sign-in when Supabase redirects with token_hash (link emails). */
  async function handleAuthCallbackFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (!tokenHash || !type) return false;

    const sb = await ensureClient();
    const { data, error } = await sb.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) {
      console.warn("[influnet] magic link verify:", error.message);
      showToast("Sign-in link expired or invalid. Request a new code.");
      return false;
    }
    if (data.session) persistSession(data.session);
    const path =
      type === "recovery" ? "/reset-password" : window.location.pathname;
    window.history.replaceState({}, "", path);
    if (type === "recovery") {
      window.dispatchEvent(new CustomEvent("influnet-password-recovery"));
    }
    return true;
  }

  async function hydrateUserFromServer() {
    await handleAuthCallbackFromUrl();
    const token = localStorage.getItem("influnet_token");
    if (!token) return;
    const session = await syncSessionFromStorage();
    if (!session?.user) {
      localStorage.removeItem("influnet_token");
      localStorage.removeItem("influnet_refresh_token");
      localStorage.removeItem("influnet_user");
      return;
    }
    if (await checkTables()) await ensureOwnProfileInDb();
    const user = await resolveUser(session.user);
    syncStoredUser(user, session.access_token);
  }

  supabaseReady.then(() => {
    const run = () => hydrateUserFromServer().catch(() => {});
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 2500 });
    } else {
      setTimeout(run, 400);
    }
  });

  function normalizeNiche(niche) {
    if (Array.isArray(niche)) {
      return niche.length ? niche.map(String) : ["Creator"];
    }
    if (typeof niche === "string" && niche.trim()) {
      try {
        const parsed = JSON.parse(niche);
        if (Array.isArray(parsed) && parsed.length) return parsed.map(String);
      } catch (_) {
        /* plain string */
      }
      return [niche];
    }
    return ["Creator"];
  }

  function normalizeSecondaryCategories(value) {
    if (value == null) return [];
    const list = Array.isArray(value) ? value : [value];
    return [...new Set(list.map(String).map((s) => s.trim()).filter(Boolean))];
  }

  /** Canonical roles: business_owner | influencer */
  function normalizeUserRole(role, hints) {
    const r = String(role || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (
      r === "business_owner" ||
      r === "business" ||
      r === "brand" ||
      r === "businessowner"
    ) {
      return "business_owner";
    }
    if (r === "influencer" || r === "creator") {
      return "influencer";
    }
    const h = hints || {};
    if (h.hasBusinessProfile && !h.hasInfluencerProfile) {
      return "business_owner";
    }
    if (h.hasInfluencerProfile && !h.hasBusinessProfile) {
      return "influencer";
    }
    return null;
  }

  function isBusinessOwnerRole(role, hints) {
    return normalizeUserRole(role, hints) === "business_owner";
  }

  function isInfluencerRole(role, hints) {
    return normalizeUserRole(role, hints) === "influencer";
  }

  function formatExtraSocialLinks(value) {
    if (value == null) return null;
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return "[]";
    }
  }

  function parseExtraSocialLinks(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  function syncStoredUser(user, token) {
    if (user) {
      localStorage.setItem("influnet_user", JSON.stringify(user));
      markProgressiveSetupIfNeeded(user);
    }
    if (token) localStorage.setItem("influnet_token", token);
    window.dispatchEvent(
      new CustomEvent("influnet-user-updated", { detail: { user, token } })
    );
  }

  function isBusinessPendingApproval(profile) {
    return (
      isBusinessOwnerRole(profile?.role, {
        hasBusinessProfile: !!profile?.companyName || !!profile?.businessUsername,
      }) &&
      profile?.approvalStatus === "rejected"
    );
  }

  async function blockPendingBusinessAccess(profile) {
    if (!isBusinessPendingApproval(profile)) return null;
    const sb = await ensureClient();
    await sb.auth.signOut();
    localStorage.removeItem("influnet_token");
    localStorage.removeItem("influnet_refresh_token");
    localStorage.removeItem("influnet_user");
    return jsonResponse(
      {
        error: BUSINESS_REJECTED_MESSAGE,
        pendingReview: false,
        approvalStatus: profile.approvalStatus,
      },
      403
    );
  }

  /** Testing only — instant business approval from registration screen. */
  async function approveBusinessTest(body) {
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    let userId = String(body?.userId || "").trim() || null;
    if (!email && !userId) {
      return jsonResponse({ error: "Email or user id required" }, 400);
    }
    if (!(await checkTables())) {
      return jsonResponse({ error: "Database not ready" }, 503);
    }
    const sb = await ensureClient();
    if (!userId && email) {
      const { data: profileRow, error: lookupError } = await sb
        .from("profiles")
        .select("id")
        .eq("role", "business_owner")
        .ilike("email", email)
        .maybeSingle();
      if (lookupError) {
        console.warn("[influnet] approveBusinessTest lookup:", lookupError.message);
        return jsonResponse({ error: "Could not verify business." }, 500);
      }
      userId = profileRow?.id || null;
    }
    if (!userId) {
      return jsonResponse({ error: "Business account not found" }, 404);
    }
    const { error: upsertError } = await sb.from("business_profiles").upsert(
      { user_id: userId, approval_status: "approved" },
      { onConflict: "user_id" }
    );
    if (upsertError) {
      console.warn("[influnet] approveBusinessTest upsert:", upsertError.message);
      return jsonResponse({ error: "Could not verify business." }, 500);
    }
    return jsonResponse({ ok: true, userId, approvalStatus: "approved" });
  }

  function dummyOtpPasswordKey(email) {
    return `influnet_dummy_otp_pw:${email}`;
  }

  async function checkTables() {
    if (tablesReady !== null) return tablesReady;
    const sb = await ensureClient();
    const { error } = await sb.from("profiles").select("id").limit(1);
    tablesReady = !error || error.code !== "PGRST205";
    return tablesReady;
  }

  async function checkCollabTables() {
    if (collabReady !== null) return collabReady;
    const sb = await ensureClient();
    const { error } = await sb.from("collab_requests").select("id").limit(1);
    collabReady = !error || error.code !== "PGRST205";
    return collabReady;
  }

  async function checkMessagingTables() {
    if (messagingReady !== null) return messagingReady;
    const sb = await ensureClient();
    const { error } = await sb.from("conversations").select("id").limit(1);
    messagingReady = !error || error.code !== "PGRST205";
    return messagingReady;
  }

  async function checkPresenceTables() {
    if (presenceReady !== null) return presenceReady;
    const sb = await ensureClient();
    const { error } = await sb.from("user_presence").select("user_id").limit(1);
    presenceReady = !error || error.code !== "PGRST205";
    return presenceReady;
  }

  async function checkProjectTables() {
    if (projectReady !== null) return projectReady;
    const sb = await ensureClient();
    const { error } = await sb.from("campaign_projects").select("id").limit(1);
    projectReady = !error || error.code !== "PGRST205";
    return projectReady;
  }

  async function checkDashboardMetricsTables() {
    if (dashboardMetricsReady !== null) return dashboardMetricsReady;
    const sb = await ensureClient();
    const { error } = await sb.from("creator_profile_views").select("id").limit(1);
    dashboardMetricsReady = !error || error.code !== "PGRST205";
    return dashboardMetricsReady;
  }

  async function checkConnectionsTable() {
    if (connectionsReady !== null) return connectionsReady;
    const sb = await ensureClient();
    const { error } = await sb.from("connections").select("id").limit(1);
    connectionsReady = !error || error.code !== "PGRST205";
    return connectionsReady;
  }

  function computeConnectionStrength(projectsCompleted, messagesCount) {
    const p = Number(projectsCompleted) || 0;
    const m = Number(messagesCount) || 0;
    if (p >= 5 || (p >= 3 && m >= 50)) return "top";
    if (p >= 2 || m >= 20) return "trusted";
    if (p >= 1 || m >= 5) return "active";
    return "new";
  }

  function connectionStrengthLabel(status) {
    const map = {
      new: "New Connection",
      active: "Active Partner",
      trusted: "Trusted Partner",
      top: "Top Partner",
    };
    return map[status] || "New Connection";
  }

  async function countMessagesBetweenUsers(userA, userB) {
    if (!(await checkMessagingTables())) return 0;
    const sb = await ensureClient();
    const { data: parts } = await sb
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("user_id", [userA, userB]);
    if (!parts?.length) return 0;
    const byConv = new Map();
    for (const p of parts) {
      if (!byConv.has(p.conversation_id)) byConv.set(p.conversation_id, new Set());
      byConv.get(p.conversation_id).add(p.user_id);
    }
    const sharedConvIds = [...byConv.entries()]
      .filter(([, users]) => users.has(userA) && users.has(userB))
      .map(([id]) => id);
    if (!sharedConvIds.length) return 0;
    const { count } = await sb
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", sharedConvIds);
    return count || 0;
  }

  async function countProjectsBetweenUsers(userA, userB, completedOnly) {
    if (!(await checkProjectTables())) return 0;
    const sb = await ensureClient();
    const pairFilter = `and(owner_user_id.eq.${userA},counterparty_user_id.eq.${userB}),and(owner_user_id.eq.${userB},counterparty_user_id.eq.${userA})`;
    let query = sb
      .from("campaign_projects")
      .select("id", { count: "exact", head: true })
      .or(pairFilter);
    if (completedOnly) {
      query = query.or("status.eq.completed,current_stage.eq.project_completed");
    } else {
      query = query
        .neq("status", "completed")
        .neq("current_stage", "project_completed");
    }
    const { count } = await query;
    return count || 0;
  }

  async function syncConnectionMetrics(userId, otherUserId) {
    const [messagesCount, projectsCompleted, activeProjects] = await Promise.all([
      countMessagesBetweenUsers(userId, otherUserId),
      countProjectsBetweenUsers(userId, otherUserId, true),
      countProjectsBetweenUsers(userId, otherUserId, false),
    ]);
    const relationshipStatus = computeConnectionStrength(projectsCompleted, messagesCount);
    return { messagesCount, projectsCompleted, activeProjects, relationshipStatus };
  }

  async function ensureConnectionForUsers(userId, otherUserId, opts = {}) {
    if (!userId || !otherUserId || userId === otherUserId) return null;
    if (!(await checkConnectionsTable())) return null;
    const sb = await ensureClient();
    const metrics = await syncConnectionMetrics(userId, otherUserId);
    const now = new Date().toISOString();
    const rows = [
      { user_id: userId, connected_user_id: otherUserId },
      { user_id: otherUserId, connected_user_id: userId },
    ];
    const created = [];
    for (const row of rows) {
      const { data: existing } = await sb
        .from("connections")
        .select("*")
        .eq("user_id", row.user_id)
        .eq("connected_user_id", row.connected_user_id)
        .maybeSingle();
      const payload = {
        user_id: row.user_id,
        connected_user_id: row.connected_user_id,
        status: "active",
        messages_count: metrics.messagesCount,
        projects_completed: metrics.projectsCompleted,
        relationship_status: metrics.relationshipStatus,
        last_interaction_at: now,
        ...(existing ? {} : { connected_at: now }),
      };
      const { data, error } = await sb
        .from("connections")
        .upsert(payload, { onConflict: "user_id,connected_user_id" })
        .select("*")
        .single();
      if (!error && data) {
        created.push(data);
        if (!existing && row.user_id === userId && opts.notify !== false) {
          broadcastNotification({
            type: "connection_created",
            connectionId: data.id,
            connectedUserId: otherUserId,
            message: "You have a new connection on Influnet.",
          });
        }
      }
    }
    return created.find((r) => r.user_id === userId) || created[0] || null;
  }

  function formatConnectionProfile(profile, viewerRole) {
    if (!profile) return null;
    const isBusiness = profile.role === "business_owner";
    const niche = normalizeNiche(profile.niche);
    const loc = [profile.city, profile.state].filter(Boolean).join(", ") || profile.location || "";
    const slug = isBusiness
      ? resolveBusinessPublicSlug(profile)
      : normalizeUsername(profile.username || profile.profileSlug);
    return {
      id: profile.id,
      role: profile.role,
      name: isBusiness ? profile.companyName || profile.name : profile.name,
      username: isBusiness ? profile.businessUsername || profile.username : profile.username,
      industry: profile.industry || niche[0] || "",
      category: niche[0] || profile.industry || "",
      location: loc,
      avatarUrl: isBusiness ? profile.logoUrl || profile.avatarUrl : profile.avatarUrl,
      profileUrl: slug ? `/influnet/${encodeURIComponent(slug)}` : null,
      isVerified: isBusiness
        ? profile.approvalStatus === "approved"
        : !!profile.isVerified || !!profile.phoneVerified,
    };
  }

  async function listConnectionsForUser(userId, query = {}) {
    if (!(await checkConnectionsTable())) {
      return { connections: [], metrics: {}, viewerRole: null };
    }
    const viewer = await resolveUser({ id: userId });
    const sb = await ensureClient();
    let q = sb
      .from("connections")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "removed")
      .order("favorite", { ascending: false })
      .order("last_interaction_at", { ascending: false });
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = rows || [];
    const otherIds = [...new Set(list.map((r) => r.connected_user_id))];
    const profiles = otherIds.length ? await loadProfilesMap(otherIds) : new Map();

    let enriched = await Promise.all(
      list.map(async (row) => {
        const metrics = await syncConnectionMetrics(userId, row.connected_user_id);
        const relationshipStatus = metrics.relationshipStatus;
        if (
          row.relationship_status !== relationshipStatus ||
          row.messages_count !== metrics.messagesCount ||
          row.projects_completed !== metrics.projectsCompleted
        ) {
          await sb
            .from("connections")
            .update({
              relationship_status: relationshipStatus,
              messages_count: metrics.messagesCount,
              projects_completed: metrics.projectsCompleted,
            })
            .eq("id", row.id);
        }
        const partner = formatConnectionProfile(profiles.get(row.connected_user_id), viewer?.role);
        return {
          id: row.id,
          connectedUserId: row.connected_user_id,
          connectedAt: row.connected_at,
          status: row.status,
          favorite: !!row.favorite,
          notes: row.notes || "",
          projectsCompleted: metrics.projectsCompleted,
          messagesCount: metrics.messagesCount,
          activeProjects: metrics.activeProjects,
          lastInteractionAt: row.last_interaction_at,
          relationshipStatus,
          strengthLabel: connectionStrengthLabel(relationshipStatus),
          partner,
          currentStatus:
            metrics.activeProjects > 0
              ? `${metrics.activeProjects} active project${metrics.activeProjects === 1 ? "" : "s"}`
              : metrics.projectsCompleted > 0
                ? "Collaborated"
                : "Connected",
        };
      })
    );

    const filter = String(query.filter || "all").toLowerCase();
    const search = String(query.search || "").trim().toLowerCase();
    if (search) {
      enriched = enriched.filter((c) => {
        const p = c.partner || {};
        const hay = [p.name, p.industry, p.category, p.location, p.username]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(search);
      });
    }
    if (filter === "favorites") {
      enriched = enriched.filter((c) => c.favorite);
    } else if (filter === "active") {
      enriched = enriched.filter((c) => c.activeProjects > 0);
    } else if (filter === "recent") {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      enriched = enriched.filter(
        (c) => new Date(c.connectedAt).getTime() >= cutoff || new Date(c.lastInteractionAt).getTime() >= cutoff
      );
    } else if (filter === "collaborated") {
      enriched = enriched.filter((c) => c.projectsCompleted > 0);
    } else if (filter && filter !== "all") {
      enriched = enriched.filter((c) => {
        const cat = String(c.partner?.category || c.partner?.industry || "").toLowerCase();
        return cat.includes(filter);
      });
    }

    enriched.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return (b.lastInteractionAt || "").localeCompare(a.lastInteractionAt || "");
    });

    let profileViewsFromConnections = 0;
    if (viewer?.role === "influencer" && (await checkDashboardMetricsTables())) {
      const businessIds = enriched
        .filter((c) => c.partner?.role === "business_owner")
        .map((c) => c.connectedUserId);
      if (businessIds.length) {
        const { count } = await sb
          .from("profile_views")
          .select("id", { count: "exact", head: true })
          .eq("influencer_user_id", userId)
          .in("viewer_user_id", businessIds);
        profileViewsFromConnections = count || 0;
      }
    }

    const metrics = {
      totalConnections: list.length,
      activeConnections: enriched.filter((c) => c.activeProjects > 0).length,
      completedCollaborations: enriched.reduce((s, c) => s + (c.projectsCompleted || 0), 0),
      profileViewsFromConnections,
      savedCreators:
        viewer?.role === "business_owner"
          ? (await listShortlistsEnriched(userId).catch(() => [])).length
          : 0,
    };

    return { connections: enriched, metrics, viewerRole: viewer?.role || null };
  }

  async function getConnectionDetailForUser(userId, connectionId) {
    if (!(await checkConnectionsTable())) return null;
    const sb = await ensureClient();
    const { data: row, error } = await sb
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !row || row.status === "removed") return null;

    const otherId = row.connected_user_id;
    const metrics = await syncConnectionMetrics(userId, otherId);
    const profiles = await loadProfilesMap([otherId, userId]);
    const partner = formatConnectionProfile(profiles.get(otherId));
    const viewer = profiles.get(userId);

    let requestsSent = 0;
    let requestsReceived = 0;
    if (await checkCollabTables()) {
      const { data: reqs } = await sb
        .from("collab_requests")
        .select("id, from_user_id, to_user_id, status")
        .or(
          `and(from_user_id.eq.${userId},to_user_id.eq.${otherId}),and(from_user_id.eq.${otherId},to_user_id.eq.${userId})`
        );
      for (const r of reqs || []) {
        if (r.from_user_id === userId) requestsSent++;
        else requestsReceived++;
      }
    }

    return {
      id: row.id,
      connectedUserId: otherId,
      connectedAt: row.connected_at,
      favorite: !!row.favorite,
      notes: row.notes || "",
      projectsCompleted: metrics.projectsCompleted,
      messagesCount: metrics.messagesCount,
      activeProjects: metrics.activeProjects,
      lastInteractionAt: row.last_interaction_at,
      relationshipStatus: metrics.relationshipStatus,
      strengthLabel: connectionStrengthLabel(metrics.relationshipStatus),
      partner,
      overview: {
        connectedSince: row.connected_at,
        messagesExchanged: metrics.messagesCount,
        requestsSent,
        requestsReceived,
        collaborationsCompleted: metrics.projectsCompleted,
        projectsActive: metrics.activeProjects,
        lastActivity: row.last_interaction_at,
      },
      viewerRole: viewer?.role || null,
    };
  }

  async function updateConnectionForUser(userId, connectionId, body) {
    if (!(await checkConnectionsTable())) {
      return jsonResponse({ error: "Connections not configured" }, 503);
    }
    const sb = await ensureClient();
    const { data: row } = await sb
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) return jsonResponse({ error: "Connection not found" }, 404);

    const patch = {};
    if (body.favorite != null) patch.favorite = !!body.favorite;
    if (body.notes != null) patch.notes = String(body.notes).slice(0, 2000);
    if (body.status != null) patch.status = body.status === "removed" ? "removed" : "active";
    patch.last_interaction_at = new Date().toISOString();

    const { data, error } = await sb
      .from("connections")
      .update(patch)
      .eq("id", connectionId)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) return jsonResponse({ error: error.message }, 400);

    if (patch.favorite) {
      broadcastNotification({
        type: "connection_favorited",
        connectionId,
        message: "Connection added to favorites.",
      });
    }
    if (patch.status === "removed") {
      broadcastNotification({
        type: "connection_removed",
        connectionId,
        connectedUserId: row.connected_user_id,
        message: "Connection removed from your network.",
      });
    }

    return jsonResponse({ connection: data });
  }


  function isOnlineFromLastSeen(lastSeenAt) {
    if (!lastSeenAt) return false;
    return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_MS;
  }

  function broadcastSse(payload) {
    const data = JSON.stringify(payload);
    for (const client of sseClients) {
      try {
        client.onmessage?.({ data });
      } catch (e) {
        console.warn("[influnet] sse client:", e);
      }
    }
  }

  async function setTyping(conversationId, userId) {
    const key = `${conversationId}:${userId}`;
    typingUntil.set(key, Date.now() + TYPING_MS);
    broadcastSse({ type: "typing", conversationId, userId });
    if (!(await checkPresenceTables())) return;
    if (!(await ensurePresenceProfile(userId))) return;
    const sb = await ensureClient();
    const expires = new Date(Date.now() + TYPING_MS).toISOString();
    const { error } = await sb.from("user_presence").upsert(
      {
        user_id: userId,
        last_seen_at: new Date().toISOString(),
        typing_conversation_id: conversationId,
        typing_expires_at: expires,
      },
      { onConflict: "user_id" }
    );
    if (error) console.warn("[influnet] setTyping:", error.message);
  }

  async function clearTyping(userId) {
    typingUntil.forEach((_, key) => {
      if (key.endsWith(`:${userId}`)) typingUntil.delete(key);
    });
    if (!(await checkPresenceTables())) return;
    const sb = await ensureClient();
    await sb
      .from("user_presence")
      .update({
        typing_conversation_id: null,
        typing_expires_at: null,
      })
      .eq("user_id", userId);
  }

  function pruneTyping() {
    const now = Date.now();
    for (const [key, until] of typingUntil) {
      if (until <= now) typingUntil.delete(key);
    }
  }

  function isUserTyping(conversationId, userId) {
    pruneTyping();
    return (typingUntil.get(`${conversationId}:${userId}`) || 0) > Date.now();
  }

  async function touchPresence(userId) {
    if (!userId || !isUuid(userId)) return;
    const now = new Date().toISOString();
    presenceCache.set(userId, { lastSeenAt: now, isOnline: true });
    if (!(await checkPresenceTables())) return;
    if (!(await ensurePresenceProfile(userId))) return;
    const sb = await ensureClient();
    const { error } = await sb.from("user_presence").upsert(
      {
        user_id: userId,
        last_seen_at: now,
      },
      { onConflict: "user_id" }
    );
    if (error) console.warn("[influnet] touchPresence:", error.message);
  }

  function isTypingInConversation(presence, conversationId) {
    if (!presence?.typingExpiresAt || !presence?.typingConversationId) {
      return false;
    }
    return (
      presence.typingConversationId === conversationId &&
      new Date(presence.typingExpiresAt).getTime() > Date.now()
    );
  }

  async function loadPresenceMap(userIds) {
    const ids = [...new Set(userIds.filter(isUuid))];
    const map = new Map();
    const now = Date.now();
    for (const id of ids) {
      const cached = presenceCache.get(id);
      if (cached) {
        map.set(id, {
          lastSeenAt: cached.lastSeenAt,
          isOnline: isOnlineFromLastSeen(cached.lastSeenAt),
        });
      }
    }
    if (!(await checkPresenceTables()) || !ids.length) {
      for (const id of ids) {
        if (!map.has(id)) map.set(id, { lastSeenAt: null, isOnline: false });
      }
      return map;
    }
    const sb = await ensureClient();
    let { data, error } = await sb
      .from("user_presence")
      .select(
        "user_id, last_seen_at, typing_conversation_id, typing_expires_at"
      )
      .in("user_id", ids);
    if (error && String(error.message).includes("typing")) {
      const fallback = await sb
        .from("user_presence")
        .select("user_id, last_seen_at")
        .in("user_id", ids);
      data = fallback.data;
      error = fallback.error;
    }
    if (error) {
      console.warn("[influnet] loadPresence:", error.message);
      return map;
    }
    for (const row of data || []) {
      const lastSeenAt = row.last_seen_at;
      const isOnline = isOnlineFromLastSeen(lastSeenAt);
      const entry = {
        lastSeenAt,
        isOnline,
        typingConversationId: row.typing_conversation_id,
        typingExpiresAt: row.typing_expires_at,
      };
      map.set(row.user_id, entry);
      presenceCache.set(row.user_id, entry);
    }
    for (const id of ids) {
      if (!map.has(id)) map.set(id, { lastSeenAt: null, isOnline: false });
    }
    return map;
  }

  function attachPresence(otherUser, presenceMap, conversationId, presenceEnabled) {
    const p = presenceMap.get(otherUser.id) || {
      lastSeenAt: null,
      isOnline: false,
    };
    const typing =
      isTypingInConversation(p, conversationId) ||
      isUserTyping(conversationId, otherUser.id);
    return {
      ...otherUser,
      presenceEnabled: !!presenceEnabled,
      isOnline: presenceEnabled ? !!p.isOnline : false,
      lastSeenAt: presenceEnabled ? p.lastSeenAt || null : null,
      isTyping: presenceEnabled ? typing : false,
    };
  }

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function isUuid(value) {
    return typeof value === "string" && UUID_RE.test(value);
  }

  function showToast(message, type) {
    if (!message) return;
    console.warn("[influnet]", message);
    let root = document.getElementById("influnet-toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "influnet-toast-root";
      root.style.cssText =
        "position:fixed;top:16px;right:16px;z-index:99999;max-width:360px;";
      document.body.appendChild(root);
    }
    const el = document.createElement("div");
    el.textContent = message;
    el.style.cssText =
      "margin-top:8px;padding:12px 16px;border-radius:12px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.15);" +
      (type === "ok"
        ? "background:#ecfdf5;color:#065f46;"
        : "background:#fef2f2;color:#991b1b;");
    root.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }

  /** collab_requests FK requires a profiles row for the sender. */
  async function ensureOwnProfileInDb() {
    if (!(await checkTables())) return false;
    const session = await syncSessionFromStorage();
    if (!session?.user?.id) return false;
    const uid = session.user.id;
    if (!isUuid(uid)) return false;

    const cached = profileEnsureCache;
    if (cached.uid === uid && cached.ok && Date.now() - cached.at < 120000) {
      return true;
    }
    if (cached.uid === uid && !cached.ok && Date.now() - cached.at < PROFILE_ENSURE_FAIL_MS) {
      return false;
    }

    const sb = await ensureClient();
    const fromDb = await loadProfileFromDb(uid);
    if (fromDb?.id) {
      profileEnsureCache = { uid, ok: true, at: Date.now() };
      return true;
    }

    const { data: row, error: rowErr } = await sb
      .from("profiles")
      .select("id")
      .eq("id", uid)
      .maybeSingle();
    if (rowErr) {
      console.warn("[influnet] ensureOwnProfile lookup:", rowErr.message);
    }
    if (row?.id) {
      profileEnsureCache = { uid, ok: true, at: Date.now() };
      return true;
    }

    const m = session.user.user_metadata || {};
    const stored = getStoredInflunetUser();
    const role =
      normalizeUserRole(m.role, {
        hasBusinessProfile: !!(stored?.companyName || stored?.businessUsername),
        hasInfluencerProfile: !!(stored?.username || stored?.profileSlug),
      }) || normalizeUserRole(stored?.role);
    if (!role) {
      console.warn("[influnet] ensureOwnProfile: missing role in user metadata");
      profileEnsureCache = { uid, ok: false, at: Date.now() };
      return false;
    }
    const payload = {
      role,
      email: session.user.email,
      name: m.name || stored?.name,
      phone: m.phone || stored?.phone,
      location: m.location || stored?.location,
      companyName: m.companyName || stored?.companyName,
      businessType: m.businessType || stored?.businessType,
      industry: m.industry || stored?.industry,
      gstNumber: m.gstNumber,
      website: m.website || stored?.website,
      collabPreferences: m.collabPreferences,
      marketingBudget: m.marketingBudget || stored?.marketingBudget,
      registeredAddress: m.registeredAddress,
      city: m.city || stored?.city,
      state: m.state || stored?.state,
      businessUsername: m.businessUsername || m.username || stored?.businessUsername,
      bio: m.bio || stored?.bio,
      niche: m.niche || stored?.niche,
      instagramHandle: m.instagramHandle || stored?.instagramHandle,
      youtubeHandle: m.youtubeHandle || stored?.youtubeHandle,
      twitterHandle: m.twitterHandle || stored?.twitterHandle,
      gender: m.gender || stored?.gender,
      facebookHandle: m.facebookHandle || stored?.facebookHandle,
      linkedinHandle: m.linkedinHandle || stored?.linkedinHandle,
      tiktokHandle: m.tiktokHandle || stored?.tiktokHandle,
      extraSocialLinks: parseExtraSocialLinks(m.extraSocialLinks || stored?.extraSocialLinks),
      username: m.username || stored?.username,
      languages: m.languages || stored?.languages,
      collabTypes: m.collabTypes || stored?.collabTypes,
      priceRange: m.priceRange || stored?.priceRange,
    };
    const { error } = await sb.rpc("register_profile", { payload });
    if (error) {
      const after = await loadProfileFromDb(uid);
      if (after?.id) {
        profileEnsureCache = { uid, ok: true, at: Date.now() };
        return true;
      }
      if (Date.now() - profileEnsureCache.at > PROFILE_ENSURE_FAIL_MS || profileEnsureCache.uid !== uid) {
        console.warn("[influnet] ensureOwnProfile:", error.message);
        if (
          isInvalidAuthError(error.message) ||
          /profiles_id_fkey|not authenticated/i.test(error.message)
        ) {
          await clearStaleAuth(error.message);
          return false;
        }
      }
      profileEnsureCache = { uid, ok: false, at: Date.now() };
      return false;
    }
    profileEnsureCache = { uid, ok: true, at: Date.now() };
    return true;
  }

  async function profileRowExists(userId) {
    if (!userId || !isUuid(userId)) return false;
    await syncSessionFromStorage();
    const fromDb = await loadProfileFromDb(userId);
    if (fromDb?.id) return true;
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[influnet] profileRowExists:", error.message);
      return false;
    }
    return !!data?.id;
  }

  async function ensurePresenceProfile(userId) {
    if (!userId || !isUuid(userId)) return false;
    if (await profileRowExists(userId)) return true;
    const session = await syncSessionFromStorage();
    if (session?.user?.id === userId) {
      return ensureOwnProfileInDb();
    }
    return false;
  }

  function mergeProfileParts(row, bp, ip) {
    const id = row?.id || bp?.user_id || ip?.user_id;
    if (!id) return null;
    const hints = {
      hasBusinessProfile: !!bp,
      hasInfluencerProfile: !!ip,
    };
    const role =
      normalizeUserRole(row?.role, hints) ||
      (bp ? "business_owner" : ip ? "influencer" : row?.role || null);
    const isBusiness = role === "business_owner";
    const niche = normalizeNiche(ip?.niche);
    const city = (isBusiness ? bp?.city : ip?.city) ?? null;
    const state = (isBusiness ? bp?.state : ip?.state) ?? null;
    const location =
      [city, state].filter(Boolean).join(", ") || row?.location || null;
    const companyName = bp?.company_name ?? null;
    const name = isBusiness
      ? row?.name || companyName || null
      : row?.name || null;
    const businessUsername = bp?.username ?? null;
    const influencerUsername = ip?.username ?? null;
    const username = isBusiness ? businessUsername : influencerUsername;
    const profileSlug = isBusiness
      ? resolveBusinessPublicSlug({
          businessUsername,
          username: businessUsername,
          name: row?.name,
          companyName,
        })
      : ip?.profile_slug ?? influencerUsername ?? null;
    const displayRole = isBusiness
      ? "Business Owner"
      : ip?.headline ||
        (niche.length && niche[0] !== "Creator"
          ? `${niche.slice(0, 2).join(" & ")} Creator`
          : "Influencer");
    return {
      id,
      name,
      email: row?.email ?? null,
      role,
      displayRole,
      location,
      city,
      state,
      companyName,
      industry: bp?.industry ?? null,
      businessUsername,
      logoUrl: bp?.logo_url ?? null,
      approvalStatus: bp?.approval_status ?? null,
      niche,
      headline: ip?.headline ?? null,
      username,
      profileSlug,
      avatarUrl: isBusiness ? bp?.logo_url ?? null : ip?.avatar_url ?? null,
      isVerified: isBusiness
        ? bp?.approval_status === "approved"
        : !!ip?.is_verified,
      verified: isBusiness
        ? bp?.approval_status === "approved"
        : !!ip?.is_verified,
      availabilityStatus: ip?.availability_status ?? null,
    };
  }

  async function loadProfilesMap(userIds) {
    const ids = [...new Set(userIds.filter(isUuid))];
    const map = new Map();
    if (!ids.length) return map;
    const fallbackProfile = (id) => ({
      id,
      name: "Influnet User",
      companyName: null,
      role: "unknown",
      displayRole: "Unknown",
      username: null,
      profileSlug: null,
      avatarUrl: null,
      location: null,
      isVerified: false,
      availabilityStatus: null,
    });

    let sb = null;
    try {
      sb = await ensureClient();
    } catch (error) {
      console.error("[influnet] loadProfilesMap: failed to init client", error);
      ids.forEach((id) => map.set(id, fallbackProfile(id)));
      return map;
    }

    if (!sb || typeof sb.from !== "function") {
      console.warn("[influnet] loadProfilesMap: supabase client unavailable");
      ids.forEach((id) => map.set(id, fallbackProfile(id)));
      return map;
    }

    const safeSelect = async (label, queryFactory) => {
      try {
        const res = await queryFactory();
        if (res?.error) {
          console.warn(`[influnet] loadProfilesMap ${label}:`, res.error.message);
        }
        return res || { data: [], error: null };
      } catch (error) {
        console.error(
          `[influnet] loadProfilesMap ${label}: fetch failed, using fallback rows`,
          error
        );
        return { data: [], error };
      }
    };

    const [profilesRes, businessRes, influencerRes] = await Promise.all([
      safeSelect("profiles", () =>
        sb
          .from("profiles")
          .select("id, name, email, role, location")
          .in("id", ids)
      ),
      safeSelect("business", () =>
        sb
          .from("business_profiles")
          .select(
            "user_id, company_name, industry, username, logo_url, approval_status, city, state, tagline"
          )
          .in("user_id", ids)
      ),
      safeSelect("influencer", () =>
        sb
          .from("influencer_profiles")
          .select(
            "user_id, niche, username, profile_slug, avatar_url, is_verified, headline, availability_status, city, state"
          )
          .in("user_id", ids)
      ),
    ]);

    if (profilesRes.error) {
      console.warn("[influnet] loadProfilesMap profiles:", profilesRes.error.message);
    }
    if (businessRes.error) {
      console.warn("[influnet] loadProfilesMap business:", businessRes.error.message);
    }
    if (influencerRes.error) {
      console.warn("[influnet] loadProfilesMap influencer:", influencerRes.error.message);
    }

    const profileRows = new Map((profilesRes.data || []).map((r) => [r.id, r]));
    const businessRows = new Map(
      (businessRes.data || []).map((r) => [r.user_id, r])
    );
    const influencerRows = new Map(
      (influencerRes.data || []).map((r) => [r.user_id, r])
    );

    for (const id of ids) {
      const merged = mergeProfileParts(
        profileRows.get(id),
        businessRows.get(id),
        influencerRows.get(id)
      );
      if (merged) {
        map.set(id, merged);
      } else {
        console.error("[influnet] Profile fetch failed, using fallback metrics:", {
          participant_id: id,
        });
        map.set(id, fallbackProfile(id));
      }
    }
    return map;
  }

  function formatConversationParticipant(profile, conversationId, participantId) {
    if (!profile?.id) {
      console.warn("[influnet] conversation participant profile missing", {
        conversation_id: conversationId,
        participant_id: participantId,
        participant_role: null,
        profile_found: false,
        profile_name: null,
        profile_username: null,
        profile_image: null,
      });
      return {
        id: participantId,
        name: "Influnet User",
        companyName: null,
        role: "unknown",
        displayRole: "Unknown",
        username: null,
        profileSlug: null,
        avatarUrl: null,
        location: null,
        isVerified: false,
        availabilityStatus: null,
      };
    }

    const isBusiness = profile.role === "business_owner";
    const participant = {
      id: profile.id,
      name: isBusiness ? profile.companyName || profile.name : profile.name,
      companyName: profile.companyName ?? null,
      industry: profile.industry ?? null,
      niche: profile.niche ?? null,
      role: profile.role ?? null,
      displayRole: profile.displayRole ?? null,
      username: isBusiness
        ? profile.businessUsername || profile.username
        : profile.username,
      profileSlug: profile.profileSlug ?? profile.username ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      location: profile.location ?? null,
      isVerified: !!profile.isVerified,
      availabilityStatus: profile.availabilityStatus ?? null,
      headline: profile.headline ?? null,
    };

    return participant;
  }

  async function findSharedConversationId(uid, otherUserId) {
    if (!isUuid(uid) || !isUuid(otherUserId) || uid === otherUserId) return null;
    const sb = await ensureClient();
    const { data: myParts } = await sb
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", uid);
    const convIds = (myParts || []).map((p) => p.conversation_id);
    if (!convIds.length) return null;
    const { data: shared } = await sb
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", convIds)
      .limit(1);
    return shared?.[0]?.conversation_id || null;
  }

  async function hasAcceptedCollab(uid, otherUserId) {
    if (!(await checkCollabTables())) return false;
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("collab_requests")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(from_user_id.eq.${uid},to_user_id.eq.${otherUserId}),and(from_user_id.eq.${otherUserId},to_user_id.eq.${uid})`
      )
      .limit(1);
    if (error) {
      console.warn("[influnet] hasAcceptedCollab:", error.message);
      return false;
    }
    return !!(data && data.length);
  }

  async function assertCanMessage(otherUserId) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) {
      return { ok: false, error: "Not authenticated", status: 401 };
    }
    const uid = session.user.id;
    if (!isUuid(otherUserId) || otherUserId === uid) {
      return { ok: false, error: "Invalid user", status: 400 };
    }

    const profiles = await loadProfilesMap([uid, otherUserId]);
    const me = profiles.get(uid);
    const other = profiles.get(otherUserId);
    if (!me || !other) {
      return { ok: false, error: "Profile not found", status: 400 };
    }

    const roles = new Set([me.role, other.role]);
    if (!roles.has("business_owner") || !roles.has("influencer")) {
      return {
        ok: false,
        error: "Messaging is only available between businesses and creators.",
        status: 403,
      };
    }

    const existingId = await findSharedConversationId(uid, otherUserId);
    if (existingId) return { ok: true, uid, existingId };

    if (!(await hasAcceptedCollab(uid, otherUserId))) {
      return {
        ok: false,
        error:
          "Messaging opens after a collaboration request is accepted. Send a request from the creator's profile, or accept theirs in Requests.",
        status: 403,
      };
    }

    return { ok: true, uid };
  }

  async function seedMessageIfEmpty(conversationId, senderUserId, body) {
    const text = String(body || "").trim();
    if (!text || !isUuid(conversationId) || !isUuid(senderUserId)) return;
    const sb = await ensureClient();
    const { count, error: countErr } = await sb
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId);
    if (countErr || (count || 0) > 0) return;
    await sb.from("messages").insert({
      conversation_id: conversationId,
      sender_user_id: senderUserId,
      body: text,
    });
    await sb
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  function dispatchCollabAccepted(detail) {
    try {
      window.dispatchEvent(
        new CustomEvent("influnet-collab-accepted", { detail })
      );
    } catch {
      /* ignore */
    }
  }

  function dispatchDashboardStale(reason) {
    try {
      window.dispatchEvent(
        new CustomEvent("influnet-dashboard-stale", {
          detail: { reason: reason || "unknown" },
        })
      );
    } catch {
      /* ignore */
    }
  }

  function broadcastNotification(event) {
    broadcastSse(event);
    try {
      window.dispatchEvent(new CustomEvent("influnet-notification", { detail: event }));
    } catch {
      /* ignore */
    }
  }

  /** Fast unread thread count for sidebar badges (no full conversation hydration). */
  async function countConversationsWithUnread(uid) {
    if (!(await checkMessagingTables())) return 0;
    const sb = await ensureClient();
    const hidden = new Set(loadHiddenConversations()[uid] || []);
    const { data: parts, error } = await sb
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", uid);
    if (error) {
      console.warn("[influnet] unread count:", error.message);
      return 0;
    }
    const visible = (parts || []).filter((p) => !hidden.has(p.conversation_id));
    if (!visible.length) return 0;

    const convIds = visible.map((p) => p.conversation_id);
    const lastRead = new Map(visible.map((p) => [p.conversation_id, p.last_read_at]));

    const { data: msgs, error: msgErr } = await sb
      .from("messages")
      .select("conversation_id, sender_user_id, created_at")
      .in("conversation_id", convIds)
      .eq("deleted", false)
      .neq("sender_user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (msgErr) {
      console.warn("[influnet] unread messages:", msgErr.message);
      return 0;
    }

    const unreadConvs = new Set();
    for (const m of msgs || []) {
      if (unreadConvs.has(m.conversation_id)) continue;
      const since = lastRead.get(m.conversation_id);
      const sinceTs = since ? new Date(since).getTime() : 0;
      if (new Date(m.created_at).getTime() > sinceTs) {
        unreadConvs.add(m.conversation_id);
      }
    }
    return unreadConvs.size;
  }

  async function getNotificationSummary() {
    const session = await getSessionUser();
    if (!session?.user) {
      return { unreadMessagesCount: 0, pendingRequestsCount: 0 };
    }
    const user = await resolveUser(session.user);
    const requestDir = user.role === "influencer" ? "incoming" : "outgoing";
    const [unreadMessagesCount, requests] = await Promise.all([
      countConversationsWithUnread(session.user.id),
      listCollabRequests(requestDir),
    ]);
    const pendingRequestsCount = requests.filter(
      (r) => String(r.status).toLowerCase() === "pending"
    ).length;
    return { unreadMessagesCount, pendingRequestsCount };
  }

  function formatCollabUser(profile, fallbackId) {
    if (!profile) {
      return { id: fallbackId, name: null, companyName: null, niche: ["Creator"] };
    }
    const isBusiness = profile.role === "business_owner";
    return {
      id: profile.id,
      name: isBusiness ? profile.companyName || profile.name : profile.name,
      companyName: profile.companyName ?? null,
      niche: profile.niche,
      role: profile.role,
      displayRole: profile.displayRole,
      username: isBusiness
        ? profile.businessUsername || profile.username
        : profile.username,
      avatarUrl: profile.avatarUrl,
      verified: !!profile.verified || !!profile.isVerified,
    };
  }

  function formatCollabRow(row, profiles) {
    const from = formatCollabUser(profiles.get(row.from_user_id), row.from_user_id);
    const to = formatCollabUser(profiles.get(row.to_user_id), row.to_user_id);
    return {
      id: row.id,
      message: row.message || "",
      budget: row.budget != null ? Number(row.budget) : null,
      status: row.status,
      createdAt: row.created_at,
      fromUserId: row.from_user_id,
      toUserId: row.to_user_id,
      fromUser: {
        id: from.id,
        name: from.name,
        companyName: from.companyName,
        niche: from.niche,
        role: from.role,
        displayRole: from.displayRole,
        username: from.username,
        avatarUrl: from.avatarUrl,
      },
      toUser: {
        id: to.id,
        name: to.name,
        niche: to.niche,
        role: to.role,
        displayRole: to.displayRole,
        username: to.username,
        avatarUrl: to.avatarUrl,
        verified: !!to.verified,
      },
    };
  }

  async function listCollabRequests(direction) {
    if (!(await checkCollabTables())) return [];
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) return [];
    const uid = session.user.id;
    const sb = await ensureClient();
    let query = sb
      .from("collab_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (direction === "incoming") {
      query = query.eq("to_user_id", uid);
    } else if (direction === "outgoing") {
      query = query.eq("from_user_id", uid);
    } else {
      query = query.or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("[influnet] collab list:", error.message);
      return [];
    }
    const rows = data || [];
    const ids = [];
    rows.forEach((r) => {
      ids.push(r.from_user_id, r.to_user_id);
    });
    const profiles = await loadProfilesMap(ids);
    return rows.map((r) => formatCollabRow(r, profiles));
  }

  async function createCollabRequest(body) {
    await syncSessionFromStorage();
    if (!(await checkCollabTables())) {
      const msg =
        "Run supabase/migrations/002_collab_and_messages.sql in Supabase SQL Editor.";
      showToast(msg);
      return jsonResponse({ error: msg }, 503);
    }
    const session = await getSessionUser();
    if (!session?.user) {
      showToast("Please log in again to send a request.");
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    const toUserId = body?.toUserId;
    if (!isUuid(toUserId)) {
      showToast("Invalid influencer. Open their profile from Discover and try again.");
      return jsonResponse({ error: "Invalid toUserId" }, 400);
    }
    if (toUserId === session.user.id) {
      showToast(
        "You cannot send a request to your own account. Log in as a business and pick a creator from Discover (not your own profile)."
      );
      return jsonResponse({ error: "Cannot send request to yourself" }, 400);
    }

    const senderProfiles = await loadProfilesMap([session.user.id]);
    const senderFromMap = senderProfiles.get(session.user.id);
    const sender = await resolveUser(session.user);
    const profileHints = {
      hasBusinessProfile:
        !!sender?.companyName ||
        !!sender?.businessUsername ||
        !!senderFromMap?.companyName ||
        !!senderFromMap?.businessUsername,
      hasInfluencerProfile:
        !!senderFromMap?.username && isInfluencerRole(senderFromMap?.role),
    };
    const authMetaRole = session.user.user_metadata?.role ?? null;
    const profileRole = sender?.role ?? senderFromMap?.role ?? null;
    const normalizedRole = normalizeUserRole(profileRole, profileHints);

    console.info("[influnet] collab request submit", {
      userId: session.user.id,
      userRole: profileRole,
      profileRole,
      authMetaRole,
      normalizedRole,
    });

    if (isInfluencerRole(profileRole, profileHints)) {
      showToast(
        "Influencer accounts cannot send collaboration requests. Log in with a business owner account."
      );
      return jsonResponse(
        {
          error:
            "Influencer accounts cannot send collaboration requests. Log in with a business owner account.",
        },
        403
      );
    }
    if (!isBusinessOwnerRole(profileRole, profileHints)) {
      showToast(
        "Only business owner accounts can send collaboration requests. Log in or sign up as a business."
      );
      return jsonResponse(
        {
          error:
            "Only business owner accounts can send collaboration requests. Please log in with a business account.",
        },
        403
      );
    }

    if (!(await ensureOwnProfileInDb())) {
      showToast(
        "Your account profile is not set up. Log out, sign up again, or run migration 001 in Supabase."
      );
      return jsonResponse({ error: "Sender profile missing" }, 400);
    }
    const sb = await ensureClient();
    const { data: targetProfile } = await sb
      .from("profiles")
      .select("id, role")
      .eq("id", toUserId)
      .maybeSingle();
    if (!targetProfile) {
      showToast("This creator has no profile in the database yet.");
      return jsonResponse({ error: "Recipient profile missing" }, 400);
    }
    if (targetProfile.role !== "influencer" && !isInfluencerRole(targetProfile.role)) {
      showToast(
        "You can only send requests to creators (influencers), not to another business account."
      );
      return jsonResponse({ error: "Recipient is not an influencer" }, 400);
    }

    const { data: pending } = await sb
      .from("collab_requests")
      .select("*")
      .eq("from_user_id", session.user.id)
      .eq("to_user_id", toUserId)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) {
      const profiles = await loadProfilesMap([
        pending.from_user_id,
        pending.to_user_id,
      ]);
      showToast("You already have a pending request with this creator.");
      return jsonResponse(formatCollabRow(pending, profiles), 200);
    }

    const { data: alreadyConnected } = await sb
      .from("collab_requests")
      .select("*")
      .eq("from_user_id", session.user.id)
      .eq("to_user_id", toUserId)
      .eq("status", "accepted")
      .maybeSingle();
    if (alreadyConnected) {
      const profiles = await loadProfilesMap([
        alreadyConnected.from_user_id,
        alreadyConnected.to_user_id,
      ]);
      showToast("You are already connected. Open Messages to chat.");
      return jsonResponse(
        { ...formatCollabRow(alreadyConnected, profiles), alreadyConnected: true },
        200
      );
    }

    const budgetRaw = body?.budget;
    const budget =
      budgetRaw != null && budgetRaw !== "" && !Number.isNaN(Number(budgetRaw))
        ? Number(budgetRaw)
        : null;

    const { data, error } = await sb
      .from("collab_requests")
      .insert({
        from_user_id: session.user.id,
        to_user_id: toUserId,
        message: String(body?.message ?? "").trim() || "Hi",
        budget,
      })
      .select("*")
      .single();
    if (error) {
      console.warn("[influnet] collab create:", error.message);
      let msg = error.message;
      if (error.code === "23505") {
        msg = "You already have a pending request with this creator.";
      } else if (error.code === "23503") {
        msg =
          "Profile missing in database. Ensure migration 001 is applied and you are logged in as a business account.";
      } else if (
        error.code === "23514" ||
        String(error.message).includes("collab_requests_no_self")
      ) {
        msg =
          "You cannot send a request to yourself. Use a business account and select a different creator in Discover.";
      }
      showToast(msg);
      return jsonResponse({ error: msg }, 400);
    }
    showToast("Collaboration request sent.", "ok");
    const profiles = await loadProfilesMap([data.from_user_id, data.to_user_id]);
    const fromProfile = profiles.get(data.from_user_id);
    broadcastNotification({
      type: "NEW_REQUEST_RECEIVED",
      requestId: data.id,
      toUserId: data.to_user_id,
      fromUserId: data.from_user_id,
      fromName: fromProfile?.companyName || fromProfile?.name || "Business",
      message: data.message,
    });
    dispatchDashboardStale("collab_created");
    return jsonResponse(formatCollabRow(data, profiles), 201);
  }

  async function updateCollabRequest(id, body) {
    if (!(await checkCollabTables())) {
      return jsonResponse({ error: "Collab tables not configured" }, 503);
    }
    if (!isUuid(id)) return jsonResponse({ error: "Invalid request id" }, 400);
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
    const uid = session.user.id;

    let status = body?.status;
    if (body?.action === "accept") status = "accepted";
    if (body?.action === "decline") status = "declined";
    if (body?.action === "cancel") status = "cancelled";
    if (!status) return jsonResponse({ error: "Missing status or action" }, 400);

    const sb = await ensureClient();
    const { data: existing, error: fetchErr } = await sb
      .from("collab_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr || !existing) {
      return jsonResponse({ error: "Request not found" }, 404);
    }
    if (existing.from_user_id !== uid && existing.to_user_id !== uid) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    if (body?.action === "cancel" && existing.from_user_id !== uid) {
      return jsonResponse({ error: "Only sender can cancel" }, 403);
    }
    if (
      (body?.action === "accept" || body?.action === "decline") &&
      existing.to_user_id !== uid
    ) {
      return jsonResponse({ error: "Only recipient can accept or decline" }, 403);
    }

    const { data, error } = await sb
      .from("collab_requests")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return jsonResponse({ error: error.message }, 400);

    let conversationId = null;
    if (status === "accepted" && (await checkMessagingTables())) {
      const otherId =
        data.from_user_id === uid ? data.to_user_id : data.from_user_id;
      conversationId = await ensureConversationForAcceptedCollab(
        uid,
        otherId,
        data.from_user_id,
        data.message
      );
    }

    const profiles = await loadProfilesMap([data.from_user_id, data.to_user_id]);
    const formatted = formatCollabRow(data, profiles);

    if (status === "accepted") {
      const business = profiles.get(data.from_user_id);
      const otherId = uid === data.from_user_id ? data.to_user_id : data.from_user_id;
      ensureConnectionForUsers(uid, otherId, { notify: true }).catch(() => {});
      await syncConversationsFromAcceptedCollabs(true);
      dispatchCollabAccepted({
        requestId: data.id,
        conversationId,
        businessUserId: data.from_user_id,
        influencerUserId: data.to_user_id,
        otherUserId: uid === data.from_user_id ? data.to_user_id : data.from_user_id,
        businessName: business?.companyName || business?.name || "Business",
        influencerName: profiles.get(data.to_user_id)?.name || "Creator",
      });
      broadcastNotification({
        type: "REQUEST_ACCEPTED",
        requestId: data.id,
        conversationId,
        fromUserId: data.from_user_id,
        toUserId: data.to_user_id,
        businessUserId: data.from_user_id,
        influencerUserId: data.to_user_id,
      });
      broadcastNotification({
        type: "conversation",
        conversationId,
        action: "created",
      });
      dispatchDashboardStale("collab_accepted");
    }
    if (status === "declined" || status === "cancelled") {
      broadcastNotification({
        type: "REQUEST_REJECTED",
        requestId: data.id,
        status,
        fromUserId: data.from_user_id,
        toUserId: data.to_user_id,
      });
      dispatchDashboardStale("collab_" + status);
    }

    return jsonResponse({ ...formatted, conversationId });
  }

  /** Ensure a 1:1 thread exists for an accepted collab; seed the original request text once. */
  async function ensureConversationForAcceptedCollab(
    uid,
    otherUserId,
    businessUserId,
    message
  ) {
    if (!isUuid(uid) || !isUuid(otherUserId) || uid === otherUserId) return null;
    const sb = await ensureClient();
    let convId = await findSharedConversationId(uid, otherUserId);

    if (!convId && cfg.useEnsureConversationRpc) {
      const { data: rpcId, error: rpcErr } = await sb.rpc("ensure_conversation", {
        other_user_id: otherUserId,
      });
      if (!rpcErr && rpcId) convId = rpcId;
      else if (rpcErr) {
        console.warn("[influnet] ensure_conversation:", rpcErr.message);
      }
    }

    if (!convId) {
      try {
        const conv = await findOrCreateConversation(otherUserId, { skipGate: true });
        convId = conv?.id || (await findSharedConversationId(uid, otherUserId));
      } catch (e) {
        console.warn("[influnet] ensure conversation:", e.message);
        convId = await findSharedConversationId(uid, otherUserId);
      }
    }

    const seedFrom = isUuid(businessUserId) ? businessUserId : uid;
    if (convId) {
      const seedText =
        String(message || "").trim() || "Collaboration request accepted.";
      await seedMessageIfEmpty(convId, seedFrom, seedText);
    }
    return convId;
  }

  /** One conversation per accepted collab (fixes empty Messages after accept). */
  async function syncConversationsFromAcceptedCollabs(force) {
    if (!(await checkCollabTables()) || !(await checkMessagingTables())) return;
    const now = Date.now();
    if (!force && now - collabSyncDoneAt < COLLAB_SYNC_COOLDOWN_MS) return;
    if (collabSyncInflight) return collabSyncInflight;
    collabSyncInflight = syncConversationsFromAcceptedCollabsCore()
      .then(() => {
        collabSyncDoneAt = Date.now();
      })
      .catch(() => {})
      .finally(() => {
        collabSyncInflight = null;
      });
    return collabSyncInflight;
  }

  async function syncConversationsFromAcceptedCollabsCore() {
    if (!(await checkCollabTables()) || !(await checkMessagingTables())) return;
    const session = await getSessionUser();
    if (!session?.user) return;
    const uid = session.user.id;
    const sb = await ensureClient();
    const { data: rows, error } = await sb
      .from("collab_requests")
      .select("id, from_user_id, to_user_id, message")
      .eq("status", "accepted")
      .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`);
    if (error) {
      console.warn("[influnet] collab sync for messages:", error.message);
      return;
    }
    const seen = new Set();
    for (const row of rows || []) {
      const otherId =
        row.from_user_id === uid ? row.to_user_id : row.from_user_id;
      if (!otherId || seen.has(otherId)) continue;
      seen.add(otherId);
      await ensureConversationForAcceptedCollab(
        uid,
        otherId,
        row.from_user_id,
        row.message
      );
    }
  }

  async function resolveConversationPeerId(conversationId, uid) {
    const sb = await ensureClient();
    const { data: participants } = await sb
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId);

    let otherId = (participants || [])
      .map((p) => p.user_id)
      .find((id) => id && id !== uid);

    if (otherId) return otherId;

    const { data: msgs } = await sb
      .from("messages")
      .select("sender_user_id")
      .eq("conversation_id", conversationId)
      .neq("sender_user_id", uid)
      .order("created_at", { ascending: false })
      .limit(8);

    otherId = (msgs || [])
      .map((m) => m.sender_user_id)
      .find((id) => id && id !== uid);

    if (otherId) {
      const { data: peerRow } = await sb
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", otherId)
        .maybeSingle();
      if (!peerRow) {
        await sb.from("conversation_participants").insert({
          conversation_id: conversationId,
          user_id: otherId,
        });
      }
      return otherId;
    }

    hideConversationForUser(uid, conversationId);
    return null;
  }

  async function formatConversationRow(conversationId, uid, lastReadAt) {
    const sb = await ensureClient();
    const otherId = await resolveConversationPeerId(conversationId, uid);
    if (!otherId) return null;
    const profiles = await loadProfilesMap([uid, otherId].filter(Boolean));
    let other = formatConversationParticipant(
      profiles.get(otherId),
      conversationId,
      otherId
    );
    const presenceEnabled = await checkPresenceTables();
    const presenceMap = presenceEnabled
      ? await loadPresenceMap([otherId])
      : new Map();
    other = attachPresence(other, presenceMap, conversationId, presenceEnabled);

    const { data: msgs } = await sb
      .from("messages")
      .select("id, body, sender_user_id, created_at, deleted")
      .eq("conversation_id", conversationId)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(50);

    const list = msgs || [];
    const last = list[0];
    let unreadCount = 0;
    const since = lastReadAt ? new Date(lastReadAt).getTime() : 0;
    for (const m of list) {
      if (m.sender_user_id === uid) continue;
      if (new Date(m.created_at).getTime() > since) unreadCount += 1;
    }

    return {
      id: conversationId,
      unreadCount,
      lastMessage: last?.body ? messagePreviewBody(last.body) : null,
      lastMessageAt: last?.created_at ?? null,
      otherUser: {
        id: other.id,
        name: other.name,
        companyName: other.companyName,
        industry: other.industry,
        niche: other.niche,
        role: other.role ?? null,
        displayRole: other.displayRole ?? null,
        username: other.username ?? null,
        profileSlug: other.profileSlug ?? other.username ?? null,
        avatarUrl: other.avatarUrl,
        location: other.location ?? null,
        isVerified: !!other.isVerified,
        availabilityStatus: other.availabilityStatus ?? null,
        headline: other.headline ?? null,
        presenceEnabled: !!other.presenceEnabled,
        isOnline: !!other.isOnline,
        lastSeenAt: other.lastSeenAt || null,
        isTyping: !!other.isTyping,
      },
    };
  }

  function conversationActivityTs(row) {
    const t = row?.lastMessageAt ? new Date(row.lastMessageAt).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  }

  /** Keep one thread per peer (latest activity wins). */
  function dedupeConversationsByPeer(rows) {
    const seenConvIds = new Set();
    const byPeer = new Map();
    for (const row of rows || []) {
      if (!row?.id || seenConvIds.has(row.id)) continue;
      seenConvIds.add(row.id);
      const peerId = row.otherUser?.id;
      if (!peerId) {
        byPeer.set(`orphan:${row.id}`, row);
        continue;
      }
      const existing = byPeer.get(peerId);
      if (!existing) {
        byPeer.set(peerId, row);
        continue;
      }
      const keep =
        conversationActivityTs(row) >= conversationActivityTs(existing) ? row : existing;
      const drop = keep === row ? existing : row;
      byPeer.set(peerId, {
        ...keep,
        unreadCount: (keep.unreadCount || 0) + (drop.unreadCount || 0),
      });
    }
    return [...byPeer.values()].sort(
      (a, b) => conversationActivityTs(b) - conversationActivityTs(a)
    );
  }

  async function listConversations() {
    if (!(await checkMessagingTables())) return [];
    await syncSessionFromStorage();
    await syncConversationsFromAcceptedCollabs();
    const session = await getSessionUser();
    if (!session?.user) return [];
    const uid = session.user.id;
    const hidden = new Set(loadHiddenConversations()[uid] || []);
    await touchPresence(uid);
    const sb = await ensureClient();
    const { data: parts, error } = await sb
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", uid);
    if (error) {
      console.warn("[influnet] conversations:", error.message);
      return [];
    }
    const rows = (
      await Promise.all(
        (parts || [])
          .filter((p) => !hidden.has(p.conversation_id))
          .map((p) => formatConversationRow(p.conversation_id, uid, p.last_read_at))
      )
    ).filter(Boolean);
    rows.sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
    return dedupeConversationsByPeer(rows);
  }

  /** Fast count for dashboard stats — avoids loading full conversation rows. */
  async function countConversationsWithMessages(uid) {
    if (!(await checkMessagingTables())) return 0;
    const sb = await ensureClient();
    const hidden = new Set(loadHiddenConversations()[uid] || []);
    const { data: parts, error } = await sb
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", uid);
    if (error) {
      console.warn("[influnet] active discussions count:", error.message);
      return 0;
    }
    const convIds = (parts || [])
      .filter((p) => !hidden.has(p.conversation_id))
      .map((p) => p.conversation_id);
    if (!convIds.length) return 0;

    const { data: msgs, error: msgErr } = await sb
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .eq("deleted", false)
      .limit(1000);
    if (msgErr) {
      console.warn("[influnet] active discussions messages:", msgErr.message);
      return 0;
    }
    return new Set((msgs || []).map((m) => m.conversation_id)).size;
  }

  /** Conversations with message activity since a given ISO timestamp. */
  async function countConversationsWithMessagesSince(uid, sinceIso) {
    if (!(await checkMessagingTables()) || !sinceIso) return 0;
    const sb = await ensureClient();
    const hidden = new Set(loadHiddenConversations()[uid] || []);
    const { data: parts, error } = await sb
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", uid);
    if (error) return 0;
    const convIds = (parts || [])
      .filter((p) => !hidden.has(p.conversation_id))
      .map((p) => p.conversation_id);
    if (!convIds.length) return 0;

    const { data: msgs, error: msgErr } = await sb
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .eq("deleted", false)
      .gte("created_at", sinceIso)
      .limit(1000);
    if (msgErr) return 0;
    return new Set((msgs || []).map((m) => m.conversation_id)).size;
  }

  async function findOrCreateConversation(otherUserId, opts) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) return null;
    const uid = session.user.id;
    if (!isUuid(otherUserId) || otherUserId === uid) return null;

    if (!opts?.skipGate) {
      const gate = await assertCanMessage(otherUserId);
      if (!gate.ok) {
        const err = new Error(gate.error || "Cannot message this user");
        err.status = gate.status || 403;
        throw err;
      }
      if (gate.existingId) {
        return formatConversationRow(gate.existingId, uid, null);
      }
    }

    const sb = await ensureClient();

    if (cfg.useEnsureConversationRpc) {
      const { data: rpcId, error: rpcErr } = await sb.rpc("ensure_conversation", {
        other_user_id: otherUserId,
      });
      if (!rpcErr && rpcId) {
        await touchPresence(uid);
        return formatConversationRow(rpcId, uid, null);
      }
      if (rpcErr) {
        console.warn("[influnet] ensure_conversation:", rpcErr.message);
      }
    }

    const sharedId = await findSharedConversationId(uid, otherUserId);
    if (sharedId) {
      return formatConversationRow(sharedId, uid, null);
    }

    // Do not .select() on insert — RLS only allows SELECT after you are a participant.
    const convId = crypto.randomUUID();
    const { error: convErr } = await sb.from("conversations").insert({ id: convId });
    if (convErr) throw convErr;

    const { error: selfErr } = await sb.from("conversation_participants").insert({
      conversation_id: convId,
      user_id: uid,
    });
    if (selfErr) throw selfErr;

    const { error: otherErr } = await sb.from("conversation_participants").insert({
      conversation_id: convId,
      user_id: otherUserId,
    });
    if (otherErr) {
      console.warn("[influnet] add other participant:", otherErr.message);
      throw otherErr;
    }

    return formatConversationRow(convId, uid, null);
  }

  function parseStoredMessageBody(raw) {
    if (!raw || raw[0] !== "{") return { text: raw || "", attachments: [] };
    try {
      const o = JSON.parse(raw);
      if (o?.infl === 1) {
        return {
          text: o.text || "",
          attachments: Array.isArray(o.attachments) ? o.attachments : [],
        };
      }
    } catch (_) {
      /* plain text */
    }
    return { text: raw || "", attachments: [] };
  }

  function serializeStoredMessageBody(text, attachments) {
    const t = String(text || "").trim();
    const list = Array.isArray(attachments) ? attachments.filter((a) => a?.url) : [];
    if (!list.length) return t;
    return JSON.stringify({ infl: 1, text: t, attachments: list });
  }

  function messagePreviewBody(raw) {
    const { text, attachments } = parseStoredMessageBody(raw);
    if (text) return text;
    if (attachments.length) {
      const first = attachments[0];
      return `📎 ${first.name || "Attachment"}${attachments.length > 1 ? ` +${attachments.length - 1}` : ""}`;
    }
    return "";
  }

  function messageStatusForViewer(row, viewerId, otherLastReadAt) {
    if (!viewerId || row.sender_user_id !== viewerId) return undefined;
    if (
      otherLastReadAt &&
      new Date(otherLastReadAt).getTime() >= new Date(row.created_at).getTime()
    ) {
      return "read";
    }
    return "sent";
  }

  function formatMessageRow(row, viewerId, otherLastReadAt) {
    const { text, attachments } = parseStoredMessageBody(row.body);
    const status = messageStatusForViewer(row, viewerId, otherLastReadAt);
    return {
      id: row.id,
      body: text,
      attachments,
      senderUserId: row.sender_user_id,
      deleted: !!row.deleted,
      createdAt: row.created_at,
      ...(status ? { status } : {}),
    };
  }

  async function getOtherParticipantLastReadAt(conversationId, uid) {
    const sb = await ensureClient();
    const { data: parts } = await sb
      .from("conversation_participants")
      .select("user_id, last_read_at")
      .eq("conversation_id", conversationId);
    const other = (parts || []).find((p) => p.user_id !== uid);
    return other?.last_read_at || null;
  }

  async function listMessages(conversationId) {
    if (!(await checkMessagingTables())) return [];
    const session = await getSessionUser();
    if (!session?.user) return [];
    const uid = session.user.id;
    await touchPresence(uid);
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("messages")
      .select("id, body, sender_user_id, deleted, created_at")
      .eq("conversation_id", conversationId)
      .eq("deleted", false)
      .order("created_at", { ascending: true });
    if (error) {
      console.warn("[influnet] messages:", error.message);
      return [];
    }
    const otherLastReadAt = await getOtherParticipantLastReadAt(conversationId, uid);
    await sb
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", uid);
    broadcastNotification({
      type: "MESSAGE_READ",
      conversationId,
      userId: uid,
    });
    return (data || []).map((m) => formatMessageRow(m, uid, otherLastReadAt));
  }

  async function getConversationContext(conversationId) {
    const session = await getSessionUser();
    if (!session?.user) return { error: "Not authenticated", status: 401 };
    const uid = session.user.id;
    const sb = await ensureClient();
    const { data: parts } = await sb
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId);
    const otherId = (parts || []).map((p) => p.user_id).find((id) => id !== uid);
    if (!otherId) return { error: "Not found", status: 404 };

    const profiles = await loadProfilesMap([uid, otherId]);
    const profile =
      formatConversationParticipant(
        profiles.get(otherId),
        conversationId,
        otherId
      ) || profiles.get(otherId);

    let projects = [];
    if (await checkProjectTables()) {
      const { data } = await sb
        .from("campaign_projects")
        .select(
          "id, title, current_stage, status, updated_at, owner_user_id, counterparty_user_id"
        )
        .or(`owner_user_id.eq.${uid},counterparty_user_id.eq.${uid}`)
        .order("updated_at", { ascending: false });
      projects = (data || [])
        .filter(
          (p) =>
            p.owner_user_id === otherId || p.counterparty_user_id === otherId
        )
        .map((p) => ({
          id: p.id,
          title: p.title,
          currentStage: normalizeProjectStage(p.current_stage),
          currentStageLabel: projectStageLabel(p.current_stage),
          status: p.status || "active",
          updatedAt: p.updated_at,
        }));
    } else {
      const all = await listProjectsForUser(uid);
      projects = all
        .filter(
          (p) =>
            p.counterpartyUserId === otherId || p.ownerUserId === otherId
        )
        .map((p) => ({
          id: p.id,
          title: p.title,
          currentStage: p.currentStage,
          currentStageLabel: projectStageLabel(p.currentStage),
          status: p.status || "active",
          updatedAt: p.updatedAt,
        }));
    }

    const activity = [];
    if (await checkCollabTables()) {
      const { data: requests } = await sb
        .from("collab_requests")
        .select("id, status, created_at, from_user_id, to_user_id")
        .or(
          `and(from_user_id.eq.${uid},to_user_id.eq.${otherId}),and(from_user_id.eq.${otherId},to_user_id.eq.${uid})`
        )
        .order("created_at", { ascending: false })
        .limit(12);
      for (const r of requests || []) {
        const from = profiles.get(r.from_user_id);
        const to = profiles.get(r.to_user_id);
        const fromName = from?.companyName || from?.name || "User";
        const toName = to?.name || to?.companyName || "User";
        if (r.status === "pending") {
          activity.push({
            id: `req-${r.id}`,
            kind: "request_sent",
            title: `${fromName} sent request`,
            createdAt: r.created_at,
          });
        } else if (r.status === "accepted") {
          const accepter =
            r.from_user_id === uid ? toName : fromName;
          activity.push({
            id: `acc-${r.id}`,
            kind: "request_accepted",
            title: `${accepter} accepted collaboration`,
            createdAt: r.created_at,
          });
        }
      }
    }

    if (await checkProjectTables()) {
      for (const p of projects.slice(0, 4)) {
        const full = await getProjectForUserFromDb(p.id, uid);
        const last = full?.history?.[full.history.length - 1];
        if (last) {
          activity.push({
            id: `proj-${p.id}-${last.id}`,
            kind: "project_update",
            title: `Project moved to ${projectStageLabel(last.stage)}`,
            createdAt: last.createdAt,
            projectId: p.id,
          });
        }
      }
    }

    activity.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const { data: msgs } = await sb
      .from("messages")
      .select("body, created_at")
      .eq("conversation_id", conversationId)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(200);
    const sharedFiles = [];
    const seenFiles = new Set();
    for (const m of msgs || []) {
      const { attachments } = parseStoredMessageBody(m.body);
      for (const a of attachments) {
        const key = a.url || a.name;
        if (!key || seenFiles.has(key)) continue;
        seenFiles.add(key);
        sharedFiles.push({
          name: a.name,
          url: a.url,
          mime: a.mime,
          createdAt: m.created_at,
        });
      }
    }

    const isCompleted = (p) =>
      p.status === "completed" || p.currentStage === "project_completed";
    const isActive = (p) => p.status === "active" && !isCompleted(p);

    const activeProjects = projects.filter(isActive);
    const completedProjects = projects.filter(isCompleted);

    let requestsSent = 0;
    let requestsAccepted = 0;
    let connectedSince = null;
    if (await checkCollabTables()) {
      const { data: allReqs } = await sb
        .from("collab_requests")
        .select("id, status, created_at, from_user_id, to_user_id")
        .or(
          `and(from_user_id.eq.${uid},to_user_id.eq.${otherId}),and(from_user_id.eq.${otherId},to_user_id.eq.${uid})`
        )
        .order("created_at", { ascending: true });
      for (const r of allReqs || []) {
        requestsSent += 1;
        if (r.status === "accepted") {
          requestsAccepted += 1;
          if (!connectedSince) connectedSince = r.created_at;
        }
      }
    }

    if (!connectedSince) {
      const { data: conv } = await sb
        .from("conversations")
        .select("created_at")
        .eq("id", conversationId)
        .maybeSingle();
      connectedSince = conv?.created_at || null;
    }

    const lastMessageAt = msgs?.[0]?.created_at || null;

    const relationship = {
      connectedSince,
      requestsSent,
      requestsAccepted,
      activeCollaborations: activeProjects.length,
      completedCollaborations: completedProjects.length,
      lastInteraction: lastMessageAt,
    };

    return {
      profile: {
        id: profile.id,
        name: profile.name,
        companyName: profile.companyName,
        role: profile.role,
        displayRole: profile.displayRole,
        industry: profile.industry,
        location: profile.location,
        niche: profile.niche,
        username: profile.username,
        profileSlug: profile.profileSlug,
        avatarUrl: profile.avatarUrl,
        isVerified: profile.isVerified,
        availabilityStatus: profile.availabilityStatus,
        headline: profile.headline,
      },
      relationship,
      activeProjects: activeProjects.slice(0, 8),
      completedProjects: completedProjects.slice(0, 4),
      activity: activity.slice(0, 10),
      sharedFiles: sharedFiles.slice(0, 16),
    };
  }

  async function createMessage(conversationId, body) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
    await touchPresence(session.user.id);
    await clearTyping(session.user.id);
    const text = body?.body ?? "";
    const attachments = Array.isArray(body?.attachments) ? body.attachments : [];
    if (!String(text).trim() && !attachments.length) {
      return jsonResponse({ error: "Empty message" }, 400);
    }
    const storedBody = serializeStoredMessageBody(text, attachments);
    const sb = await ensureClient();
    const insertMessage = () =>
      sb
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_user_id: session.user.id,
          body: storedBody,
        })
        .select("id, body, sender_user_id, deleted, created_at")
        .single();

    let { data, error } = await insertMessage();
    if (
      error &&
      (error.code === "42501" ||
        /row-level security policy|forbidden|permission/i.test(String(error.message || "")))
    ) {
      // Some users hit stale conversations where their participant row is missing.
      // Restore self membership and retry once before surfacing the error.
      const { data: mine } = await sb
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mine) {
        const { error: joinErr } = await sb
          .from("conversation_participants")
          .insert({
            conversation_id: conversationId,
            user_id: session.user.id,
          });
        if (joinErr) {
          console.warn("[influnet] message send rejoin failed:", joinErr.message);
        } else {
          ({ data, error } = await insertMessage());
        }
      }
    }
    if (error) return jsonResponse({ error: error.message }, 400);
    await sb
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    broadcastSse({ type: "message", conversationId });
    broadcastNotification({
      type: "NEW_MESSAGE_RECEIVED",
      conversationId,
      senderUserId: data.sender_user_id,
      body: data.body,
    });
    const otherLastReadAt = await getOtherParticipantLastReadAt(
      conversationId,
      session.user.id
    );
    return jsonResponse(formatMessageRow(data, session.user.id, otherLastReadAt));
  }

  async function uploadMessageAttachment(conversationId, body) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);

    const parsed = parseImageUploadBody(body);
    if (!parsed) return jsonResponse({ error: "Invalid or missing file data" }, 400);

    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
      "application/x-zip-compressed",
    ]);
    if (!allowed.has(parsed.contentType)) {
      return jsonResponse({ error: "Unsupported file type" }, 400);
    }
    if (parsed.bytes.length > 25 * 1024 * 1024) {
      return jsonResponse({ error: "File must be under 25 MB" }, 400);
    }

    const sb = await ensureClient();
    const uid = session.user.id;
    const safeName = String(body?.fileName || "file")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(0, 120);
    const path = `${conversationId}/${uid}/${Date.now()}-${safeName}`;

    const { error: upErr } = await sb.storage
      .from("message-attachments")
      .upload(path, parsed.bytes, {
        upsert: false,
        contentType: parsed.contentType,
      });
    if (upErr) {
      const hint = String(upErr.message).includes("Bucket not found")
        ? " Run supabase/migrations/019_message_attachments.sql in Supabase."
        : "";
      return jsonResponse({ error: upErr.message + hint }, 400);
    }

    const { data: urlData } = sb.storage.from("message-attachments").getPublicUrl(path);
    return jsonResponse({
      name: safeName,
      url: urlData.publicUrl,
      mime: parsed.contentType,
      size: parsed.bytes.length,
    });
  }

  async function markConversationUnread(conversationId) {
    const session = await getSessionUser();
    if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
    const sb = await ensureClient();
    const { error } = await sb
      .from("conversation_participants")
      .update({ last_read_at: new Date(0).toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", session.user.id);
    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ ok: true });
  }

  function mapUser(authUser) {
    const m = authUser?.user_metadata || {};
    return {
      id: authUser.id,
      email: authUser.email,
      name: m.name ?? null,
      phone: m.phone ?? null,
      phoneVerified: !!m.phoneVerified,
      phoneVerifiedAt: m.phoneVerifiedAt ?? null,
      otpVerifiedBy: m.otpVerifiedBy ?? null,
      role: normalizeUserRole(m.role) ?? m.role ?? null,
      location: m.location ?? null,
      companyName: m.companyName ?? null,
      businessType: m.businessType ?? null,
      industry: m.industry ?? null,
      gstNumber: m.gstNumber ?? null,
      website: m.website ?? null,
      collabPreferences: m.collabPreferences ?? null,
      marketingBudget: m.marketingBudget ?? null,
      registeredAddress: m.registeredAddress ?? null,
      city: m.city ?? null,
      state: m.state ?? null,
      approvalStatus: m.approvalStatus ?? null,
      bio: m.bio ?? null,
      niche: m.niche ?? null,
      instagramHandle: m.instagramHandle ?? null,
      youtubeHandle: m.youtubeHandle ?? null,
      twitterHandle: m.twitterHandle ?? null,
      gender: m.gender ?? null,
      facebookHandle: m.facebookHandle ?? null,
      linkedinHandle: sanitizeLinkedInHandle(m.linkedinHandle ?? null),
      extraSocialLinks: formatExtraSocialLinks(m.extraSocialLinks),
      instagramFollowers:
        m.instagramFollowers != null ? Number(m.instagramFollowers) : null,
      youtubeSubscribers:
        m.youtubeSubscribers != null ? Number(m.youtubeSubscribers) : null,
      tiktokFollowers: m.tiktokFollowers != null ? Number(m.tiktokFollowers) : null,
      facebookFollowers:
        m.facebookFollowers != null ? Number(m.facebookFollowers) : null,
      businessUsername: m.businessUsername ?? m.username ?? null,
      tagline: m.tagline ?? null,
      companyDescription: m.companyDescription ?? null,
      logoUrl: m.logoUrl ?? null,
      coverImageUrl: m.coverImageUrl ?? null,
      preferredCreatorNiches: m.preferredCreatorNiches ?? null,
      targetAudience: m.targetAudience ?? null,
      pastCampaigns: m.pastCampaigns ?? null,
      headline: m.headline ?? null,
      availabilityStatus: m.availabilityStatus ?? null,
      audienceDemographics: m.audienceDemographics ?? null,
      pastCollaborations: m.pastCollaborations ?? null,
      username: m.username ?? null,
      collabTypes: m.collabTypes ?? null,
      languages: m.languages ?? null,
      priceRange: m.priceRange ?? null,
      avatarUrl: m.avatarUrl ?? null,
      mediaKitUrl: m.mediaKitUrl ?? null,
      portfolio: m.portfolio ?? null,
      tiktokHandle: m.tiktokHandle ?? null,
    };
  }

  function pickDbOrMeta(dbVal, metaVal) {
    if (dbVal === null || dbVal === undefined) return metaVal;
    if (typeof dbVal === "string" && !dbVal.trim() && metaVal) return metaVal;
    if (Array.isArray(dbVal) && dbVal.length === 0) {
      if (Array.isArray(metaVal) && metaVal.length > 0) return metaVal;
    }
    if (
      dbVal &&
      typeof dbVal === "object" &&
      !Array.isArray(dbVal) &&
      Object.keys(dbVal).length === 0 &&
      metaVal &&
      typeof metaVal === "object" &&
      Object.keys(metaVal).length > 0
    ) {
      return metaVal;
    }
    return dbVal;
  }

  async function loadProfileFromDb(userId) {
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("profiles")
      .select("*, business_profiles(*), influencer_profiles(*)")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return null;
    const bp = Array.isArray(data.business_profiles)
      ? data.business_profiles[0]
      : data.business_profiles;
    const ip = Array.isArray(data.influencer_profiles)
      ? data.influencer_profiles[0]
      : data.influencer_profiles;
    const isBusiness = isBusinessOwnerRole(data.role, {
      hasBusinessProfile: !!bp,
      hasInfluencerProfile: !!ip,
    });
    const resolvedRole =
      normalizeUserRole(data.role, {
        hasBusinessProfile: !!bp,
        hasInfluencerProfile: !!ip,
      }) || data.role;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      phoneVerified: !!data.phone_verified,
      phoneVerifiedAt: data.phone_verified_at ?? null,
      otpVerifiedBy: data.otp_verified_by ?? null,
      role: resolvedRole,
      hasInfluencerProfile: !!ip,
      hasBusinessProfile: !!bp,
      location: data.location,
      companyName: bp?.company_name ?? null,
      businessType: bp?.business_type ?? null,
      industry: bp?.industry ?? null,
      gstNumber: bp?.gst_number ?? null,
      website: bp?.website ?? null,
      collabPreferences: bp?.collab_preferences ?? null,
      marketingBudget: bp?.marketing_budget ?? null,
      registeredAddress: bp?.registered_address ?? null,
      approvalStatus: bp?.approval_status ?? null,
      businessUsername: bp?.username ?? null,
      businessUsernameChangedAt: bp?.username_changed_at ?? null,
      tagline: bp?.tagline ?? null,
      companyDescription: bp?.company_description ?? null,
      logoUrl: bp?.logo_url ?? null,
      coverImageUrl: isBusiness
        ? bp?.cover_image_url ?? null
        : ip?.cover_image_url ?? null,
      preferredCreatorNiches: Array.isArray(bp?.preferred_creator_niches)
        ? bp.preferred_creator_niches
        : [],
      targetAudience:
        bp?.target_audience && typeof bp.target_audience === "object"
          ? bp.target_audience
          : {},
      pastCampaigns: Array.isArray(bp?.past_campaigns) ? bp.past_campaigns : [],
      instagramHandle: bp?.instagram_handle ?? ip?.instagram_handle ?? null,
      facebookHandle: bp?.facebook_handle ?? ip?.facebook_handle ?? null,
      linkedinHandle: sanitizeLinkedInHandle(
        bp?.linkedin_handle ?? ip?.linkedin_handle ?? null
      ),
      bio: ip?.bio ?? null,
      niche: ip?.niche ?? null,
      secondaryCategories: Array.isArray(ip?.secondary_categories)
        ? ip.secondary_categories.filter(Boolean).map(String)
        : [],
      youtubeHandle: ip?.youtube_handle ?? null,
      twitterHandle: ip?.twitter_handle ?? null,
      gender: ip?.gender ?? null,
      extraSocialLinks: formatExtraSocialLinks(ip?.extra_social_links),
      profileSlug: ip?.profile_slug ?? null,
      username: isBusiness ? bp?.username ?? null : ip?.username ?? null,
      usernameChangedAt: isBusiness
        ? bp?.username_changed_at ?? null
        : ip?.username_changed_at ?? null,
      avatarUrl: ip?.avatar_url ?? null,
      tiktokHandle: ip?.tiktok_handle ?? null,
      instagramFollowers:
        ip?.instagram_followers != null ? Number(ip.instagram_followers) : null,
      youtubeSubscribers:
        ip?.youtube_subscribers != null ? Number(ip.youtube_subscribers) : null,
      tiktokFollowers:
        ip?.tiktok_followers != null ? Number(ip.tiktok_followers) : null,
      facebookFollowers:
        ip?.facebook_followers != null ? Number(ip.facebook_followers) : null,
      engagementRate:
        ip?.engagement_rate != null ? Number(ip.engagement_rate) : null,
      mediaKitUrl: ip?.media_kit_url ?? null,
      portfolio: Array.isArray(ip?.portfolio) ? ip.portfolio : [],
      pricingMin: ip?.pricing_min != null ? Number(ip.pricing_min) : null,
      pricingMax: ip?.pricing_max != null ? Number(ip.pricing_max) : null,
      isVerified: isBusiness ? bp?.approval_status === "approved" : !!ip?.is_verified,
      city: isBusiness ? bp?.city ?? null : ip?.city ?? null,
      state: isBusiness ? bp?.state ?? null : ip?.state ?? null,
      languages: Array.isArray(ip?.languages) ? ip.languages : [],
      collabTypes: Array.isArray(ip?.collab_types) ? ip.collab_types : [],
      priceRange: ip?.price_range ?? null,
      headline: ip?.headline ?? null,
      availabilityStatus: ip?.availability_status ?? null,
      audienceDemographics:
        ip?.audience_demographics && typeof ip.audience_demographics === "object"
          ? ip.audience_demographics
          : {},
      pastCollaborations: Array.isArray(ip?.past_collaborations)
        ? ip.past_collaborations
        : [],
      onboardingStep: ip?.onboarding_step != null ? Number(ip.onboarding_step) : null,
      isProfileComplete: ip?.is_profile_complete != null ? !!ip.is_profile_complete : null,
      onboardingCompleted:
        ip?.onboarding_completed != null ? !!ip.onboarding_completed : null,
    };
  }

  function parseLocationParts(location, city, state) {
    if (city != null || state != null) {
      const c = String(city ?? "").trim();
      const st = String(state ?? "").trim();
      if (c && st) return { city: c, state: st, location: `${c}, ${st}` };
      if (c) return { city: c, state: st, location: c };
      return { city: c, state: st, location: st || null };
    }
    const loc = String(location || "").trim();
    if (!loc) return { city: "", state: "", location: null };
    const parts = loc.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        city: parts[0],
        state: parts.slice(1).join(", "),
        location: loc,
      };
    }
    return { city: loc, state: "", location: loc };
  }

  const INFLUENCER_PRICE_RANGES = {
    entry: { min: 1000, max: 5000 },
    standard: { min: 5000, max: 10000 },
    premium: { min: 10000, max: 25000 },
    pro: { min: 25000, max: null },
    under10k: { min: 1000, max: 10000 },
    "10kto50k": { min: 10000, max: 50000 },
    "50kto2l": { min: 50000, max: 200000 },
    "2lplus": { min: 200000, max: null },
  };

  const LEGACY_PRICE_RANGE_IDS = {
    under10k: "entry",
    "10kto50k": "standard",
    "50kto2l": "premium",
    "2lplus": "pro",
  };

  function normalizePriceRangeId(value) {
    const s = String(value || "").trim();
    if (!s) return null;
    return LEGACY_PRICE_RANGE_IDS[s] || s;
  }

  function normalizeCollabTypeIds(list) {
    if (!Array.isArray(list)) return [];
    const alias = { youtube: "yt" };
    return [...new Set(list.filter(Boolean).map((id) => alias[String(id)] || String(id)))];
  }

  const SOCIAL_PLATFORM_DOMAINS = {
    instagram: ["instagram.com"],
    tiktok: ["tiktok.com"],
    youtube: ["youtube.com", "youtu.be"],
    linkedin: ["linkedin.com"],
    facebook: ["facebook.com", "fb.com"],
    twitter: ["twitter.com", "x.com"],
  };

  function looksLikeSocialUrl(value) {
    const s = String(value || "").toLowerCase();
    return (
      /^https?:\/\//i.test(s) ||
      s.includes("instagram.com") ||
      s.includes("tiktok.com") ||
      s.includes("youtube.com") ||
      s.includes("youtu.be") ||
      s.includes("linkedin.com") ||
      s.includes("facebook.com") ||
      s.includes("twitter.com") ||
      s.includes("x.com")
    );
  }

  function isEmailLike(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  /** Drop email-shaped values wrongly stored or autofilled as LinkedIn usernames. */
  function sanitizeLinkedInHandle(raw) {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const slug = formatSocialHandle("linkedin", s);
    if (!slug || isEmailLike(slug)) return null;
    if (!looksLikeSocialUrl(s) && isEmailLike(s)) return null;
    return raw;
  }

  function isSocialHandleForPlatform(platform, raw) {
    if (!raw) return false;
    const s = String(raw).trim().toLowerCase();
    if (!s) return false;
    if (!looksLikeSocialUrl(s)) {
      if (platform === "linkedin" && isEmailLike(s)) return false;
      return true;
    }
    const domains = SOCIAL_PLATFORM_DOMAINS[platform];
    if (!domains) return true;
    return domains.some((d) => s.includes(d));
  }

  function formatSocialHandle(platform, raw) {
    if (!raw) return "";
    let s = String(raw).trim();
    if (!s) return "";

    const soc =
      typeof window !== "undefined" && window.INFLUNET_SOCIAL
        ? window.INFLUNET_SOCIAL
        : null;
    if (soc?.displayFromStored) {
      const display = soc.displayFromStored(platform, s);
      if (display) {
        if (platform === "instagram" || platform === "tiktok" || platform === "twitter") {
          return display.startsWith("@") ? display : `@${display.replace(/^@/, "")}`;
        }
        if (platform === "youtube" && display && !display.startsWith("@") && !/^UC/i.test(display)) {
          return `@${display}`;
        }
        return display;
      }
    }

    if (looksLikeSocialUrl(s)) {
      const href = s.startsWith("http") ? s : `https://${s.replace(/^@+/, "")}`;
      try {
        const u = new URL(href);
        const host = u.hostname.replace(/^www\./, "").toLowerCase();
        const parts = u.pathname.split("/").filter(Boolean);

        if (host.includes("instagram.com")) {
          const user = parts[0];
          return user ? `@${user.replace(/^@/, "")}` : "";
        }
        if (host.includes("tiktok.com")) {
          const user = parts.find((p) => p.startsWith("@")) || parts[parts.length - 1];
          return user ? `@${String(user).replace(/^@/, "")}` : "";
        }
        if (host.includes("youtu.be")) {
          return parts[0] ? `@${parts[0]}` : "";
        }
        if (host.includes("youtube.com")) {
          if (parts[0] === "channel" || parts[0] === "c") {
            return parts[1] ? `@${parts[1]}` : "";
          }
          const user = parts.find((p) => p.startsWith("@")) || parts[parts.length - 1];
          return user ? (user.startsWith("@") ? user : `@${user}`) : "";
        }
        if (host.includes("linkedin.com")) {
          const inIdx = parts.indexOf("in");
          if (inIdx >= 0 && parts[inIdx + 1]) return parts[inIdx + 1];
          return parts[parts.length - 1] || "";
        }
        if (host.includes("facebook.com") || host.includes("fb.com")) {
          return parts[0] || "";
        }
        if (host.includes("twitter.com") || host === "x.com") {
          const user = parts[0];
          return user ? `@${user.replace(/^@/, "")}` : "";
        }
      } catch {
        /* fall through */
      }
    }

    s = s.replace(/^@+/, "");
    if (platform === "instagram" || platform === "tiktok") return `@${s}`;
    if (platform === "youtube" && s) return s.startsWith("@") ? s : `@${s}`;
    if (platform === "twitter" && s) return `@${s}`;
    return s;
  }

  function normalizeSocialInput(platform, raw) {
    if (raw == null) return undefined;
    const trimmed = String(raw).trim();
    if (!trimmed) return null;
    if (!isSocialHandleForPlatform(platform, trimmed)) return null;
    const display = formatSocialHandle(platform, trimmed);
    if (!display) return null;
    if (platform === "linkedin" && isEmailLike(display)) return null;
    if (platform === "instagram" || platform === "tiktok" || platform === "twitter") {
      return display.replace(/^@/, "");
    }
    if (platform === "youtube") return display.replace(/^@/, "");
    return display;
  }

  /** Canonical full URL for storage; null if invalid. */
  function normalizeSocialProfileForStorage(platform, raw) {
    if (raw == null) return undefined;
    const soc =
      typeof window !== "undefined" && window.INFLUNET_SOCIAL
        ? window.INFLUNET_SOCIAL
        : null;
    if (soc?.normalizeForStorage) return soc.normalizeForStorage(platform, raw);
    const trimmed = String(raw).trim();
    if (!trimmed) return null;
    const normalized = normalizeSocialInput(platform, trimmed);
    if (!normalized) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (platform === "instagram") return `https://instagram.com/${normalized.replace(/^@/, "")}`;
    if (platform === "facebook") return `https://facebook.com/${normalized}`;
    if (platform === "youtube") {
      return normalized.startsWith("UC")
        ? `https://youtube.com/channel/${normalized}`
        : `https://youtube.com/@${normalized.replace(/^@/, "")}`;
    }
    if (platform === "linkedin") return `https://linkedin.com/in/${normalized}`;
    if (platform === "tiktok") return `https://tiktok.com/@${normalized.replace(/^@/, "")}`;
    if (platform === "twitter") return `https://x.com/${normalized.replace(/^@/, "")}`;
    return trimmed;
  }

  /** @deprecated use normalizeSocialProfileForStorage */
  function normalizeSocialInputLenient(platform, raw) {
    return normalizeSocialProfileForStorage(platform, raw);
  }

  function normalizeSignupSocialFields(body) {
    const fields = [
      ["instagramHandle", "instagram"],
      ["facebookHandle", "facebook"],
      ["youtubeHandle", "youtube"],
      ["linkedinHandle", "linkedin"],
      ["tiktokHandle", "tiktok"],
      ["twitterHandle", "twitter"],
    ];
    const errors = [];
    for (const [key, platform] of fields) {
      if (body[key] == null) continue;
      const trimmed = String(body[key]).trim();
      if (!trimmed) {
        body[key] = null;
        continue;
      }
      const url = normalizeSocialProfileForStorage(platform, trimmed);
      if (!url) {
        errors.push(`Invalid ${platform} profile link`);
      } else {
        body[key] = url;
      }
    }
    return errors;
  }

  function slugifyProfileName(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const USERNAME_RE = /^[a-z0-9][a-z0-9._]{2,29}$/;
  const RESERVED_USERNAMES = new Set([
    "admin",
    "api",
    "help",
    "influnet",
    "support",
    "www",
    "mail",
    "root",
    "system",
    "null",
    "undefined",
    "dashboard",
    "signup",
    "login",
  ]);

  function normalizeUsername(raw) {
    return String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function isValidUsername(value) {
    const u = normalizeUsername(value);
    if (!USERNAME_RE.test(u)) return false;
    if (RESERVED_USERNAMES.has(u)) return false;
    return true;
  }

  function suggestUsernames(base) {
    const u = normalizeUsername(base).replace(/[^a-z0-9._]/g, "");
    if (!u || u.length < 2) return [];
    const out = [];
    const suffixes = ["123", "_official", ".in", "_creator", "01"];
    for (const sfx of suffixes) {
      const trimmed = u.length + sfx.length > 30 ? u.slice(0, 30 - sfx.length) : u;
      const cand = `${trimmed}${sfx}`;
      if (isValidUsername(cand) && !out.includes(cand)) out.push(cand);
      if (out.length >= 3) break;
    }
    return out;
  }

  function resolvePublicSlug(profile) {
    if (!profile) return null;
    const u = normalizeUsername(profile.username);
    if (u && isValidUsername(u)) return u;
    const legacy = String(profile.profileSlug || "").trim();
    if (legacy) return normalizeProfileSlug(legacy);
    return null;
  }

  async function isUsernameGloballyTaken(username, excludeUserId) {
    const u = normalizeUsername(username);
    if (!u) return false;
    if (!(await checkTables())) return false;
    const sb = await ensureClient();
    const { data, error } = await sb.rpc("is_username_globally_taken", {
      p_username: u,
      p_exclude_user_id: excludeUserId || null,
    });
    if (error) {
      const [inf, biz] = await Promise.all([
        sb.from("influencer_profiles").select("user_id").ilike("username", u).maybeSingle(),
        sb.from("business_profiles").select("user_id").ilike("username", u).maybeSingle(),
      ]);
      const takenId = inf.data?.user_id || biz.data?.user_id || null;
      return !!(takenId && takenId !== excludeUserId);
    }
    return !!data;
  }

  async function isUsernameAvailable(username, excludeUserId) {
    const u = normalizeUsername(username);
    if (!isValidUsername(u)) {
      return { available: false, username: u, reason: "invalid", suggestions: suggestUsernames(u) };
    }
    if (!(await checkTables())) {
      return { available: true, username: u, suggestions: [] };
    }
    const taken = await isUsernameGloballyTaken(u, excludeUserId);
    if (taken) {
      return {
        available: false,
        username: u,
        reason: "taken",
        suggestions: suggestUsernames(u),
      };
    }
    return { available: true, username: u, suggestions: [] };
  }

  async function checkUsernameAvailability(search) {
    const username = search.get("username") || search.get("q") || "";
    let excludeUserId = null;
    if (search.get("excludeSelf") === "1" || search.get("excludeSelf") === "true") {
      const session = await getSessionUser();
      excludeUserId = session?.user?.id || null;
    }
    const result = await isUsernameAvailable(username, excludeUserId);
    return jsonResponse(result);
  }

  async function checkBusinessUsernameAvailability(search) {
    return checkUsernameAvailability(search);
  }

  function resolveBusinessPublicSlug(profile) {
    if (!profile) return null;
    const u = normalizeUsername(profile.businessUsername || profile.username);
    if (u && isValidUsername(u)) return u;
    return null;
  }

  function publicBusinessUrl(slug) {
    const origin = window.location.origin;
    const s = String(slug || "").trim().toLowerCase();
    return s ? `${origin}/influnet/${encodeURIComponent(s)}` : origin;
  }

  function normalizeProfileSlug(value) {
    return slugifyProfileName(value);
  }

  function publicInfluencerUrl(slug) {
    const origin = window.location.origin;
    const s = String(slug || "").trim().toLowerCase();
    return s ? `${origin}/influnet/${encodeURIComponent(s)}` : origin;
  }

  function parseProfileSlugFromQuery(q) {
    const t = String(q || "").trim();
    if (!t) return null;
    const fromPath = t.match(/influnet[/\\]([a-z0-9._]+)/i);
    if (fromPath) return normalizeUsername(fromPath[1]);
    if (/^[a-z0-9][a-z0-9._-]{2,29}$/i.test(t)) return normalizeUsername(t.replace(/-/g, "_"));
    return null;
  }

  function hasSocialLinks(profile) {
    if (!profile) return false;
    const extra = profile.extraSocialLinks;
    const extraCount = Array.isArray(extra)
      ? extra.filter((x) => x && (x.url || x.handle)).length
      : 0;
    return !!(
      profile.instagramHandle ||
      profile.youtubeHandle ||
      profile.linkedinHandle ||
      profile.twitterHandle ||
      profile.facebookHandle ||
      profile.tiktokHandle ||
      extraCount > 0
    );
  }

  function hasAudienceDemographics(profile) {
    const d = profile?.audienceDemographics;
    if (!d || typeof d !== "object") return false;
    const ages = Array.isArray(d.ageRanges) ? d.ageRanges : [];
    const cities = Array.isArray(d.topCities) ? d.topCities : [];
    return ages.length > 0 || cities.length > 0;
  }

  function computeProfileCompletion(profile) {
    const signupChecks = [
      {
        key: "username",
        label: "Influnet Username",
        done: isValidUsername(profile?.username),
        phase: "signup",
      },
      {
        key: "photo",
        label: "Profile Photo",
        done: !!(profile?.avatarUrl && String(profile.avatarUrl).trim()),
        phase: "signup",
      },
      {
        key: "bio",
        label: "Bio",
        done: !!(profile?.bio && String(profile.bio).trim()),
        phase: "signup",
      },
      {
        key: "location",
        label: "Location",
        done: !!(profile?.location && String(profile.location).trim()),
        phase: "signup",
      },
      {
        key: "categories",
        label: "Categories",
        done: normalizeNiche(profile?.niche).length > 0,
        phase: "signup",
      },
      {
        key: "social",
        label: "Social Links",
        done: hasSocialLinks(profile),
        phase: "signup",
      },
      {
        key: "contact",
        label: "Verified Mobile",
        done: !!profile?.phoneVerified,
        phase: "signup",
      },
      {
        key: "languages",
        label: "Languages",
        done: Array.isArray(profile?.languages) && profile.languages.length > 0,
        phase: "signup",
      },
      {
        key: "collabTypes",
        label: "Collaboration Types",
        done: Array.isArray(profile?.collabTypes) && profile.collabTypes.length > 0,
        phase: "signup",
      },
      {
        key: "priceRange",
        label: "Price Range",
        done: !!(profile?.priceRange && String(profile.priceRange).trim()),
        phase: "signup",
      },
    ];
    const postSignupChecks = [
      {
        key: "headline",
        label: "Profile Headline",
        done: !!(profile?.headline && String(profile.headline).trim()),
        phase: "post_signup",
      },
      {
        key: "availability",
        label: "Availability Status",
        done: !!(profile?.availabilityStatus && String(profile.availabilityStatus).trim()),
        phase: "post_signup",
      },
      {
        key: "portfolio",
        label: "Portfolio",
        done: Array.isArray(profile?.portfolio) && profile.portfolio.length > 0,
        phase: "post_signup",
      },
      {
        key: "mediaKit",
        label: "Media Kit",
        done: !!(profile?.mediaKitUrl && String(profile.mediaKitUrl).trim()),
        phase: "post_signup",
      },
      {
        key: "audience",
        label: "Audience Demographics",
        done: hasAudienceDemographics(profile),
        phase: "post_signup",
      },
    ];
    const checks = [...signupChecks, ...postSignupChecks];
    const done = checks.filter((c) => c.done).length;
    const postSignupPending = postSignupChecks.filter((c) => !c.done);
    return {
      percent: Math.round((done / checks.length) * 100),
      checks,
      postSignupComplete: postSignupPending.length === 0,
      postSignupPending,
    };
  }

  function computeOnboardingStep(profile) {
    const completion = computeProfileCompletion(profile);
    const isDone = (key) =>
      completion.checks.some((c) => c.key === key && c.done);
    const step2Done = isDone("categories") && isDone("social");
    const step3Done =
      step2Done && isDone("languages") && isDone("location") && isDone("bio");
    const step4Done = step3Done && isDone("collabTypes") && isDone("priceRange");
    if (!step2Done) return 2;
    if (!step3Done) return 3;
    if (!step4Done) return 4;
    return 5;
  }

  function isSignupProfileComplete(profile) {
    const completion = computeProfileCompletion(profile);
    return completion.checks.filter((c) => c.phase === "signup").every((c) => c.done);
  }

  function enrichCompletionWithOnboarding(profile, completion) {
    if (profile?.onboardingCompleted === true) {
      return {
        ...completion,
        onboardingStep: 5,
        isProfileComplete: profile?.isProfileComplete === true,
        onboardingCompleted: true,
        signupStepsRemaining: 0,
      };
    }

    const dbStepRaw = profile?.onboardingStep;
    const hasDbOnboarding =
      dbStepRaw != null && !Number.isNaN(Number(dbStepRaw));

    if (hasDbOnboarding) {
      const step = Math.max(2, Math.min(5, Number(dbStepRaw)));
      const complete = profile?.isProfileComplete === true && step >= 5;
      return {
        ...completion,
        onboardingStep: complete ? 5 : step,
        isProfileComplete: complete,
        onboardingCompleted: false,
        signupStepsRemaining: Math.max(0, 5 - (complete ? 5 : step)),
      };
    }

    const computedStep = computeOnboardingStep(profile);
    const signupDone = isSignupProfileComplete(profile);
    return {
      ...completion,
      onboardingStep: computedStep,
      isProfileComplete: signupDone && computedStep >= 5,
      onboardingCompleted: false,
      signupStepsRemaining: Math.max(0, 5 - computedStep),
    };
  }

  /** Hide signup fields the user has not reached yet (avoids stale data from prior attempts). */
  function stripStaleSignupProfileFields(profile, completion) {
    if (!profile || !completion) return profile;
    const step = Number(completion.onboardingStep) || 2;
    const dbStep = Number(profile?.onboardingStep);
    if (dbStep >= 5 || (step >= 5 && completion.isProfileComplete)) return profile;
    const next = { ...profile };
    if (step < 3) {
      next.niche = [];
      next.secondaryCategories = [];
      next.instagramHandle = null;
      next.facebookHandle = null;
      next.youtubeHandle = null;
      next.twitterHandle = null;
      next.linkedinHandle = null;
      next.tiktokHandle = null;
      next.extraSocialLinks = [];
      next.instagramFollowers = 0;
      next.facebookFollowers = 0;
      next.youtubeSubscribers = 0;
      next.tiktokFollowers = 0;
    }
    if (step < 4) {
      next.avatarUrl = null;
      next.bio = "";
      next.location = null;
      next.city = null;
      next.state = null;
      next.languages = [];
    }
    if (step < 5) {
      next.collabTypes = [];
      next.priceRange = null;
      next.pricingMin = null;
      next.pricingMax = null;
    }
    return next;
  }

  async function syncInfluencerOnboardingFlags(userId, profile) {
    if (!userId || !profile || !isInfluencerRole(profile.role)) return;
    try {
      const sb = await ensureClient();
      const fieldStep = computeOnboardingStep(profile);
      const complete = isSignupProfileComplete(profile);
      const dbStepRaw = profile?.onboardingStep;
      const dbStep =
        dbStepRaw != null && !Number.isNaN(Number(dbStepRaw))
          ? Math.max(2, Math.min(5, Number(dbStepRaw)))
          : null;
      let step = fieldStep;
      // Progressive wizard: never skip a step due to stale profile fields from prior attempts
      if (dbStep != null && dbStep < 5 && !complete) {
        step = Math.min(fieldStep, dbStep + 1);
        step = Math.max(step, dbStep);
      }
      step = Math.max(2, Math.min(5, step));
      const patch = {
        onboarding_step: complete ? 5 : step,
        is_profile_complete: complete,
      };
      if (complete || profile?.onboardingCompleted === true) {
        patch.onboarding_completed = true;
      }
      await sb.from("influencer_profiles").update(patch).eq("user_id", userId);
    } catch (err) {
      console.warn("[influnet] sync onboarding flags:", err?.message || err);
    }
  }

  function hasTargetAudience(profile) {
    const d = profile?.targetAudience;
    if (!d || typeof d !== "object") return false;
    const ages = Array.isArray(d.ageRanges) ? d.ageRanges : [];
    const regions = Array.isArray(d.regions) ? d.regions : [];
    const interests = Array.isArray(d.interests) ? d.interests : [];
    return ages.length > 0 || regions.length > 0 || interests.length > 0;
  }

  function hasBusinessSocialLinks(profile) {
    return !!(
      profile?.instagramHandle ||
      profile?.facebookHandle ||
      profile?.linkedinHandle ||
      profile?.website
    );
  }

  function computeBusinessProfileCompletion(profile) {
    const locParts = parseLocationParts(profile?.location, profile?.city, profile?.state);
    const signupChecks = [
      {
        key: "company",
        label: "Company Name",
        done: !!(profile?.companyName && String(profile.companyName).trim()),
        phase: "signup",
      },
      {
        key: "industry",
        label: "Industry",
        done: !!(profile?.industry && String(profile.industry).trim()),
        phase: "signup",
      },
      {
        key: "businessType",
        label: "Business Type",
        done: !!(profile?.businessType && String(profile.businessType).trim()),
        phase: "signup",
      },
      {
        key: "location",
        label: "Location",
        done:
          !!(locParts.city && locParts.state) ||
          !!(profile?.location && String(profile.location).trim()),
        phase: "signup",
      },
      {
        key: "contact",
        label: "Verified Mobile",
        done: !!profile?.phoneVerified,
        phase: "signup",
      },
      {
        key: "budget",
        label: "Marketing Budget",
        done: !!(profile?.marketingBudget && String(profile.marketingBudget).trim()),
        phase: "signup",
      },
      {
        key: "social",
        label: "Social / Web Presence",
        done: hasBusinessSocialLinks(profile),
        phase: "signup",
      },
      {
        key: "collabPrefs",
        label: "Collaboration Preferences",
        done:
          Array.isArray(profile?.collabPreferences) &&
          profile.collabPreferences.length > 0,
        phase: "signup",
      },
    ];
    const postSignupChecks = [
      {
        key: "username",
        label: "Business Username",
        done: isValidUsername(profile?.businessUsername || profile?.username),
        phase: "post_signup",
      },
      {
        key: "tagline",
        label: "Tagline",
        done: !!(profile?.tagline && String(profile.tagline).trim()),
        phase: "post_signup",
      },
      {
        key: "description",
        label: "Company Description",
        done: !!(profile?.companyDescription && String(profile.companyDescription).trim()),
        phase: "post_signup",
      },
      {
        key: "logo",
        label: "Company Logo",
        done: !!(profile?.logoUrl && String(profile.logoUrl).trim()),
        phase: "post_signup",
      },
      {
        key: "niches",
        label: "Preferred Creator Niches",
        done:
          Array.isArray(profile?.preferredCreatorNiches) &&
          profile.preferredCreatorNiches.length > 0,
        phase: "post_signup",
      },
      {
        key: "audience",
        label: "Target Audience",
        done: hasTargetAudience(profile),
        phase: "post_signup",
      },
    ];
    const checks = [...signupChecks, ...postSignupChecks];
    const done = checks.filter((c) => c.done).length;
    const postSignupPending = postSignupChecks.filter((c) => !c.done);
    return {
      percent: Math.round((done / checks.length) * 100),
      checks,
      postSignupComplete: postSignupPending.length === 0,
      postSignupPending,
    };
  }

  async function getProfileCompletionResponse() {
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    const profile = await resolveUser(session.user);
    if (profile?.role === "business_owner" || isBusinessOwnerRole(profile?.role, {
      hasBusinessProfile: !!profile?.companyName || !!profile?.businessUsername,
    })) {
      const completion = computeBusinessProfileCompletion(profile);
      return jsonResponse({
        role: "business_owner",
        profile: toBusinessApiProfile(profile),
        completion,
      });
    }
    const completion = enrichCompletionWithOnboarding(
      profile,
      computeProfileCompletion(profile)
    );
    const displayProfile = stripStaleSignupProfileFields(profile, completion);
    return jsonResponse({
      role: "influencer",
      profile: toInfluencerApiProfile(displayProfile),
      completion,
    });
  }

  function getExtraSocialMetric(extras, id) {
    const link = extras.find((item) => item && String(item.id || "").toLowerCase() === id);
    const n = Number(link?.followers);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function buildSocialPlatformCards(profile) {
    if (!profile) return [];
    const extras = parseExtraSocialLinks(profile.extraSocialLinks);
    const defs = [
      {
        id: "instagram",
        label: "Instagram",
        raw: profile.instagramHandle,
        metricLabel: "Followers",
        metric: Number(profile.instagramFollowers) || 0,
      },
      {
        id: "facebook",
        label: "Facebook",
        raw: profile.facebookHandle,
        metricLabel: "Followers",
        metric: Number(profile.facebookFollowers) || 0,
      },
      {
        id: "youtube",
        label: "YouTube",
        raw: profile.youtubeHandle,
        metricLabel: "Subscribers",
        metric: Number(profile.youtubeSubscribers) || 0,
      },
      {
        id: "tiktok",
        label: "TikTok",
        raw: profile.tiktokHandle,
        metricLabel: "Followers",
        metric: Number(profile.tiktokFollowers) || 0,
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        raw: profile.linkedinHandle,
        metricLabel: "Followers",
        metric: getExtraSocialMetric(extras, "linkedin"),
      },
      {
        id: "twitter",
        label: "X (Twitter)",
        raw: profile.twitterHandle,
        metricLabel: "Followers",
        metric: getExtraSocialMetric(extras, "twitter"),
      },
    ];

    const cards = [];
    for (const d of defs) {
      const raw = d.raw;
      const metric = d.metric != null ? Number(d.metric) : 0;
      const hasHandle = raw && String(raw).trim();
      if (!hasHandle) continue;
      let handle = "";
      if (hasHandle) {
        handle = formatSocialHandle(d.id, raw) || String(raw).trim();
      } else {
        handle = "—";
      }
      cards.push({
        id: d.id,
        label: d.label,
        handle,
        metricLabel: d.metricLabel,
        metric: d.metric,
      });
    }

    const extraDefs = [
      { id: "snapchat", label: "Snapchat" },
      { id: "pinterest", label: "Pinterest" },
      { id: "website", label: "Website" },
    ];
    for (const ed of extraDefs) {
      const link = extras.find((item) => item && String(item.id || "").toLowerCase() === ed.id);
      const url = link?.url != null ? String(link.url).trim() : "";
      if (!url) continue;
      const metric = getExtraSocialMetric(extras, ed.id);
      cards.push({
        id: ed.id,
        label: ed.label,
        handle: url,
        metricLabel: metric != null ? "Followers" : null,
        metric: metric,
      });
    }
    return cards;
  }

  function toInfluencerApiProfile(profile) {
    if (!profile) return null;
    const slug = resolvePublicSlug(profile);
    const username = normalizeUsername(profile.username) || null;
    return {
      userId: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      phoneVerified: !!profile.phoneVerified,
      phoneVerifiedAt: profile.phoneVerifiedAt || null,
      otpVerifiedBy: profile.otpVerifiedBy || null,
      bio: profile.bio,
      location: profile.location,
      gender: profile.gender,
      niche: profile.niche,
      secondaryCategories: Array.isArray(profile.secondaryCategories)
        ? profile.secondaryCategories
        : [],
      instagramHandle: profile.instagramHandle,
      facebookHandle: profile.facebookHandle,
      youtubeHandle: profile.youtubeHandle,
      linkedinHandle: profile.linkedinHandle,
      twitterHandle: profile.twitterHandle,
      tiktokHandle: profile.tiktokHandle,
      extraSocialLinks: profile.extraSocialLinks,
      instagramFollowers: Number(profile.instagramFollowers) || 0,
      youtubeSubscribers: Number(profile.youtubeSubscribers) || 0,
      tiktokFollowers: Number(profile.tiktokFollowers) || 0,
      facebookFollowers: Number(profile.facebookFollowers) || 0,
      engagementRate:
        profile.engagementRate != null ? Number(profile.engagementRate) : null,
      avatarUrl: profile.avatarUrl || null,
      username,
      profileSlug: slug,
      profileUrl: slug ? publicInfluencerUrl(slug) : null,
      publicPath: slug ? `influnet/${slug}` : null,
      usernameChangedAt: profile.usernameChangedAt || null,
      mediaKitUrl: profile.mediaKitUrl || null,
      portfolio: Array.isArray(profile.portfolio) ? profile.portfolio : [],
      pricingMin: profile.pricingMin != null ? Number(profile.pricingMin) : null,
      pricingMax: profile.pricingMax != null ? Number(profile.pricingMax) : null,
      isVerified: !!profile.isVerified,
      city: profile.city || null,
      state: profile.state || null,
      languages: Array.isArray(profile.languages) ? profile.languages : [],
      collabTypes: Array.isArray(profile.collabTypes) ? profile.collabTypes : [],
      priceRange: profile.priceRange || null,
      headline: profile.headline || null,
      coverImageUrl: profile.coverImageUrl || null,
      availabilityStatus: profile.availabilityStatus || null,
      audienceDemographics:
        profile.audienceDemographics && typeof profile.audienceDemographics === "object"
          ? profile.audienceDemographics
          : {},
      pastCollaborations: Array.isArray(profile.pastCollaborations)
        ? profile.pastCollaborations
        : [],
      onboardingStep:
        profile.onboardingStep != null ? Number(profile.onboardingStep) : null,
      isProfileComplete:
        profile.isProfileComplete != null ? !!profile.isProfileComplete : null,
      onboardingCompleted:
        profile.onboardingCompleted != null ? !!profile.onboardingCompleted : null,
    };
  }

  function toBusinessApiProfile(profile) {
    if (!profile) return null;
    const slug = resolveBusinessPublicSlug(profile);
    const businessUsername =
      normalizeUsername(profile.businessUsername || profile.username) || null;
    return {
      userId: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      phoneVerified: !!profile.phoneVerified,
      phoneVerifiedAt: profile.phoneVerifiedAt || null,
      otpVerifiedBy: profile.otpVerifiedBy || null,
      companyName: profile.companyName,
      businessType: profile.businessType,
      industry: profile.industry,
      gstNumber: profile.gstNumber,
      website: profile.website,
      marketingBudget: profile.marketingBudget,
      registeredAddress: profile.registeredAddress,
      city: profile.city || null,
      state: profile.state || null,
      location: profile.location || null,
      collabPreferences: Array.isArray(profile.collabPreferences)
        ? profile.collabPreferences
        : [],
      approvalStatus: profile.approvalStatus || null,
      instagramHandle: profile.instagramHandle,
      facebookHandle: profile.facebookHandle,
      linkedinHandle: profile.linkedinHandle,
      businessUsername,
      username: businessUsername,
      profileSlug: slug,
      profileUrl: slug ? publicBusinessUrl(slug) : null,
      publicPath: slug ? `influnet/${slug}` : null,
      usernameChangedAt: profile.businessUsernameChangedAt || profile.usernameChangedAt || null,
      tagline: profile.tagline || null,
      companyDescription: profile.companyDescription || null,
      logoUrl: profile.logoUrl || null,
      coverImageUrl: profile.coverImageUrl || null,
      preferredCreatorNiches: Array.isArray(profile.preferredCreatorNiches)
        ? profile.preferredCreatorNiches
        : [],
      targetAudience:
        profile.targetAudience && typeof profile.targetAudience === "object"
          ? profile.targetAudience
          : {},
      pastCampaigns: Array.isArray(profile.pastCampaigns) ? profile.pastCampaigns : [],
      isVerified: profile.approvalStatus === "approved",
    };
  }

  async function resolveUser(authUser) {
    const meta = mapUser(authUser);
    if (await checkTables()) {
      const fromDb = await loadProfileFromDb(authUser.id);
      if (fromDb) {
        const profileHints = {
          hasBusinessProfile: fromDb.hasBusinessProfile,
          hasInfluencerProfile: fromDb.hasInfluencerProfile,
        };
        const metaRole = normalizeUserRole(authUser.user_metadata?.role, profileHints);
        let finalRole =
          metaRole ||
          normalizeUserRole(fromDb.role, profileHints) ||
          fromDb.role;
        if (
          !metaRole &&
          profileHints.hasBusinessProfile &&
          !profileHints.hasInfluencerProfile
        ) {
          finalRole = "business_owner";
        } else if (
          !metaRole &&
          profileHints.hasInfluencerProfile &&
          !profileHints.hasBusinessProfile
        ) {
          finalRole = "influencer";
        }
        if (finalRole && fromDb.role !== finalRole) {
          const sb = await ensureClient();
          const { error } = await sb
            .from("profiles")
            .update({ role: finalRole })
            .eq("id", authUser.id);
          if (!error) fromDb.role = finalRole;
        }
        const { hasInfluencerProfile, hasBusinessProfile, ...profile } = fromDb;
        const merged = { ...meta };
        for (const [key, val] of Object.entries(profile)) {
          merged[key] = pickDbOrMeta(val, meta[key]);
        }
        return {
          ...merged,
          role: finalRole || fromDb.role,
          businessType: pickDbOrMeta(fromDb.businessType, meta.businessType),
          marketingBudget: pickDbOrMeta(fromDb.marketingBudget, meta.marketingBudget),
          registeredAddress: pickDbOrMeta(fromDb.registeredAddress, meta.registeredAddress),
          city: pickDbOrMeta(fromDb.city, meta.city),
          state: pickDbOrMeta(fromDb.state, meta.state),
          instagramHandle: pickDbOrMeta(fromDb.instagramHandle, meta.instagramHandle),
          facebookHandle: pickDbOrMeta(fromDb.facebookHandle, meta.facebookHandle),
          linkedinHandle: sanitizeLinkedInHandle(
            pickDbOrMeta(fromDb.linkedinHandle, meta.linkedinHandle)
          ),
          phoneVerified: pickDbOrMeta(fromDb.phoneVerified, meta.phoneVerified) ?? false,
          phoneVerifiedAt: pickDbOrMeta(fromDb.phoneVerifiedAt, meta.phoneVerifiedAt),
          otpVerifiedBy: pickDbOrMeta(fromDb.otpVerifiedBy, meta.otpVerifiedBy),
          instagramFollowers:
            merged.instagramFollowers ?? meta.instagramFollowers ?? 0,
          youtubeSubscribers:
            merged.youtubeSubscribers ?? meta.youtubeSubscribers ?? 0,
          tiktokFollowers: merged.tiktokFollowers ?? meta.tiktokFollowers ?? 0,
          facebookFollowers:
            merged.facebookFollowers ?? meta.facebookFollowers ?? 0,
        };
      }
    }
    return meta;
  }

  async function getSessionUser() {
    const synced = await syncSessionFromStorage();
    if (synced?.user) return synced;
    return sessionFromStoredJwt();
  }

  function jsonResponse(body, status) {
    return new Response(JSON.stringify(body), {
      status: status || 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  function empty204() {
    return new Response(null, { status: 204 });
  }

  function parseApi(url) {
    try {
      const u = new URL(url, window.location.origin);
      if (!u.pathname.startsWith("/api/")) return null;
      return {
        pathname: u.pathname,
        search: u.searchParams,
      };
    } catch {
      return null;
    }
  }

  const PHONE_OTP_TEMPLATE = "Login_Verification_OTP";

  function normalizeIndianPhone(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return null;
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
    if (digits.length === 12 && digits.startsWith("91")) return digits;
    if (digits.length >= 10 && digits.length <= 15) return digits;
    return null;
  }

  function formatDisplayPhone(e164) {
    const n = normalizeIndianPhone(e164);
    if (!n) return String(e164 || "").trim() || null;
    if (n.length === 12 && n.startsWith("91")) return `+91 ${n.slice(2)}`;
    return `+${n}`;
  }

  function phonesMatch(a, b) {
    const na = normalizeIndianPhone(a);
    const nb = normalizeIndianPhone(b);
    return !!(na && nb && na === nb);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  async function invokeAuthSignupEdge(payload) {
    const base =
      cfg.authSignupFunctionUrl ||
      `${String(cfg.url || "").replace(/\/$/, "")}/functions/v1/auth-signup`;
    const res = await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function invokePhoneOtpEdge(payload) {
    const base =
      cfg.phoneOtpFunctionUrl ||
      `${String(cfg.url || "").replace(/\/$/, "")}/functions/v1/phone-otp`;
    let res;
    try {
      res = await fetch(base, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.key}`,
          apikey: cfg.key,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("[influnet] phone-otp edge unreachable:", err?.message || err);
      return {
        res: { ok: false, status: 0 },
        data: {
          error:
            "OTP service is unreachable. Deploy the phone-otp Edge Function in Supabase and set TWOFACTOR_API_KEY (see docs/PHONE_OTP_SETUP.md).",
          reason: "edge_unreachable",
        },
      };
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) {
      return {
        res: { ok: false, status: 404 },
        data: {
          error:
            "OTP service not deployed. In Supabase Dashboard → Edge Functions, deploy phone-otp (index.ts) and add the TWOFACTOR_API_KEY secret.",
          reason: "not_deployed",
          ...(typeof data === "object" ? data : {}),
        },
      };
    }
    return { res, data };
  }

  async function sendPhoneOtp(body) {
    const phone = String(body.phone || "").trim();
    if (!normalizeIndianPhone(phone)) {
      return jsonResponse({ error: "Enter a valid 10-digit mobile number." }, 400);
    }
    const session = await getSessionUser();
    const purpose = body.purpose || "signup";
    if (purpose === "password_reset") {
      if (!session?.user) {
        return jsonResponse({ error: "Not authenticated" }, 401);
      }
      const profile = await resolveUser(session.user);
      if (!profile?.phone || !phonesMatch(profile.phone, phone)) {
        return jsonResponse(
          { error: "Enter the mobile number registered on your account." },
          400
        );
      }
    }
    const { res, data } = await invokePhoneOtpEdge({
      action: "send",
      phone,
      purpose,
      userId: session?.user?.id || body.userId || null,
    });
    if (!res.ok) {
      const status = res.status === 429 ? 429 : res.status || 502;
      const friendly =
        status === 429 && data.reason === "cooldown"
          ? `Please wait ${data.retryAfterSec || 30} seconds before requesting another code.`
          : status === 429
            ? data.error || "Too many OTP requests. Please wait before trying again."
            : data.error ||
              "Could not send OTP. Deploy the phone-otp Edge Function and set TWOFACTOR_API_KEY.";
      return jsonResponse(
        {
          error: friendly,
          reason: data.reason || (status === 429 ? "rate_limited" : null),
          retryAfterSec: data.retryAfterSec || (status === 429 ? 60 : null),
        },
        status
      );
    }
    return jsonResponse({
      ok: true,
      status: "otp_sent",
      providerSessionId: data.providerSessionId,
      sessionId: data.sessionId,
      phoneE164: data.phoneE164,
      expiresAt: data.expiresAt,
      resendAfterSec: data.resendAfterSec || 30,
    });
  }

  async function verifyPhoneOtp(body) {
    const phone = String(body.phone || "").trim();
    const otp = String(body.otp || "").replace(/\D/g, "");
    const providerSessionId = String(
      body.providerSessionId || body.sessionId || ""
    ).trim();
    if (!normalizeIndianPhone(phone)) {
      return jsonResponse({ error: "Enter a valid mobile number." }, 400);
    }
    if (!providerSessionId) {
      return jsonResponse({ error: "Send a verification code first." }, 400);
    }
    const session = await getSessionUser();
    const { res, data } = await invokePhoneOtpEdge({
      action: "verify",
      phone,
      otp,
      providerSessionId,
      userId: session?.user?.id || body.userId || null,
    });
    if (!res.ok) {
      return jsonResponse(
        {
          error: data.error || "Verification failed.",
          status: data.status || "failed",
          attemptsRemaining: data.attemptsRemaining ?? null,
        },
        res.status || 400
      );
    }
    return jsonResponse({
      ok: true,
      status: "verified",
      verified: true,
      verificationToken: data.verificationToken,
      phoneE164: data.phoneE164,
      providerSessionId: data.providerSessionId,
    });
  }

  async function assertPhoneVerifiedForSignup(phone, verificationToken) {
    if (!(await checkTables())) {
      return { ok: false, error: "Phone verification requires database migration 022." };
    }
    const sb = await ensureClient();
    const token = verificationToken ? String(verificationToken).trim() : "";
    if (!token) {
      return { ok: false, error: "Verify your mobile number before continuing." };
    }
    const { data, error } = await sb.rpc("validate_phone_verification_token", {
      p_token: token,
      p_phone: phone,
    });
    if (error) {
      console.warn("[influnet] validate_phone_verification_token:", error.message);
      return { ok: false, error: "Phone verification could not be confirmed." };
    }
    if (!data?.ok) {
      return {
        ok: false,
        error: "Mobile verification expired. Send and verify OTP again.",
      };
    }
    return { ok: true, phoneE164: data.phoneE164 };
  }

  async function applyVerifiedPhoneToProfile(userId, phone) {
    if (!userId || !(await checkTables())) return;
    const sb = await ensureClient();
    const { error } = await sb.rpc("mark_profile_phone_verified", {
      p_user_id: userId,
      p_phone: phone,
      p_provider: "2factor",
    });
    if (error) {
      console.warn("[influnet] mark_profile_phone_verified:", error.message);
    }
  }

  async function resetPhoneVerificationIfChanged(userId, prevPhone, nextPhone) {
    if (!userId || !(await checkTables())) return;
    if (!nextPhone || phonesMatch(prevPhone, nextPhone)) return;
    const sb = await ensureClient();
    const { error } = await sb.rpc("reset_profile_phone_verification", {
      p_user_id: userId,
    });
    if (error) {
      console.warn("[influnet] reset_profile_phone_verification:", error.message);
    }
  }

  async function syncPhoneAuthMetadata(userId) {
    if (!userId || !(await checkTables())) return;
    const sb = await ensureClient();
    const { data } = await sb
      .from("profiles")
      .select("phone, phone_verified, phone_verified_at, otp_verified_by")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return;
    const { error } = await sb.auth.updateUser({
      data: {
        phone: data.phone,
        phoneVerified: !!data.phone_verified,
        phoneVerifiedAt: data.phone_verified_at,
        otpVerifiedBy: data.otp_verified_by,
      },
    });
    if (error) {
      console.warn("[influnet] syncPhoneAuthMetadata:", error.message);
    }
  }

  async function sendEmailOtp(body) {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!email) return jsonResponse({ error: "Email is required" }, 400);

    const sb = await ensureClient();
    const password = body.password;

    if (DUMMY_OTP_ENABLED) {
      if (password) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return jsonResponse({ error: error.message }, 400);
        sessionStorage.setItem(dummyOtpPasswordKey(email), password);
        await sb.auth.signOut();
        localStorage.removeItem("influnet_token");
        localStorage.removeItem("influnet_refresh_token");
        localStorage.removeItem("influnet_user");
      }
      showToast(`Demo OTP mode: use ${DUMMY_OTP_CODE}`, "ok");
      return jsonResponse({ ok: true, dummyOtp: DUMMY_OTP_CODE });
    }

    if (password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return jsonResponse({ error: error.message }, 400);
      await sb.auth.signOut();
      localStorage.removeItem("influnet_token");
      localStorage.removeItem("influnet_refresh_token");
      localStorage.removeItem("influnet_user");
    }

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: body.purpose === "signup",
      },
    });
    if (error) {
      showToast(error.message);
      return jsonResponse({ error: error.message }, 400);
    }
    showToast("Verification code sent to your email.", "ok");
    return jsonResponse({ ok: true });
  }

  async function verifyEmailOtp(body) {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const token = String(body.token || "").trim();
    if (!email) {
      return jsonResponse({ error: "Email is required" }, 400);
    }

    if (DUMMY_OTP_ENABLED && body.purpose === "signup") {
      sessionStorage.setItem(`influnet_email_verified:${email}`, String(Date.now()));
      return jsonResponse({ verified: true });
    }

    if (!token) {
      return jsonResponse({ error: "Email and verification code are required" }, 400);
    }

    if (DUMMY_OTP_ENABLED) {
      const validDummy =
        token === DUMMY_OTP_CODE || token === DUMMY_OTP_CODE.slice(0, 6);
      if (!validDummy) {
        return jsonResponse({ error: "Invalid OTP code" }, 400);
      }

      if (body.purpose === "signup") {
        sessionStorage.setItem(`influnet_email_verified:${email}`, String(Date.now()));
        return jsonResponse({ verified: true });
      }

      const sb = await ensureClient();
      const password = sessionStorage.getItem(dummyOtpPasswordKey(email));
      if (!password) {
        return jsonResponse(
          { error: "OTP expired. Please click Send OTP again." },
          400
        );
      }

      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return jsonResponse({ error: error.message }, 400);
      sessionStorage.removeItem(dummyOtpPasswordKey(email));

      persistSession(data.session);
      if (await checkTables()) await ensureOwnProfileInDb();
      const user = await resolveUser(data.user);
      syncStoredUser(user, data.session.access_token);
      return jsonResponse({ user, token: data.session.access_token });
    }

    const sb = await ensureClient();
    const { data, error } = await sb.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) return jsonResponse({ error: error.message }, 400);

    if (body.purpose === "signup") {
      sessionStorage.setItem(`influnet_email_verified:${email}`, String(Date.now()));
      await sb.auth.signOut();
      localStorage.removeItem("influnet_token");
      localStorage.removeItem("influnet_refresh_token");
      return jsonResponse({ verified: true });
    }

    persistSession(data.session);
    if (await checkTables()) await ensureOwnProfileInDb();
    const user = await resolveUser(data.user);
    const blocked = await blockPendingBusinessAccess(user);
    if (blocked) return blocked;
    syncStoredUser(user, data.session.access_token);
    return jsonResponse({ user, token: data.session.access_token });
  }

  async function handleAuth(action, method, body) {
    if (action === "send-otp" && method === "POST") {
      return sendEmailOtp(body);
    }
    if (action === "verify-otp" && method === "POST") {
      return verifyEmailOtp(body);
    }
    if (action === "login" && method === "POST") {
      const sb = await ensureClient();
      const { data, error } = await sb.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (error) return jsonResponse({ error: error.message }, 400);
      persistSession(data.session);
      if (await checkTables()) await ensureOwnProfileInDb();
      const user = await resolveUser(data.user);
      const blocked = await blockPendingBusinessAccess(user);
      if (blocked) return blocked;
      syncStoredUser(user, data.session.access_token);
      return jsonResponse({
        user,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });
    }
    if (action === "register" && method === "POST") {
      const sb = await ensureClient();
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const password = String(body.password || "");
      const { email: _ignoredEmail, password: _ignoredPw, ...meta } = body;

      if (!isValidEmail(email)) {
        return jsonResponse({ error: "Enter a valid email address." }, 400);
      }
      if (!password || password.length < 6) {
        return jsonResponse({ error: "Password must be at least 6 characters." }, 400);
      }

      const phoneCheck = await assertPhoneVerifiedForSignup(
        body.phone,
        body.phoneVerificationToken
      );
      if (!phoneCheck.ok) {
        return jsonResponse({ error: phoneCheck.error }, 400);
      }
      if (body.phone) {
        body.phone = formatDisplayPhone(body.phone) || body.phone;
      }
      body.email = email;

      async function completeRegistration(authData, opts = {}) {
        const skipRegisterRpc = !!opts.skipRegisterRpc;
        const skipPhoneVerify = !!opts.skipPhoneVerify;
        const signupRole =
          normalizeUserRole(body.role) === "influencer" ? "influencer" : "business_owner";
        const isBusinessSignup = signupRole === "business_owner";
        let progressiveInfluencerSignup = false;

        if (!skipRegisterRpc && (await checkTables())) {
          const signupPayload = {
            ...body,
            role: signupRole,
            approvalStatus: isBusinessSignup ? "pending_review" : undefined,
            extraSocialLinks: parseExtraSocialLinks(body.extraSocialLinks),
          };
          const socialErrors = normalizeSignupSocialFields(signupPayload);
          if (socialErrors.length) {
            return jsonResponse({ error: socialErrors[0] }, 400);
          }
          if (signupRole === "influencer") {
            const u = normalizeUsername(body.username);
            if (!isValidUsername(u)) {
              return jsonResponse(
                {
                  error:
                    "Choose a valid Influnet username (3–30 characters, lowercase letters, numbers, underscore, dot).",
                },
                400
              );
            }
            const avail = await isUsernameAvailable(u);
            if (!avail.available) {
              return jsonResponse(
                {
                  error: "This username is already taken. Try another.",
                  suggestions: avail.suggestions || [],
                },
                400
              );
            }
            signupPayload.username = u;
            signupPayload.progressiveSignup = true;
            progressiveInfluencerSignup = true;
          }
          if (isBusinessSignup) {
            const bu =
              normalizeUsername(body.businessUsername || body.username) || null;
            if (bu) {
              if (!isValidUsername(bu)) {
                return jsonResponse(
                  {
                    error:
                      "Choose a valid business username (3–30 characters, lowercase letters, numbers, underscore, dot).",
                  },
                  400
                );
              }
              const avail = await isUsernameAvailable(bu);
              if (!avail.available) {
                return jsonResponse(
                  {
                    error: "This business username is already taken. Try another.",
                    suggestions: avail.suggestions || [],
                  },
                  400
                );
              }
              signupPayload.businessUsername = bu;
            }
          }
          const { error: rpcError } = await sb.rpc("register_profile", {
            payload: signupPayload,
          });
          if (rpcError) {
            console.warn("[influnet] register_profile:", rpcError.message);
            showToast(
              "Account created but profile was not saved to the database. Run migration 001 in Supabase, then log in again."
            );
          } else {
            const { error: roleErr } = await sb
              .from("profiles")
              .update({ role: signupRole })
              .eq("id", authData.user.id);
            if (roleErr) {
              console.warn("[influnet] profiles role sync:", roleErr.message);
            }
            if (isBusinessSignup) {
              const { error: approvalErr } = await sb
                .from("business_profiles")
                .upsert(
                  {
                    user_id: authData.user.id,
                    approval_status: "pending_review",
                  },
                  { onConflict: "user_id" }
                );
              if (approvalErr) {
                console.warn(
                  "[influnet] business approval_status:",
                  approvalErr.message
                );
              }
            }
          }
        }

        if (!skipPhoneVerify) {
          await applyVerifiedPhoneToProfile(authData.user.id, body.phone);
        }

        const signupMeta = {
          ...meta,
          role: signupRole,
          email,
          emailVerified: false,
          phoneVerified: true,
          phoneVerifiedAt: new Date().toISOString(),
          otpVerifiedBy: "2factor",
          ...(isBusinessSignup
            ? {
                approvalStatus: "pending_review",
                businessType: body.businessType ?? meta.businessType ?? null,
                marketingBudget: body.marketingBudget ?? meta.marketingBudget ?? null,
                registeredAddress: body.registeredAddress ?? meta.registeredAddress ?? null,
                city: body.city ?? meta.city ?? null,
                state: body.state ?? meta.state ?? null,
                instagramHandle: body.instagramHandle ?? meta.instagramHandle ?? null,
                facebookHandle: body.facebookHandle ?? meta.facebookHandle ?? null,
                linkedinHandle: body.linkedinHandle ?? meta.linkedinHandle ?? null,
                businessUsername:
                  normalizeUsername(body.businessUsername || body.username) || null,
              }
            : {}),
        };
        await sb.auth.updateUser({ data: signupMeta });

        if (isBusinessSignup) {
          persistSession(authData.session);
          if (await checkTables()) await ensureOwnProfileInDb();
          const user = await resolveUser(authData.user);
          syncStoredUser(user, authData.session.access_token);
          return jsonResponse({
            user,
            token: authData.session.access_token,
            refreshToken: authData.session.refresh_token,
            approvalPending: user?.approvalStatus === "pending_review",
            message: BUSINESS_PENDING_REVIEW_MESSAGE,
          });
        }

        persistSession(authData.session);
        if (await checkTables()) await ensureOwnProfileInDb();
        const user = await resolveUser(authData.user);
        syncStoredUser(user, authData.session.access_token);
        if (progressiveInfluencerSignup) {
          localStorage.setItem(PROGRESSIVE_SETUP_KEY, "1");
        }
        if (signupRole === "influencer" && !progressiveInfluencerSignup) {
          await syncInfluencerOnboardingFlags(authData.user.id, user);
        }
        return jsonResponse({ user, token: authData.session.access_token });
      }

      const signupRole =
        normalizeUserRole(body.role) === "influencer" ? "influencer" : "business_owner";

      const isBusinessSignup = signupRole === "business_owner";

      if (signupRole === "influencer") {
        const u = normalizeUsername(body.username);
        if (!isValidUsername(u)) {
          return jsonResponse(
            {
              error:
                "Choose a valid Influnet username (3–30 characters, lowercase letters, numbers, underscore, dot).",
            },
            400
          );
        }
        const avail = await isUsernameAvailable(u);
        if (!avail.available) {
          return jsonResponse(
            {
              error: "This username is already taken. Try another.",
              suggestions: avail.suggestions || [],
            },
            400
          );
        }
        body.username = u;
      }

      if (isBusinessSignup) {
        const bu =
          normalizeUsername(body.businessUsername || body.username) || null;
        if (bu) {
          if (!isValidUsername(bu)) {
            return jsonResponse(
              {
                error:
                  "Choose a valid business username (3–30 characters, lowercase letters, numbers, underscore, dot).",
              },
              400
            );
          }
          const avail = await isUsernameAvailable(bu);
          if (!avail.available) {
            return jsonResponse(
              {
                error: "This business username is already taken. Try another.",
                suggestions: avail.suggestions || [],
              },
              400
            );
          }
          body.businessUsername = bu;
        }
      }

      async function signInAfterCreate(signupMeta, completeOpts) {
        const login = await sb.auth.signInWithPassword({ email, password });
        if (!login.error && login.data?.session) {
          await sb.auth.updateUser({ data: signupMeta });
          return completeRegistration(login.data, completeOpts);
        }
        const loginMsg = login.error?.message || "";
        if (/already|registered|exists/i.test(loginMsg)) {
          return jsonResponse(
            {
              error:
                "This email is already registered. Sign in with your existing password, or use a different email.",
            },
            400
          );
        }
        return jsonResponse(
          {
            error:
              loginMsg ||
              "Account created but sign-in failed. Try logging in with your email and password.",
          },
          400
        );
      }

      const signupMeta = {
        ...meta,
        role: signupRole,
        email,
        emailVerified: false,
      };

      const edgePayload = {
        ...body,
        email,
        password,
        role: signupRole,
        extraSocialLinks: parseExtraSocialLinks(body.extraSocialLinks),
      };
      const { res: edgeRes, data: edgeData } = await invokeAuthSignupEdge(edgePayload);

      if (edgeRes.ok) {
        return signInAfterCreate(signupMeta, {});
      }

      if (edgeData?.reason === "email_exists" || edgeRes.status === 409) {
        return jsonResponse(
          {
            error:
              "This email is already registered. Sign in with your existing password, or use a different email.",
          },
          400
        );
      }

      if (edgeRes.status !== 404 && edgeRes.status !== 502 && edgeData?.error) {
        console.warn("[influnet] auth-signup edge:", edgeData.error);
      }

      const signup = await sb.auth.signUp({
        email,
        password,
        options: { data: signupMeta },
      });

      if (signup.error && /already|registered|exists/i.test(signup.error.message)) {
        return jsonResponse(
          {
            error:
              "This email is already registered. Sign in with your existing password, or use a different email.",
          },
          400
        );
      }
      if (signup.error && !/rate limit/i.test(signup.error.message)) {
        return jsonResponse({ error: signup.error.message }, 400);
      }

      if (signup.data?.session) {
        await sb.auth.updateUser({ data: signupMeta });
        return completeRegistration(signup.data);
      }

      return signInAfterCreate(signupMeta, {});
    }
    if (action === "logout" && method === "POST") {
      const sb = await ensureClient();
      await sb.auth.signOut();
      localStorage.removeItem("influnet_token");
      localStorage.removeItem("influnet_refresh_token");
      localStorage.removeItem("influnet_user");
      return empty204();
    }
    if (action === "me" && method === "GET") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      if (await checkTables()) await ensureOwnProfileInDb();
      const user = await resolveUser(session.user);
      const blocked = await blockPendingBusinessAccess(user);
      if (blocked) return blocked;
      syncStoredUser(user, session.access_token);
      return jsonResponse({ user, token: session.access_token });
    }
    if (action === "me" && method === "PATCH") {
      return updateCurrentUserProfile(body);
    }
    if (action === "change-password" && method === "POST") {
      return changePassword(body);
    }
    if (action === "forgot-password" && method === "POST") {
      return forgotPassword(body);
    }
    if (action === "reset-password" && method === "POST") {
      return resetPasswordFromRecovery(body);
    }
    if (action === "update-email" && method === "POST") {
      return updateUserEmail(body);
    }
    return null;
  }

  async function forgotPassword(body) {
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!email) return jsonResponse({ error: "Email is required" }, 400);

    const sb = await ensureClient();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      showToast(error.message);
      return jsonResponse({ error: error.message }, 400);
    }
    showToast("Password reset link sent. Check your email.", "ok");
    return jsonResponse({
      ok: true,
      message: "If an account exists for this email, a reset link has been sent.",
    });
  }

  async function resetPasswordFromRecovery(body) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse(
        { error: "Reset link expired or invalid. Request a new password reset." },
        401
      );
    }

    const password = String(body.password || "");
    const confirm = String(body.confirmPassword || body.confirm || "");
    if (password.length < 6) {
      return jsonResponse({ error: "Password must be at least 6 characters" }, 400);
    }
    if (confirm && password !== confirm) {
      return jsonResponse({ error: "Passwords do not match" }, 400);
    }

    const sb = await ensureClient();
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      showToast(error.message);
      return jsonResponse({ error: error.message }, 400);
    }

    showToast("Password updated. You can sign in now.", "ok");
    return jsonResponse({ ok: true });
  }

  async function updateCurrentUserProfile(body) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    const sb = await ensureClient();
    const uid = session.user.id;
    const prev = session.user.user_metadata || {};
    const role = prev.role || body.role || "business_owner";

    const meta = {
      ...prev,
      role,
      name: body.name != null ? String(body.name).trim() : prev.name,
      phone: body.phone != null ? String(body.phone).trim() : prev.phone,
      location: body.location != null ? String(body.location).trim() : prev.location,
      companyName:
        body.companyName != null ? String(body.companyName).trim() : prev.companyName,
      businessType:
        body.businessType != null ? String(body.businessType).trim() : prev.businessType,
      industry: body.industry != null ? String(body.industry).trim() : prev.industry,
      gstNumber: body.gstNumber != null ? String(body.gstNumber).trim() : prev.gstNumber,
      website: body.website != null ? String(body.website).trim() : prev.website,
      collabPreferences:
        body.collabPreferences != null ? body.collabPreferences : prev.collabPreferences,
      marketingBudget:
        body.marketingBudget != null
          ? String(body.marketingBudget).trim()
          : prev.marketingBudget,
      registeredAddress:
        body.registeredAddress != null
          ? String(body.registeredAddress).trim()
          : prev.registeredAddress,
      city: body.city != null ? String(body.city).trim() : prev.city,
      state: body.state != null ? String(body.state).trim() : prev.state,
      bio: body.bio != null ? String(body.bio) : prev.bio,
      instagramHandle:
        body.instagramHandle != null ? String(body.instagramHandle).trim() : prev.instagramHandle,
      facebookHandle:
        body.facebookHandle != null
          ? String(body.facebookHandle).trim()
          : prev.facebookHandle,
      linkedinHandle:
        body.linkedinHandle != null
          ? String(body.linkedinHandle).trim()
          : prev.linkedinHandle,
      youtubeHandle:
        body.youtubeHandle != null ? String(body.youtubeHandle).trim() : prev.youtubeHandle,
      twitterHandle:
        body.twitterHandle != null ? String(body.twitterHandle).trim() : prev.twitterHandle,
    };

    const { data: authData, error: authErr } = await sb.auth.updateUser({ data: meta });
    if (authErr) {
      showToast(authErr.message);
      return jsonResponse({ error: authErr.message }, 400);
    }

    if (await checkTables()) {
      await ensureOwnProfileInDb();
      const location =
        meta.city && meta.state
          ? `${meta.city}, ${meta.state}`
          : meta.location || null;
      const profileRow = {
        name: meta.name,
        phone: meta.phone || null,
        location,
      };
      if (body.phone != null && !phonesMatch(prev.phone, body.phone)) {
        if (body.phoneVerificationToken) {
          const v = await assertPhoneVerifiedForSignup(
            body.phone,
            body.phoneVerificationToken
          );
          if (!v.ok) {
            return jsonResponse({ error: v.error }, 400);
          }
          profileRow.phone = formatDisplayPhone(body.phone) || meta.phone;
        } else {
          await resetPhoneVerificationIfChanged(uid, prev.phone, body.phone);
          profileRow.phone_verified = false;
          profileRow.phone_verified_at = null;
          profileRow.otp_verified_by = null;
        }
      }
      await sb.from("profiles").update(profileRow).eq("id", uid);
      if (body.phoneVerificationToken && body.phone != null) {
        await applyVerifiedPhoneToProfile(uid, body.phone);
      }
      if (body.phone != null) {
        await syncPhoneAuthMetadata(uid);
      }
      if (role === "business_owner") {
        const collabPrefs =
          body.collabPreferences != null
            ? body.collabPreferences
            : meta.collabPreferences || [];
        await sb.from("business_profiles").upsert(
          {
            user_id: uid,
            company_name: meta.companyName || null,
            business_type: meta.businessType || null,
            industry: meta.industry || null,
            gst_number: meta.gstNumber || null,
            website: meta.website || null,
            marketing_budget: meta.marketingBudget || null,
            registered_address: meta.registeredAddress || null,
            city: meta.city || null,
            state: meta.state || null,
            instagram_handle: meta.instagramHandle || null,
            facebook_handle: meta.facebookHandle || null,
            linkedin_handle: meta.linkedinHandle || null,
            collab_preferences: Array.isArray(collabPrefs) ? collabPrefs : [],
          },
          { onConflict: "user_id" }
        );
      } else if (role === "influencer") {
        let niche = prev.niche;
        if (body.niche != null) {
          niche = Array.isArray(body.niche) ? body.niche : [String(body.niche)];
        }
        await sb.from("influencer_profiles").upsert(
          {
            user_id: uid,
            bio: meta.bio || null,
            niche: normalizeNiche(niche),
            instagram_handle: meta.instagramHandle || null,
            youtube_handle: meta.youtubeHandle || null,
            twitter_handle: meta.twitterHandle || null,
          },
          { onConflict: "user_id" }
        );
      }
    }

    const user = await resolveUser(authData.user);
    const refreshed = await getSessionUser();
    if (refreshed) persistSession(refreshed);
    syncStoredUser(user, refreshed?.access_token || session.access_token);
    showToast("Profile updated.", "ok");
    return jsonResponse({
      user,
      token: refreshed?.access_token || session.access_token,
    });
  }

  async function updateInfluencerProfileMe(body) {
    if (
      body?.data &&
      typeof body.data === "object" &&
      body.bio === undefined &&
      body.niche === undefined
    ) {
      body = body.data;
    }
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const sb = await ensureClient();
    const uid = session.user.id;
    const prev = (await resolveUser(session.user)) || mapUser(session.user);
    const prevMeta = session.user.user_metadata || {};

    if (body.markOnboardingCompleted === true) {
      const { error: markErr } = await sb.from("influencer_profiles").upsert(
        {
          user_id: uid,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (markErr) {
        const msg = markErr.message || "Could not update onboarding status";
        showToast(msg);
        return jsonResponse({ error: msg }, 400);
      }
      const user = await resolveUser(session.user);
      const refreshed = await getSessionUser();
      if (refreshed) persistSession(refreshed);
      syncStoredUser(user, refreshed?.access_token || session.access_token);
      return jsonResponse(toInfluencerApiProfile(user));
    }

    const prevOnboardingStep = Math.max(2, Number(prev.onboardingStep) || 2);
    const isProgressiveStep2Save =
      prevOnboardingStep <= 2 &&
      body.niche != null &&
      body.languages == null &&
      body.bio == null &&
      body.city == null &&
      body.state == null &&
      body.location == null;
    const isProgressiveStep3Save =
      prevOnboardingStep <= 3 &&
      (body.languages != null ||
        body.bio != null ||
        body.city != null ||
        body.state != null ||
        body.location != null) &&
      body.collabTypes == null &&
      body.priceRange == null;

    const socialFieldError = (() => {
      const fields = [
        ["instagramHandle", "instagram"],
        ["facebookHandle", "facebook"],
        ["youtubeHandle", "youtube"],
        ["linkedinHandle", "linkedin"],
        ["tiktokHandle", "tiktok"],
        ["twitterHandle", "twitter"],
      ];
      for (const [key, platform] of fields) {
        if (body[key] == null) continue;
        const trimmed = String(body[key]).trim();
        if (!trimmed) continue;
        if (!normalizeSocialProfileForStorage(platform, trimmed)) {
          return `Invalid ${platform} profile link`;
        }
      }
      return null;
    })();
    if (socialFieldError) {
      showToast(socialFieldError);
      return jsonResponse({ error: socialFieldError }, 400);
    }

    const niche =
      body.niche != null
        ? Array.isArray(body.niche)
          ? body.niche.filter(Boolean).map(String)
          : [String(body.niche)]
        : normalizeNiche(prev.niche ?? prevMeta.niche);

    const secondaryCategories =
      body.secondaryCategories != null || body.secondary_categories != null
        ? normalizeSecondaryCategories(
            body.secondaryCategories != null
              ? body.secondaryCategories
              : body.secondary_categories
          )
        : normalizeSecondaryCategories(
            prev.secondaryCategories ?? prevMeta.secondaryCategories
          );

    const primaryNiche = niche[0] || null;
    const filteredSecondary = primaryNiche
      ? secondaryCategories.filter((c) => c !== primaryNiche).slice(0, 4)
      : secondaryCategories.slice(0, 4);

    const extraSocialLinks = parseExtraSocialLinks(
      body.extraSocialLinks != null ? body.extraSocialLinks : prev.extraSocialLinks
    );

    const locParts = isProgressiveStep2Save
      ? { city: "", state: "", location: null }
      : parseLocationParts(
          body.location != null ? body.location : prev.location,
          body.city != null ? body.city : prev.city,
          body.state != null ? body.state : prev.state
        );

    const languages = isProgressiveStep2Save
      ? []
      : body.languages != null
        ? Array.isArray(body.languages)
          ? body.languages.filter(Boolean).map(String)
          : []
        : Array.isArray(prev.languages)
          ? prev.languages
          : Array.isArray(prevMeta.languages)
            ? prevMeta.languages
            : [];

    const collabTypes = isProgressiveStep3Save
      ? []
      : body.collabTypes != null
        ? normalizeCollabTypeIds(
            Array.isArray(body.collabTypes) ? body.collabTypes : []
          )
        : normalizeCollabTypeIds(
            Array.isArray(prev.collabTypes)
              ? prev.collabTypes
              : Array.isArray(prevMeta.collabTypes)
                ? prevMeta.collabTypes
                : []
          );

    const priceRange = isProgressiveStep3Save
      ? null
      : body.priceRange != null
        ? normalizePriceRangeId(body.priceRange)
        : normalizePriceRangeId(prev.priceRange ?? prevMeta.priceRange ?? null);

    const meta = {
      ...prevMeta,
      role: "influencer",
      name:
        body.name != null
          ? String(body.name).trim() || null
          : prev.name ?? prevMeta.name ?? null,
      phone:
        body.phone != null
          ? formatDisplayPhone(body.phone) || String(body.phone).trim()
          : prev.phone ?? prevMeta.phone ?? null,
      bio: isProgressiveStep2Save
        ? null
        : body.bio != null
          ? String(body.bio)
          : prev.bio ?? prevMeta.bio ?? null,
      location: locParts.location,
      city: locParts.city || null,
      state: locParts.state || null,
      gender: body.gender != null ? body.gender : prev.gender ?? prevMeta.gender ?? null,
      niche: primaryNiche ? [primaryNiche] : [],
      secondaryCategories: filteredSecondary,
      languages,
      collabTypes,
      priceRange,
      headline:
        body.headline != null
          ? String(body.headline).trim()
          : prev.headline ?? prevMeta.headline ?? null,
      availabilityStatus:
        body.availabilityStatus != null
          ? String(body.availabilityStatus).trim()
          : prev.availabilityStatus ?? prevMeta.availabilityStatus ?? null,
      audienceDemographics:
        body.audienceDemographics != null
          ? body.audienceDemographics
          : prev.audienceDemographics ?? prevMeta.audienceDemographics ?? {},
      mediaKitUrl:
        body.mediaKitUrl != null
          ? String(body.mediaKitUrl).trim()
          : prev.mediaKitUrl ?? prevMeta.mediaKitUrl ?? null,
      portfolio:
        body.portfolio != null
          ? body.portfolio
          : prev.portfolio ?? prevMeta.portfolio ?? [],
      username:
        body.username != null
          ? normalizeUsername(body.username)
          : prev.username ?? prevMeta.username ?? null,
      tiktokHandle:
        body.tiktokHandle != null
          ? normalizeSocialProfileForStorage("tiktok", body.tiktokHandle)
          : prev.tiktokHandle ?? prevMeta.tiktokHandle ?? null,
      instagramHandle:
        body.instagramHandle != null
          ? normalizeSocialProfileForStorage("instagram", body.instagramHandle)
          : prev.instagramHandle ?? prevMeta.instagramHandle ?? null,
      facebookHandle:
        body.facebookHandle != null
          ? normalizeSocialProfileForStorage("facebook", body.facebookHandle)
          : prev.facebookHandle ?? prevMeta.facebookHandle ?? null,
      youtubeHandle:
        body.youtubeHandle != null
          ? normalizeSocialProfileForStorage("youtube", body.youtubeHandle)
          : prev.youtubeHandle ?? prevMeta.youtubeHandle ?? null,
      linkedinHandle:
        body.linkedinHandle != null
          ? normalizeSocialProfileForStorage("linkedin", body.linkedinHandle)
          : prev.linkedinHandle ?? prevMeta.linkedinHandle ?? null,
      twitterHandle:
        body.twitterHandle != null
          ? normalizeSocialProfileForStorage("twitter", body.twitterHandle)
          : prev.twitterHandle ?? prevMeta.twitterHandle ?? null,
      extraSocialLinks: formatExtraSocialLinks(extraSocialLinks),
    };

    if (body.instagramFollowers != null) {
      meta.instagramFollowers = Math.max(0, Number(body.instagramFollowers) || 0);
    }
    if (body.facebookFollowers != null) {
      meta.facebookFollowers = Math.max(0, Number(body.facebookFollowers) || 0);
    }
    if (body.youtubeSubscribers != null) {
      meta.youtubeSubscribers = Math.max(0, Number(body.youtubeSubscribers) || 0);
    }
    if (body.tiktokFollowers != null) {
      meta.tiktokFollowers = Math.max(0, Number(body.tiktokFollowers) || 0);
    }

    const { data: authData, error: authErr } = await sb.auth.updateUser({ data: meta });
    if (authErr) {
      showToast(authErr.message);
      return jsonResponse({ error: authErr.message }, 400);
    }

    if (await checkTables()) {
      await ensureOwnProfileInDb();
      const profilePatch = { location: meta.location || null };
      if (body.name != null) {
        profilePatch.name = String(body.name).trim() || null;
      }
      if (body.phone != null) {
        const nextPhone = String(body.phone).trim() || null;
        if (nextPhone && !phonesMatch(prev.phone, nextPhone)) {
          if (body.phoneVerificationToken) {
            const v = await assertPhoneVerifiedForSignup(
              nextPhone,
              body.phoneVerificationToken
            );
            if (!v.ok) {
              return jsonResponse({ error: v.error }, 400);
            }
            profilePatch.phone = formatDisplayPhone(nextPhone) || nextPhone;
          } else {
            await resetPhoneVerificationIfChanged(uid, prev.phone, nextPhone);
            profilePatch.phone = nextPhone;
            profilePatch.phone_verified = false;
            profilePatch.phone_verified_at = null;
            profilePatch.otp_verified_by = null;
          }
        } else if (nextPhone) {
          profilePatch.phone = nextPhone;
        }
      }
      await sb.from("profiles").update(profilePatch).eq("id", uid);
      if (body.phoneVerificationToken && body.phone != null) {
        await applyVerifiedPhoneToProfile(uid, body.phone);
      }
      if (body.phone != null) {
        await syncPhoneAuthMetadata(uid);
      }

      const ipRow = {
        user_id: uid,
        bio: meta.bio || null,
        niche: primaryNiche ? [primaryNiche] : [],
        secondary_categories: filteredSecondary,
        instagram_handle: meta.instagramHandle || null,
        youtube_handle: meta.youtubeHandle || null,
        twitter_handle: meta.twitterHandle || null,
        facebook_handle: meta.facebookHandle || null,
        linkedin_handle: meta.linkedinHandle || null,
        gender: meta.gender || null,
        extra_social_links: extraSocialLinks,
        city: locParts.city || null,
        state: locParts.state || null,
        languages,
        collab_types: collabTypes,
        price_range: priceRange,
      };
      if (body.profileSlug != null) {
        ipRow.profile_slug = String(body.profileSlug).trim() || null;
      }
      if (body.username != null) {
        const nextUsername = normalizeUsername(body.username);
        const currentUsername = normalizeUsername(prev.username);
        if (nextUsername !== currentUsername) {
          if (!isValidUsername(nextUsername)) {
            showToast("Invalid username format.");
            return jsonResponse({ error: "Invalid username format" }, 400);
          }
          const changedAt = prev.usernameChangedAt
            ? new Date(prev.usernameChangedAt).getTime()
            : 0;
          const daysSince =
            changedAt > 0 ? (Date.now() - changedAt) / (1000 * 60 * 60 * 24) : 999;
          if (daysSince < 30) {
            const msg = "You can change your username again in 30 days.";
            showToast(msg);
            return jsonResponse({ error: msg }, 400);
          }
          const avail = await isUsernameAvailable(nextUsername, uid);
          if (!avail.available) {
            showToast("Username already taken.");
            return jsonResponse(
              { error: "Username already taken", suggestions: avail.suggestions || [] },
              400
            );
          }
          ipRow.username = nextUsername;
          ipRow.username_changed_at = new Date().toISOString();
        }
      }
      if (body.avatarUrl != null) {
        ipRow.avatar_url = String(body.avatarUrl).trim() || null;
      }
      if (body.tiktokHandle != null) {
        ipRow.tiktok_handle = normalizeSocialProfileForStorage("tiktok", body.tiktokHandle);
      }
      if (body.instagramFollowers != null) {
        ipRow.instagram_followers = Math.max(0, Number(body.instagramFollowers) || 0);
      }
      if (body.facebookFollowers != null) {
        ipRow.facebook_followers = Math.max(0, Number(body.facebookFollowers) || 0);
      }
      if (body.youtubeSubscribers != null) {
        ipRow.youtube_subscribers = Math.max(0, Number(body.youtubeSubscribers) || 0);
      }
      if (body.tiktokFollowers != null) {
        ipRow.tiktok_followers = Math.max(0, Number(body.tiktokFollowers) || 0);
      }
      if (body.engagementRate != null && body.engagementRate !== "") {
        ipRow.engagement_rate = Number(body.engagementRate);
      }
      if (body.mediaKitUrl != null) {
        ipRow.media_kit_url = String(body.mediaKitUrl).trim() || null;
      }
      if (body.portfolio != null) {
        ipRow.portfolio = Array.isArray(body.portfolio) ? body.portfolio : [];
      }
      if (body.pricingMin != null && body.pricingMin !== "") {
        ipRow.pricing_min = Number(body.pricingMin);
      }
      if (body.pricingMax != null && body.pricingMax !== "") {
        ipRow.pricing_max = Number(body.pricingMax);
      }
      if (priceRange && INFLUENCER_PRICE_RANGES[priceRange]) {
        const band = INFLUENCER_PRICE_RANGES[priceRange];
        if (body.pricingMin == null || body.pricingMin === "") {
          ipRow.pricing_min = band.min;
        }
        if ((body.pricingMax == null || body.pricingMax === "") && band.max != null) {
          ipRow.pricing_max = band.max;
        }
      }
      if (body.headline != null) {
        ipRow.headline = String(body.headline).trim() || null;
      }
      if (body.coverImageUrl != null) {
        ipRow.cover_image_url = String(body.coverImageUrl).trim() || null;
      }
      if (body.availabilityStatus != null) {
        ipRow.availability_status = String(body.availabilityStatus).trim() || null;
      }
      if (body.audienceDemographics != null) {
        ipRow.audience_demographics =
          typeof body.audienceDemographics === "object" ? body.audienceDemographics : {};
      }
      if (body.pastCollaborations != null) {
        ipRow.past_collaborations = Array.isArray(body.pastCollaborations)
          ? body.pastCollaborations
          : [];
      }
      if (body.finalizeProgressiveOnboarding) {
        ipRow.onboarding_step = 5;
        ipRow.onboarding_completed = true;
        ipRow.is_profile_complete = isSignupProfileComplete({
          ...prev,
          ...meta,
          niche: primaryNiche ? [primaryNiche] : [],
          secondaryCategories: filteredSecondary,
          languages,
          collabTypes,
          priceRange,
          city: locParts.city || null,
          state: locParts.state || null,
          location: locParts.location,
          bio: meta.bio,
        });
      }
      const { error: ipErr } = await sb.from("influencer_profiles").upsert(ipRow, {
        onConflict: "user_id",
      });
      if (ipErr) {
        const msg = ipErr.message || "Could not save profile";
        const hint = /column/i.test(msg)
          ? " Run Supabase migrations 021 in Supabase SQL Editor, then try again."
          : "";
        showToast(msg + hint);
        return jsonResponse({ error: msg + hint }, 400);
      }
    }

    const user = await resolveUser(authData.user);
    const refreshed = await getSessionUser();
    if (refreshed) persistSession(refreshed);
    syncStoredUser(user, refreshed?.access_token || session.access_token);
    await syncInfluencerOnboardingFlags(uid, user);
    showToast("Profile saved.", "ok");
    return jsonResponse(toInfluencerApiProfile(user));
  }

  async function updateBusinessProfileMe(body) {
    if (body?.data && typeof body.data === "object") {
      body = body.data;
    }
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const sb = await ensureClient();
    const uid = session.user.id;
    const prev = (await resolveUser(session.user)) || mapUser(session.user);
    const prevMeta = session.user.user_metadata || {};

    const locParts = parseLocationParts(
      body.location != null ? body.location : prev.location,
      body.city != null ? body.city : prev.city,
      body.state != null ? body.state : prev.state
    );

    const meta = {
      ...prevMeta,
      role: "business_owner",
      name: body.name != null ? String(body.name).trim() : prev.name ?? prevMeta.name ?? null,
      phone: body.phone != null ? String(body.phone).trim() : prev.phone ?? prevMeta.phone ?? null,
      location: locParts.location,
      city: locParts.city || null,
      state: locParts.state || null,
      companyName:
        body.companyName != null
          ? String(body.companyName).trim()
          : prev.companyName ?? prevMeta.companyName ?? null,
      businessType:
        body.businessType != null
          ? String(body.businessType).trim()
          : prev.businessType ?? prevMeta.businessType ?? null,
      industry:
        body.industry != null
          ? String(body.industry).trim()
          : prev.industry ?? prevMeta.industry ?? null,
      gstNumber:
        body.gstNumber != null
          ? String(body.gstNumber).trim()
          : prev.gstNumber ?? prevMeta.gstNumber ?? null,
      website:
        body.website != null ? String(body.website).trim() : prev.website ?? prevMeta.website ?? null,
      marketingBudget:
        body.marketingBudget != null
          ? String(body.marketingBudget).trim()
          : prev.marketingBudget ?? prevMeta.marketingBudget ?? null,
      registeredAddress:
        body.registeredAddress != null
          ? String(body.registeredAddress).trim()
          : prev.registeredAddress ?? prevMeta.registeredAddress ?? null,
      instagramHandle:
        body.instagramHandle != null
          ? String(body.instagramHandle).trim()
          : prev.instagramHandle ?? prevMeta.instagramHandle ?? null,
      facebookHandle:
        body.facebookHandle != null
          ? String(body.facebookHandle).trim()
          : prev.facebookHandle ?? prevMeta.facebookHandle ?? null,
      linkedinHandle:
        body.linkedinHandle != null
          ? String(body.linkedinHandle).trim()
          : prev.linkedinHandle ?? prevMeta.linkedinHandle ?? null,
      collabPreferences:
        body.collabPreferences != null
          ? body.collabPreferences
          : prev.collabPreferences ?? prevMeta.collabPreferences ?? [],
      tagline:
        body.tagline != null ? String(body.tagline).trim() : prev.tagline ?? prevMeta.tagline ?? null,
      companyDescription:
        body.companyDescription != null
          ? String(body.companyDescription).trim()
          : prev.companyDescription ?? prevMeta.companyDescription ?? null,
      logoUrl: body.logoUrl != null ? String(body.logoUrl).trim() : prev.logoUrl ?? prevMeta.logoUrl ?? null,
      coverImageUrl:
        body.coverImageUrl != null
          ? String(body.coverImageUrl).trim()
          : prev.coverImageUrl ?? prevMeta.coverImageUrl ?? null,
      preferredCreatorNiches:
        body.preferredCreatorNiches != null
          ? body.preferredCreatorNiches
          : prev.preferredCreatorNiches ?? prevMeta.preferredCreatorNiches ?? [],
      targetAudience:
        body.targetAudience != null
          ? body.targetAudience
          : prev.targetAudience ?? prevMeta.targetAudience ?? {},
      pastCampaigns:
        body.pastCampaigns != null
          ? body.pastCampaigns
          : prev.pastCampaigns ?? prevMeta.pastCampaigns ?? [],
    };

    const { data: authData, error: authErr } = await sb.auth.updateUser({ data: meta });
    if (authErr) {
      showToast(authErr.message);
      return jsonResponse({ error: authErr.message }, 400);
    }

    if (await checkTables()) {
      await ensureOwnProfileInDb();
      const profileRow = {
        name: meta.name,
        phone: meta.phone || null,
        location: meta.location || null,
      };
      if (body.phone != null && !phonesMatch(prev.phone, body.phone)) {
        if (body.phoneVerificationToken) {
          const v = await assertPhoneVerifiedForSignup(
            body.phone,
            body.phoneVerificationToken
          );
          if (!v.ok) {
            return jsonResponse({ error: v.error }, 400);
          }
          profileRow.phone = formatDisplayPhone(body.phone) || meta.phone;
        } else {
          await resetPhoneVerificationIfChanged(uid, prev.phone, body.phone);
          profileRow.phone_verified = false;
          profileRow.phone_verified_at = null;
          profileRow.otp_verified_by = null;
        }
      }
      await sb.from("profiles").update(profileRow).eq("id", uid);
      if (body.phoneVerificationToken && body.phone != null) {
        await applyVerifiedPhoneToProfile(uid, body.phone);
      }
      if (body.phone != null) {
        await syncPhoneAuthMetadata(uid);
      }

      const bpRow = {
        user_id: uid,
        company_name: meta.companyName || null,
        business_type: meta.businessType || null,
        industry: meta.industry || null,
        gst_number: meta.gstNumber || null,
        website: meta.website || null,
        marketing_budget: meta.marketingBudget || null,
        registered_address: meta.registeredAddress || null,
        city: meta.city || null,
        state: meta.state || null,
        instagram_handle: meta.instagramHandle || null,
        facebook_handle: meta.facebookHandle || null,
        linkedin_handle: meta.linkedinHandle || null,
        collab_preferences: Array.isArray(meta.collabPreferences) ? meta.collabPreferences : [],
        tagline: meta.tagline || null,
        company_description: meta.companyDescription || null,
        logo_url: meta.logoUrl || null,
        cover_image_url: meta.coverImageUrl || null,
        preferred_creator_niches: Array.isArray(meta.preferredCreatorNiches)
          ? meta.preferredCreatorNiches
          : [],
        target_audience:
          meta.targetAudience && typeof meta.targetAudience === "object"
            ? meta.targetAudience
            : {},
        past_campaigns: Array.isArray(meta.pastCampaigns) ? meta.pastCampaigns : [],
      };

      const usernameField = body.businessUsername != null ? body.businessUsername : body.username;
      if (usernameField != null) {
        const nextUsername = normalizeUsername(usernameField);
        const currentUsername = normalizeUsername(
          prev.businessUsername || prev.username
        );
        if (nextUsername !== currentUsername) {
          if (!isValidUsername(nextUsername)) {
            return jsonResponse({ error: "Invalid business username format" }, 400);
          }
          const changedAt = prev.businessUsernameChangedAt || prev.usernameChangedAt;
          const changedMs = changedAt ? new Date(changedAt).getTime() : 0;
          const daysSince =
            changedMs > 0 ? (Date.now() - changedMs) / (1000 * 60 * 60 * 24) : 999;
          if (daysSince < 30) {
            const msg = "You can change your business username again in 30 days.";
            return jsonResponse({ error: msg }, 400);
          }
          const avail = await isUsernameAvailable(nextUsername, uid);
          if (!avail.available) {
            return jsonResponse(
              { error: "Username already taken", suggestions: avail.suggestions || [] },
              400
            );
          }
          bpRow.username = nextUsername;
          bpRow.username_changed_at = new Date().toISOString();
          meta.businessUsername = nextUsername;
        }
      }

      const { error: bpErr } = await sb.from("business_profiles").upsert(bpRow, {
        onConflict: "user_id",
      });
      if (bpErr) {
        const hint = /column/i.test(bpErr.message || "")
          ? " Run Supabase migration 021, then try again."
          : "";
        return jsonResponse({ error: (bpErr.message || "Could not save profile") + hint }, 400);
      }
    }

    const user = await resolveUser(authData.user);
    const refreshed = await getSessionUser();
    if (refreshed) persistSession(refreshed);
    syncStoredUser(user, refreshed?.access_token || session.access_token);
    showToast("Profile saved.", "ok");
    return jsonResponse({ profile: toBusinessApiProfile(user) });
  }

  async function changePassword(body) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    const newPassword = String(body?.newPassword ?? "");
    const confirmPassword = String(body?.confirmPassword ?? body?.confirm ?? "");
    if (newPassword.length < 6) {
      return jsonResponse({ error: "New password must be at least 6 characters" }, 400);
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      return jsonResponse({ error: "Passwords do not match" }, 400);
    }

    const sb = await ensureClient();

    if (body.phoneVerificationToken && body.phone) {
      const profile = await resolveUser(session.user);
      const phone = String(body.phone).trim();
      if (!profile?.phone || !phonesMatch(profile.phone, phone)) {
        return jsonResponse(
          { error: "Phone number does not match your account." },
          400
        );
      }
      const v = await assertPhoneVerifiedForSignup(phone, body.phoneVerificationToken);
      if (!v.ok) {
        return jsonResponse({ error: v.error }, 400);
      }
      const { error } = await sb.auth.updateUser({ password: newPassword });
      if (error) {
        showToast(error.message);
        return jsonResponse({ error: error.message }, 400);
      }
      showToast("Password updated.", "ok");
      return jsonResponse({ ok: true });
    }

    const currentPassword = body?.currentPassword ?? "";
    if (!currentPassword || !newPassword) {
      return jsonResponse({ error: "Current and new password are required" }, 400);
    }
    const { error: verifyErr } = await sb.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });
    if (verifyErr) {
      showToast("Current password is incorrect.");
      return jsonResponse({ error: "Current password is incorrect" }, 400);
    }
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) {
      showToast(error.message);
      return jsonResponse({ error: error.message }, 400);
    }
    showToast("Password updated.", "ok");
    return jsonResponse({ ok: true });
  }

  async function updateUserEmail(body) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    const email = String(body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = body?.password ?? "";
    if (!email || !password) {
      return jsonResponse({ error: "Email and current password are required" }, 400);
    }
    const sb = await ensureClient();
    const { error: verifyErr } = await sb.auth.signInWithPassword({
      email: session.user.email,
      password,
    });
    if (verifyErr) {
      showToast("Password is incorrect.");
      return jsonResponse({ error: "Password is incorrect" }, 400);
    }
    const { data, error } = await sb.auth.updateUser({ email });
    if (error) {
      showToast(error.message);
      return jsonResponse({ error: error.message }, 400);
    }
    if (await checkTables()) {
      await sb.from("profiles").update({ email }).eq("id", session.user.id);
    }
    const user = await resolveUser(data.user);
    const sess = await getSessionUser();
    if (sess) persistSession(sess);
    showToast(
      "Email update requested. Check your inbox to confirm the new address if Supabase requires it.",
      "ok"
    );
    return jsonResponse({ user, token: sess?.access_token });
  }

  async function enrichPublicInfluencerProfile(base) {
    if (!base?.userId) return base;
    const sb = await ensureClient();
    const uid = base.userId;

    const [profRes, ipRes] = await Promise.all([
      sb.from("profiles").select("created_at").eq("id", uid).maybeSingle(),
      sb
        .from("influencer_profiles")
        .select("extra_social_links")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    const extraSocialLinks = parseExtraSocialLinks(ipRes.data?.extra_social_links);
    const memberSince = profRes.data?.created_at || null;

    let projectsCompleted = 0;
    let businessConnections = 0;
    let profileViews = 0;
    let activeCollaborations = 0;
    let savedByBusinesses = 0;

    if (await checkProjectTables()) {
      const { count } = await sb
        .from("campaign_projects")
        .select("id", { count: "exact", head: true })
        .or(`owner_user_id.eq.${uid},counterparty_user_id.eq.${uid}`)
        .eq("status", "completed");
      projectsCompleted = count || 0;

      const { count: activeCount } = await sb
        .from("campaign_projects")
        .select("id", { count: "exact", head: true })
        .or(`owner_user_id.eq.${uid},counterparty_user_id.eq.${uid}`)
        .neq("status", "completed");
      activeCollaborations = activeCount || 0;
    }

    if (await checkCollabTables()) {
      const { count } = await sb
        .from("collab_requests")
        .select("id", { count: "exact", head: true })
        .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
        .eq("status", "accepted");
      businessConnections = count || 0;
    }

    if (await checkDashboardMetricsTables()) {
      const { count: viewsCount } = await sb
        .from("creator_profile_views")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", uid);
      profileViews = viewsCount || 0;

      const { count: savedCount } = await sb
        .from("influencer_shortlists")
        .select("id", { count: "exact", head: true })
        .eq("influencer_user_id", uid);
      savedByBusinesses = savedCount || 0;
    }

    const {
      instagramFollowers,
      youtubeSubscribers,
      tiktokFollowers,
      facebookFollowers,
      ...publicFields
    } = base;

    return {
      ...publicFields,
      extraSocialLinks,
      publicStats: {
        memberSince,
        projectsCompleted,
        businessConnections,
        responseRate: base.responseRate ?? null,
        instagramFollowers:
          instagramFollowers != null ? Number(instagramFollowers) || 0 : null,
        facebookFollowers:
          facebookFollowers != null ? Number(facebookFollowers) || 0 : null,
        profileViews,
        activeCollaborations,
        savedByBusinesses,
      },
    };
  }

  function normalizePublicSlugParam(slugParam) {
    return String(slugParam || "")
      .trim()
      .toLowerCase()
      .replace(/^influnet\//, "")
      .replace(/^@/, "");
  }

  function buildPublicInfluencerJsonFromRow(prof, ip) {
    if (!prof?.id || !ip) return null;
    const legacySlug = normalizeProfileSlug(ip.profile_slug);
    return {
      userId: prof.id,
      name: prof.name,
      location: prof.location,
      city: ip.city ?? null,
      state: ip.state ?? null,
      username: ip.username ?? null,
      profileSlug: ip.username || legacySlug || null,
      headline: ip.headline ?? null,
      bio: ip.bio ?? null,
      niche: ip.niche ?? [],
      avatarUrl: ip.avatar_url ?? null,
      coverImageUrl: ip.cover_image_url ?? null,
      availabilityStatus: ip.availability_status ?? null,
      audienceDemographics: ip.audience_demographics ?? {},
      pastCollaborations: ip.past_collaborations ?? [],
      isVerified: !!ip.is_verified,
      instagramHandle: ip.instagram_handle ?? null,
      youtubeHandle: ip.youtube_handle ?? null,
      twitterHandle: ip.twitter_handle ?? null,
      facebookHandle: ip.facebook_handle ?? null,
      linkedinHandle: sanitizeLinkedInHandle(ip.linkedin_handle ?? null),
      tiktokHandle: ip.tiktok_handle ?? null,
      instagramFollowers: Number(ip.instagram_followers) || 0,
      youtubeSubscribers: Number(ip.youtube_subscribers) || 0,
      tiktokFollowers: Number(ip.tiktok_followers) || 0,
      facebookFollowers: Number(ip.facebook_followers) || 0,
      engagementRate: ip.engagement_rate ?? null,
      mediaKitUrl: ip.media_kit_url ?? null,
      portfolio: Array.isArray(ip.portfolio) ? ip.portfolio : [],
      pricingMin: ip.pricing_min != null ? Number(ip.pricing_min) : null,
      pricingMax: ip.pricing_max != null ? Number(ip.pricing_max) : null,
      collabTypes: Array.isArray(ip.collab_types) ? ip.collab_types : [],
      priceRange: ip.price_range ?? null,
      languages: Array.isArray(ip.languages) ? ip.languages : [],
    };
  }

  async function fetchPublicInfluencerDirect(slugParam) {
    await syncSessionFromStorage();
    const sb = await ensureClient();
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session?.user) return null;

    const needle = normalizePublicSlugParam(slugParam);
    if (!needle) return null;

    const { data: byUsername } = await sb
      .from("influencer_profiles")
      .select("*")
      .ilike("username", needle)
      .maybeSingle();

    if (byUsername?.user_id) {
      const { data: prof } = await sb
        .from("profiles")
        .select("id, name, location, role")
        .eq("id", byUsername.user_id)
        .eq("role", "influencer")
        .maybeSingle();
      const payload = buildPublicInfluencerJsonFromRow(prof, byUsername);
      if (payload) return payload;
    }

    const needleSlug = normalizeProfileSlug(needle);
    if (!needleSlug) return null;

    const { data: legacyRows } = await sb
      .from("influencer_profiles")
      .select("*")
      .not("profile_slug", "is", null);

    for (const ip of legacyRows || []) {
      const custom = normalizeProfileSlug(ip.profile_slug);
      if (!custom || custom !== needleSlug || !ip.user_id) continue;
      const { data: prof } = await sb
        .from("profiles")
        .select("id, name, location, role")
        .eq("id", ip.user_id)
        .eq("role", "influencer")
        .maybeSingle();
      const payload = buildPublicInfluencerJsonFromRow(prof, ip);
      if (payload) return payload;
    }

    return null;
  }

  async function finalizePublicInfluencerPayload(data) {
    if (!data) return null;
    const resolvedSlug = resolvePublicSlug({
      username: data.username,
      profileSlug: data.profileSlug,
    });
    const { phone, email, ...safe } = data;
    return enrichPublicInfluencerProfile({
      ...safe,
      username: data.username || null,
      profileSlug: resolvedSlug,
      profileUrl: resolvedSlug ? publicInfluencerUrl(resolvedSlug) : null,
      publicPath: resolvedSlug ? `influnet/${resolvedSlug}` : null,
    });
  }

  async function getPublicInfluencerBySlug(slugParam) {
    if (!(await checkTables())) return null;
    const needle = normalizePublicSlugParam(slugParam);
    if (!needle) return null;

    const sb = await ensureClient();
    const { data, error } = await sb.rpc("get_public_influencer", {
      p_slug: needle,
    });

    if (!error && data) {
      return finalizePublicInfluencerPayload(data);
    }

    if (error) {
      console.warn("[influnet] get_public_influencer:", error.message);
      const direct = await fetchPublicInfluencerDirect(needle);
      if (direct) {
        return finalizePublicInfluencerPayload(direct);
      }
    }

    return null;
  }

  function aggregateReviewStats(reviews, fallbackAvg, fallbackTotal) {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    const list = Array.isArray(reviews) ? reviews : [];
    list.forEach((r) => {
      const rt = Math.min(5, Math.max(1, Number(r.rating) || 0));
      if (rt >= 1) {
        breakdown[rt] += 1;
        sum += rt;
      }
    });
    const totalReviews = list.length || Number(fallbackTotal) || 0;
    const averageRating =
      list.length > 0
        ? Number((sum / list.length).toFixed(1))
        : fallbackAvg != null
          ? Number(fallbackAvg)
          : null;
    return { breakdown, averageRating, totalReviews };
  }

  async function enrichPublicBusinessProfile(base) {
    if (!base?.userId) return base;
    const uid = base.userId;
    const sb = await ensureClient();

    const [profRes, bpRes] = await Promise.all([
      sb.from("profiles").select("created_at, phone_verified").eq("id", uid).maybeSingle(),
      sb
        .from("business_profiles")
        .select("gst_number, approval_status")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    const memberSince = base.memberSince || profRes.data?.created_at || null;
    const phoneVerified =
      base.phoneVerified != null ? !!base.phoneVerified : !!profRes.data?.phone_verified;
    const gstVerified =
      base.gstVerified != null
        ? !!base.gstVerified
        : !!(bpRes.data?.gst_number && String(bpRes.data.gst_number).trim().length >= 10);

    const reviewStats = aggregateReviewStats(
      base.reviews,
      base.averageRating,
      base.totalReviews
    );

    const reputation = {
      projectsCompleted: 0,
      creatorsWorkedWith: 0,
      averageRating: reviewStats.averageRating,
      totalReviews: reviewStats.totalReviews,
      ratingBreakdown: reviewStats.breakdown,
      repeatCreatorRate: null,
      averageResponseTime: null,
      campaignCompletionRate: null,
      memberSince,
    };

    let computedCollaborations = [];

    if (await checkProjectTables()) {
      const { data: projects } = await sb
        .from("campaign_projects")
        .select(
          "id, title, status, current_stage, owner_user_id, counterparty_user_id, updated_at"
        )
        .or(`owner_user_id.eq.${uid},counterparty_user_id.eq.${uid}`);

      const rows = projects || [];
      const isDone = (p) =>
        String(p.status).toLowerCase() === "completed" ||
        p.current_stage === "project_completed";
      const completed = rows.filter(isDone);
      reputation.projectsCompleted = completed.length;
      reputation.campaignCompletionRate = rows.length
        ? Math.round((completed.length / rows.length) * 100)
        : null;

      const creatorCounts = new Map();
      completed.forEach((p) => {
        const cid =
          p.owner_user_id === uid ? p.counterparty_user_id : p.owner_user_id;
        if (!cid) return;
        creatorCounts.set(cid, (creatorCounts.get(cid) || 0) + 1);
      });
      reputation.creatorsWorkedWith = creatorCounts.size;
      const repeatCount = [...creatorCounts.values()].filter((n) => n > 1).length;
      reputation.repeatCreatorRate = creatorCounts.size
        ? Math.round((repeatCount / creatorCounts.size) * 100)
        : null;

      const creatorIds = [...creatorCounts.keys()];
      const creatorMap = creatorIds.length ? await loadProfilesMap(creatorIds) : new Map();
      computedCollaborations = completed.slice(0, 12).map((p) => {
        const cid =
          p.owner_user_id === uid ? p.counterparty_user_id : p.owner_user_id;
        const creator = creatorMap.get(cid);
        return {
          creatorName: creator?.name || "Creator",
          campaignName: p.title || "Campaign",
          campaignType: "Brand Campaign",
          status: "Completed",
          rating: null,
          year: p.updated_at ? String(p.updated_at).slice(0, 4) : "",
        };
      });
    }

    const trust = {
      phoneVerified,
      websiteVerified:
        !!base.websiteVerified || !!(base.website && String(base.website).trim()),
      emailVerified: !!base.emailVerified,
      gstVerified,
      influnetVerified: !!base.isVerified || bpRes.data?.approval_status === "approved",
      trustedPartner: !!base.trustedPartner,
      verifiedAt: base.verifiedAt || null,
      memberSince,
    };

    let campaignsPosted = 0;
    let lastActive = null;
    if (await checkCollabTables()) {
      const { count } = await sb
        .from("collab_requests")
        .select("id", { count: "exact", head: true })
        .eq("from_user_id", uid);
      campaignsPosted = count || 0;
    }
    if (await checkMessagingTables()) {
      const { data: msgs } = await sb
        .from("messages")
        .select("created_at")
        .eq("sender_user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1);
      lastActive = msgs?.[0]?.created_at || null;
    }

    const activity = {
      lastActive,
      campaignsPosted,
      campaignsCompleted: reputation.projectsCompleted,
      creatorsHired: reputation.creatorsWorkedWith,
      repeatCollaborations: reputation.repeatCreatorRate,
      averageResponseTime: reputation.averageResponseTime,
    };

    return {
      ...base,
      profileType: "business",
      trust,
      reputation,
      activity,
      computedCollaborations,
    };
  }

  async function getPublicBusinessBySlug(slugParam) {
    if (!(await checkTables())) return null;
    const sb = await ensureClient();
    const { data, error } = await sb.rpc("get_public_business", {
      p_slug: slugParam,
    });
    if (error) {
      console.warn("[influnet] get_public_business:", error.message);
      return null;
    }
    if (!data) return null;
    const resolvedSlug = resolveBusinessPublicSlug({
      businessUsername: data.username,
      username: data.username,
    });
    const { phone, email, gstNumber, registeredAddress, ...safe } = data;
    const enriched = await enrichPublicBusinessProfile({
      ...safe,
      username: data.username || null,
      profileSlug: resolvedSlug,
      profileUrl: resolvedSlug ? publicBusinessUrl(resolvedSlug) : null,
      publicPath: resolvedSlug ? `influnet/${resolvedSlug}` : null,
    });
    return enriched;
  }

  async function recordProfileView(influencerUserId) {
    if (!(await checkDashboardMetricsTables()) || !isUuid(influencerUserId)) return;
    const session = await getSessionUser();
    const viewerId = session?.user?.id || null;
    if (!viewerId || viewerId === influencerUserId) return;

    const viewer = await loadProfileFromDb(viewerId);
    if (
      !viewer ||
      !isBusinessOwnerRole(viewer.role, {
        hasBusinessProfile: viewer.hasBusinessProfile,
        hasInfluencerProfile: viewer.hasInfluencerProfile,
      })
    ) {
      return;
    }

    const sb = await ensureClient();
    const { data, error } = await sb.rpc("record_creator_profile_view", {
      p_creator_id: influencerUserId,
      p_business_id: viewerId,
    });
    if (error) {
      console.warn("[influnet] record_creator_profile_view:", error.message);
      return;
    }

    if (data?.is_first_view) {
      const businessName = viewer.companyName || viewer.name || "A business";
      broadcastNotification({
        type: "PROFILE_VIEWED",
        toUserId: influencerUserId,
        fromUserId: viewerId,
        fromName: businessName,
        body: `👀 ${businessName} viewed your profile.`,
      });
    }
  }

  async function recordLinkClick(influencerUserId, linkType) {
    if (!(await checkDashboardMetricsTables()) || !isUuid(influencerUserId)) return;
    const sb = await ensureClient();
    await sb.from("profile_link_clicks").insert({
      influencer_user_id: influencerUserId,
      link_type: linkType || "profile",
    });
  }

  async function getInfluencerDashboard() {
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    const uid = session.user.id;
    const profile = await resolveUser(session.user);
    const completion = enrichCompletionWithOnboarding(
      profile,
      computeProfileCompletion(profile)
    );
    const displayProfile = stripStaleSignupProfileFields(profile, completion);
    const slug = resolvePublicSlug(displayProfile);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [requests, activeDiscussions, discussionsWeek] = await Promise.all([
      listCollabRequests("incoming"),
      countConversationsWithMessages(uid),
      countConversationsWithMessagesSince(uid, weekAgo),
    ]);

    const stats = {
      profileViews: 0,
      collaborationRequests: requests.length,
      activeDiscussions,
      activeProjects: 0,
      completedProjects: 0,
      savedByBusinesses: 0,
    };

    let recentViews = [];

    const projects = (await checkProjectTables())
      ? await listProjectsForUserFromDb(uid)
      : [];
    stats.activeProjects = projects.filter(
      (p) =>
        String(p.status).toLowerCase() !== "completed" &&
        normalizeProjectStage(p.currentStage) !== "project_completed"
    ).length;
    stats.completedProjects = projects.filter(
      (p) =>
        String(p.status).toLowerCase() === "completed" ||
        normalizeProjectStage(p.currentStage) === "project_completed"
    ).length;
    stats.pendingReviews = projects.filter((p) =>
      ["sent_for_review", "revisions", "content_review", "client_review"].includes(
        normalizeProjectStage(p.currentStage)
      )
    ).length;
    stats.projectEarnings = projects
      .filter(
        (p) =>
          String(p.status).toLowerCase() === "completed" ||
          normalizeProjectStage(p.currentStage) === "project_completed"
      )
      .reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

    const isProjectCompleted = (p) =>
      String(p.status).toLowerCase() === "completed" ||
      p.currentStage === "project_completed";
    const trends = {
      profileViews: { week: 0 },
      collaborationRequests: {
        week: requests.filter((r) => (r.createdAt || "") >= weekAgo).length,
      },
      activeDiscussions: {
        week: discussionsWeek,
      },
      activeProjects: {
        week: projects.filter(
          (p) =>
            String(p.status).toLowerCase() === "active" &&
            (p.updatedAt || p.createdAt || "") >= weekAgo
        ).length,
      },
      completedProjects: {
        month: projects.filter(
          (p) =>
            isProjectCompleted(p) &&
            (p.updatedAt || p.createdAt || "") >= monthAgo
        ).length,
      },
      savedByBusinesses: { week: 0 },
    };

    let interestedBusinesses = [];

    if (await checkDashboardMetricsTables()) {
      const sb = await ensureClient();
      const [viewsRes, savesRes, recentRes, viewsWeekRes, savesWeekRes, interestedRes] =
        await Promise.all([
          sb
            .from("creator_profile_views")
            .select("id", { count: "exact", head: true })
            .eq("creator_id", uid),
          sb
            .from("influencer_shortlists")
            .select("id", { count: "exact", head: true })
            .eq("influencer_user_id", uid),
          sb
            .from("creator_profile_views")
            .select("business_id, last_viewed_at, view_count")
            .eq("creator_id", uid)
            .order("last_viewed_at", { ascending: false })
            .limit(8),
          sb
            .from("creator_profile_views")
            .select("id", { count: "exact", head: true })
            .eq("creator_id", uid)
            .gte("first_viewed_at", weekAgo),
          sb
            .from("influencer_shortlists")
            .select("id", { count: "exact", head: true })
            .eq("influencer_user_id", uid)
            .gte("created_at", weekAgo),
          sb
            .from("influencer_shortlists")
            .select("business_user_id, created_at")
            .eq("influencer_user_id", uid)
            .order("created_at", { ascending: false })
            .limit(8),
        ]);
      stats.profileViews = viewsRes.count || 0;
      stats.savedByBusinesses = savesRes.count || 0;
      trends.profileViews.week = viewsWeekRes.count || 0;
      trends.savedByBusinesses.week = savesWeekRes.count || 0;

      const businessIds = [...new Set((recentRes.data || []).map((v) => v.business_id).filter(Boolean))];
      const businessMap = businessIds.length
        ? await loadProfilesMap(businessIds)
        : new Map();

      recentViews = (recentRes.data || []).map((v) => {
        const biz = businessMap.get(v.business_id);
        const businessName = biz?.companyName || biz?.name || "Business";
        return {
          businessId: v.business_id,
          businessName,
          industry: biz?.industry || "",
          logoUrl: biz?.avatarUrl || null,
          viewedAt: v.last_viewed_at,
          viewCount: v.view_count || 1,
        };
      });

      const interestedIds = [
        ...new Set((interestedRes.data || []).map((r) => r.business_user_id).filter(Boolean)),
      ];
      const interestedMap = interestedIds.length
        ? await loadProfilesMap(interestedIds)
        : new Map();
      interestedBusinesses = (interestedRes.data || []).map((r) => {
        const biz = interestedMap.get(r.business_user_id);
        return {
          businessId: r.business_user_id,
          businessName: biz?.companyName || biz?.name || "Business",
          industry: biz?.industry || "",
          logoUrl: biz?.avatarUrl || null,
          savedAt: r.created_at,
        };
      });
    } else {
      const localShortlists = loadShortlistsStore().filter(
        (x) => x.influencerUserId === uid
      );
      stats.savedByBusinesses = localShortlists.length;
      trends.savedByBusinesses.week = localShortlists.filter(
        (x) => (x.createdAt || "") >= weekAgo
      ).length;
    }

    const pendingRequests = requests
      .filter((r) => r.status === "pending")
      .slice(0, 6)
      .map((r) => ({
        id: r.id,
        businessName: r.fromUser?.companyName || r.fromUser?.name || "Business",
        title: r.message || "Collaboration request",
        budget: r.budget,
        createdAt: r.createdAt,
      }));

    return jsonResponse({
      profile: toInfluencerApiProfile(displayProfile),
      username: displayProfile.username || null,
      profileSlug: slug,
      publicPath: slug ? `influnet/${slug}` : null,
      completion,
      stats,
      trends,
      requests: pendingRequests,
      recentViews,
      interestedBusinesses,
      socialPlatforms: buildSocialPlatformCards(displayProfile),
    });
  }

  const BIZ_NEGOTIATION_STAGES = [
    "collaboration_started",
    "project_discussion",
    "advance_payment",
    "content_planning",
    "content_confirmation",
    "lead_received",
    "discussion_started",
    "requirements_finalized",
    "budget_confirmed",
    "agreement_approved",
  ];
  const BIZ_ACTIVE_STAGES = [
    "shooting_in_progress",
    "editing_in_progress",
    "sent_for_review",
    "revisions",
    "final_approval",
    "final_payment",
    "content_creation",
    "content_review",
    "content_published",
    "payment_received",
  ];

  async function listShortlistsEnriched(businessUserId) {
    let rows = [];
    if (await checkDashboardMetricsTables()) {
      const sb = await ensureClient();
      const { data } = await sb
        .from("influencer_shortlists")
        .select("influencer_user_id, note, created_at")
        .eq("business_user_id", businessUserId)
        .order("created_at", { ascending: false })
        .limit(12);
      rows = (data || []).map((r) => ({
        influencerUserId: r.influencer_user_id,
        note: r.note,
        createdAt: r.created_at,
      }));
    }
    if (!rows.length) {
      rows = listShortlistsForUser(businessUserId).map((r) => ({
        influencerUserId: r.influencerUserId,
        note: r.note,
        createdAt: r.createdAt,
      }));
    }
    const ids = rows.map((r) => r.influencerUserId).filter(isUuid);
    const profiles = ids.length ? await loadProfilesMap(ids) : new Map();
    return rows.map((r) => {
      const p = profiles.get(r.influencerUserId);
      const niche = normalizeNiche(p?.niche);
      return {
        id: r.influencerUserId,
        name: p?.name || "Creator",
        username: p?.username || null,
        niche: niche[0] || "",
        location: p?.location || "",
        profileSlug: p?.profileSlug || p?.username || null,
        savedAt: r.createdAt,
      };
    });
  }

  async function getBusinessDashboard() {
    try {
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    const uid = session.user.id;
    const profile = await resolveUser(session.user);
    if (
      !isBusinessOwnerRole(profile?.role, {
        hasBusinessProfile: !!profile?.companyName || !!profile?.businessUsername,
      })
    ) {
      return jsonResponse(
        { error: "Business owner account required. Log in with a business account." },
        403
      );
    }
    const blocked = await blockPendingBusinessAccess(profile);
    if (blocked) return blocked;

    const [requests, activeDiscussions, projects, savedCreators] = await Promise.all([
      listCollabRequests("outgoing"),
      countConversationsWithMessages(uid),
      (async () => {
        try {
          if (!(await checkProjectTables())) return [];
          return listProjectsForUserFromDb(uid);
        } catch (e) {
          console.warn("[influnet] business dashboard projects:", e?.message || e);
          return [];
        }
      })(),
      listShortlistsEnriched(uid).catch(() => []),
    ]);

    const accepted = requests.filter((r) => r.status === "accepted");
    const pending = requests.filter((r) => r.status === "pending");

    const negotiation = projects.filter(
      (p) =>
        BIZ_NEGOTIATION_STAGES.includes(p.currentStage) &&
        p.status !== "completed" &&
        p.currentStage !== "project_completed"
    );
    const activeProjects = projects.filter(
      (p) => BIZ_ACTIVE_STAGES.includes(p.currentStage) && p.status !== "completed"
    );
    const completedProjects = projects.filter(
      (p) => p.currentStage === "project_completed" || p.status === "completed"
    );

    const discussing = accepted.filter(
      (r) =>
        !projects.some(
          (p) =>
            p.counterpartyUserId === r.toUserId || p.ownerUserId === r.toUserId
        )
    );

    let profileViews = 0;
    let recentViews = [];

    if (await checkDashboardMetricsTables()) {
      const sb = await ensureClient();
      const [viewsCountRes, viewsListRes] = await Promise.all([
        sb
          .from("creator_profile_views")
          .select("id", { count: "exact", head: true })
          .eq("business_id", uid),
        sb
          .from("creator_profile_views")
          .select("creator_id, last_viewed_at, view_count")
          .eq("business_id", uid)
          .order("last_viewed_at", { ascending: false })
          .limit(8),
      ]);
      profileViews = viewsCountRes.count || 0;
      const creatorIds = [...new Set((viewsListRes.data || []).map((v) => v.creator_id))];
      const creatorMap = creatorIds.length
        ? await loadProfilesMap(creatorIds)
        : new Map();
      recentViews = (viewsListRes.data || []).map((v) => {
        const c = creatorMap.get(v.creator_id);
        const niche = normalizeNiche(c?.niche);
        return {
          creatorId: v.creator_id,
          name: c?.name || "Creator",
          username: c?.username || null,
          niche: niche[0] || "",
          profileSlug: c?.profileSlug || c?.username || null,
          viewedAt: v.last_viewed_at,
          viewCount: v.view_count || 1,
        };
      });
    }

    const stats = {
      profileViews,
      requestsSent: requests.length,
      requestsAccepted: accepted.length,
      activeDiscussions,
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      savedCreators: savedCreators.length,
      pendingApprovals: projects.filter((p) =>
        ["sent_for_review", "revisions", "final_approval", "content_review", "client_review"].includes(
          normalizeProjectStage(p.currentStage)
        )
      ).length,
      projectSpend: projects
        .filter(
          (p) =>
            p.status === "completed" ||
            normalizeProjectStage(p.currentStage) === "project_completed"
        )
        .reduce((sum, p) => sum + (Number(p.budget) || 0), 0),
    };

    const pipeline = {
      viewed: profileViews,
      contacted: pending.length,
      discussing: discussing.length + activeDiscussions,
      negotiation: negotiation.length,
      active: activeProjects.length,
      completed: completedProjects.length,
    };

    const recentActivity = [];
    for (const r of requests.slice(0, 8)) {
      const creator = r.toUser?.name || "Creator";
      const status = String(r.status || "pending").toLowerCase();
      let badge = "Pending";
      let badgeClass = "pending";
      if (status === "accepted") {
        badge = "Accepted";
        badgeClass = "accepted";
      } else if (status === "declined" || status === "cancelled") {
        badge = "Closed";
        badgeClass = "closed";
      }
      recentActivity.push({
        id: `req-${r.id}`,
        title: r.message?.slice(0, 60) || "Collaboration request",
        subtitle: `with ${creator}`,
        createdAt: r.createdAt,
        badge,
        badgeClass,
      });
    }
    for (const p of projects.slice(0, 6)) {
      const isDone =
        p.currentStage === "project_completed" || p.status === "completed";
      recentActivity.push({
        id: `proj-${p.id}`,
        title: p.title || "Campaign",
        subtitle: `with ${p.counterparty?.name || "Creator"}`,
        createdAt: p.updatedAt || p.createdAt,
        badge: isDone ? "Completed" : "Ongoing",
        badgeClass: isDone ? "completed" : "ongoing",
      });
    }
    recentActivity.sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );

    const prefs = Array.isArray(profile.collabPreferences)
      ? profile.collabPreferences
      : [];
    const acceptanceRate =
      stats.requestsSent > 0
        ? Math.round((stats.requestsAccepted / stats.requestsSent) * 100)
        : 0;

    const insights = {
      acceptanceRate,
      responseLabel:
        activeDiscussions > 0 ? "< 2 hrs avg response" : "No active chats yet",
      topCategories: prefs.length
        ? prefs.slice(0, 4)
        : recentViews
            .map((v) => v.niche)
            .filter(Boolean)
            .slice(0, 4),
    };

    const locParts = [profile.city, profile.state].filter(Boolean);
    const location =
      profile.location ||
      (locParts.length ? locParts.join(", ") : "") ||
      "";
    const publicSlug = resolveBusinessPublicSlug(profile);
    const profileUrl = publicSlug ? publicBusinessUrl(publicSlug) : null;

    return jsonResponse({
      profile: {
        companyName: profile.companyName || profile.name || "Your Brand",
        tagline: profile.tagline?.trim()
          ? profile.tagline.trim()
          : profile.bio?.trim()
            ? profile.bio.trim()
            : profile.industry
              ? `Partner with creators in ${profile.industry}.`
              : "Discover and collaborate with creators on Influnet.",
        industry: profile.industry || "Brand",
        location,
        website: profile.website || "",
        marketingBudget: profile.marketingBudget || "",
        collabPreferences: prefs,
        isVerified: profile.approvalStatus === "approved",
        approvalStatus: profile.approvalStatus || "pending_review",
        phoneVerified: !!profile.phoneVerified,
        businessUsername: publicSlug,
        profileUrl,
      },
      stats,
      pipeline,
      savedCreators: savedCreators.slice(0, 6),
      recentActivity: recentActivity.slice(0, 8),
      recentViews,
      insights,
    });
    } catch (e) {
      console.warn("[influnet] business dashboard:", e?.message || e);
      return jsonResponse(
        { error: e?.message || "Failed to load business dashboard" },
        500
      );
    }
  }

  async function listDiscoverInfluencers(search) {
    if (!(await checkTables())) return [];
    const session = await syncSessionFromStorage();
    if (!session?.user) {
      console.warn("[influnet] discover: not signed in (Supabase session)");
      return [];
    }
    const sb = await ensureClient();
    let query = sb
      .from("profiles")
      .select(
        "id, name, location, influencer_profiles(bio, niche, username, profile_slug, instagram_handle, youtube_handle, twitter_handle, instagram_followers, youtube_subscribers, engagement_rate, is_verified)"
      )
      .eq("role", "influencer")
      .neq("id", session.user.id);
    const q = (search.get("q") || search.get("search") || "").trim();
    const niche = search.get("niche");
    const location = search.get("location");
    if (location) query = query.ilike("location", `%${location}%`);
    let { data, error } = await query.limit(q ? 150 : 50);
    if (error && /profile_slug/i.test(error.message || "")) {
      const fallback = await sb
        .from("profiles")
        .select(
          "id, name, location, influencer_profiles(bio, niche, instagram_handle, youtube_handle, twitter_handle, instagram_followers, youtube_subscribers, engagement_rate, is_verified)"
        )
        .eq("role", "influencer")
        .neq("id", session.user.id)
        .limit(q ? 150 : 50);
      data = fallback.data;
      error = fallback.error;
    }
    if (error) {
      console.warn("[influnet] discover:", error.message);
      return [];
    }
    let rows = (data || []).filter((row) => row.id !== session.user.id);
    if (q) {
      const slugTerm = parseProfileSlugFromQuery(q);
      const term = q.toLowerCase();
      rows = rows.filter((row) => {
        const ip = Array.isArray(row.influencer_profiles)
          ? row.influencer_profiles[0]
          : row.influencer_profiles;
        if (slugTerm) {
          const custom = normalizeUsername(ip?.username);
          const legacy = normalizeProfileSlug(ip?.profile_slug);
          const fromName = normalizeProfileSlug(row.name);
          if (custom === slugTerm || legacy === slugTerm || fromName === slugTerm) return true;
        }
        if ((row.name || "").toLowerCase().includes(term)) return true;
        if (normalizeUsername(ip?.username || "").includes(term.replace(/[^a-z0-9._]/g, ""))) return true;
        if ((ip?.bio || "").toLowerCase().includes(term)) return true;
        const publicSlug = resolvePublicSlug({
          username: ip?.username,
          profileSlug: ip?.profile_slug,
        });
        const publicPath = publicSlug ? `influnet/${publicSlug}` : "";
        if (publicPath && publicPath.includes(term.replace(/\s+/g, ""))) return true;
        return normalizeNiche(ip?.niche).some((t) =>
          t.toLowerCase().includes(term)
        );
      });
    }
    if (niche) {
      const n = niche.toLowerCase();
      rows = rows.filter((row) => {
        const ip = Array.isArray(row.influencer_profiles)
          ? row.influencer_profiles[0]
          : row.influencer_profiles;
        const tags = normalizeNiche(ip?.niche).map((t) => t.toLowerCase());
        return tags.some((t) => t.includes(n) || n.includes(t));
      });
    }
    return rows.map((row) => {
      const ip = Array.isArray(row.influencer_profiles)
        ? row.influencer_profiles[0]
        : row.influencer_profiles;
      const nicheArr = normalizeNiche(ip?.niche);
      const profileSlug = resolvePublicSlug({
        username: ip?.username,
        profileSlug: ip?.profile_slug,
      });
      const username = normalizeUsername(ip?.username) || null;
      return {
        id: row.id,
        userId: row.id,
        influencerUserId: row.id,
        name: row.name || "Creator",
        username,
        location: row.location || "",
        bio: ip?.bio,
        niche: nicheArr,
        profileSlug,
        profileUrl: profileSlug ? publicInfluencerUrl(profileSlug) : null,
        publicPath: profileSlug ? `influnet/${profileSlug}` : null,
        instagramHandle: ip?.instagram_handle || "",
        youtubeHandle: ip?.youtube_handle || "",
        twitterHandle: ip?.twitter_handle || "",
        totalFollowers:
          (Number(ip?.instagram_followers) || 0) +
          (Number(ip?.youtube_subscribers) || 0),
        instagramFollowers: Number(ip?.instagram_followers) || 0,
        engagementRate:
          ip?.engagement_rate != null ? Number(ip.engagement_rate) : null,
        verified: !!ip?.is_verified,
      };
    });
  }

  const PROJECT_STAGES = [
    "collaboration_started",
    "project_discussion",
    "advance_payment",
    "content_planning",
    "content_confirmation",
    "shooting_in_progress",
    "editing_in_progress",
    "sent_for_review",
    "revisions",
    "final_approval",
    "final_payment",
    "project_completed",
  ];

  const PROJECT_STAGE_LABELS = {
    collaboration_started: "Collaboration Started",
    project_discussion: "Project Discussion",
    advance_payment: "Advance Payment",
    content_planning: "Content Planning",
    content_confirmation: "Content Confirmation",
    shooting_in_progress: "Shooting In Progress",
    editing_in_progress: "Editing In Progress",
    sent_for_review: "Sent For Review",
    revisions: "Revisions",
    final_approval: "Final Approval",
    final_payment: "Final Payment",
    project_completed: "Project Completed",
    lead_received: "Collaboration Started",
    discussion_started: "Project Discussion",
    start_project: "Collaboration Started",
    client_review: "Sent For Review",
    final_iteration: "Revisions",
    project_done: "Project Completed",
    content_creation: "Shooting In Progress",
    content_review: "Sent For Review",
    content_published: "Final Approval",
    payment_received: "Final Payment",
  };

  const LEGACY_PROJECT_STAGE_MAP = {
    lead_received: "collaboration_started",
    discussion_started: "project_discussion",
    requirements_finalized: "content_planning",
    budget_confirmed: "advance_payment",
    agreement_approved: "content_planning",
    content_creation: "shooting_in_progress",
    content_review: "sent_for_review",
    content_published: "final_approval",
    payment_received: "final_payment",
    start_project: "collaboration_started",
    client_review: "sent_for_review",
    final_iteration: "revisions",
    project_done: "project_completed",
  };

  function normalizeProjectStage(stage) {
    const key = String(stage || "").trim();
    if (PROJECT_STAGES.includes(key)) return key;
    return LEGACY_PROJECT_STAGE_MAP[key] || PROJECT_STAGES[0];
  }

  function projectStageLabel(stage) {
    const key = normalizeProjectStage(stage);
    return PROJECT_STAGE_LABELS[key] || key.replace(/_/g, " ");
  }

  function nextProjectStage(stage) {
    const key = normalizeProjectStage(stage);
    const idx = PROJECT_STAGES.indexOf(key);
    if (idx < 0 || idx >= PROJECT_STAGES.length - 1) return null;
    return PROJECT_STAGES[idx + 1];
  }

  function mapProjectRow(row) {
    const currentStage = normalizeProjectStage(row.current_stage);
    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      counterpartyUserId: row.counterparty_user_id,
      title: row.title,
      description: row.description || "",
      deliverables: row.deliverables || "",
      budget: row.budget,
      timeline: row.timeline,
      startDate: row.start_date || null,
      endDate: row.end_date || null,
      conversationId: row.conversation_id || null,
      status: row.status,
      currentStage,
      stageProgress: normalizeStageProgress(currentStage, row.stage_progress || {}),
      history: Array.isArray(row.history) ? row.history : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  const PROJECTS_STORE_KEY = "influnet_projects_v2";
  const SHORTLISTS_STORE_KEY = "influnet_shortlists_v1";
  const HIDDEN_CONV_STORE_KEY = "influnet_hidden_conversations_v1";

  function emptyStageProgress() {
    return PROJECT_STAGES.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});
  }

  function computeOverallProgress(stageProgress) {
    const total = PROJECT_STAGES.reduce(
      (sum, key) => sum + Math.max(0, Math.min(100, Number(stageProgress?.[key] || 0))),
      0
    );
    return Math.round(total / PROJECT_STAGES.length);
  }

  function normalizeStageProgress(currentStage, incoming) {
    const progress = emptyStageProgress();
    const idx = PROJECT_STAGES.indexOf(currentStage);
    for (const key of PROJECT_STAGES) {
      if (incoming && Object.prototype.hasOwnProperty.call(incoming, key)) {
        progress[key] = Math.max(0, Math.min(100, Number(incoming[key] || 0)));
        continue;
      }
      const stageIdx = PROJECT_STAGES.indexOf(key);
      if (idx < 0) {
        progress[key] = 0;
      } else if (currentStage === "project_completed") {
        progress[key] = 100;
      } else if (stageIdx < idx) {
        progress[key] = 100;
      } else if (stageIdx === idx) {
        progress[key] = 70;
      } else {
        progress[key] = 0;
      }
    }
    return progress;
  }

  function loadProjectsStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROJECTS_STORE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveProjectsStore(projects) {
    localStorage.setItem(PROJECTS_STORE_KEY, JSON.stringify(projects));
  }

  async function enrichProjectCounterparty(project, currentUserId) {
    const otherUserId =
      project.ownerUserId === currentUserId ? project.counterpartyUserId : project.ownerUserId;
    const owner = await resolveUser({ id: project.ownerUserId });
    const other = await resolveUser({ id: otherUserId });
    const usersById = new Map();
    if (project.ownerUserId) usersById.set(project.ownerUserId, owner?.name || "User");
    if (otherUserId) usersById.set(otherUserId, other?.name || "User");
    return {
      ...project,
      currentStageLabel: projectStageLabel(project.currentStage),
      counterparty: {
        userId: otherUserId,
        name: other?.name || other?.companyName || "User",
        avatarUrl: other?.avatar_url || null,
        companyName: other?.companyName || null,
      },
      history: (project.history || []).map((item) => ({
        ...item,
        updatedByName: item.updatedByName || usersById.get(item.updatedByUserId) || "User",
        stageLabel: projectStageLabel(item.stage),
      })),
      overallProgress: computeOverallProgress(project.stageProgress || emptyStageProgress()),
    };
  }

  async function listProjectsForUser(sessionUserId) {
    const all = loadProjectsStore();
    const mine = all.filter(
      (p) => p.ownerUserId === sessionUserId || p.counterpartyUserId === sessionUserId
    );
    const hydrated = [];
    for (const p of mine.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))) {
      hydrated.push(await enrichProjectCounterparty(p, sessionUserId));
    }
    return hydrated;
  }

  async function getProjectForUser(projectId, sessionUserId) {
    const all = loadProjectsStore();
    const row = all.find((p) => Number(p.id) === Number(projectId));
    if (!row) return null;
    if (row.ownerUserId !== sessionUserId && row.counterpartyUserId !== sessionUserId) {
      return null;
    }
    return enrichProjectCounterparty(row, sessionUserId);
  }

  function loadShortlistsStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SHORTLISTS_STORE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveShortlistsStore(rows) {
    localStorage.setItem(SHORTLISTS_STORE_KEY, JSON.stringify(rows));
  }

  function listShortlistsForUser(userId) {
    return loadShortlistsStore()
      .filter((x) => x.userId === userId)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  function loadHiddenConversations() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HIDDEN_CONV_STORE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function hideConversationForUser(userId, conversationId) {
    const all = loadHiddenConversations();
    const arr = Array.isArray(all[userId]) ? all[userId] : [];
    if (!arr.includes(conversationId)) arr.push(conversationId);
    all[userId] = arr;
    localStorage.setItem(HIDDEN_CONV_STORE_KEY, JSON.stringify(all));
  }

  async function listProjectsForUserFromDb(sessionUserId) {
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("campaign_projects")
      .select("*")
      .or(`owner_user_id.eq.${sessionUserId},counterparty_user_id.eq.${sessionUserId}`)
      .order("updated_at", { ascending: false });
    if (error) {
      console.warn("[influnet] list projects:", error.message);
      return [];
    }
    const rows = [];
    for (const row of data || []) {
      rows.push(await enrichProjectCounterparty(mapProjectRow(row), sessionUserId));
    }
    return rows;
  }

  async function getProjectForUserFromDb(projectId, sessionUserId) {
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("campaign_projects")
      .select("*")
      .eq("id", projectId)
      .or(`owner_user_id.eq.${sessionUserId},counterparty_user_id.eq.${sessionUserId}`)
      .single();
    if (error || !data) return null;
    return enrichProjectCounterparty(mapProjectRow(data), sessionUserId);
  }

  async function listProjectCollaborators(sessionUserId) {
    const viewer = await resolveUser({ id: sessionUserId });
    const targetRole = viewer?.role === "business_owner" ? "influencer" : "business_owner";
    const fallbackLabel = targetRole === "business_owner" ? "Business owner" : "Creator";
    const seen = new Set();
    const out = [];

    if (await checkConnectionsTable()) {
      const { connections } = await listConnectionsForUser(sessionUserId, {});
      for (const row of connections || []) {
        const partner = row.partner;
        if (!row.connectedUserId || seen.has(row.connectedUserId)) continue;
        if (row.status === "removed") continue;
        if (partner?.role !== targetRole) continue;
        seen.add(row.connectedUserId);
        out.push({
          userId: row.connectedUserId,
          name: partner?.name || fallbackLabel,
          avatarUrl: partner?.avatarUrl || null,
          role: partner?.role || targetRole,
          lastMessageAt: row.lastInteractionAt || row.connectedAt || null,
        });
      }
      out.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
      if (out.length) return out;
    }

    const conversations = await listConversations();
    for (const c of conversations) {
      const other = c.otherUser;
      if (!other?.id || other.id === sessionUserId || seen.has(other.id)) continue;
      if (other.role && other.role !== targetRole) continue;
      seen.add(other.id);
      out.push({
        userId: other.id,
        name: other.companyName || other.name || fallbackLabel,
        avatarUrl: other.avatarUrl || null,
        role: other.role || null,
        lastMessageAt: c.lastMessageAt || null,
      });
    }
    out.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
    return out;
  }

  async function notifyProjectUpdate(project, actorUserId, stageLabel) {
    const counterpartyId =
      project.ownerUserId === actorUserId
        ? project.counterpartyUserId
        : project.ownerUserId;
    const actor = await resolveUser({ id: actorUserId });
    broadcastNotification({
      type: "project_update",
      title: "Project Update",
      message: `${project.title} moved to: ${stageLabel}`,
      projectId: project.id,
      targetUserId: counterpartyId,
      actorName: actor?.name || "Collaborator",
      createdAt: new Date().toISOString(),
    });
  }

  async function advanceProjectStage(projectId, sessionUserId, body) {
    const project = (await checkProjectTables())
      ? await getProjectForUserFromDb(projectId, sessionUserId)
      : await getProjectForUser(projectId, sessionUserId);
    if (!project) return jsonResponse({ error: "Not found" }, 404);

    const current = normalizeProjectStage(project.currentStage);
    let nextStage = nextProjectStage(current);
    if (body?.action === "complete" || body?.forceComplete) {
      nextStage = "project_completed";
    }
    if (!nextStage) {
      return jsonResponse({ error: "Project is already at the final stage" }, 400);
    }

    const stageLabel = projectStageLabel(nextStage);
    const actor = await resolveUser({ id: sessionUserId });
    const actorName = actor?.name || "User";
    const note =
      typeof body?.note === "string" && body.note.trim()
        ? body.note.trim()
        : `Moved project to ${stageLabel}`;
    const historyItem = {
      id: crypto.randomUUID(),
      stage: nextStage,
      action: "stage_advance",
      note,
      createdAt: new Date().toISOString(),
      updatedByUserId: sessionUserId,
      updatedByName: actorName,
    };
    const nextHistory = [...(project.history || []), historyItem];
    const stageProgress = normalizeStageProgress(nextStage);
    const status = nextStage === "project_completed" ? "completed" : "active";

    if (await checkProjectTables()) {
      const sb = await ensureClient();
      const { data, error } = await sb
        .from("campaign_projects")
        .update({
          current_stage: nextStage,
          stage_progress: stageProgress,
          status,
          history: nextHistory,
        })
        .eq("id", projectId)
        .select("*")
        .single();
      if (error) return jsonResponse({ error: error.message }, 400);
      const updated = await enrichProjectCounterparty(mapProjectRow(data), sessionUserId);
      await notifyProjectUpdate(updated, sessionUserId, stageLabel);
      dispatchDashboardStale("project_stage_" + nextStage);
      if (nextStage === "project_completed") {
        ensureConnectionForUsers(
          updated.ownerUserId,
          updated.counterpartyUserId,
          { notify: false }
        ).catch(() => {});
      }
      return jsonResponse(updated);
    }

    const all = loadProjectsStore();
    const idx = all.findIndex((p) => Number(p.id) === Number(projectId));
    if (idx === -1) return jsonResponse({ error: "Not found" }, 404);
    all[idx] = {
      ...all[idx],
      currentStage: nextStage,
      stageProgress,
      status,
      history: nextHistory,
      updatedAt: new Date().toISOString(),
    };
    saveProjectsStore(all);
    const updated = await enrichProjectCounterparty(all[idx], sessionUserId);
    await notifyProjectUpdate(updated, sessionUserId, stageLabel);
    if (nextStage === "project_completed") {
      ensureConnectionForUsers(updated.ownerUserId, updated.counterpartyUserId, {
        notify: false,
      }).catch(() => {});
    }
    return jsonResponse(updated);
  }

  async function listProjectAssets(projectId, sessionUserId) {
    const project = (await checkProjectTables())
      ? await getProjectForUserFromDb(projectId, sessionUserId)
      : await getProjectForUser(projectId, sessionUserId);
    if (!project) return null;
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("project_assets")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) {
      if (String(error.message).includes("project_assets")) return [];
      console.warn("[influnet] project assets list:", error.message);
      return [];
    }
    const uploaderIds = [...new Set((data || []).map((r) => r.uploaded_by).filter(Boolean))];
    const profiles = uploaderIds.length ? await loadProfilesMap(uploaderIds) : new Map();
    return (data || []).map((r) => ({
      id: r.id,
      projectId: r.project_id,
      fileName: r.file_name,
      fileUrl: r.file_url,
      linkUrl: r.link_url,
      assetType: r.asset_type,
      mimeType: r.mime_type,
      uploadedBy: r.uploaded_by,
      uploadedByName: profiles.get(r.uploaded_by)?.name || "User",
      createdAt: r.created_at,
    }));
  }

  async function uploadProjectAsset(projectId, sessionUserId, body) {
    const project = await getProjectForUserFromDb(projectId, sessionUserId);
    if (!project) return jsonResponse({ error: "Not found" }, 404);

    if (body?.linkUrl) {
      const sb = await ensureClient();
      const { data, error } = await sb
        .from("project_assets")
        .insert({
          project_id: projectId,
          uploaded_by: sessionUserId,
          file_name: String(body?.fileName || body.linkUrl).slice(0, 200),
          link_url: String(body.linkUrl),
          asset_type: "link",
        })
        .select("*")
        .single();
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({
        id: data.id,
        fileName: data.file_name,
        linkUrl: data.link_url,
        assetType: "link",
        createdAt: data.created_at,
      }, 201);
    }

    const parsed = parseImageUploadBody(body);
    if (!parsed) return jsonResponse({ error: "Invalid file data" }, 400);
    if (parsed.bytes.length > 25 * 1024 * 1024) {
      return jsonResponse({ error: "File must be under 25 MB" }, 400);
    }

    const ext = (parsed.contentType.split("/")[1] || "bin").replace("jpeg", "jpg");
    const path = `${projectId}/${sessionUserId}/${Date.now()}.${ext}`;
    const sb = await ensureClient();
    const { error: upErr } = await sb.storage.from("project-assets").upload(path, parsed.bytes, {
      upsert: false,
      contentType: parsed.contentType,
    });
    if (upErr) return jsonResponse({ error: upErr.message }, 400);
    const { data: urlData } = sb.storage.from("project-assets").getPublicUrl(path);
    const fileName = String(body?.fileName || `asset.${ext}`).slice(0, 200);
    const { data, error } = await sb
      .from("project_assets")
      .insert({
        project_id: projectId,
        uploaded_by: sessionUserId,
        file_name: fileName,
        file_url: urlData.publicUrl,
        asset_type: "file",
        mime_type: parsed.contentType,
      })
      .select("*")
      .single();
    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({
      id: data.id,
      fileName: data.file_name,
      fileUrl: data.file_url,
      assetType: "file",
      mimeType: data.mime_type,
      createdAt: data.created_at,
    }, 201);
  }

  function parseImageUploadBody(body) {
    if (body?._formFile?.bytes) {
      return {
        contentType: body._formFile.contentType || "image/jpeg",
        bytes: body._formFile.bytes,
      };
    }
    if (body?.dataUrl) {
      const m = String(body.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return null;
      const contentType = m[1];
      const binary = atob(m[2]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { contentType, bytes };
    }
    if (body?.base64 && body?.contentType) {
      const binary = atob(String(body.base64));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { contentType: String(body.contentType), bytes };
    }
    return null;
  }

  async function uploadInfluencerAvatar(body) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const parsed = parseImageUploadBody(body);
    if (!parsed) {
      return jsonResponse({ error: "Invalid or missing image data" }, 400);
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(parsed.contentType)) {
      return jsonResponse({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." }, 400);
    }
    if (parsed.bytes.length > 5 * 1024 * 1024) {
      return jsonResponse({ error: "Image must be under 5 MB" }, 400);
    }

    const uid = session.user.id;
    const ts = Date.now();
    const ext =
      parsed.contentType === "image/png"
        ? "png"
        : parsed.contentType === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${uid}/${ts}.${ext}`;
    const contentType = parsed.contentType;
    const sb = await ensureClient();

    let bucket = "profile-photos";
    let { error: upErr } = await sb.storage.from(bucket).upload(path, parsed.bytes, {
      upsert: false,
      contentType,
    });
    if (upErr && String(upErr.message).includes("Bucket not found")) {
      bucket = "avatars";
      const ext = contentType.split("/")[1].replace("jpeg", "jpg");
      const legacyPath = `${uid}/avatar.${ext}`;
      const legacy = await sb.storage.from(bucket).upload(legacyPath, parsed.bytes, {
        upsert: true,
        contentType,
      });
      upErr = legacy.error;
      if (!upErr) {
        const { data: urlData } = sb.storage.from(bucket).getPublicUrl(legacyPath);
        const avatarUrl = `${urlData.publicUrl}?t=${ts}`;
        if (await checkTables()) {
          const { error: dbErr } = await sb.from("influencer_profiles").upsert(
            { user_id: uid, avatar_url: avatarUrl },
            { onConflict: "user_id" }
          );
          if (dbErr) return jsonResponse({ error: dbErr.message }, 400);
        }
        const user = await resolveUser(session.user);
        syncStoredUser(user, session.access_token);
        showToast("Profile photo saved.", "ok");
        return jsonResponse({ avatarUrl, profile: toInfluencerApiProfile(user) });
      }
    }
    if (upErr) {
      console.warn("[influnet] avatar upload:", upErr.message);
      const hint = String(upErr.message).includes("Bucket not found")
        ? " Run supabase/migrations/025_profile_photos_storage.sql in Supabase."
        : "";
      return jsonResponse({ error: upErr.message + hint }, 400);
    }

    const { data: urlData } = sb.storage.from(bucket).getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${ts}`;

    if (await checkTables()) {
      const { error: dbErr } = await sb.from("influencer_profiles").upsert(
        { user_id: uid, avatar_url: avatarUrl },
        { onConflict: "user_id" }
      );
      if (dbErr) {
        return jsonResponse({ error: dbErr.message }, 400);
      }
    }

    const user = await resolveUser(session.user);
    syncStoredUser(user, session.access_token);
    showToast("Profile photo saved.", "ok");
    return jsonResponse({
      avatarUrl,
      profile: toInfluencerApiProfile(user),
    });
  }

  async function uploadBusinessLogo(body) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const parsed = parseImageUploadBody(body);
    if (!parsed) {
      return jsonResponse({ error: "Invalid or missing image data" }, 400);
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    if (!allowed.includes(parsed.contentType)) {
      return jsonResponse(
        { error: "Unsupported image type. Use JPEG, PNG, WebP, GIF, or SVG." },
        400
      );
    }
    if (parsed.bytes.length > 5 * 1024 * 1024) {
      return jsonResponse({ error: "Image must be under 5 MB" }, 400);
    }

    const ext = parsed.contentType.split("/")[1].replace("jpeg", "jpg");
    const uid = session.user.id;
    const path = `${uid}/logo.${ext}`;
    const sb = await ensureClient();

    const { error: upErr } = await sb.storage.from("business-logos").upload(path, parsed.bytes, {
      upsert: true,
      contentType: parsed.contentType,
    });
    if (upErr) {
      console.warn("[influnet] business logo upload:", upErr.message);
      const hint = String(upErr.message).includes("Bucket not found")
        ? " Run supabase/migrations/021_profile_completion_and_business_public.sql in Supabase."
        : "";
      return jsonResponse({ error: upErr.message + hint }, 400);
    }

    const { data: urlData } = sb.storage.from("business-logos").getPublicUrl(path);
    const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    if (await checkTables()) {
      const { error: dbErr } = await sb.from("business_profiles").upsert(
        { user_id: uid, logo_url: logoUrl },
        { onConflict: "user_id" }
      );
      if (dbErr) {
        return jsonResponse({ error: dbErr.message }, 400);
      }
    }

    const profile = await resolveUser(session.user);
    const prevMeta = session.user.user_metadata || {};
    await sb.auth.updateUser({ data: { ...prevMeta, logoUrl } });

    const user = await resolveUser(session.user);
    syncStoredUser(user, session.access_token);
    showToast("Company logo saved.", "ok");
    return jsonResponse({
      logoUrl,
      profile: toBusinessApiProfile(user),
    });
  }

  async function handleApi(pathname, method, body, search) {
    if (pathname === "/api/auth/business/approve-test" && method === "POST") {
      return approveBusinessTest(body);
    }

    if (pathname.startsWith("/api/auth/")) {
      const action = pathname.replace("/api/auth/", "");
      return handleAuth(action, method, body);
    }

    if (pathname === "/api/phone-otp/send" && method === "POST") {
      return sendPhoneOtp(body);
    }

    if (pathname === "/api/phone-otp/verify" && method === "POST") {
      return verifyPhoneOtp(body);
    }

    if (pathname === "/api/influencer-profile/username/check" && method === "GET") {
      return checkUsernameAvailability(search);
    }

    if (pathname === "/api/influencer-profile/me" && method === "GET") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const profile = await resolveUser(session.user);
      return jsonResponse(toInfluencerApiProfile(profile));
    }

    if (pathname === "/api/influencer-profile/me" && method === "PATCH") {
      return updateInfluencerProfileMe(body);
    }

    if (pathname === "/api/influencer-profile/avatar" && method === "POST") {
      return uploadInfluencerAvatar(body);
    }

    if (pathname === "/api/business-profile/username/check" && method === "GET") {
      return checkBusinessUsernameAvailability(search);
    }

    if (pathname === "/api/business-profile/me" && method === "GET") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const profile = await resolveUser(session.user);
      return jsonResponse(toBusinessApiProfile(profile));
    }

    if (pathname === "/api/business-profile/me" && method === "PATCH") {
      return updateBusinessProfileMe(body);
    }

    if (pathname === "/api/business-profile/logo" && method === "POST") {
      return uploadBusinessLogo(body);
    }

    if (pathname === "/api/profile/completion" && method === "GET") {
      return getProfileCompletionResponse();
    }

    if (pathname === "/api/profile/completion" && method === "PATCH") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const resolved = await resolveUser(session.user);
      if (isBusinessOwnerRole(resolved?.role, {
        hasBusinessProfile: !!resolved?.companyName || !!resolved?.businessUsername,
      })) {
        const patchRes = await updateBusinessProfileMe(body);
        if (patchRes.status >= 400) return patchRes;
        const patchData = await patchRes.json();
        const completionRes = await getProfileCompletionResponse();
        const completionData = await completionRes.json();
        const savedProfile =
          patchData.profile || (patchData.userId ? patchData : null) || completionData.profile;
        return jsonResponse({
          ...completionData,
          profile: savedProfile,
          user: savedProfile,
        });
      }
      const patchRes = await updateInfluencerProfileMe(body);
      if (patchRes.status >= 400) return patchRes;
      const patchData = await patchRes.json();
      const completionRes = await getProfileCompletionResponse();
      const completionData = await completionRes.json();
      const savedProfile =
        patchData.profile || (patchData.userId ? patchData : null) || completionData.profile;
      return jsonResponse({
        ...completionData,
        profile: savedProfile,
        user: savedProfile,
      });
    }

    if (pathname === "/api/discover/influencers" && method === "GET") {
      const list = await listDiscoverInfluencers(search);
      return jsonResponse(list);
    }

    const publicInfluencerMatch = pathname.match(
      /^\/api\/public\/influencer\/([^/]+)$/
    );
    if (publicInfluencerMatch && method === "GET") {
      const slug = decodeURIComponent(publicInfluencerMatch[1]);
      const profile = await getPublicInfluencerBySlug(slug);
      if (!profile) {
        return jsonResponse({ error: "Profile not found" }, 404);
      }
      const session = await getSessionUser();
      let viewer = null;
      if (session?.user) {
        const vu = await resolveUser(session.user);
        if (vu?.id) {
          const viewerSlug = slugifyProfileName(vu.profileSlug || vu.name);
          const profileSlug = slugifyProfileName(profile.profileSlug || profile.name);
          const viewerHints = {
            hasBusinessProfile: !!vu.companyName || !!vu.businessUsername,
            hasInfluencerProfile: isInfluencerRole(vu.role),
          };
          const normalizedRole = normalizeUserRole(vu.role, viewerHints);
          const authMetaRole = session.user.user_metadata?.role ?? null;
          viewer = {
            id: vu.id,
            role: normalizedRole || vu.role,
            authMetaRole,
            profileRole: vu.role,
            isOwner:
              vu.id === profile.userId ||
              (!!viewerSlug && !!profileSlug && viewerSlug === profileSlug),
            isBusiness: isBusinessOwnerRole(vu.role, viewerHints),
            isInfluencer: isInfluencerRole(vu.role, viewerHints),
          };
        }
      }
      if (session?.user?.id && session.user.id !== profile.userId) {
        recordProfileView(profile.userId).catch(() => {});
      }
      return jsonResponse({ ...profile, viewer });
    }

    const publicInfluencerClick = pathname.match(
      /^\/api\/public\/influencer\/([^/]+)\/click$/i
    );
    if (publicInfluencerClick && method === "POST") {
      const slug = decodeURIComponent(publicInfluencerClick[1]);
      const profile = await getPublicInfluencerBySlug(slug);
      if (!profile?.userId) {
        return jsonResponse({ error: "Profile not found" }, 404);
      }
      await recordLinkClick(profile.userId, body?.linkType || "profile");
      return jsonResponse({ ok: true });
    }

    const publicBusinessMatch = pathname.match(/^\/api\/public\/business\/([^/]+)$/);
    if (publicBusinessMatch && method === "GET") {
      const slug = decodeURIComponent(publicBusinessMatch[1]);
      const profile = await getPublicBusinessBySlug(slug);
      if (!profile) {
        return jsonResponse({ error: "Profile not found" }, 404);
      }
      const session = await getSessionUser();
      let viewer = null;
      if (session?.user) {
        const vu = await resolveUser(session.user);
        if (vu?.id) {
          const viewerHints = {
            hasBusinessProfile: !!vu.companyName || !!vu.businessUsername,
            hasInfluencerProfile: isInfluencerRole(vu.role),
          };
          const normalizedRole = normalizeUserRole(vu.role, viewerHints);
          viewer = {
            id: vu.id,
            role: normalizedRole || vu.role,
            authMetaRole: session.user.user_metadata?.role ?? null,
            profileRole: vu.role,
            isOwner: vu.id === profile.userId,
            isBusiness: isBusinessOwnerRole(vu.role, viewerHints),
            isInfluencer: isInfluencerRole(vu.role, viewerHints),
          };
        }
      }
      return jsonResponse({ ...profile, viewer });
    }

    if (pathname === "/api/influencer/dashboard" && method === "GET") {
      return getInfluencerDashboard();
    }

    if (pathname === "/api/business/dashboard" && method === "GET") {
      return getBusinessDashboard();
    }

    if (pathname === "/api/conversations" && method === "GET") {
      const list = await listConversations();
      return jsonResponse(list);
    }
    if (pathname === "/api/conversations" && method === "POST") {
      if (!(await checkMessagingTables())) {
        return jsonResponse(
          {
            error:
              "Run supabase/migrations/002_collab_and_messages.sql in Supabase SQL Editor.",
          },
          503
        );
      }
      try {
        await syncSessionFromStorage();
        const conv = await findOrCreateConversation(body?.otherUserId);
        if (!conv) {
          showToast("Could not start chat. Check you are messaging the other party, not yourself.");
          return jsonResponse({ error: "Invalid otherUserId" }, 400);
        }
        return jsonResponse(conv, 201);
      } catch (e) {
        const msg = e.message || "Failed to start conversation";
        const status = e.status || (msg.includes("policy") ? 403 : 500);
        showToast(
          status === 403
            ? msg
            : msg.includes("policy")
              ? "Chat could not be created. Hard refresh, then run migration 003 in Supabase (see docs)."
              : msg
        );
        return jsonResponse({ error: msg }, status);
      }
    }

    const convMatch = pathname.match(/^\/api\/conversations\/([0-9a-f-]{36})$/i);
    if (convMatch && method === "DELETE") {
      const convId = convMatch[1];
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      hideConversationForUser(session.user.id, convId);
      const sb = await ensureClient();
      try {
        await sb
          .from("conversation_participants")
          .delete()
          .eq("conversation_id", convId)
          .eq("user_id", session.user.id);

        const { data: left } = await sb
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", convId)
          .limit(1);
        if (!left || left.length === 0) {
          await sb.from("messages").delete().eq("conversation_id", convId);
          await sb.from("conversations").delete().eq("id", convId);
        }
      } catch (e) {
        console.warn("[influnet] delete conversation fallback:", e?.message || e);
      }
      return empty204();
    }

    const attachMatch = pathname.match(
      /^\/api\/conversations\/([0-9a-f-]{36})\/attachments$/i
    );
    if (attachMatch && method === "POST") {
      return uploadMessageAttachment(attachMatch[1], body);
    }

    const unreadMatch = pathname.match(
      /^\/api\/conversations\/([0-9a-f-]{36})\/unread$/i
    );
    if (unreadMatch && method === "POST") {
      return markConversationUnread(unreadMatch[1]);
    }

    const msgMatch = pathname.match(
      /^\/api\/conversations\/([0-9a-f-]{36})\/messages$/i
    );
    if (msgMatch) {
      const convId = msgMatch[1];
      if (method === "GET") {
        const msgs = await listMessages(convId);
        return jsonResponse(msgs);
      }
      if (method === "POST") return createMessage(convId, body);
    }

    const msgPatch = pathname.match(
      /^\/api\/conversations\/([0-9a-f-]{36})\/messages\/([0-9a-f-]{36})$/i
    );
    if (msgPatch) {
      const convId = msgPatch[1];
      const msgId = msgPatch[2];
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const sb = await ensureClient();
      if (method === "PATCH") {
        const { data, error } = await sb
          .from("messages")
          .update({ body: body?.body ?? "" })
          .eq("id", msgId)
          .eq("conversation_id", convId)
          .eq("sender_user_id", session.user.id)
          .select("id, body, sender_user_id, deleted, created_at")
          .single();
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({
          id: data.id,
          body: data.body,
          senderUserId: data.sender_user_id,
          deleted: !!data.deleted,
          createdAt: data.created_at,
        });
      }
      if (method === "DELETE") {
        await sb
          .from("messages")
          .update({ deleted: true })
          .eq("id", msgId)
          .eq("conversation_id", convId)
          .eq("sender_user_id", session.user.id);
        return empty204();
      }
    }

    const typingMatch = pathname.match(
      /^\/api\/conversations\/([0-9a-f-]{36})\/typing$/i
    );
    if (typingMatch && method === "POST") {
      const convId = typingMatch[1];
      const session = await getSessionUser();
      if (session?.user) {
        await touchPresence(session.user.id);
        await setTyping(convId, session.user.id);
      }
      return empty204();
    }

    const contextMatch = pathname.match(
      /^\/api\/conversations\/([0-9a-f-]{36})\/context$/i
    );
    if (contextMatch && method === "GET") {
      const convId = contextMatch[1];
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const ctx = await getConversationContext(convId);
      if (ctx?.error) return jsonResponse({ error: ctx.error }, ctx.status || 400);
      return jsonResponse(ctx);
    }

    const statusMatch = pathname.match(
      /^\/api\/conversations\/([0-9a-f-]{36})\/status$/i
    );
    if (statusMatch && method === "GET") {
      const convId = statusMatch[1];
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const uid = session.user.id;
      const sb = await ensureClient();
      const { data: parts } = await sb
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", convId);
      const otherId = (parts || [])
        .map((p) => p.user_id)
        .find((id) => id !== uid);
      if (!otherId) {
        return jsonResponse({
          typing: false,
          isOnline: false,
          lastSeenAt: null,
          presenceEnabled: false,
        });
      }
      const presenceEnabled = await checkPresenceTables();
      if (!presenceEnabled) {
        return jsonResponse({
          typing: false,
          isOnline: false,
          lastSeenAt: null,
          presenceEnabled: false,
        });
      }
      const presenceMap = await loadPresenceMap([otherId]);
      const p = presenceMap.get(otherId) || {};
      return jsonResponse({
        typing:
          isTypingInConversation(p, convId) ||
          isUserTyping(convId, otherId),
        isOnline: !!p.isOnline,
        lastSeenAt: p.lastSeenAt || null,
        presenceEnabled: true,
      });
    }

    if (pathname === "/api/presence/ping" && method === "POST") {
      await syncSessionFromStorage();
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const uid = session.user.id;
      const profile = await loadProfileFromDb(uid);
      if (profile?.id) {
        profileEnsureCache = { uid, ok: true, at: Date.now() };
      }
      await touchPresence(uid);
      return jsonResponse({ ok: true, lastSeenAt: new Date().toISOString() });
    }

    if (pathname === "/api/notifications/summary" && method === "GET") {
      return jsonResponse(await getNotificationSummary());
    }

    if (pathname === "/api/collab-requests/incoming" && method === "GET") {
      return jsonResponse(await listCollabRequests("incoming"));
    }
    if (pathname === "/api/collab-requests/outgoing" && method === "GET") {
      return jsonResponse(await listCollabRequests("outgoing"));
    }
    if (pathname === "/api/collab-requests" && method === "GET") {
      const direction = search.get("direction") || "";
      return jsonResponse(await listCollabRequests(direction));
    }
    if (pathname === "/api/collab-requests" && method === "POST") {
      return createCollabRequest(body);
    }
    const collabPatch = pathname.match(
      /^\/api\/collab-requests\/([0-9a-f-]{36})$/i
    );
    if (collabPatch && method === "PATCH") {
      return updateCollabRequest(collabPatch[1], body);
    }

    if (pathname === "/api/projects/collaborators" && method === "GET") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      return jsonResponse(await listProjectCollaborators(session.user.id));
    }

    if (pathname === "/api/projects" && method === "GET") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      if (await checkProjectTables()) {
        return jsonResponse(await listProjectsForUserFromDb(session.user.id));
      }
      return jsonResponse(await listProjectsForUser(session.user.id));
    }
    if (pathname === "/api/projects" && method === "POST") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      if (!isUuid(body?.counterpartyUserId)) {
        return jsonResponse({ error: "Invalid counterparty user" }, 400);
      }
      if (body.counterpartyUserId === session.user.id) {
        return jsonResponse({ error: "Cannot create a project with yourself" }, 400);
      }

      const now = new Date().toISOString();
      const currentStage = PROJECT_STAGES[0];
      const stageProgress = normalizeStageProgress(currentStage);
      const creator = await resolveUser(session.user);
      const creatorName = creator?.name || "User";
      const project = {
        id: Date.now(),
        ownerUserId: session.user.id,
        counterpartyUserId: body.counterpartyUserId,
        title: String(body?.title || "Untitled campaign").trim(),
        description: body?.description ? String(body.description) : "",
        deliverables: body?.deliverables ? String(body.deliverables) : "",
        budget: Number.isFinite(Number(body?.budget)) ? Number(body.budget) : null,
        timeline: body?.timeline ? String(body.timeline) : null,
        startDate: body?.startDate ? String(body.startDate) : null,
        endDate: body?.endDate ? String(body.endDate) : null,
        conversationId: null,
        status: "active",
        currentStage,
        stageProgress,
        history: [
          {
            id: crypto.randomUUID(),
            stage: currentStage,
            action: "project_created",
            note: `${creatorName} created the collaboration`,
            createdAt: now,
            updatedByUserId: session.user.id,
            updatedByName: creatorName,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      if (await checkProjectTables()) {
        const sb = await ensureClient();
        let conversationId = null;
        try {
          conversationId = await ensureConversationForAcceptedCollab(
            session.user.id,
            body.counterpartyUserId,
            session.user.id,
            null
          );
        } catch {
          /* optional */
        }
        const { data, error } = await sb
          .from("campaign_projects")
          .insert({
            owner_user_id: project.ownerUserId,
            counterparty_user_id: project.counterpartyUserId,
            title: project.title,
            description: project.description,
            deliverables: project.deliverables,
            budget: project.budget,
            timeline: project.timeline,
            start_date: project.startDate || null,
            end_date: project.endDate || null,
            conversation_id: conversationId,
            status: project.status,
            current_stage: project.currentStage,
            stage_progress: project.stageProgress,
            history: project.history,
          })
          .select("*")
          .single();
        if (error) return jsonResponse({ error: error.message }, 400);
        const created = await enrichProjectCounterparty(mapProjectRow(data), session.user.id);
        await notifyProjectUpdate(created, session.user.id, projectStageLabel(currentStage));
        ensureConnectionForUsers(session.user.id, body.counterpartyUserId, {
          notify: true,
        }).catch(() => {});
        return jsonResponse(created, 201);
      }

      const all = loadProjectsStore();
      all.push(project);
      saveProjectsStore(all);
      const enriched = await enrichProjectCounterparty(project, session.user.id);
      ensureConnectionForUsers(session.user.id, body.counterpartyUserId, {
        notify: true,
      }).catch(() => {});
      return jsonResponse(enriched, 201);
    }
    const projectAdvance = pathname.match(/^\/api\/projects\/(\d+)\/advance$/);
    if (projectAdvance && method === "POST") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      return advanceProjectStage(Number(projectAdvance[1]), session.user.id, body || {});
    }

    const projectAssetsMatch = pathname.match(/^\/api\/projects\/(\d+)\/assets$/);
    if (projectAssetsMatch) {
      const id = Number(projectAssetsMatch[1]);
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      if (method === "GET") {
        const assets = await listProjectAssets(id, session.user.id);
        if (assets === null) return jsonResponse({ error: "Not found" }, 404);
        return jsonResponse(assets);
      }
      if (method === "POST") {
        return uploadProjectAsset(id, session.user.id, body || {});
      }
    }

    const projectId = pathname.match(/^\/api\/projects\/(\d+)$/);
    if (projectId) {
      const id = Number(projectId[1]);
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      if (method === "GET") {
        const project = (await checkProjectTables())
          ? await getProjectForUserFromDb(id, session.user.id)
          : await getProjectForUser(id, session.user.id);
        if (!project) return jsonResponse({ error: "Not found" }, 404);
        return jsonResponse(project);
      }
      if (method === "PATCH") {
        if (await checkProjectTables()) {
          const sb = await ensureClient();
          const existing = await sb
            .from("campaign_projects")
            .select("*")
            .eq("id", id)
            .or(`owner_user_id.eq.${session.user.id},counterparty_user_id.eq.${session.user.id}`)
            .single();
          if (existing.error || !existing.data) {
            return jsonResponse({ error: "Not found" }, 404);
          }
          const row = existing.data;
          const next = {
            title:
              typeof body?.title === "string" && body.title.trim()
                ? body.title.trim()
                : row.title,
            description:
              typeof body?.description === "string" ? body.description : row.description || "",
            timeline: typeof body?.timeline === "string" ? body.timeline : row.timeline,
            budget:
              body?.budget !== undefined && Number.isFinite(Number(body.budget))
                ? Number(body.budget)
                : row.budget,
            status: row.status,
            currentStage: row.current_stage,
            stageProgress: normalizeStageProgress(row.current_stage, row.stage_progress || {}),
            history: Array.isArray(row.history) ? row.history : [],
          };

          if (typeof body?.currentStage === "string") {
            const requested = normalizeProjectStage(body.currentStage);
            if (PROJECT_STAGES.includes(requested)) {
              const actor = await resolveUser(session.user);
              const actorName = actor?.name || "User";
              const stageLabel = projectStageLabel(requested);
              next.currentStage = requested;
              next.stageProgress = normalizeStageProgress(next.currentStage, next.stageProgress);
              next.history = [
                ...next.history,
                {
                  id: crypto.randomUUID(),
                  stage: next.currentStage,
                  action: "stage_advance",
                  note: `Moved project to ${stageLabel}`,
                  createdAt: new Date().toISOString(),
                  updatedByUserId: session.user.id,
                  updatedByName: actorName,
                },
              ];
            }
          }
          if (body?.stageProgress && typeof body.stageProgress === "object") {
            next.stageProgress = normalizeStageProgress(next.currentStage, {
              ...next.stageProgress,
              ...body.stageProgress,
            });
          }
          if (typeof body?.status === "string") next.status = body.status;
          if (next.currentStage === PROJECT_STAGES[PROJECT_STAGES.length - 1] || next.status === "completed") {
            next.currentStage = PROJECT_STAGES[PROJECT_STAGES.length - 1];
            next.status = "completed";
            next.stageProgress = PROJECT_STAGES.reduce((acc, key) => {
              acc[key] = 100;
              return acc;
            }, {});
          }

          const { data, error } = await sb
            .from("campaign_projects")
            .update({
              title: next.title,
              description: next.description,
              timeline: next.timeline,
              budget: next.budget,
              status: next.status,
              current_stage: next.currentStage,
              stage_progress: next.stageProgress,
              history: next.history,
            })
            .eq("id", id)
            .select("*")
            .single();
          if (error) return jsonResponse({ error: error.message }, 400);
          const updated = await enrichProjectCounterparty(mapProjectRow(data), session.user.id);
          if (typeof body?.currentStage === "string") {
            await notifyProjectUpdate(
              updated,
              session.user.id,
              projectStageLabel(updated.currentStage)
            );
          }
          return jsonResponse(updated);
        }

        const all = loadProjectsStore();
        const idx = all.findIndex((p) => Number(p.id) === id);
        if (idx === -1) return jsonResponse({ error: "Not found" }, 404);
        const row = all[idx];
        if (row.ownerUserId !== session.user.id && row.counterpartyUserId !== session.user.id) {
          return jsonResponse({ error: "Forbidden" }, 403);
        }

        if (typeof body?.title === "string") row.title = body.title.trim() || row.title;
        if (typeof body?.description === "string") row.description = body.description;
        if (typeof body?.timeline === "string") row.timeline = body.timeline;
        if (body?.budget !== undefined) {
          row.budget = Number.isFinite(Number(body.budget)) ? Number(body.budget) : row.budget;
        }

        if (typeof body?.currentStage === "string" && PROJECT_STAGES.includes(body.currentStage)) {
          row.currentStage = body.currentStage;
          row.stageProgress = normalizeStageProgress(row.currentStage, row.stageProgress);
          row.history = [
            ...(row.history || []),
            {
              id: crypto.randomUUID(),
              stage: row.currentStage,
              note: `Stage updated to ${row.currentStage}`,
              createdAt: new Date().toISOString(),
              updatedByUserId: session.user.id,
            },
          ];
          if (row.currentStage === PROJECT_STAGES[PROJECT_STAGES.length - 1]) {
            row.status = "completed";
            row.stageProgress = PROJECT_STAGES.reduce((acc, key) => {
              acc[key] = 100;
              return acc;
            }, {});
          }
        }

        if (body?.stageProgress && typeof body.stageProgress === "object") {
          row.stageProgress = normalizeStageProgress(row.currentStage, {
            ...(row.stageProgress || {}),
            ...body.stageProgress,
          });
        }

        if (typeof body?.status === "string") {
          row.status = body.status;
          if (row.status === "completed") {
            row.currentStage = PROJECT_STAGES[PROJECT_STAGES.length - 1];
            row.stageProgress = PROJECT_STAGES.reduce((acc, key) => {
              acc[key] = 100;
              return acc;
            }, {});
          }
        }

        row.updatedAt = new Date().toISOString();
        all[idx] = row;
        saveProjectsStore(all);
        return jsonResponse(await enrichProjectCounterparty(row, session.user.id));
      }
    }

    if (pathname === "/api/shortlists" && method === "GET") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      return jsonResponse(listShortlistsForUser(session.user.id));
    }
    if (pathname === "/api/shortlists" && method === "POST") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const influencerUserId = body?.influencerUserId || body?.id;
      if (!isUuid(influencerUserId)) {
        return jsonResponse({ error: "Invalid influencer id" }, 400);
      }
      if (influencerUserId === session.user.id) {
        return jsonResponse({ error: "Cannot shortlist yourself" }, 400);
      }
      const all = loadShortlistsStore();
      const existing = all.find(
        (x) => x.userId === session.user.id && x.influencerUserId === influencerUserId
      );
      if (existing) return jsonResponse(existing);
      const row = {
        id: Date.now(),
        userId: session.user.id,
        influencerUserId,
        note: body?.note ? String(body.note) : "",
        createdAt: new Date().toISOString(),
      };
      all.push(row);
      saveShortlistsStore(all);
      if (await checkDashboardMetricsTables()) {
        const sb = await ensureClient();
        await sb.from("influencer_shortlists").upsert(
          {
            business_user_id: session.user.id,
            influencer_user_id: influencerUserId,
            note: row.note || null,
          },
          { onConflict: "business_user_id,influencer_user_id" }
        );
      }
      return jsonResponse(row, 201);
    }
    const shortlistId = pathname.match(/^\/api\/shortlists\/([^/]+)$/);
    if (shortlistId && method === "DELETE") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const token = String(shortlistId[1]);
      const all = loadShortlistsStore();
      const next = all.filter((x) => {
        if (x.userId !== session.user.id) return true;
        return String(x.id) !== token && String(x.influencerUserId) !== token;
      });
      saveShortlistsStore(next);
      return empty204();
    }

    if (pathname === "/api/connections" && method === "GET") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      try {
        const data = await listConnectionsForUser(session.user.id, {
          filter: search?.get?.("filter") || "all",
          search: search?.get?.("search") || "",
        });
        return jsonResponse(data);
      } catch (e) {
        return jsonResponse({ error: e.message || "Failed to load connections" }, 500);
      }
    }
    if (pathname === "/api/connections" && method === "POST") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const otherId = body?.connectedUserId || body?.userId;
      if (!isUuid(otherId)) return jsonResponse({ error: "Invalid user id" }, 400);
      if (otherId === session.user.id) {
        return jsonResponse({ error: "Cannot connect with yourself" }, 400);
      }
      const row = await ensureConnectionForUsers(session.user.id, otherId, { notify: true });
      if (!row) return jsonResponse({ error: "Connections not configured" }, 503);
      return jsonResponse({ connection: row }, 201);
    }
    const connectionMatch = pathname.match(/^\/api\/connections\/([0-9a-f-]{36})$/i);
    if (connectionMatch) {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      const connId = connectionMatch[1];
      if (method === "GET") {
        const detail = await getConnectionDetailForUser(session.user.id, connId);
        if (!detail) return jsonResponse({ error: "Connection not found" }, 404);
        return jsonResponse(detail);
      }
      if (method === "PATCH") {
        return updateConnectionForUser(session.user.id, connId, body || {});
      }
      if (method === "DELETE") {
        return updateConnectionForUser(session.user.id, connId, { status: "removed" });
      }
    }

    console.warn("[influnet] Unhandled API:", method, pathname);
    if (method === "GET") return jsonResponse([]);
    if (method === "DELETE") return empty204();
    return jsonResponse({});
  }

  /* Real-time typing + presence via polling EventSource (/api/events) */
  const NativeEventSource = window.EventSource;
  if (NativeEventSource) {
    window.EventSource = function (url, config) {
      if (String(url).indexOf("/api/events") === -1) {
        return new NativeEventSource(url, config);
      }

      const client = {
        url,
        readyState: 0,
        onopen: null,
        onmessage: null,
        onerror: null,
        userId: null,
        _closed: false,
        _timer: null,
        close() {
          this._closed = true;
          if (this._timer) clearInterval(this._timer);
          sseClients.delete(this);
          this.readyState = 2;
        },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return true;
        },
      };

      sseClients.add(client);
      syncSessionFromStorage().then((session) => {
        if (client._closed) return;
        client.userId = session?.user?.id || null;
        if (client.userId) touchPresence(client.userId);
        client.readyState = 1;
        client.onopen?.({});
        client._timer = setInterval(async () => {
          if (client._closed) return;
          pruneTyping();
          if (client.userId) {
            await touchPresence(client.userId);
            const lastSeenAt = new Date().toISOString();
            broadcastSse({
              type: "presence",
              userId: client.userId,
              lastSeenAt,
              isOnline: isOnlineFromLastSeen(lastSeenAt),
            });
          }
        }, 30000);
      });

      return client;
    };
    window.EventSource.prototype = NativeEventSource.prototype;
  }

  setInterval(() => {
    pruneTyping();
    for (const [key, until] of typingUntil) {
      if (until <= Date.now()) continue;
      const [conversationId, userId] = key.split(":");
      if (conversationId && userId) {
        broadcastSse({ type: "typing", conversationId, userId });
      }
    }
  }, 1500);

  const nativeFetch = window.fetch.bind(window);

  async function parseApiRequestBody(init) {
    if (!init?.body) return {};
    if (typeof FormData !== "undefined" && init.body instanceof FormData) {
      const file =
        init.body.get("file") ||
        init.body.get("avatar") ||
        init.body.get("logo");
      if (file && typeof file.arrayBuffer === "function") {
        const buf = await file.arrayBuffer();
        return {
          _formFile: {
            contentType: file.type || "image/jpeg",
            bytes: new Uint8Array(buf),
            name: file.name || "upload",
          },
        };
      }
      return {};
    }
    if (typeof init.body === "string") {
      try {
        return JSON.parse(init.body);
      } catch {
        return {};
      }
    }
    return init.body;
  }

  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input?.url;
    const method = (init?.method || "GET").toUpperCase();
    const api = url ? parseApi(url) : null;

    if (api) {
      try {
        const body = await parseApiRequestBody(init);
        const res = await handleApi(api.pathname, method, body, api.search);
        if (res) return res;
      } catch (e) {
        console.error("[influnet] API bridge", e);
        return jsonResponse({ error: e.message || "Request failed" }, 500);
      }
    }

    return nativeFetch(input, init);
  };

  console.info("[influnet] Supabase + API bridge active");
})();
