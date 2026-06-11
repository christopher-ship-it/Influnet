/**
 * Profile photo upload for influencer signup (step 2) and Edit Profile.
 * Uploads to Supabase Storage via POST /api/influencer-profile/avatar.
 */
(function () {
  try {
    const MAX_BYTES = 5 * 1024 * 1024;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    let pendingFile = null;
    let uploading = false;

    function isSignupPage() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/influencer";
    }

    function isEditProfilePage() {
      const path = window.location.pathname.replace(/\/$/, "") || "/";
      if (path !== "/dashboard/influencer") return false;
      if (document.getElementById("influnet-profile-photo-card")) return true;
      if (document.getElementById("influnet-profile-edit-root")) return true;
      return [...document.querySelectorAll("h1")].some(
        (h) => h.textContent.trim() === "Edit Profile"
      );
    }

    function initials(name) {
      const p = String(name || "?").trim().split(/\s+/);
      return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
    }

    function getStoredUser() {
      try {
        const raw = localStorage.getItem("influnet_user");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read image file"));
        reader.readAsDataURL(file);
      });
    }

    function validateFile(file) {
      if (!file) return "No file selected.";
      if (!ALLOWED.includes(file.type)) {
        return "Use a JPEG, PNG, WebP, or GIF image.";
      }
      if (file.size > MAX_BYTES) return "Image must be under 5 MB.";
      return null;
    }

    async function uploadAvatarFile(file) {
      const err = validateFile(file);
      if (err) throw new Error(err);
      const dataUrl = await fileToDataUrl(file);
      const token = localStorage.getItem("influnet_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/influencer-profile/avatar", {
        method: "POST",
        headers,
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      window.dispatchEvent(new CustomEvent("influnet-profile-updated", { detail: data }));
      return data;
    }

    function findSignupPhotoHost() {
      const label = [...document.querySelectorAll("span")].find(
        (s) => s.textContent.trim() === "Upload photo"
      );
      return label?.closest(".cursor-pointer")?.parentElement || null;
    }

    function setSignupStatus(text, kind) {
      const host =
        document.querySelector(".infl-signup-photo-status")?.parentElement ||
        findSignupPhotoHost();
      if (!host) return;
      let el = host.querySelector(".infl-signup-photo-status");
      if (!el) {
        el = document.createElement("p");
        el.className = "infl-signup-photo-status pending";
        host.appendChild(el);
      }
      el.className = `infl-signup-photo-status ${kind || "pending"}`;
      el.textContent = text;
    }

    function wireSignupFileInput() {
      if (!isSignupPage()) return;
      document.querySelectorAll('input[type="file"]').forEach((input) => {
        if (input.dataset.inflPhotoWired === "1") return;
        input.dataset.inflPhotoWired = "1";
        input.addEventListener("change", (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const err = validateFile(file);
          if (err) {
            setSignupStatus(err, "err");
            pendingFile = null;
            return;
          }
          pendingFile = file;
          setSignupStatus(`${file.name} — will upload when you complete signup`, "pending");
        });
      });
    }

    async function uploadPendingAfterSignup() {
      if (!pendingFile || uploading) return;
      uploading = true;
      setSignupStatus("Uploading profile photo…", "uploading");
      try {
        await uploadAvatarFile(pendingFile);
        pendingFile = null;
        setSignupStatus("Profile photo saved ✓", "done");
      } catch (err) {
        setSignupStatus(err.message || "Photo upload failed. Add it from Edit Profile.", "err");
      } finally {
        uploading = false;
      }
    }

    function hookRegisterUpload() {
      if (window.__inflPhotoFetchHooked) return;
      window.__inflPhotoFetchHooked = true;
      const prev = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        const url = typeof input === "string" ? input : input?.url || "";
        const res = await prev(input, init);
        if (url.includes("/api/auth/register") && res.ok && pendingFile) {
          const clone = res.clone();
          clone
            .json()
            .then((data) => {
              if (data?.token) uploadPendingAfterSignup();
            })
            .catch(() => {});
        }
        return res;
      };
    }

    async function renderEditProfileCard() {
      if (!isEditProfilePage()) return;
      const container = document.querySelector(".max-w-2xl.mx-auto");
      if (!container || document.getElementById("influnet-profile-photo-card")) return;

      const user = getStoredUser();
      let avatarUrl = null;
      try {
        const res = await fetch("/api/influencer-profile/me", { credentials: "same-origin" });
        const data = await res.json();
        avatarUrl = data?.avatarUrl || null;
      } catch {
        /* use cached */
      }

      const card = document.createElement("div");
      card.id = "influnet-profile-photo-card";
      card.className = "infl-profile-photo-card";
      card.innerHTML = `
        <h2>Profile Photo</h2>
        <p>This photo appears on your public profile and dashboard.</p>
        <div class="infl-profile-photo-row">
          <div class="infl-profile-photo-preview" id="infl-photo-preview">
            ${avatarUrl ? `<img src="${avatarUrl}" alt="" />` : initials(user?.name)}
          </div>
          <div class="infl-profile-photo-actions">
            <input type="file" id="infl-photo-file" class="infl-profile-photo-input" accept="image/jpeg,image/png,image/webp,image/gif" />
            <button type="button" class="infl-profile-photo-btn infl-profile-photo-btn-primary" id="infl-photo-choose">Choose photo</button>
            <button type="button" class="infl-profile-photo-btn infl-profile-photo-btn-ghost" id="infl-photo-remove" style="display:none">Remove preview</button>
          </div>
        </div>
        <p class="infl-profile-photo-hint">JPEG, PNG, WebP or GIF · max 5 MB</p>
        <div id="infl-photo-msg" class="infl-profile-photo-msg" style="display:none"></div>
      `;

      const header = container.querySelector(".flex.items-center.justify-between");
      if (header) container.insertBefore(card, header);
      else container.prepend(card);

      const fileInput = card.querySelector("#infl-photo-file");
      const preview = card.querySelector("#infl-photo-preview");
      const msg = card.querySelector("#infl-photo-msg");
      const removeBtn = card.querySelector("#infl-photo-remove");
      let localPreviewUrl = null;

      function showMsg(text, ok) {
        msg.style.display = "block";
        msg.className = `infl-profile-photo-msg ${ok ? "ok" : "err"}`;
        msg.textContent = text;
      }

      card.querySelector("#infl-photo-choose").addEventListener("click", () => {
        fileInput.click();
      });

      removeBtn.addEventListener("click", () => {
        fileInput.value = "";
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        localPreviewUrl = null;
        preview.innerHTML = avatarUrl
          ? `<img src="${avatarUrl}" alt="" />`
          : initials(user?.name);
        removeBtn.style.display = "none";
        msg.style.display = "none";
      });

      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const err = validateFile(file);
        if (err) {
          showMsg(err, false);
          return;
        }
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        localPreviewUrl = URL.createObjectURL(file);
        preview.innerHTML = `<img src="${localPreviewUrl}" alt="" />`;
        removeBtn.style.display = "inline-block";
        msg.style.display = "none";

        const btn = card.querySelector("#infl-photo-choose");
        btn.disabled = true;
        btn.textContent = "Uploading…";
        try {
          const data = await uploadAvatarFile(file);
          avatarUrl = data.avatarUrl;
          preview.innerHTML = `<img src="${avatarUrl}" alt="" />`;
          showMsg("Profile photo saved.", true);
        } catch (uploadErr) {
          showMsg(uploadErr.message || "Upload failed", false);
        } finally {
          btn.disabled = false;
          btn.textContent = "Choose photo";
        }
      });
    }

    function tick() {
      wireSignupFileInput();
      renderEditProfileCard();
    }

    hookRegisterUpload();
    tick();
    setInterval(tick, 1500);
    window.addEventListener("popstate", tick);
    window.addEventListener("load", tick);
  } catch (e) {
    console.warn("[influnet] influencer-profile-photo:", e);
  }
})();
