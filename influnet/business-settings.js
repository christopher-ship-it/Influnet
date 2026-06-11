/**
 * Business dashboard → Settings: edit all registration profile fields.
 */
(function () {
  const MOUNT_ID = "influnet-settings-mount";

  const BUSINESS_TYPES = [
    "Startup",
    "SME",
    "Enterprise",
    "Agency",
    "D2C Brand",
    "E-commerce",
    "NGO / Non-profit",
    "Freelancer / Solo",
    "Other",
  ];

  const INDUSTRIES = [
    "Fashion & Apparel",
    "Beauty & Personal Care",
    "Food & Beverage",
    "Technology",
    "Healthcare & Wellness",
    "Finance",
    "Education",
    "Travel & Hospitality",
    "Home & Lifestyle",
    "Automotive",
    "Entertainment & Media",
    "Sports & Fitness",
    "Real Estate",
    "Other",
  ];

  const BUDGET_RANGES = [
    "< ₹25k / month",
    "₹25k – ₹50k",
    "₹50k – ₹1L",
    "₹1L – ₹5L",
    "₹5L – ₹10L",
    "₹10L+",
    "Other",
  ];

  function getStoredUser() {
    try {
      const raw = localStorage.getItem("influnet_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function applyUser(user, token) {
    if (user) localStorage.setItem("influnet_user", JSON.stringify(user));
    if (token) localStorage.setItem("influnet_token", token);
    window.dispatchEvent(
      new CustomEvent("influnet-user-updated", { detail: { user, token } })
    );
  }

  async function api(path, method, body) {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem("influnet_token");
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
    return data;
  }

  function resolveSelectOther(options, value) {
    if (!value) return { select: "", custom: "" };
    if (options.includes(value)) return { select: value, custom: "" };
    return { select: "Other", custom: value };
  }

  function parseCityState(user) {
    if (user?.city || user?.state) {
      return { city: user.city || "", state: user.state || "" };
    }
    const loc = (user?.location || "").trim();
    if (!loc) return { city: "", state: "" };
    const parts = loc.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      return { city: parts[0], state: parts.slice(1).join(", ") };
    }
    return { city: loc, state: "" };
  }

  function field(label, id, type, value, opts) {
    const wrap = document.createElement("div");
    wrap.className = opts?.full ? "sm:col-span-2 space-y-1" : "space-y-1";
    const lbl = document.createElement("label");
    lbl.className = "text-sm font-medium text-gray-700";
    lbl.htmlFor = id;
    lbl.textContent = label;
    if (opts?.optional) {
      const span = document.createElement("span");
      span.className = "text-gray-400 font-normal ml-1";
      span.textContent = "(optional)";
      lbl.appendChild(span);
    }
    wrap.appendChild(lbl);

    if (opts?.textarea) {
      const ta = document.createElement("textarea");
      ta.id = id;
      ta.name = id;
      ta.value = value ?? "";
      ta.rows = opts.rows || 3;
      ta.className =
        "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400";
      if (opts.placeholder) ta.placeholder = opts.placeholder;
      wrap.appendChild(ta);
      return wrap;
    }

    const input = document.createElement("input");
    input.id = id;
    input.name = id;
    input.type = type || "text";
    input.value = value ?? "";
    input.className =
      "w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400";
    if (opts?.placeholder) input.placeholder = opts.placeholder;
    if (opts?.required) input.required = true;
    wrap.appendChild(input);
    return wrap;
  }

  function selectField(label, id, options, selected, opts) {
    const wrap = document.createElement("div");
    wrap.className = "space-y-1";
    const lbl = document.createElement("label");
    lbl.className = "text-sm font-medium text-gray-700";
    lbl.htmlFor = id;
    lbl.textContent = label;
    wrap.appendChild(lbl);
    const sel = document.createElement("select");
    sel.id = id;
    sel.name = id;
    sel.className =
      "w-full h-10 px-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = opts?.placeholder || "Select…";
    sel.appendChild(empty);
    for (const opt of options) {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      if (opt === selected) o.selected = true;
      sel.appendChild(o);
    }
    wrap.appendChild(sel);
    return wrap;
  }

  function wireOtherToggle(selectId, customWrap) {
    const sel = document.getElementById(selectId);
    if (!sel || !customWrap) return;
    const sync = () => {
      customWrap.style.display = sel.value === "Other" ? "" : "none";
    };
    sel.addEventListener("change", sync);
    sync();
  }

  async function renderSettings(root) {
    if (root.dataset.rendered === "1") return;
    root.dataset.rendered = "1";
    root.className = "p-6";
    root.innerHTML =
      '<div class="max-w-3xl mx-auto py-8 text-center text-gray-400 text-sm">Loading profile…</div>';

    let user = getStoredUser();
    try {
      const data = await api("/api/auth/me", "GET");
      if (data.user) {
        user = data.user;
        applyUser(data.user, data.token);
      }
    } catch (_) {
      /* cached */
    }

    const isBusiness =
      user?.role === "business_owner" || !user?.role || user?.role === "business";
    if (!isBusiness) {
      root.innerHTML =
        '<div class="max-w-2xl mx-auto p-6 text-sm text-gray-500">Settings are only available for business accounts.</div>';
      return;
    }

    const { city, state } = parseCityState(user);
    const typeVals = resolveSelectOther(BUSINESS_TYPES, user?.businessType || "");
    const indVals = resolveSelectOther(INDUSTRIES, user?.industry || "");
    const budgetVals = resolveSelectOther(BUDGET_RANGES, user?.marketingBudget || "");

    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "max-w-3xl mx-auto space-y-6";

    wrap.innerHTML = `
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Edit profile</h1>
        <p class="text-sm text-gray-500 mt-1">Update the information you entered during registration.</p>
      </div>`;

    const msg = document.createElement("div");
    msg.id = "influnet-settings-msg";
    msg.className = "hidden";
    wrap.appendChild(msg);

    function showMsg(text, ok) {
      msg.textContent = text;
      msg.className = ok
        ? "text-sm rounded-xl px-4 py-3 bg-green-50 text-green-800 border border-green-100"
        : "text-sm rounded-xl px-4 py-3 bg-red-50 text-red-800 border border-red-100";
    }

    const form = document.createElement("form");
    form.className = "space-y-6";

    function section(title, subtitle) {
      const card = document.createElement("div");
      card.className =
        "bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4";
      card.innerHTML = `<h2 class="text-lg font-semibold text-gray-900">${title}</h2>${
        subtitle ? `<p class="text-xs text-gray-500 -mt-2">${subtitle}</p>` : ""
      }`;
      const grid = document.createElement("div");
      grid.className = "grid grid-cols-1 sm:grid-cols-2 gap-4";
      card.appendChild(grid);
      form.appendChild(card);
      return grid;
    }

    const account = section("Account details");
    account.appendChild(field("Full name", "name", "text", user?.name, { required: true }));
    account.appendChild(
      field("Business / company name", "companyName", "text", user?.companyName, {
        required: true,
      })
    );
    account.appendChild(field("Phone", "phone", "tel", user?.phone));
    const emailNote = document.createElement("p");
    emailNote.className = "sm:col-span-2 text-xs text-gray-500";
    emailNote.innerHTML = `Work email: <strong>${user?.email || "—"}</strong> — change below in Email &amp; password.`;
    account.appendChild(emailNote);

    const business = section("Business details");
    business.appendChild(
      selectField("Business type", "businessTypeSelect", BUSINESS_TYPES, typeVals.select, {
        placeholder: "Select type",
      })
    );
    const typeCustomWrap = field(
      "Specify business type",
      "businessTypeCustom",
      "text",
      typeVals.custom,
      { placeholder: "Enter your business type" }
    );
    typeCustomWrap.id = "business-type-custom-wrap";
    business.appendChild(typeCustomWrap);

    business.appendChild(
      selectField("Industry", "industrySelect", INDUSTRIES, indVals.select, {
        placeholder: "Select industry",
      })
    );
    const indCustomWrap = field(
      "Specify industry",
      "industryCustom",
      "text",
      indVals.custom,
      { placeholder: "Enter your industry" }
    );
    indCustomWrap.id = "industry-custom-wrap";
    business.appendChild(indCustomWrap);

    business.appendChild(
      field("Company website", "website", "url", user?.website, {
        optional: true,
        placeholder: "https://example.com",
      })
    );
    business.appendChild(
      field("Instagram", "instagramHandle", "text", user?.instagramHandle, {
        optional: true,
        placeholder: "Username or profile URL",
      })
    );
    business.appendChild(
      field("Facebook", "facebookHandle", "text", user?.facebookHandle, {
        optional: true,
        placeholder: "Page URL",
      })
    );
    business.appendChild(
      field("LinkedIn", "linkedinHandle", "text", user?.linkedinHandle, {
        optional: true,
        placeholder: "Company profile URL",
      })
    );

    const verify = section("Verification & address");
    verify.appendChild(
      field("GST number", "gstNumber", "text", user?.gstNumber, { optional: true })
    );
    verify.appendChild(field("City", "city", "text", city));
    verify.appendChild(field("State / province", "state", "text", state));
    verify.appendChild(
      field("Registered address", "registeredAddress", "text", user?.registeredAddress, {
        optional: true,
        textarea: true,
        full: true,
        placeholder: "Complete registered business address",
        rows: 3,
      })
    );

    const collab = section("Collaboration preferences", "Looking for influencers");
    collab.appendChild(
      selectField(
        "Monthly marketing budget",
        "marketingBudgetSelect",
        BUDGET_RANGES,
        budgetVals.select,
        { placeholder: "Select a range…" }
      )
    );
    const budgetCustomWrap = field(
      "Specify budget amount",
      "marketingBudgetCustom",
      "text",
      budgetVals.custom,
      { placeholder: "e.g. ₹50,000 / month" }
    );
    budgetCustomWrap.id = "budget-custom-wrap";
    collab.appendChild(budgetCustomWrap);

    const collabNote = document.createElement("p");
    collabNote.className = "sm:col-span-2 text-sm text-gray-600 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3";
    collabNote.textContent =
      "Looking for: Influencers (Reach & Awareness)";
    collab.appendChild(collabNote);

    const saveBtn = document.createElement("button");
    saveBtn.type = "submit";
    saveBtn.className =
      "w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50";
    saveBtn.textContent = "Save profile";
    form.appendChild(saveBtn);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      saveBtn.disabled = true;
      try {
        const fd = new FormData(form);
        const businessTypeSelect = fd.get("businessTypeSelect");
        const businessTypeCustom = String(fd.get("businessTypeCustom") || "").trim();
        const industrySelect = fd.get("industrySelect");
        const industryCustom = String(fd.get("industryCustom") || "").trim();
        const budgetSelect = fd.get("marketingBudgetSelect");
        const budgetCustom = String(fd.get("marketingBudgetCustom") || "").trim();

        if (!businessTypeSelect && !businessTypeCustom) {
          throw new Error("Please select or enter a business type.");
        }
        if (businessTypeSelect === "Other" && !businessTypeCustom) {
          throw new Error("Please enter your business type.");
        }
        if (!industrySelect && !industryCustom) {
          throw new Error("Please select or enter an industry.");
        }
        if (industrySelect === "Other" && !industryCustom) {
          throw new Error("Please enter your industry.");
        }
        if (budgetSelect === "Other" && !budgetCustom) {
          throw new Error("Please enter your budget amount.");
        }

        const payload = {
          name: fd.get("name"),
          companyName: fd.get("companyName"),
          phone: fd.get("phone"),
          businessType:
            businessTypeSelect === "Other"
              ? businessTypeCustom
              : businessTypeSelect || businessTypeCustom,
          industry:
            industrySelect === "Other" ? industryCustom : industrySelect || industryCustom,
          website: fd.get("website"),
          instagramHandle: fd.get("instagramHandle"),
          facebookHandle: fd.get("facebookHandle"),
          linkedinHandle: fd.get("linkedinHandle"),
          gstNumber: fd.get("gstNumber"),
          city: fd.get("city"),
          state: fd.get("state"),
          registeredAddress: fd.get("registeredAddress"),
          marketingBudget:
            budgetSelect === "Other" ? budgetCustom : budgetSelect || budgetCustom,
          collabPreferences: ["influencers"],
        };

        const data = await api("/api/auth/me", "PATCH", payload);
        applyUser(data.user, data.token);
        showMsg("Profile saved successfully.", true);
        delete root.dataset.rendered;
        renderSettings(root);
      } catch (err) {
        showMsg(err.message, false);
      } finally {
        saveBtn.disabled = false;
      }
    });

    wrap.appendChild(form);

    const credCard = document.createElement("div");
    credCard.className =
      "bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4";
    credCard.innerHTML = '<h2 class="text-lg font-semibold text-gray-900">Email &amp; password</h2>';
    credCard.appendChild(
      field("New email", "email", "email", user?.email, { required: true })
    );
    credCard.appendChild(
      field("Current password (to confirm email change)", "emailPassword", "password", "", {
        required: true,
      })
    );
    const emailBtn = document.createElement("button");
    emailBtn.type = "button";
    emailBtn.className =
      "bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl";
    emailBtn.textContent = "Update email";
    emailBtn.addEventListener("click", async () => {
      emailBtn.disabled = true;
      try {
        const email = credCard.querySelector("#email").value;
        const password = credCard.querySelector("#emailPassword").value;
        const data = await api("/api/auth/update-email", "POST", { email, password });
        if (data.user) applyUser(data.user, data.token);
        showMsg("Email update initiated. Check your inbox if confirmation is required.", true);
      } catch (err) {
        showMsg(err.message, false);
      } finally {
        emailBtn.disabled = false;
      }
    });
    credCard.appendChild(emailBtn);

    credCard.appendChild(
      field("Current password", "currentPassword", "password", "", { required: true })
    );
    credCard.appendChild(
      field("New password", "newPassword", "password", "", {
        required: true,
        placeholder: "At least 6 characters",
      })
    );
    const passBtn = document.createElement("button");
    passBtn.type = "button";
    passBtn.className =
      "bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl";
    passBtn.textContent = "Change password";
    passBtn.addEventListener("click", async () => {
      passBtn.disabled = true;
      try {
        await api("/api/auth/change-password", "POST", {
          currentPassword: credCard.querySelector("#currentPassword").value,
          newPassword: credCard.querySelector("#newPassword").value,
        });
        showMsg("Password changed successfully.", true);
      } catch (err) {
        showMsg(err.message, false);
      } finally {
        passBtn.disabled = false;
      }
    });
    credCard.appendChild(passBtn);
    wrap.appendChild(credCard);

    root.appendChild(wrap);

    wireOtherToggle("businessTypeSelect", typeCustomWrap);
    wireOtherToggle("industrySelect", indCustomWrap);
    wireOtherToggle("marketingBudgetSelect", budgetCustomWrap);
  }

  function tryMount() {
    if (!window.location.pathname.startsWith("/dashboard")) return;
    const el = document.getElementById(MOUNT_ID);
    if (el) renderSettings(el);
  }

  const observer = new MutationObserver(tryMount);

  function startObserver() {
    const root = document.body || document.documentElement;
    if (!root) return;
    observer.observe(root, { childList: true, subtree: true });
    tryMount();
  }

  if (document.body) startObserver();
  else document.addEventListener("DOMContentLoaded", startObserver);

  window.addEventListener("influnet-settings-remount", () => {
    const el = document.getElementById(MOUNT_ID);
    if (el) {
      delete el.dataset.rendered;
      renderSettings(el);
    }
  });
})();
