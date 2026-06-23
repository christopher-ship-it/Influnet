/**
 * Wire all influencer signup entry points → standalone Step 1 page.
 */
(function () {
  try {
    const CREATOR_SIGNUP = "/signup/influencer";
    const INFLUENCER_SIGNUP = "/signup/influencer";

    function currentPath() {
      return window.location.pathname.replace(/\/$/, "") || "/";
    }

    function isLandingFinish() {
      return new URLSearchParams(window.location.search).get("from") === "landing";
    }

    function goCreatorSignup() {
      if (currentPath() === INFLUENCER_SIGNUP && !isLandingFinish()) return;
      window.location.assign(CREATOR_SIGNUP);
    }

    function patchSignupAnchors() {
      document
        .querySelectorAll('a[href="/?#creator-signup"], a[href="/signup/influencer"], a[href="/signup/influencer/"]')
        .forEach((link) => {
          link.setAttribute("href", CREATOR_SIGNUP);
          link.dataset.inflCreatorSignup = "1";
        });
    }

    function isInfluencerSignupClick(target) {
      const link = target.closest(
        'a[href="/signup/influencer"], a[href="/signup/influencer/"], a[href="/?#creator-signup"], a[data-infl-creator-signup="1"]'
      );
      if (link) return true;

      const startBtn = target.closest('[data-testid="button-start-influencer"]');
      if (startBtn) return true;

      const tile = target.closest("a, button, [role='button']");
      if (!tile) return false;
      const text = (tile.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
      if (text.includes("INFLUENCER") && text.includes("SIGNUP AS")) return true;
      if (text === "START INFLUENCER SETUP" || text.startsWith("START INFLUENCER SETUP")) {
        return true;
      }
      return false;
    }

    function patchHistory() {
      if (window.__inflSignupHistoryPatched) return;
      window.__inflSignupHistoryPatched = true;

      const notify = () => {
        window.setTimeout(patchSignupAnchors, 0);
      };

      const wrap = (original) =>
        function (...args) {
          const result = original.apply(this, args);
          notify();
          return result;
        };

      history.pushState = wrap(history.pushState);
      history.replaceState = wrap(history.replaceState);
      window.addEventListener("popstate", notify);
    }

    function wireClicks() {
      if (window.__inflSignupClickWired) return;
      window.__inflSignupClickWired = true;

      document.addEventListener(
        "click",
        (e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) {
            return;
          }
          if (!isInfluencerSignupClick(e.target)) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          goCreatorSignup();
        },
        true
      );
    }

    patchHistory();
    wireClicks();
    patchSignupAnchors();

    window.setInterval(patchSignupAnchors, 500);

    const obs = new MutationObserver(patchSignupAnchors);
    obs.observe(document.documentElement, { childList: true, subtree: true });

    window.influnetGoCreatorSignup = goCreatorSignup;
  } catch (e) {
    console.warn("[influnet] signup redirect:", e);
  }
})();
