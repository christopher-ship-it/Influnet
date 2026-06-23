/**
 * Edit Profile helpers — hide legacy profile-link card; shorten full URL displays.
 */
(function () {
  const MOUNT_ID = "influnet-profile-link-mount";
  const CARD_ID = "influnet-profile-link-card";
  const FULL_URL_RE = /^https?:\/\/[^/]+\/(?:influnet\/)?([a-z0-9][a-z0-9._-]{2,29})\/?$/i;

  function shortenDisplayedUrl(text) {
    const t = String(text || "").trim();
    const m = t.match(FULL_URL_RE);
    return m ? `influnet/${m[1].toLowerCase()}` : t;
  }

  function hideProfileLinkCard() {
    const mount = document.getElementById(MOUNT_ID);
    if (mount) {
      mount.innerHTML = "";
      mount.hidden = true;
      mount.setAttribute("aria-hidden", "true");
      mount.style.display = "none";
    }
    document.getElementById(CARD_ID)?.remove();
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
    hideProfileLinkCard();
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
    hideProfileLinkCard();
    patchFullUrlDisplays();
  });
})();
