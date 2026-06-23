/**
 * Request actions UI fix:
 * - Remove "Message Brand" button
 * - Redesign "Accept Request" + "Decline" per SaaS ghost-button spec
 */
(function () {
  const STYLE_ID = "influnet-request-actions-style-fix";
  const PATCHED_ATTR = "data-infl-req-actions-patched";

  function normalize(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .infl-req-actions-row {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
        width: 100% !important;
      }

      .infl-req-btn {
        height: 44px !important;
        min-height: 44px !important;
        border-radius: 999px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        padding: 0 32px !important;
        text-transform: none !important;
        letter-spacing: normal !important;
        transition: opacity 150ms ease, transform 150ms ease !important;
        box-shadow: none !important;
        background-image: none !important;
        width: 100% !important;
      }

      .infl-req-btn:hover {
        opacity: 0.85 !important;
      }

      .infl-req-btn:active {
        transform: scale(0.97) !important;
      }

      .infl-req-btn:disabled,
      .infl-req-btn[disabled],
      .infl-req-btn[aria-disabled="true"] {
        opacity: 0.4 !important;
      }

      .infl-req-btn-accept {
        background: #6c2bd9 !important;
        color: #fff !important;
        border: 0 !important;
      }

      .infl-req-btn-decline {
        background: transparent !important;
        color: #e53e3e !important;
        border: 0.5px solid #e53e3e !important;
      }
    `;
    document.head.appendChild(style);
  }

  function patchRequestActionRows() {
    const buttons = Array.from(document.querySelectorAll("button"));
    if (!buttons.length) return;

    const messageBrandButtons = buttons.filter(
      (btn) => normalize(btn.textContent) === "message brand"
    );
    messageBrandButtons.forEach((btn) => btn.remove());

    const acceptButtons = buttons.filter((btn) =>
      normalize(btn.textContent).startsWith("accept request")
    );

    acceptButtons.forEach((acceptBtn) => {
      const row = acceptBtn.parentElement;
      if (!row || row.getAttribute(PATCHED_ATTR) === "1") return;

      const rowButtons = Array.from(row.querySelectorAll(":scope > button"));
      const declineBtn = rowButtons.find(
        (btn) => normalize(btn.textContent) === "decline"
      );
      if (!declineBtn) return;

      row.setAttribute(PATCHED_ATTR, "1");
      row.classList.add("infl-req-actions-row");

      acceptBtn.classList.add("infl-req-btn", "infl-req-btn-accept");
      declineBtn.classList.add("infl-req-btn", "infl-req-btn-decline");
    });
  }

  function tick() {
    ensureStyles();
    patchRequestActionRows();
  }

  tick();
  window.addEventListener("load", tick);
  window.addEventListener("popstate", tick);
  const observer = new MutationObserver(tick);
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(tick, 2000);
})();

