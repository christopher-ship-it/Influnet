import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { NOTIFICATION_PANEL_Z_INDEX } from "../constants";
import { useMessagingStore } from "../store/messagingStore";
import { computePopoverPosition } from "../utils/popoverPosition";
import { displayName } from "../utils/avatar";
import type { AuthUser, Conversation } from "../types";

type Props = {
  conversation: Conversation;
  currentUser: AuthUser | null;
  triggerRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
};

function profilePath(conversation: Conversation, viewerRole?: string | null): string | null {
  const other = conversation.otherUser;
  const slug = other.profileSlug || other.username;
  if (viewerRole === "business_owner" && slug) {
    return `/influnet/${encodeURIComponent(slug)}`;
  }
  return null;
}

export function ConversationMenu({
  conversation,
  currentUser,
  triggerRef,
  open,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 });

  const archiveConversation = useMessagingStore((s) => s.archiveConversation);
  const markUnread = useMessagingStore((s) => s.markConversationUnread);
  const toggleMute = useMessagingStore((s) => s.toggleMuteConversation);
  const deletePermanently = useMessagingStore((s) => s.deleteConversationPermanently);
  const mutedIds = useMessagingStore((s) => s.mutedIds);

  const isMuted = mutedIds.has(conversation.id);
  const isBusiness = currentUser?.role === "business_owner";
  const publicPath = profilePath(conversation, currentUser?.role);
  const otherName = displayName(conversation.otherUser);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = computePopoverPosition({
        triggerRect: el.getBoundingClientRect(),
        panelWidth: 240,
        panelHeight: 360,
        gap: 6,
      });
      setPos({ top: rect.top, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, triggerRef]);

  const item = (label: string, onClick: () => void, danger?: boolean) => (
    <button
      type="button"
      className={`w-full text-left px-3 py-2 text-xs border-0 cursor-pointer bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 ${
        danger ? "text-red-600 font-semibold" : "text-gray-800 dark:text-gray-100"
      }`}
      onClick={() => {
        onClick();
        onClose();
      }}
    >
      {label}
    </button>
  );

  const menu = open ? (
    <div
      ref={panelRef}
      className="infl-msgs-popover fixed py-1 rounded-xl overflow-hidden"
      style={{
        zIndex: NOTIFICATION_PANEL_Z_INDEX + 1,
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: "70vh",
        overflowY: "auto",
      }}
      role="menu"
    >
      <p className="px-3 py-1.5 m-0 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        Conversation
      </p>
      {publicPath &&
        item("View Profile", () => window.open(publicPath, "_blank", "noopener"))}
      {isBusiness &&
        publicPath &&
        item("Open Public Profile", () => window.open(publicPath, "_blank", "noopener"))}
      {isBusiness &&
        publicPath &&
        item("Copy Profile Link", () => {
          const url = `${window.location.origin}${publicPath}`;
          navigator.clipboard?.writeText(url);
        })}
      {!isBusiness &&
        item("View Business Profile", () => {
          /* no public business page yet — focus requests tab */
          import("../utils/nav").then(({ openNavSection }) => openNavSection("requests"));
        })}
      {item("Mark as Unread", () => void markUnread(conversation.id))}
      {item("Archive Conversation", () => void archiveConversation(conversation.id))}
      {item(isMuted ? "Unmute Notifications" : "Mute Notifications", () =>
        toggleMute(conversation.id)
      )}

      <p className="px-3 py-1.5 m-0 text-[10px] font-bold uppercase tracking-wide text-gray-400 border-t border-gray-100 dark:border-gray-800 mt-1">
        Danger zone
      </p>
      {item("Delete Conversation", () => {
        const ok = window.confirm(
          `Delete your conversation with ${otherName}? This cannot be undone.`
        );
        if (ok) void deletePermanently(conversation.id);
      }, true)}
    </div>
  ) : null;

  return createPortal(menu, document.body);
}
