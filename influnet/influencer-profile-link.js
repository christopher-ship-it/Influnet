/**

 * Shareable public profile link — display as influnet/{slug} (short path).

 */

(function () {

  const MOUNT_ID = "influnet-profile-link-mount";

  const CARD_ID = "influnet-profile-link-card";

  const FULL_URL_RE = /^https?:\/\/[^/]+\/(influnet\/[a-z0-9-]+)\/?$/i;



  function slugify(name) {

    return String(name || "")

      .toLowerCase()

      .replace(/[^a-z0-9]+/g, "-")

      .replace(/^-|-$/g, "");

  }



  function getStoredUser() {

    try {

      const raw = localStorage.getItem("influnet_user");

      return raw ? JSON.parse(raw) : null;

    } catch {

      return null;

    }

  }



  function publicPath(slug) {

    const s = slugify(slug);

    return s ? `influnet/${s}` : "";

  }



  function fullUrl(slug) {

    const path = publicPath(slug);

    return path ? `${window.location.origin}/${path}` : "";

  }



  function shortenDisplayedUrl(text) {

    const t = String(text || "").trim();

    const m = t.match(FULL_URL_RE);

    return m ? m[1].toLowerCase() : t;

  }



  async function copyText(text) {

    if (navigator.clipboard?.writeText) {

      await navigator.clipboard.writeText(text);

      return;

    }

    const ta = document.createElement("textarea");

    ta.value = text;

    ta.style.position = "fixed";

    ta.style.left = "-9999px";

    document.body.appendChild(ta);

    ta.select();

    document.execCommand("copy");

    ta.remove();

  }



  async function resolveSlug() {

    try {

      const res = await fetch("/api/influencer-profile/me", { credentials: "same-origin" });

      const data = await res.json();

      if (res.ok && data?.profileSlug) return slugify(data.profileSlug);

      if (res.ok && data?.name) return slugify(data.name);

    } catch {

      /* fall through */

    }

    const user = getStoredUser();

    return slugify(user?.profileSlug || user?.name);

  }



  function linkIconSvg() {

    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

  }



  function renderShareCard(root, slug) {

    const path = publicPath(slug);

    const url = fullUrl(slug);

    if (!path) {

      root.innerHTML =

        '<p class="text-sm text-gray-500">Add your name in profile to generate your public link.</p>';

      return;

    }



    const user = getStoredUser();

    const name = user?.name || "";



    root.innerHTML = "";

    const card = document.createElement("button");

    card.type = "button";

    card.id = CARD_ID;

    card.className =

      "w-full flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 hover:border-gray-300 transition-colors text-left";

    card.innerHTML = `

      <div class="size-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center shrink-0 text-gray-500">

        ${linkIconSvg()}

      </div>

      <div class="min-w-0">

        <p class="text-sm font-bold text-gray-900">My Influnet Profile</p>

        <p class="text-xs text-gray-500 truncate infl-profile-link-path" data-path="${path}">${path}</p>

      </div>

    `;



    card.addEventListener("click", async () => {

      try {

        await copyText(path);

        const label = card.querySelector(".infl-profile-link-path");

        if (label) {

          const prev = label.textContent;

          label.textContent = "Copied!";

          setTimeout(() => {

            label.textContent = prev;

          }, 1500);

        }

        if (window.showToast) window.showToast("Profile link copied.", "ok");

      } catch {

        if (window.showToast) window.showToast("Could not copy link.", "err");

      }

    });



    card.addEventListener("contextmenu", (e) => {

      e.preventDefault();

      window.open(url, "_blank", "noopener,noreferrer");

    });



    root.appendChild(card);



    if (navigator.share) {

      const shareRow = document.createElement("div");

      shareRow.className = "flex justify-end mt-2";

      const shareBtn = document.createElement("button");

      shareBtn.type = "button";

      shareBtn.className =

        "text-xs font-semibold text-violet-600 hover:text-violet-800";

      shareBtn.textContent = "Share full link";

      shareBtn.addEventListener("click", async (e) => {

        e.stopPropagation();

        try {

          await navigator.share({

            title: `${name || "My"} Influnet Profile`,

            text: `View my creator profile: ${path}`,

            url,

          });

        } catch (_) {

          /* cancelled */

        }

      });

      shareRow.appendChild(shareBtn);

      root.appendChild(shareRow);

    }

  }



  async function mountShareCard(root) {

    if (root.dataset.rendered === "1") return;

    root.dataset.rendered = "1";

    const slug = await resolveSlug();

    renderShareCard(root, slug);

  }



  function isEditProfilePage() {

    const path = window.location.pathname.replace(/\/$/, "") || "/";

    if (path !== "/dashboard/influencer") return false;

    return (

      !!document.getElementById(MOUNT_ID) ||

      !!document.getElementById("influnet-profile-edit-root") ||

      [...document.querySelectorAll("h1")].some((h) => h.textContent.trim() === "Edit Profile")

    );

  }



  function patchFullUrlDisplays() {

    if (!isEditProfilePage()) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

    let node;

    while ((node = walker.nextNode())) {

      const raw = node.textContent;

      if (!raw || !FULL_URL_RE.test(raw.trim())) continue;

      const parent = node.parentElement;

      if (!parent || parent.closest(`#${CARD_ID}, #${MOUNT_ID}`)) continue;

      const short = shortenDisplayedUrl(raw.trim());

      if (short !== raw.trim()) node.textContent = raw.replace(raw.trim(), short);

    }



    document.querySelectorAll("input[readonly], input[type='text']").forEach((input) => {

      if (!FULL_URL_RE.test(String(input.value || "").trim())) return;

      if (input.closest(`#${CARD_ID}, #${MOUNT_ID}`)) return;

      input.value = shortenDisplayedUrl(input.value);

    });

  }



  function tryMount() {

    const el = document.getElementById(MOUNT_ID);

    if (el) mountShareCard(el);

    patchFullUrlDisplays();

  }



  const observer = new MutationObserver(tryMount);



  function start() {

    observer.observe(document.documentElement, { childList: true, subtree: true });

    tryMount();

  }



  if (document.body) start();

  else document.addEventListener("DOMContentLoaded", start);



  window.addEventListener("influnet-profile-updated", () => {

    document.querySelectorAll(`#${MOUNT_ID}`).forEach((el) => {

      delete el.dataset.rendered;

      mountShareCard(el);

    });

    patchFullUrlDisplays();

  });

})();


