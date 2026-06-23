/**
 * Business logo upload — signup draft + settings + profile completion wizard.
 */
(function () {
  try {
    const PENDING_KEY = "influnet_business_logo_pending";
    const MAX_BYTES = 5 * 1024 * 1024;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

    let pendingFile = null;

    function isSignupPage() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/business";
    }

    function isDashboard() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      return path === "/dashboard" || path.startsWith("/dashboard/");
    }

    function validateFile(file) {
      if (!file) return "No file selected.";
      if (!ALLOWED.includes(file.type)) return "Use JPEG, PNG, WebP, GIF, or SVG.";
      if (file.size > MAX_BYTES) return "Image must be under 5 MB.";
      return null;
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
    }

    async function uploadLogoFile(file) {
      const err = validateFile(file);
      if (err) throw new Error(err);
      const dataUrl = await fileToDataUrl(file);
      const token = localStorage.getItem("influnet_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/business-profile/logo", {
        method: "POST",
        headers,
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      sessionStorage.removeItem(PENDING_KEY);
      window.dispatchEvent(new CustomEvent("influnet-profile-updated", { detail: data }));
      return data;
    }

    function storePendingFromSignup(file) {
      fileToDataUrl(file).then((dataUrl) => {
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({ dataUrl, name: file.name, type: file.type })
        );
      });
    }

    function wireSignupLogoInput() {
      if (!isSignupPage()) return;
      document.querySelectorAll('input[type="file"][accept*="image"]').forEach((input) => {
        if (input.dataset.inflBizLogoWired === "1") return;
        input.dataset.inflBizLogoWired = "1";
        input.addEventListener("change", (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const err = validateFile(file);
          if (err) return;
          pendingFile = file;
          storePendingFromSignup(file);
        });
      });
    }

    async function flushPendingLogo() {
      const token = localStorage.getItem("influnet_token");
      if (!token) return;
      try {
        const raw = sessionStorage.getItem(PENDING_KEY);
        if (!raw) return;
        const pending = JSON.parse(raw);
        if (!pending?.dataUrl) return;
        const res = await fetch("/api/business-profile/logo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ dataUrl: pending.dataUrl }),
        });
        if (res.ok) sessionStorage.removeItem(PENDING_KEY);
      } catch {
        /* retry later */
      }
    }

    window.influnetUploadBusinessLogo = uploadLogoFile;

    wireSignupLogoInput();
    setInterval(wireSignupLogoInput, 1000);
    if (isDashboard()) {
      flushPendingLogo();
      setInterval(flushPendingLogo, 5000);
    }
    window.addEventListener("load", () => {
      wireSignupLogoInput();
      flushPendingLogo();
    });
  } catch (e) {
    console.warn("[influnet] business-logo-upload:", e);
  }
})();
