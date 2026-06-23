/**
 * Influencer signup — profile photo: crop, preview, draft persistence, Supabase upload.
 */
(function () {
  try {
    window.__inflSignupPhotoModuleLoaded = true;

    const DRAFT_KEY = "influnet_signup_photo_draft";
    const MAX_BYTES = 5 * 1024 * 1024;
    const MAX_OUTPUT = 1000;
    const VIEWPORT = 320;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    const ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

    let photoFile = null;
    let previewObjectUrl = null;
    let uploading = false;
    let previewRestored = false;
    let lastDraftKey = "";

    function isSignupPage() {
      return (window.location.pathname.replace(/\/$/, "") || "/") === "/signup/influencer";
    }

    function draftFingerprint(draft) {
      if (!draft?.dataUrl) return "";
      return `${draft.dataUrl.length}:${draft.fileName || ""}`;
    }

    function isProfileDetailsStep() {
      if (!isSignupPage()) return false;
      return [...document.querySelectorAll("h2")].some(
        (h) => h.textContent.trim() === "Profile Details"
      );
    }

    function isFinalStep() {
      if (!isSignupPage()) return false;
      const h2s = [...document.querySelectorAll("h2")].map((h) => h.textContent.trim());
      if (h2s.some((t) => /collaboration|preferences/i.test(t))) return true;
      return !!document.querySelector("p.text-\\[10px\\].font-bold.uppercase")?.textContent
        ?.includes("Typical Price Range");
    }

    function findCompleteBtn() {
      return [...document.querySelectorAll("button")].find((b) =>
        (b.textContent || "").includes("Complete Signup")
      );
    }

    function setCompleteSignupUploading(active, message) {
      const btn = findCompleteBtn();
      if (!btn) return;
      if (active) {
        if (!btn.dataset.inflPrevLabel) btn.dataset.inflPrevLabel = btn.textContent.trim();
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
        btn.textContent = message || "Uploading photo…";
      } else if (btn.dataset.inflPrevLabel) {
        btn.textContent = btn.dataset.inflPrevLabel;
        delete btn.dataset.inflPrevLabel;
        btn.disabled = false;
        btn.removeAttribute("aria-disabled");
      }
    }

    function showFinalPhotoError(msg) {
      const row = findCompleteBtn()?.closest(".flex.gap-3") || findCompleteBtn()?.parentElement;
      if (!row) return;
      let el = document.getElementById("infl-signup-photo-error-final");
      if (!el) {
        el = document.createElement("p");
        el.id = "infl-signup-photo-error-final";
        el.className = "isd-field-error";
        el.style.marginTop = "8px";
        row.parentNode.insertBefore(el, row);
      }
      el.hidden = !msg;
      el.textContent = msg || "";
    }

    function loadDraft() {
      try {
        return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      } catch {
        return null;
      }
    }

    function saveDraft(patch) {
      const prev = loadDraft() || {};
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...prev, ...patch }));
    }

    function clearDraft() {
      sessionStorage.removeItem(DRAFT_KEY);
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read image file."));
        reader.readAsDataURL(file);
      });
    }

    async function dataUrlToFile(dataUrl, name) {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return new File([blob], name || "profile.jpg", { type: "image/jpeg" });
    }

    function validateFile(file) {
      if (!file) return "No file selected.";
      const type = String(file.type || "").toLowerCase();
      if (!ALLOWED.includes(type)) {
        return "Only JPG, PNG, or WEBP files allowed.";
      }
      if (file.size > MAX_BYTES) {
        return "File too large. Maximum size is 5 MB.";
      }
      return null;
    }

    function openCropModal(file) {
      return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);

          let scale = Math.max(VIEWPORT / img.width, VIEWPORT / img.height);
          let offsetX = 0;
          let offsetY = 0;
          let dragging = false;
          let lastX = 0;
          let lastY = 0;

          const modal = document.createElement("div");
          modal.className = "isd-crop-modal";
          modal.innerHTML = `
            <div class="isd-crop-backdrop"></div>
            <div class="isd-crop-dialog" role="dialog" aria-modal="true" aria-label="Crop profile photo">
              <h3 class="isd-crop-title">Crop profile photo</h3>
              <p class="isd-crop-sub">Drag to reposition · use zoom to adjust</p>
              <div class="isd-crop-viewport-wrap">
                <canvas class="isd-crop-canvas" width="${VIEWPORT}" height="${VIEWPORT}"></canvas>
              </div>
              <label class="isd-crop-zoom-label">Zoom</label>
              <input type="range" class="isd-crop-zoom" min="100" max="300" value="100" />
              <div class="isd-crop-actions">
                <button type="button" class="isd-crop-btn isd-crop-btn--ghost" data-cancel>Cancel</button>
                <button type="button" class="isd-crop-btn isd-crop-btn--primary" data-save>Use photo</button>
              </div>
            </div>`;

          document.body.appendChild(modal);
          const canvas = modal.querySelector(".isd-crop-canvas");
          const ctx = canvas.getContext("2d");
          const zoom = modal.querySelector(".isd-crop-zoom");
          const baseScale = scale;

          function draw() {
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(0, 0, VIEWPORT, VIEWPORT);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (VIEWPORT - w) / 2 + offsetX;
            const y = (VIEWPORT - h) / 2 + offsetY;
            ctx.drawImage(img, x, y, w, h);
            ctx.strokeStyle = "rgba(238, 62, 150, 0.85)";
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, VIEWPORT - 2, VIEWPORT - 2);
          }

          function exportCrop() {
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (VIEWPORT - w) / 2 + offsetX;
            const y = (VIEWPORT - h) / 2 + offsetY;
            const sx = Math.max(0, -x / scale);
            const sy = Math.max(0, -y / scale);
            const sSize = Math.min(img.width - sx, img.height - sy, VIEWPORT / scale);

            const out = document.createElement("canvas");
            out.width = MAX_OUTPUT;
            out.height = MAX_OUTPUT;
            const octx = out.getContext("2d");
            octx.drawImage(img, sx, sy, sSize, sSize, 0, 0, MAX_OUTPUT, MAX_OUTPUT);
            out.toBlob(
              (blob) => {
                modal.remove();
                if (!blob) {
                  reject(new Error("Could not process image."));
                  return;
                }
                resolve(new File([blob], "profile.jpg", { type: "image/jpeg" }));
              },
              "image/jpeg",
              0.9
            );
          }

          function onPointerDown(e) {
            dragging = true;
            canvas.classList.add("isd-crop-canvas--drag");
            lastX = e.clientX;
            lastY = e.clientY;
          }

          function onPointerMove(e) {
            if (!dragging) return;
            offsetX += e.clientX - lastX;
            offsetY += e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            draw();
          }

          function onPointerUp() {
            dragging = false;
            canvas.classList.remove("isd-crop-canvas--drag");
          }

          canvas.addEventListener("mousedown", onPointerDown);
          window.addEventListener("mousemove", onPointerMove);
          window.addEventListener("mouseup", onPointerUp);
          canvas.addEventListener(
            "touchstart",
            (e) => {
              if (!e.touches[0]) return;
              onPointerDown(e.touches[0]);
            },
            { passive: true }
          );
          window.addEventListener(
            "touchmove",
            (e) => {
              if (!e.touches[0]) return;
              onPointerMove(e.touches[0]);
            },
            { passive: true }
          );
          window.addEventListener("touchend", onPointerUp);

          zoom.addEventListener("input", () => {
            const factor = Number(zoom.value) / 100;
            scale = baseScale * factor;
            draw();
          });

          modal.querySelector("[data-cancel]")?.addEventListener("click", () => {
            modal.remove();
            reject(new Error("Crop cancelled."));
          });
          modal.querySelector(".isd-crop-backdrop")?.addEventListener("click", () => {
            modal.remove();
            reject(new Error("Crop cancelled."));
          });
          modal.querySelector("[data-save]")?.addEventListener("click", exportCrop);

          draw();
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Could not read image."));
        };
        img.src = objectUrl;
      });
    }

    async function processPhotoFile(file) {
      const err = validateFile(file);
      if (err) throw new Error(err);
      const cropped = await openCropModal(file);
      if (cropped.size > MAX_BYTES) {
        throw new Error("File too large after processing. Try a smaller image.");
      }
      return cropped;
    }

    async function setPhotoFile(file) {
      photoFile = file;
      window.__inflSignupPhotoFile = file;
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = URL.createObjectURL(file);
      const dataUrl = await fileToDataUrl(file);
      saveDraft({ dataUrl, fileName: file.name, uploadedUrl: null });
      lastDraftKey = draftFingerprint({ dataUrl, fileName: file.name });
      previewRestored = true;
      refreshAllBlocks();
    }

    function hasPhoto() {
      if (photoFile) return true;
      const draft = loadDraft();
      return !!(draft?.dataUrl || draft?.uploadedUrl);
    }

    function refreshBlock(block) {
      if (!block) return;
      const preview = block.querySelector(".isd-photo-preview");
      const status = block.querySelector(".isd-photo-status");
      const err = block.querySelector(".isd-photo-error");

      if (hasPhoto()) {
        block.classList.add("isd-photo--ready");
        if (preview && previewObjectUrl) {
          preview.innerHTML = `<img src="${previewObjectUrl}" alt="" />`;
          preview.classList.add("isd-photo-preview--filled");
        }
        if (status) {
          if (uploading) {
            status.textContent = "Uploading photo…";
            status.className = "isd-photo-status isd-photo-status--uploading";
          } else {
            status.textContent = "✓ Photo uploaded";
            status.className = "isd-photo-status isd-photo-status--ok";
          }
        }
        if (err) err.hidden = true;
      } else {
        block.classList.remove("isd-photo--ready");
      }
      block.classList.toggle("isd-photo--uploading", uploading);
    }

    function refreshAllBlocks() {
      document.querySelectorAll(".isd-photo-block").forEach(refreshBlock);
    }

    function showBlockError(block, msg) {
      const err = block?.querySelector(".isd-photo-error");
      const status = block?.querySelector(".isd-photo-status");
      if (err) {
        err.hidden = !msg;
        err.textContent = msg || "";
      }
      if (status && msg) {
        status.textContent = msg;
        status.className = "isd-photo-status isd-photo-status--err";
      }
    }

    async function handleFilePicked(file, block) {
      try {
        const processed = await processPhotoFile(file);
        await setPhotoFile(processed);
      } catch (e) {
        if (e?.message === "Crop cancelled.") return;
        showBlockError(block, e?.message || "Upload failed.");
      }
    }

    function attachPhotoBlock(block) {
      if (!block || block.dataset.isdPhotoWired === "1") return;
      block.dataset.isdPhotoWired = "1";

      const drop = block.querySelector(".isd-photo-drop");
      let fileInput = block.querySelector(".isd-photo-file");
      if (!fileInput) {
        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.className = "isd-photo-file";
        fileInput.hidden = true;
        fileInput.accept = ACCEPT;
        block.appendChild(fileInput);
      } else {
        fileInput.accept = ACCEPT;
      }

      const pick = () => {
        if (uploading) return;
        fileInput.click();
      };

      drop?.addEventListener("click", (e) => {
        if (e.target.closest(".isd-photo-change")) return;
        pick();
      });
      drop?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick();
        }
      });

      block.querySelector(".isd-photo-change")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        pick();
      });

      drop?.addEventListener("dragover", (e) => {
        e.preventDefault();
        drop.classList.add("isd-photo-drop--drag");
      });
      drop?.addEventListener("dragleave", () => drop.classList.remove("isd-photo-drop--drag"));
      drop?.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("isd-photo-drop--drag");
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFilePicked(file, block);
      });

      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        fileInput.value = "";
        if (file) handleFilePicked(file, block);
      });

      refreshBlock(block);
    }

    async function restoreFromDraft() {
      const draft = loadDraft();
      if (!draft?.dataUrl) {
        previewRestored = false;
        lastDraftKey = "";
        return;
      }
      const fp = draftFingerprint(draft);
      if (previewRestored && photoFile && previewObjectUrl && fp === lastDraftKey) {
        return;
      }
      try {
        if (!photoFile || fp !== lastDraftKey) {
          photoFile = await dataUrlToFile(draft.dataUrl, draft.fileName || "profile.jpg");
          window.__inflSignupPhotoFile = photoFile;
        }
        if (!previewObjectUrl || fp !== lastDraftKey) {
          if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
          previewObjectUrl = URL.createObjectURL(photoFile);
        }
        lastDraftKey = fp;
        previewRestored = true;
        refreshAllBlocks();
      } catch {
        clearDraft();
        previewRestored = false;
        lastDraftKey = "";
      }
    }

    async function uploadAfterSignup() {
      if (!photoFile) {
        const draft = loadDraft();
        if (draft?.dataUrl) {
          photoFile = await dataUrlToFile(draft.dataUrl, draft.fileName || "profile.jpg");
        }
      }
      if (!photoFile) return { ok: false, error: "Please upload a profile photo." };
      if (uploading) return { ok: false, error: "Upload already in progress." };

      uploading = true;
      refreshAllBlocks();

      try {
        const dataUrl = await fileToDataUrl(photoFile);
        const token = localStorage.getItem("influnet_token");
        if (!token) {
          throw new Error("Network error. Please sign in again and upload from Edit Profile.");
        }
        const res = await fetch("/api/influencer-profile/avatar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ dataUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data.error || "Upload failed.";
          if (/bucket|storage/i.test(msg)) {
            throw new Error("Storage error. Run migration 025_profile_photos_storage.sql in Supabase.");
          }
          if (/network|fetch/i.test(msg)) {
            throw new Error("Network error. Check your connection and try again.");
          }
          throw new Error(msg);
        }
        saveDraft({ uploadedUrl: data.avatarUrl });
        clearDraft();
        photoFile = null;
        window.__inflSignupPhotoFile = null;
        return { ok: true, avatarUrl: data.avatarUrl };
      } catch (e) {
        return { ok: false, error: e?.message || "Upload failed." };
      } finally {
        uploading = false;
        refreshAllBlocks();
      }
    }

    function hookRegisterUpload() {
      if (window.__inflSignupPhotoRegisterHooked) return;
      window.__inflSignupPhotoRegisterHooked = true;
      const prev = window.fetch.bind(window);
      window.fetch = async function (input, init) {
        const url = typeof input === "string" ? input : input?.url || "";
        const res = await prev(input, init);
        if (url.includes("/api/auth/register") && res.ok && hasPhoto()) {
          try {
            const data = await res.clone().json();
            if (data?.token) {
              if (!localStorage.getItem("influnet_token")) {
                localStorage.setItem("influnet_token", data.token);
              }
              setCompleteSignupUploading(true, "Uploading photo…");
              showFinalPhotoError("");
              const result = await uploadAfterSignup();
              if (!result.ok) {
                showFinalPhotoError(result.error || "Upload failed.");
                console.warn("[influnet] signup photo upload:", result.error);
              } else {
                showFinalPhotoError("");
              }
            }
          } catch (e) {
            showFinalPhotoError(e?.message || "Upload failed.");
          } finally {
            setCompleteSignupUploading(false);
          }
        }
        return res;
      };
    }

    function wireCompleteSignupGuard() {
      if (window.__inflSignupPhotoCompleteGuard) return;
      window.__inflSignupPhotoCompleteGuard = true;
      document.addEventListener(
        "click",
        (e) => {
          if (!isFinalStep()) return;
          const btn = e.target.closest("button");
          if (!btn?.textContent?.includes("Complete Signup")) return;
          if (uploading) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
          }
          if (!hasPhoto()) {
            e.preventDefault();
            e.stopImmediatePropagation();
            showFinalPhotoError("Please upload a profile photo.");
          } else {
            showFinalPhotoError("");
          }
        },
        true
      );
    }

    function wireNextStepGuard() {
      if (window.__inflSignupPhotoGuardWired) return;
      window.__inflSignupPhotoGuardWired = true;
      document.addEventListener(
        "click",
        (e) => {
          if (!isSignupPage()) return;
          const btn = e.target.closest("button");
          if (!btn?.textContent?.includes("Next Step")) return;
          if (uploading) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        },
        true
      );
    }

    async function tick() {
      if (!isProfileDetailsStep()) return;
      document.querySelectorAll(".isd-photo-block").forEach(attachPhotoBlock);
      await restoreFromDraft();
    }

    window.influnetSignupPhoto = {
      hasPhoto,
      getFile: () => photoFile || window.__inflSignupPhotoFile || null,
      isUploading: () => uploading,
      restorePreview: restoreFromDraft,
      uploadAfterSignup,
      attach: attachPhotoBlock,
    };

    hookRegisterUpload();
    wireNextStepGuard();
    wireCompleteSignupGuard();
    tick();
    setInterval(tick, 1200);
    window.addEventListener("load", tick);
  } catch (e) {
    console.warn("[influnet] signup profile photo:", e);
  }
})();
