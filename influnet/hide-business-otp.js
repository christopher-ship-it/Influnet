/**
 * Business signup: hide mobile/OTP UI and bypass validation until SMS is deployed.
 */
(function () {
  const PLACEHOLDER_PHONE = "+910000000000";

  function isBusinessSignup() {
    return window.location.pathname.replace(/\/$/, "") === "/signup/business";
  }

  function setReactInputValue(input, value) {
    if (!input) return;
    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc?.set) desc.set.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function findMobileInput() {
    return Array.from(document.querySelectorAll('input[type="tel"]')).find((input) => {
      const ph = (input.getAttribute("placeholder") || "").toLowerCase();
      return ph.includes("98765") || ph.includes("mobile") || ph.includes("+91");
    });
  }

  function hideFieldGroup(labelText) {
    const labels = Array.from(document.querySelectorAll("label"));
    for (const label of labels) {
      const t = (label.textContent || "").trim().toLowerCase();
      if (!t.includes(labelText)) continue;
      const group =
        label.closest(".space-y-2") ||
        label.closest(".space-y-1") ||
        label.parentElement;
      if (group) group.style.display = "none";
    }
  }

  function hideSendOtpButton() {
    const buttons = Array.from(document.querySelectorAll("button"));
    for (const b of buttons) {
      const t = (b.textContent || "").trim().toLowerCase();
      if (t === "send otp") b.style.display = "none";
    }
  }

  function ensurePlaceholderPhone() {
    const mobile = findMobileInput();
    if (!mobile) return;
    if (!(mobile.value || "").trim()) {
      setReactInputValue(mobile, PLACEHOLDER_PHONE);
    }
  }

  function hideOtpAndMobile() {
    if (!isBusinessSignup()) return;

    hideFieldGroup("mobile number");
    hideFieldGroup("enter otp");
    hideSendOtpButton();

    const otpInputs = Array.from(document.querySelectorAll("input"));
    for (const input of otpInputs) {
      const ph = (input.getAttribute("placeholder") || "").toLowerCase();
      if (!ph.includes("otp") && !ph.includes("digit code")) continue;
      const group =
        input.closest(".space-y-2") ||
        input.closest(".space-y-1") ||
        input.parentElement;
      if (group) group.style.display = "none";
    }

    ensurePlaceholderPhone();
  }

  function onActionClick(ev) {
    if (!isBusinessSignup()) return;
    const btn = ev.target.closest("button");
    if (!btn) return;
    const label = (btn.textContent || "").trim().toLowerCase();
    if (
      label.includes("next step") ||
      label.includes("complete signup") ||
      label.includes("creating account")
    ) {
      ensurePlaceholderPhone();
    }
  }

  const obs = new MutationObserver(hideOtpAndMobile);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", onActionClick, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideOtpAndMobile);
  } else {
    hideOtpAndMobile();
  }
})();
