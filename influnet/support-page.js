/**
 * /support — Book a Demo / contact support (standalone page).
 */
(function () {
  if (!/^\/support\/?$/i.test(window.location.pathname)) return;

  function render() {
    const existing = document.getElementById("influnet-support-page");
    if (existing) return;

    const root = document.getElementById("root");
    if (root) root.style.display = "none";

    document.title = "Book a Demo — Influnet";

    const wrap = document.createElement("div");
    wrap.id = "influnet-support-page";
    wrap.style.cssText =
      "position:fixed;inset:0;z-index:200000;overflow:auto;background:#f5f6fa;font-family:Inter,system-ui,sans-serif;color:#111;";
    wrap.innerHTML = `
      <header style="background:#09090b;color:#fff;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;">
        <a href="/" style="display:flex;align-items:center;text-decoration:none;"><img src="/Asset/Influnet-LOGO/Logo.png" alt="Influnet" style="height:36px;width:auto;display:block;" /></a>
        <a href="/login" style="color:#e5e7eb;text-decoration:none;font-size:14px;font-weight:600;">Log in</a>
      </header>
      <main style="max-width:560px;margin:0 auto;padding:48px 20px 64px;">
        <h1 style="font-size:32px;font-weight:800;margin:0 0 8px;">Book a Demo</h1>
        <p style="color:#6b7280;line-height:1.6;margin:0 0 28px;">Tell us about your brand or creator team. We'll walk you through collaborations, campaigns, and messaging on Influnet.</p>
        <form id="influnet-support-form" style="background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:24px;display:flex;flex-direction:column;gap:14px;">
          <label style="font-size:13px;font-weight:600;">Name<input name="name" required style="display:block;width:100%;margin-top:6px;height:44px;border:1px solid #e5e7eb;border-radius:12px;padding:0 12px;font-size:14px;box-sizing:border-box;" /></label>
          <label style="font-size:13px;font-weight:600;">Work email<input name="email" type="email" required style="display:block;width:100%;margin-top:6px;height:44px;border:1px solid #e5e7eb;border-radius:12px;padding:0 12px;font-size:14px;box-sizing:border-box;" /></label>
          <label style="font-size:13px;font-weight:600;">Company / channel<input name="company" style="display:block;width:100%;margin-top:6px;height:44px;border:1px solid #e5e7eb;border-radius:12px;padding:0 12px;font-size:14px;box-sizing:border-box;" /></label>
          <label style="font-size:13px;font-weight:600;">What do you want to see?<textarea name="message" rows="4" required placeholder="e.g. brand collab workflow, influencer dashboard..." style="display:block;width:100%;margin-top:6px;border:1px solid #e5e7eb;border-radius:12px;padding:12px;font-size:14px;resize:vertical;box-sizing:border-box;font-family:inherit;"></textarea></label>
          <button type="submit" style="height:48px;border:none;border-radius:12px;background:#ff3380;color:#fff;font-weight:700;font-size:15px;cursor:pointer;">Request demo</button>
          <p id="influnet-support-msg" style="display:none;font-size:13px;margin:0;"></p>
        </form>
        <p style="text-align:center;margin-top:20px;font-size:13px;color:#9ca3af;">Or email <a href="mailto:support@influnet.io?subject=Book%20a%20Demo" style="color:#7c3aed;font-weight:600;">support@influnet.io</a></p>
        <p style="text-align:center;margin-top:12px;"><a href="/" style="color:#6b7280;font-size:14px;">← Back to home</a></p>
      </main>
    `;
    document.body.appendChild(wrap);

    const form = document.getElementById("influnet-support-form");
    const msg = document.getElementById("influnet-support-msg");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const subject = encodeURIComponent("Influnet demo request");
      const body = encodeURIComponent(
        `Name: ${fd.get("name")}\nEmail: ${fd.get("email")}\nCompany: ${fd.get("company")}\n\n${fd.get("message")}`
      );
      window.location.href = `mailto:support@influnet.io?subject=${subject}&body=${body}`;
      msg.style.display = "block";
      msg.style.color = "#065f46";
      msg.textContent =
        "Opening your email app… If nothing opens, email support@influnet.io with the details above.";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  new MutationObserver(() => {
    const root = document.getElementById("root");
    if (root) root.style.display = "none";
  }).observe(document.body, { childList: true, subtree: true });
})();
