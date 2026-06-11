/**
 * Business Requests tab: "Message" on accepted collabs → open Messages chat.
 */
(function () {
  try {
    function isBusinessDashboard() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path !== "/dashboard") return false;
      try {
        const user = JSON.parse(localStorage.getItem("influnet_user") || "null");
        return user?.role !== "influencer";
      } catch {
        return false;
      }
    }

    function normalizeNavText(text) {
      return String(text || "")
        .replace(/\d+/g, "")
        .replace(/\+/g, "")
        .trim();
    }

    function getActiveNavLabel() {
      const nav = document.querySelector(".flex.h-screen aside nav");
      if (!nav) return "";
      const active = [...nav.querySelectorAll(":scope > button")].find(
        (b) =>
          b.classList.contains("bg-violet-100") ||
          /\bbg-violet-100\b/.test(b.className)
      );
      return active ? normalizeNavText(active.textContent) : "";
    }

    function isRequestsPage() {
      if (getActiveNavLabel().toLowerCase() !== "requests") return false;
      return !!document.querySelector("h1")?.textContent?.includes(
        "Collaboration Requests"
      );
    }

    function rowIsAccepted(row) {
      return [...row.querySelectorAll("span, p, div")].some(
        (el) => el.textContent.trim() === "Accepted"
      );
    }

    function injectMessageButtons() {
      if (!isBusinessDashboard() || !isRequestsPage()) return;

      const list = document.querySelector(
        ".bg-white.rounded-2xl.border.border-gray-100.divide-y"
      );
      if (!list) return;

      list.querySelectorAll(":scope > div.flex.items-center").forEach((row) => {
        if (!rowIsAccepted(row)) return;
        if (row.querySelector(".infl-req-message-btn")) return;

        const name =
          row.querySelector(".font-semibold.text-gray-900")?.textContent?.trim() ||
          "";
        if (!name) return;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "infl-req-message-btn ml-2 border border-violet-200 text-violet-700 text-sm font-semibold px-4 py-1.5 rounded-xl hover:bg-violet-50 transition-colors shrink-0";
        btn.textContent = "Message";
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          btn.disabled = true;
          try {
            const token = localStorage.getItem("influnet_token");
            const res = await fetch("/api/collab-requests/outgoing", {
              credentials: "same-origin",
              headers: token ? { Authorization: "Bearer " + token } : {},
            });
            const requests = await res.json();
            const match = (Array.isArray(requests) ? requests : []).find(
              (r) =>
                r.status === "accepted" &&
                String(r.toUser?.name || "")
                  .trim()
                  .toLowerCase() === name.toLowerCase()
            );
            const userId = match?.toUserId || match?.toUser?.id;
            if (!userId) {
              alert(
                "Could not find this creator. Open Messages — they should appear after a refresh."
              );
              return;
            }
            if (typeof window.influnetOpenBusinessChat === "function") {
              await window.influnetOpenBusinessChat(userId, name);
            } else {
              alert("Open the Messages tab to chat with " + name + ".");
            }
          } catch (err) {
            alert(err.message || "Could not open chat.");
          } finally {
            btn.disabled = false;
          }
        });

        const actions = row.querySelector(".text-right.shrink-0")?.parentElement;
        if (actions) {
          actions.appendChild(btn);
        } else {
          row.appendChild(btn);
        }
      });
    }

    function tick() {
      if (!isBusinessDashboard()) return;
      injectMessageButtons();
    }

    tick();
    setInterval(tick, 2000);
    window.addEventListener("load", tick);

    const nav = document.querySelector(".flex.h-screen aside nav");
    nav?.addEventListener("click", () => {
      [100, 400, 800].forEach((ms) => window.setTimeout(tick, ms));
    });
  } catch (e) {
    console.warn("[influnet] business-requests-messages-bridge:", e);
  }
})();
