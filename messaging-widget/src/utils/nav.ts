export function normalizeNavText(text: string): string {
  return String(text || "")
    .replace(/\d+/g, "")
    .replace(/\+/g, "")
    .trim()
    .toLowerCase();
}

export function findNavButton(label: string): HTMLButtonElement | null {
  const nav = document.querySelector(".flex.h-screen aside nav");
  if (!nav) return null;
  const target = label.toLowerCase();
  const buttons = [...nav.querySelectorAll(":scope > button")] as HTMLButtonElement[];
  const byLabel = buttons.find(
    (btn) => normalizeNavText(btn.textContent || "") === target
  );
  if (byLabel) return byLabel;
  const idx = { dashboard: 0, messages: 1, requests: 2 }[target];
  return idx != null ? buttons[idx] || null : null;
}

export function getActiveNavLabel(): string {
  if (typeof window.influnetBizIsDefinitelyDashboard === "function") {
    if (window.influnetBizIsDefinitelyDashboard()) return "dashboard";
  }
  const nav = document.querySelector(".flex.h-screen aside nav");
  if (nav) {
    const active = [...nav.querySelectorAll(":scope > button")].find(
      (b) =>
        b.classList.contains("bg-violet-100") ||
        /\bbg-violet-100\b/.test(b.className)
    );
    if (active) return normalizeNavText(active.textContent || "");
  }
  const crumb = document.querySelector(
    ".flex.h-screen header span.text-sm.font-semibold.text-gray-800, .flex.h-screen header .text-gray-800.font-semibold, .flex.h-screen header .text-gray-800.font-medium"
  );
  return crumb ? normalizeNavText(crumb.textContent || "") : "";
}

export function isOnMessagesPage(): boolean {
  if (typeof window.influnetBizIsMessagesTab === "function" && window.influnetBizIsMessagesTab()) {
    return true;
  }
  return getActiveNavLabel() === "messages";
}

export function isOnRequestsPage(): boolean {
  return getActiveNavLabel() === "requests";
}

export function openNavSection(label: string) {
  const btn = findNavButton(label);
  btn?.click();
}

declare global {
  interface Window {
    influnetBizIsMessagesTab?: () => boolean;
    influnetBizIsDefinitelyDashboard?: () => boolean;
    influnetOpenFloatingMessenger?: () => void;
  }
}
