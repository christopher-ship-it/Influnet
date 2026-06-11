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

  const ONLINE_MS = 90 * 1000;
  const TYPING_MS = 4000;
  const DUMMY_OTP_ENABLED = true;
  const DUMMY_OTP_CODE = "12345678";
  /** @type {Map<string, number>} */
  const typingUntil = new Map();
  /** @type {Set<{ onmessage: ((ev: { data: string }) => void) | null, userId: string | null }>} */
  const sseClients = new Set();
  /** @type {Map<string, { lastSeenAt: string, isOnline: boolean }>} */
  const presenceCache = new Map();

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

  function persistSession(session) {
    if (!session) return;
    localStorage.setItem("influnet_token", session.access_token);
    if (session.refresh_token) {
      localStorage.setItem("influnet_refresh_token", session.refresh_token);
    }
  }

  /** Keep Supabase client session in sync with influnet_token (needed for DB / discover). */
  async function syncSessionFromStorage() {
    const sb = await ensureClient();
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (session?.user) return session;

    const access = localStorage.getItem("influnet_token");
    const refresh = localStorage.getItem("influnet_refresh_token");
    if (!access) return null;

    if (refresh) {
      const { data, error } = await sb.auth.setSession({
        access_token: access,
        refresh_token: refresh,
      });
      if (!error && data?.session?.user) return data.session;
      if (error) console.warn("[influnet] session sync:", error.message);
    }

    const { data: userData, error: userErr } = await sb.auth.getUser(access);
    if (!userErr && userData?.user) {
      return {
        access_token: access,
        refresh_token: refresh || "",
        user: userData.user,
        token_type: "bearer",
      };
    }
    return null;
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

  supabaseReady.then(() => hydrateUserFromServer());

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
    if (user) localStorage.setItem("influnet_user", JSON.stringify(user));
    if (token) localStorage.setItem("influnet_token", token);
    window.dispatchEvent(
      new CustomEvent("influnet-user-updated", { detail: { user, token } })
    );
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
    const { error } = await sb.from("profile_views").select("id").limit(1);
    dashboardMetricsReady = !error || error.code !== "PGRST205";
    return dashboardMetricsReady;
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
    if (!userId) return;
    const now = new Date().toISOString();
    presenceCache.set(userId, { lastSeenAt: now, isOnline: true });
    if (!(await checkPresenceTables())) return;
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

  function attachPresence(otherUser, presenceMap, conversationId) {
    const p = presenceMap.get(otherUser.id) || {
      lastSeenAt: null,
      isOnline: false,
    };
    return {
      ...otherUser,
      isOnline: p.isOnline,
      lastSeenAt: p.lastSeenAt,
      isTyping: isTypingInConversation(p, conversationId),
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
    const session = await getSessionUser();
    if (!session?.user) return false;
    const sb = await ensureClient();
    const { data: row } = await sb
      .from("profiles")
      .select("id")
      .eq("id", session.user.id)
      .maybeSingle();
    if (row) return true;

    const m = session.user.user_metadata || {};
    const role =
      m.role === "influencer"
        ? "influencer"
        : m.role === "business_owner"
          ? "business_owner"
          : null;
    if (!role) {
      console.warn("[influnet] ensureOwnProfile: missing role in user metadata");
      return false;
    }
    const payload = {
      role,
      email: session.user.email,
      name: m.name,
      phone: m.phone,
      location: m.location,
      companyName: m.companyName,
      businessType: m.businessType,
      industry: m.industry,
      gstNumber: m.gstNumber,
      website: m.website,
      collabPreferences: m.collabPreferences,
      marketingBudget: m.marketingBudget,
      bio: m.bio,
      niche: m.niche,
      instagramHandle: m.instagramHandle,
      youtubeHandle: m.youtubeHandle,
      twitterHandle: m.twitterHandle,
      gender: m.gender,
      facebookHandle: m.facebookHandle,
      linkedinHandle: m.linkedinHandle,
      extraSocialLinks: parseExtraSocialLinks(m.extraSocialLinks),
    };
    const { error } = await sb.rpc("register_profile", { payload });
    if (error) {
      console.warn("[influnet] ensureOwnProfile:", error.message);
      return false;
    }
    return true;
  }

  async function loadProfilesMap(userIds) {
    const ids = [...new Set(userIds.filter(isUuid))];
    const map = new Map();
    if (!ids.length) return map;
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("profiles")
      .select(
        "id, name, email, role, business_profiles(company_name), influencer_profiles(niche)"
      )
      .in("id", ids);
    if (error) {
      console.warn("[influnet] loadProfilesMap:", error.message);
      return map;
    }
    for (const row of data || []) {
      const bp = Array.isArray(row.business_profiles)
        ? row.business_profiles[0]
        : row.business_profiles;
      const ip = Array.isArray(row.influencer_profiles)
        ? row.influencer_profiles[0]
        : row.influencer_profiles;
      map.set(row.id, {
        id: row.id,
        name: row.name || "User",
        email: row.email,
        role: row.role,
        companyName: bp?.company_name ?? null,
        niche: normalizeNiche(ip?.niche),
        verified: false,
      });
    }
    return map;
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

  function broadcastNotification(event) {
    broadcastSse(event);
    try {
      window.dispatchEvent(new CustomEvent("influnet-notification", { detail: event }));
    } catch {
      /* ignore */
    }
  }

  async function getNotificationSummary() {
    const session = await getSessionUser();
    if (!session?.user) {
      return { unreadMessagesCount: 0, pendingRequestsCount: 0 };
    }
    const user = await resolveUser(session.user);
    const conversations = await listConversations();
    const unreadMessagesCount = conversations.filter(
      (c) => (c.unreadCount || 0) > 0
    ).length;
    const requestDir = user.role === "influencer" ? "incoming" : "outgoing";
    const requests = await listCollabRequests(requestDir);
    const pendingRequestsCount = requests.filter(
      (r) => String(r.status).toLowerCase() === "pending"
    ).length;
    return { unreadMessagesCount, pendingRequestsCount };
  }

  function formatCollabRow(row, profiles) {
    const from = profiles.get(row.from_user_id) || {
      id: row.from_user_id,
      name: "User",
      companyName: null,
      niche: ["Creator"],
    };
    const to = profiles.get(row.to_user_id) || {
      id: row.to_user_id,
      name: "User",
      niche: ["Creator"],
      verified: false,
    };
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
      },
      toUser: {
        id: to.id,
        name: to.name,
        niche: to.niche,
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
    const sender = senderProfiles.get(session.user.id);
    if (sender?.role !== "business_owner") {
      showToast("Only business accounts can send collaboration requests.");
      return jsonResponse({ error: "Only business accounts can send requests" }, 403);
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
    if (targetProfile.role !== "influencer") {
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
        toUserId: data.to_user_id,
        fromUserId: data.from_user_id,
      });
    }
    if (status === "declined" || status === "cancelled") {
      broadcastNotification({
        type: "REQUEST_REJECTED",
        requestId: data.id,
        status,
      });
    }

    return jsonResponse(formatted);
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
    if (convId && message) {
      await seedMessageIfEmpty(convId, seedFrom, message);
    }
    return convId;
  }

  /** One conversation per accepted collab (fixes empty Messages after accept). */
  async function syncConversationsFromAcceptedCollabs() {
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

  async function formatConversationRow(conversationId, uid, lastReadAt) {
    const sb = await ensureClient();
    const { data: participants } = await sb
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId);
    const otherId = (participants || [])
      .map((p) => p.user_id)
      .find((id) => id !== uid);
    const profiles = await loadProfilesMap([uid, otherId].filter(Boolean));
    let other = profiles.get(otherId) || { id: otherId, name: "User" };
    const presenceMap = await loadPresenceMap([otherId]);
    other = attachPresence(other, presenceMap, conversationId);

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
      lastMessage: last?.body ?? null,
      lastMessageAt: last?.created_at ?? null,
      otherUser: {
        id: other.id,
        name: other.name,
        companyName: other.companyName,
        industry: other.industry,
        niche: other.niche,
        avatarUrl: other.avatarUrl,
        isOnline: !!other.isOnline,
        lastSeenAt: other.lastSeenAt || null,
        isTyping: !!other.isTyping,
      },
    };
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
    const rows = [];
    for (const p of parts || []) {
      if (hidden.has(p.conversation_id)) continue;
      rows.push(
        await formatConversationRow(p.conversation_id, uid, p.last_read_at)
      );
    }
    rows.sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
    return rows;
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
    return (data || []).map((m) => ({
      id: m.id,
      body: m.body,
      senderUserId: m.sender_user_id,
      deleted: !!m.deleted,
      createdAt: m.created_at,
    }));
  }

  async function createMessage(conversationId, body) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
    await touchPresence(session.user.id);
    await clearTyping(session.user.id);
    const text = body?.body ?? "";
    if (!text.trim()) return jsonResponse({ error: "Empty message" }, 400);
    const sb = await ensureClient();
    const { data, error } = await sb
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_user_id: session.user.id,
        body: text.trim(),
      })
      .select("id, body, sender_user_id, deleted, created_at")
      .single();
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
    return jsonResponse({
      id: data.id,
      body: data.body,
      senderUserId: data.sender_user_id,
      deleted: !!data.deleted,
      createdAt: data.created_at,
    });
  }

  function mapUser(authUser) {
    const m = authUser?.user_metadata || {};
    return {
      id: authUser.id,
      email: authUser.email,
      name: m.name ?? null,
      phone: m.phone ?? null,
      role: m.role ?? null,
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
      linkedinHandle: m.linkedinHandle ?? null,
      extraSocialLinks: formatExtraSocialLinks(m.extraSocialLinks),
      instagramFollowers:
        m.instagramFollowers != null ? Number(m.instagramFollowers) : null,
      youtubeSubscribers:
        m.youtubeSubscribers != null ? Number(m.youtubeSubscribers) : null,
      tiktokFollowers: m.tiktokFollowers != null ? Number(m.tiktokFollowers) : null,
      facebookFollowers:
        m.facebookFollowers != null ? Number(m.facebookFollowers) : null,
    };
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
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      role: data.role,
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
      city: bp?.city ?? null,
      state: bp?.state ?? null,
      approvalStatus: bp?.approval_status ?? null,
      instagramHandle: bp?.instagram_handle ?? ip?.instagram_handle ?? null,
      facebookHandle: bp?.facebook_handle ?? ip?.facebook_handle ?? null,
      linkedinHandle: bp?.linkedin_handle ?? ip?.linkedin_handle ?? null,
      bio: ip?.bio ?? null,
      niche: ip?.niche ?? null,
      youtubeHandle: ip?.youtube_handle ?? null,
      twitterHandle: ip?.twitter_handle ?? null,
      gender: ip?.gender ?? null,
      extraSocialLinks: formatExtraSocialLinks(ip?.extra_social_links),
      profileSlug: ip?.profile_slug ?? null,
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
      isVerified: !!ip?.is_verified,
      city: ip?.city ?? null,
      state: ip?.state ?? null,
      languages: Array.isArray(ip?.languages) ? ip.languages : [],
      collabTypes: Array.isArray(ip?.collab_types) ? ip.collab_types : [],
      priceRange: ip?.price_range ?? null,
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
  };

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

  function isSocialHandleForPlatform(platform, raw) {
    if (!raw) return false;
    const s = String(raw).trim().toLowerCase();
    if (!s) return false;
    if (!looksLikeSocialUrl(s)) return true;
    const domains = SOCIAL_PLATFORM_DOMAINS[platform];
    if (!domains) return true;
    return domains.some((d) => s.includes(d));
  }

  function formatSocialHandle(platform, raw) {
    if (!raw) return "";
    let s = String(raw).trim();
    if (!s) return "";

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
    if (platform === "instagram" || platform === "tiktok" || platform === "twitter") {
      return display.replace(/^@/, "");
    }
    if (platform === "youtube") return display.replace(/^@/, "");
    return display;
  }

  /** Keep user-entered handles when strict URL validation would clear them. */
  function normalizeSocialInputLenient(platform, raw) {
    if (raw == null) return undefined;
    const trimmed = String(raw).trim();
    if (!trimmed) return null;
    const normalized = normalizeSocialInput(platform, trimmed);
    if (normalized) return normalized;
    let s = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    const parts = s.split("/").filter(Boolean);
    const last = (parts[parts.length - 1] || s).replace(/^@+/, "");
    return last || trimmed.replace(/^@+/, "");
  }

  function slugifyProfileName(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function normalizeProfileSlug(value) {
    return slugifyProfileName(value);
  }

  function publicInfluencerUrl(slug) {
    const origin = window.location.origin;
    const s = slugifyProfileName(slug);
    return s ? `${origin}/influnet/${s}` : origin;
  }

  function parseProfileSlugFromQuery(q) {
    const t = String(q || "").trim();
    if (!t) return null;
    const fromPath = t.match(/influnet[/\\]([a-z0-9-]+)/i);
    if (fromPath) return normalizeProfileSlug(fromPath[1]);
    if (/^[a-z0-9][a-z0-9-]*$/i.test(t)) return normalizeProfileSlug(t);
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

  function computeProfileCompletion(profile) {
    const checks = [
      {
        key: "photo",
        label: "Profile Photo",
        done: !!(profile?.avatarUrl && String(profile.avatarUrl).trim()),
      },
      {
        key: "bio",
        label: "Bio",
        done: !!(profile?.bio && String(profile.bio).trim()),
      },
      {
        key: "location",
        label: "Location",
        done: !!(profile?.location && String(profile.location).trim()),
      },
      {
        key: "categories",
        label: "Categories",
        done: normalizeNiche(profile?.niche).length > 0,
      },
      {
        key: "social",
        label: "Social Links",
        done: hasSocialLinks(profile),
      },
      {
        key: "portfolio",
        label: "Portfolio",
        done:
          Array.isArray(profile?.portfolio) && profile.portfolio.length > 0,
      },
      {
        key: "contact",
        label: "Contact Information",
        done: !!(profile?.phone && String(profile.phone).trim()),
      },
      {
        key: "mediaKit",
        label: "Media Kit",
        done: !!(profile?.mediaKitUrl && String(profile.mediaKitUrl).trim()),
      },
    ];
    const done = checks.filter((c) => c.done).length;
    return {
      percent: Math.round((done / checks.length) * 100),
      checks,
    };
  }

  function buildSocialPlatformCards(profile) {
    if (!profile) return [];
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
        metricLabel: null,
        metric: null,
      },
    ];

    const cards = [];
    for (const d of defs) {
      const raw = d.raw;
      const metric = d.metric != null ? Number(d.metric) : 0;
      const hasHandle = raw && String(raw).trim();
      const hasMetric = metric > 0;
      if (!hasHandle && !hasMetric) continue;
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
    return cards;
  }

  function toInfluencerApiProfile(profile) {
    if (!profile) return null;
    const slug = profile.profileSlug || slugifyProfileName(profile.name);
    return {
      userId: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      bio: profile.bio,
      location: profile.location,
      gender: profile.gender,
      niche: profile.niche,
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
      profileSlug: slug,
      profileUrl: publicInfluencerUrl(slug),
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
    };
  }

  async function resolveUser(authUser) {
    const meta = mapUser(authUser);
    if (await checkTables()) {
      const fromDb = await loadProfileFromDb(authUser.id);
      if (fromDb) {
        const metaRole = authUser.user_metadata?.role;
        const sb = await ensureClient();
        // Auth metadata is the source of truth when the user signed up as business or influencer.
        if (
          (metaRole === "influencer" || metaRole === "business_owner") &&
          fromDb.role !== metaRole
        ) {
          const { error } = await sb
            .from("profiles")
            .update({ role: metaRole })
            .eq("id", authUser.id);
          if (!error) fromDb.role = metaRole;
        } else if (
          fromDb.hasInfluencerProfile &&
          !fromDb.hasBusinessProfile &&
          fromDb.role !== "influencer" &&
          metaRole !== "business_owner"
        ) {
          // Influencer-only account with a stale role — do not flip business accounts.
          const { error } = await sb
            .from("profiles")
            .update({ role: "influencer" })
            .eq("id", authUser.id);
          if (!error) fromDb.role = "influencer";
        } else if (
          fromDb.hasBusinessProfile &&
          !fromDb.hasInfluencerProfile &&
          fromDb.role !== "business_owner" &&
          metaRole !== "influencer"
        ) {
          const { error } = await sb
            .from("profiles")
            .update({ role: "business_owner" })
            .eq("id", authUser.id);
          if (!error) fromDb.role = "business_owner";
        }
        const { hasInfluencerProfile, hasBusinessProfile, ...profile } = fromDb;
        return {
          ...meta,
          ...profile,
          role: fromDb.role,
          businessType: fromDb.businessType ?? meta.businessType,
          marketingBudget: fromDb.marketingBudget ?? meta.marketingBudget,
          registeredAddress: fromDb.registeredAddress ?? meta.registeredAddress,
          city: fromDb.city ?? meta.city,
          state: fromDb.state ?? meta.state,
          instagramHandle: fromDb.instagramHandle ?? meta.instagramHandle,
          facebookHandle: fromDb.facebookHandle ?? meta.facebookHandle,
          linkedinHandle: fromDb.linkedinHandle ?? meta.linkedinHandle,
          instagramFollowers:
            profile.instagramFollowers ?? meta.instagramFollowers ?? 0,
          youtubeSubscribers:
            profile.youtubeSubscribers ?? meta.youtubeSubscribers ?? 0,
          tiktokFollowers: profile.tiktokFollowers ?? meta.tiktokFollowers ?? 0,
          facebookFollowers:
            profile.facebookFollowers ?? meta.facebookFollowers ?? 0,
        };
      }
    }
    return meta;
  }

  async function getSessionUser() {
    return syncSessionFromStorage();
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
      syncStoredUser(user, data.session.access_token);
      return jsonResponse({
        user,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });
    }
    if (action === "register" && method === "POST") {
      const sb = await ensureClient();
      const { email, password, ...meta } = body;

      const BUSINESS_REVIEW_MESSAGE =
        "Your account information has been saved. We will review your account and send you a confirmation.";

      async function completeRegistration(authData) {
        const signupRole =
          body.role === "influencer" ? "influencer" : "business_owner";
        const isBusinessSignup = signupRole === "business_owner";

        if (await checkTables()) {
          const signupPayload = {
            ...body,
            role: signupRole,
            approvalStatus: isBusinessSignup ? "pending_review" : undefined,
            extraSocialLinks: parseExtraSocialLinks(body.extraSocialLinks),
          };
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

        const signupMeta = {
          ...meta,
          role: signupRole,
          ...(isBusinessSignup ? { approvalStatus: "pending_review" } : {}),
        };
        await sb.auth.updateUser({ data: signupMeta });

        if (isBusinessSignup) {
          await sb.auth.signOut();
          localStorage.removeItem("influnet_token");
          localStorage.removeItem("influnet_refresh_token");
          localStorage.removeItem("influnet_user");
          return jsonResponse({
            pendingReview: true,
            message: BUSINESS_REVIEW_MESSAGE,
            email,
          });
        }

        persistSession(authData.session);
        if (await checkTables()) await ensureOwnProfileInDb();
        const user = await resolveUser(authData.user);
        syncStoredUser(user, authData.session.access_token);
        return jsonResponse({ user, token: authData.session.access_token });
      }

      if (DUMMY_OTP_ENABLED) {
        const signupRole =
          body.role === "influencer" ? "influencer" : "business_owner";
        const signupMeta = { ...meta, role: signupRole };

        const signup = await sb.auth.signUp({
          email,
          password,
          options: { data: signupMeta },
        });

        async function loginAfterSignup(fallbackError, emailAlreadyUsed) {
          const login = await sb.auth.signInWithPassword({ email, password });
          if (!login.error && login.data?.session) {
            await sb.auth.updateUser({ data: signupMeta });
            return completeRegistration(login.data);
          }
          const loginMsg = login.error?.message || "";
          if (emailAlreadyUsed || /already|registered|exists/i.test(fallbackError || "")) {
            return jsonResponse(
              {
                error:
                  "This email is already registered. Sign in with your existing password, or use a different email.",
              },
              400
            );
          }
          if (/confirm|verified/i.test(loginMsg)) {
            return jsonResponse(
              {
                error:
                  'Account created but email confirmation is still required. Turn off "Confirm email" in Supabase → Authentication → Email, then try signup again.',
              },
              400
            );
          }
          if (/invalid login|invalid credential/i.test(loginMsg)) {
            return jsonResponse(
              {
                error:
                  "Sign-in failed after signup. Use a new email address, or log in if you already have an account.",
              },
              400
            );
          }
          return jsonResponse(
            { error: fallbackError || loginMsg || "Registration failed." },
            400
          );
        }

        const emailAlreadyUsed =
          signup.error &&
          /already|registered|exists/i.test(signup.error.message);

        if (signup.error && /rate limit/i.test(signup.error.message)) {
          return loginAfterSignup(signup.error.message, emailAlreadyUsed);
        }

        if (signup.error && !emailAlreadyUsed) {
          return jsonResponse({ error: signup.error.message }, 400);
        }

        if (signup.data?.session) {
          await sb.auth.updateUser({ data: signupMeta });
          return completeRegistration(signup.data);
        }

        if (signup.error) {
          return loginAfterSignup(signup.error.message, true);
        }

        return loginAfterSignup(
          "Registration failed. Try signing in or use a different email.",
          false
        );
      }

      let data;
      const signup = await sb.auth.signUp({
        email,
        password,
        options: {
          data: meta,
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      data = signup.data;

      if (signup.error && /already|registered|exists/i.test(signup.error.message)) {
        const login = await sb.auth.signInWithPassword({ email, password });
        if (login.error) return jsonResponse({ error: login.error.message }, 400);
        data = login.data;
        await sb.auth.updateUser({ data: meta });
      } else if (signup.error) {
        return jsonResponse({ error: signup.error.message }, 400);
      }

      if (!data.session) {
        const msg =
          "Account created. Check your email and click the confirmation link, then sign in.";
        showToast(msg, "ok");
        return jsonResponse({
          pendingEmailConfirmation: true,
          message: msg,
          email,
        });
      }
      return completeRegistration(data);
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
      await sb
        .from("profiles")
        .update({
          name: meta.name,
          phone: meta.phone || null,
          location,
        })
        .eq("id", uid);
      if (role === "business_owner") {
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
            collab_preferences: meta.collabPreferences || [],
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

    const niche =
      body.niche != null
        ? Array.isArray(body.niche)
          ? body.niche.filter(Boolean).map(String)
          : [String(body.niche)]
        : normalizeNiche(prev.niche ?? prevMeta.niche);

    const extraSocialLinks = parseExtraSocialLinks(
      body.extraSocialLinks != null ? body.extraSocialLinks : prev.extraSocialLinks
    );

    const locParts = parseLocationParts(
      body.location != null ? body.location : prev.location,
      body.city != null ? body.city : prev.city,
      body.state != null ? body.state : prev.state
    );

    const meta = {
      ...prevMeta,
      role: "influencer",
      bio: body.bio != null ? String(body.bio) : prev.bio ?? prevMeta.bio ?? null,
      location: locParts.location,
      city: locParts.city || null,
      state: locParts.state || null,
      gender: body.gender != null ? body.gender : prev.gender ?? prevMeta.gender ?? null,
      niche,
      instagramHandle:
        body.instagramHandle != null
          ? normalizeSocialInputLenient("instagram", body.instagramHandle)
          : prev.instagramHandle ?? prevMeta.instagramHandle ?? null,
      facebookHandle:
        body.facebookHandle != null
          ? normalizeSocialInputLenient("facebook", body.facebookHandle)
          : prev.facebookHandle ?? prevMeta.facebookHandle ?? null,
      youtubeHandle:
        body.youtubeHandle != null
          ? normalizeSocialInputLenient("youtube", body.youtubeHandle)
          : prev.youtubeHandle ?? prevMeta.youtubeHandle ?? null,
      linkedinHandle:
        body.linkedinHandle != null
          ? normalizeSocialInputLenient("linkedin", body.linkedinHandle)
          : prev.linkedinHandle ?? prevMeta.linkedinHandle ?? null,
      twitterHandle:
        body.twitterHandle != null
          ? normalizeSocialInputLenient("twitter", body.twitterHandle)
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
      if (body.phone != null) {
        profilePatch.phone = String(body.phone).trim() || null;
      }
      await sb.from("profiles").update(profilePatch).eq("id", uid);

      const languages =
        body.languages != null
          ? Array.isArray(body.languages)
            ? body.languages.filter(Boolean).map(String)
            : []
          : Array.isArray(prev.languages)
            ? prev.languages
            : [];

      const collabTypes =
        body.collabTypes != null
          ? Array.isArray(body.collabTypes)
            ? body.collabTypes.filter(Boolean).map(String)
            : []
          : Array.isArray(prev.collabTypes)
            ? prev.collabTypes
            : [];

      const priceRange =
        body.priceRange != null
          ? String(body.priceRange).trim() || null
          : prev.priceRange ?? null;

      const ipRow = {
        user_id: uid,
        bio: meta.bio || null,
        niche,
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
      if (body.avatarUrl != null) {
        ipRow.avatar_url = String(body.avatarUrl).trim() || null;
      }
      if (body.tiktokHandle != null) {
        ipRow.tiktok_handle = normalizeSocialInputLenient("tiktok", body.tiktokHandle);
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
      const { error: ipErr } = await sb.from("influencer_profiles").upsert(ipRow, {
        onConflict: "user_id",
      });
      if (ipErr) {
        const msg = ipErr.message || "Could not save profile";
        const hint = /column/i.test(msg)
          ? " Run Supabase migrations 012 and 015, then try again."
          : "";
        showToast(msg + hint);
        return jsonResponse({ error: msg + hint }, 400);
      }
    }

    const user = await resolveUser(authData.user);
    const refreshed = await getSessionUser();
    if (refreshed) persistSession(refreshed);
    syncStoredUser(user, refreshed?.access_token || session.access_token);
    showToast("Profile saved.", "ok");
    return jsonResponse(toInfluencerApiProfile(user));
  }

  async function changePassword(body) {
    await syncSessionFromStorage();
    const session = await getSessionUser();
    if (!session?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
    const currentPassword = body?.currentPassword ?? "";
    const newPassword = body?.newPassword ?? "";
    if (!currentPassword || !newPassword) {
      return jsonResponse({ error: "Current and new password are required" }, 400);
    }
    if (newPassword.length < 6) {
      return jsonResponse({ error: "New password must be at least 6 characters" }, 400);
    }
    const sb = await ensureClient();
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

  async function getPublicInfluencerBySlug(slug) {
    if (!(await checkTables())) return null;
    const sb = await ensureClient();
    const { data, error } = await sb.rpc("get_public_influencer", {
      p_slug: slug,
    });
    if (error) {
      console.warn("[influnet] get_public_influencer:", error.message);
      return null;
    }
    if (!data) return null;
    const profileSlug = data.profileSlug || slugifyProfileName(data.name);
    return {
      ...data,
      profileSlug,
      profileUrl: publicInfluencerUrl(profileSlug),
      publicPath: `influnet/${profileSlug}`,
    };
  }

  async function recordProfileView(influencerUserId) {
    if (!(await checkDashboardMetricsTables()) || !isUuid(influencerUserId)) return;
    const session = await getSessionUser();
    const viewerId = session?.user?.id || null;
    const sb = await ensureClient();
    let viewerName = null;
    let viewerIndustry = null;
    if (viewerId) {
      const viewer = await loadProfileFromDb(viewerId);
      if (viewer) {
        viewerName = viewer.companyName || viewer.name || "Business";
        viewerIndustry = viewer.industry || "";
      }
    }
    await sb.from("profile_views").insert({
      influencer_user_id: influencerUserId,
      viewer_user_id: viewerId,
      viewer_name: viewerName,
      viewer_industry: viewerIndustry,
    });
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
    const completion = computeProfileCompletion(profile);
    const slug = profile.profileSlug || slugifyProfileName(profile.name);

    const [requests, conversations] = await Promise.all([
      listCollabRequests("incoming"),
      listConversations(),
    ]);

    const stats = {
      requestsReceived: requests.filter((r) => r.status === "pending").length,
      activeDiscussions: conversations.filter(
        (c) => c.lastMessage || (c.unreadCount || 0) > 0
      ).length,
      profileViews: 0,
      savedByBusinesses: 0,
      linkClicks: 0,
    };

    let recentViews = [];

    if (await checkDashboardMetricsTables()) {
      const sb = await ensureClient();
      const [viewsRes, clicksRes, savesRes, recentRes] = await Promise.all([
        sb
          .from("profile_views")
          .select("id", { count: "exact", head: true })
          .eq("influencer_user_id", uid),
        sb
          .from("profile_link_clicks")
          .select("id", { count: "exact", head: true })
          .eq("influencer_user_id", uid),
        sb
          .from("influencer_shortlists")
          .select("id", { count: "exact", head: true })
          .eq("influencer_user_id", uid),
        sb
          .from("profile_views")
          .select("viewer_name, viewer_industry, viewed_at")
          .eq("influencer_user_id", uid)
          .order("viewed_at", { ascending: false })
          .limit(8),
      ]);
      stats.profileViews = viewsRes.count || 0;
      stats.linkClicks = clicksRes.count || 0;
      stats.savedByBusinesses = savesRes.count || 0;
      recentViews = (recentRes.data || []).map((v) => ({
        businessName: v.viewer_name || "Business",
        industry: v.viewer_industry || "",
        viewedAt: v.viewed_at,
      }));
    } else {
      stats.savedByBusinesses = loadShortlistsStore().filter(
        (x) => x.influencerUserId === uid
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
      profile: toInfluencerApiProfile(profile),
      profileSlug: slug,
      publicPath: `influnet/${slug}`,
      completion,
      stats,
      requests: pendingRequests,
      recentViews,
      socialPlatforms: buildSocialPlatformCards(profile),
    });
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
        "id, name, email, location, influencer_profiles(bio, niche, profile_slug, instagram_handle, youtube_handle, twitter_handle, instagram_followers, youtube_subscribers, engagement_rate, is_verified)"
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
          "id, name, email, location, influencer_profiles(bio, niche, instagram_handle, youtube_handle, twitter_handle, instagram_followers, youtube_subscribers, engagement_rate, is_verified)"
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
          const custom = normalizeProfileSlug(ip?.profile_slug);
          const fromName = normalizeProfileSlug(row.name);
          if (custom === slugTerm || fromName === slugTerm) return true;
        }
        if ((row.name || "").toLowerCase().includes(term)) return true;
        if ((ip?.bio || "").toLowerCase().includes(term)) return true;
        const publicPath = `influnet/${normalizeProfileSlug(ip?.profile_slug || row.name)}`;
        if (publicPath.includes(term.replace(/\s+/g, ""))) return true;
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
      const profileSlug = normalizeProfileSlug(ip?.profile_slug || row.name);
      return {
        id: row.id,
        userId: row.id,
        influencerUserId: row.id,
        name: row.name || "Creator",
        email: row.email,
        location: row.location || "",
        bio: ip?.bio,
        niche: nicheArr,
        profileSlug,
        profileUrl: publicInfluencerUrl(profileSlug),
        publicPath: `influnet/${profileSlug}`,
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
    "lead_received",
    "discussion_started",
    "requirements_finalized",
    "budget_confirmed",
    "agreement_approved",
    "content_creation",
    "content_review",
    "content_published",
    "payment_received",
    "project_completed",
  ];
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
      counterparty: {
        userId: otherUserId,
        name: other?.name || "User",
        avatarUrl: other?.avatar_url || null,
      },
      history: (project.history || []).map((item) => ({
        ...item,
        updatedByName: usersById.get(item.updatedByUserId) || "User",
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
      rows.push(
        await enrichProjectCounterparty(
          {
            id: row.id,
            ownerUserId: row.owner_user_id,
            counterpartyUserId: row.counterparty_user_id,
            title: row.title,
            description: row.description || "",
            budget: row.budget,
            timeline: row.timeline,
            status: row.status,
            currentStage: row.current_stage,
            stageProgress: normalizeStageProgress(row.current_stage, row.stage_progress || {}),
            history: Array.isArray(row.history) ? row.history : [],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          },
          sessionUserId
        )
      );
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
    return enrichProjectCounterparty(
      {
        id: data.id,
        ownerUserId: data.owner_user_id,
        counterpartyUserId: data.counterparty_user_id,
        title: data.title,
        description: data.description || "",
        budget: data.budget,
        timeline: data.timeline,
        status: data.status,
        currentStage: data.current_stage,
        stageProgress: normalizeStageProgress(data.current_stage, data.stage_progress || {}),
        history: Array.isArray(data.history) ? data.history : [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      sessionUserId
    );
  }

  function parseImageUploadBody(body) {
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

    const ext = parsed.contentType.split("/")[1].replace("jpeg", "jpg");
    const uid = session.user.id;
    const path = `${uid}/avatar.${ext}`;
    const sb = await ensureClient();

    const { error: upErr } = await sb.storage.from("avatars").upload(path, parsed.bytes, {
      upsert: true,
      contentType: parsed.contentType,
    });
    if (upErr) {
      console.warn("[influnet] avatar upload:", upErr.message);
      const hint = String(upErr.message).includes("Bucket not found")
        ? " Run supabase/migrations/013_avatar_storage.sql in Supabase."
        : "";
      return jsonResponse({ error: upErr.message + hint }, 400);
    }

    const { data: urlData } = sb.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

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

  async function handleApi(pathname, method, body, search) {
    if (pathname.startsWith("/api/auth/")) {
      const action = pathname.replace("/api/auth/", "");
      return handleAuth(action, method, body);
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
          viewer = {
            id: vu.id,
            role: vu.role,
            isOwner:
              vu.id === profile.userId ||
              (!!viewerSlug && !!profileSlug && viewerSlug === profileSlug),
            isBusiness: vu.role === "business_owner",
            isInfluencer: vu.role === "influencer",
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

    if (pathname === "/api/influencer/dashboard" && method === "GET") {
      return getInfluencerDashboard();
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
      if (!otherId) return jsonResponse({ typing: false, isOnline: false });
      const presenceMap = await loadPresenceMap([otherId]);
      const p = presenceMap.get(otherId) || {};
      return jsonResponse({
        typing: isTypingInConversation(p, convId),
        isOnline: !!p.isOnline,
        lastSeenAt: p.lastSeenAt || null,
      });
    }

    if (pathname === "/api/presence/ping" && method === "POST") {
      const session = await getSessionUser();
      if (!session?.user) return jsonResponse({ error: "Not authenticated" }, 401);
      await touchPresence(session.user.id);
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

      const now = new Date().toISOString();
      const currentStage = PROJECT_STAGES[0];
      const stageProgress = normalizeStageProgress(currentStage);
      const project = {
        id: Date.now(),
        ownerUserId: session.user.id,
        counterpartyUserId: body.counterpartyUserId,
        title: String(body?.title || "Untitled campaign").trim(),
        description: body?.description ? String(body.description) : "",
        budget: Number.isFinite(Number(body?.budget)) ? Number(body.budget) : null,
        timeline: body?.timeline ? String(body.timeline) : null,
        status: "active",
        currentStage,
        stageProgress,
        history: [
          {
            id: crypto.randomUUID(),
            stage: currentStage,
            note: "Project started",
            createdAt: now,
            updatedByUserId: session.user.id,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      if (await checkProjectTables()) {
        const sb = await ensureClient();
        const { data, error } = await sb
          .from("campaign_projects")
          .insert({
            owner_user_id: project.ownerUserId,
            counterparty_user_id: project.counterpartyUserId,
            title: project.title,
            description: project.description,
            budget: project.budget,
            timeline: project.timeline,
            status: project.status,
            current_stage: project.currentStage,
            stage_progress: project.stageProgress,
            history: project.history,
          })
          .select("*")
          .single();
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse(
          await enrichProjectCounterparty(
            {
              id: data.id,
              ownerUserId: data.owner_user_id,
              counterpartyUserId: data.counterparty_user_id,
              title: data.title,
              description: data.description || "",
              budget: data.budget,
              timeline: data.timeline,
              status: data.status,
              currentStage: data.current_stage,
              stageProgress: normalizeStageProgress(data.current_stage, data.stage_progress || {}),
              history: Array.isArray(data.history) ? data.history : [],
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            },
            session.user.id
          ),
          201
        );
      }

      const all = loadProjectsStore();
      all.push(project);
      saveProjectsStore(all);
      return jsonResponse(await enrichProjectCounterparty(project, session.user.id), 201);
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

          if (typeof body?.currentStage === "string" && PROJECT_STAGES.includes(body.currentStage)) {
            next.currentStage = body.currentStage;
            next.stageProgress = normalizeStageProgress(next.currentStage, next.stageProgress);
            next.history = [
              ...next.history,
              {
                id: crypto.randomUUID(),
                stage: next.currentStage,
                note: `Stage updated to ${next.currentStage}`,
                createdAt: new Date().toISOString(),
                updatedByUserId: session.user.id,
              },
            ];
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
          return jsonResponse(
            await enrichProjectCounterparty(
              {
                id: data.id,
                ownerUserId: data.owner_user_id,
                counterpartyUserId: data.counterparty_user_id,
                title: data.title,
                description: data.description || "",
                budget: data.budget,
                timeline: data.timeline,
                status: data.status,
                currentStage: data.current_stage,
                stageProgress: normalizeStageProgress(data.current_stage, data.stage_progress || {}),
                history: Array.isArray(data.history) ? data.history : [],
                createdAt: data.created_at,
                updatedAt: data.updated_at,
              },
              session.user.id
            )
          );
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
            broadcastSse({
              type: "presence",
              userId: client.userId,
              lastSeenAt: new Date().toISOString(),
              isOnline: true,
            });
          }
        }, 25000);
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

  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input?.url;
    const method = (init?.method || "GET").toUpperCase();
    const api = url ? parseApi(url) : null;

    if (api) {
      try {
        let body = {};
        if (init?.body) {
          body =
            typeof init.body === "string" ? JSON.parse(init.body) : init.body;
        }
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
