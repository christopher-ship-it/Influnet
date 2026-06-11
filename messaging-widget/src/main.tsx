import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

function mount() {
  if (document.getElementById("infl-messenger-root")) return;
  const el = document.createElement("div");
  el.id = "infl-messenger-root";
  document.body.appendChild(el);
  createRoot(el).render(<App />);
}

mount();

window.addEventListener("load", mount);
window.addEventListener("popstate", mount);

window.addEventListener("influnet-messenger-notify", ((e: Event) => {
  const detail = (e as CustomEvent).detail as {
    title?: string;
    body?: string;
    kind?: "message" | "collab" | "response";
    conversationId?: string;
    actionLabel?: string;
  };
  if (!detail?.title) return;
  import("./store/notificationStore").then(({ useNotificationStore }) => {
    useNotificationStore.getState().pushToast({
      title: detail.title!,
      body: detail.body || "",
      kind: detail.kind || "message",
      conversationId: detail.conversationId,
      actionLabel: detail.actionLabel,
    });
  });
}) as EventListener);

(window as Window & { influnetOpenFloatingMessenger?: () => void }).influnetOpenFloatingMessenger =
  () => {
    mount();
    import("./store/messagingStore").then(({ useMessagingStore }) => {
      useMessagingStore.getState().setPanelExpanded(true);
      useMessagingStore.getState().loadConversations();
    });
  };
