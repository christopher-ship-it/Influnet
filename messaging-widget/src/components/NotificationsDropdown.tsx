import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BellDot,
  MessageSquare,
  Handshake,
  CheckCircle2,
  XCircle,
  Eye,
  FolderKanban,
  X,
} from "lucide-react";
import {
  NOTIFICATION_PANEL_HEIGHT,
  NOTIFICATION_PANEL_MAX_HEIGHT_VH,
  NOTIFICATION_PANEL_WIDTH,
  NOTIFICATION_PANEL_Z_INDEX,
} from "../constants";
import { usePopoverPosition } from "../hooks/usePopoverPosition";
import {
  countUnreadActivity,
  fetchActivityFeed,
  getNotificationsSeenAt,
  markNotificationsSeen,
} from "../api/activityApi";
import type { ActivityItem, AuthUser } from "../types";
import { openNavSection } from "../utils/nav";
import { timeShort } from "../utils/dates";
import { HeaderIconButton, HEADER_ICON_SIZE, HEADER_ICON_STROKE } from "./HeaderIconButton";

function ActivityKindIcon({ kind }: { kind: ActivityItem["kind"] }) {
  const props = { size: 16, strokeWidth: HEADER_ICON_STROKE, className: "text-gray-500" };
  switch (kind) {
    case "message":
      return <MessageSquare {...props} />;
    case "collab_request":
      return <Handshake {...props} />;
    case "request_accepted":
      return <CheckCircle2 {...props} />;
    case "request_rejected":
      return <XCircle {...props} />;
    case "profile_view":
      return <Eye {...props} />;
    default:
      return <FolderKanban {...props} />;
  }
}

type Props = {
  currentUserId: string | null;
  onOpenChat: (id: string) => void;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia("(max-width: 767px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

export function NotificationsDropdown({ currentUserId, onOpenChat }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const position = usePopoverPosition(
    open && !isMobile,
    triggerRef,
    NOTIFICATION_PANEL_WIDTH,
    NOTIFICATION_PANEL_HEIGHT
  );

  const refresh = async () => {
    setLoading(true);
    try {
      let user: AuthUser | null = null;
      try {
        user = JSON.parse(localStorage.getItem("influnet_user") || "null");
      } catch {
        user = null;
      }
      const feed = await fetchActivityFeed(user);
      setItems(feed);
      setUnread(countUnreadActivity(feed));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const poll = window.setInterval(refresh, 20000);
    const onNotify = () => refresh();
    window.addEventListener("influnet-notification", onNotify);
    return () => {
      clearInterval(poll);
      window.removeEventListener("influnet-notification", onNotify);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!open) return;
    markNotificationsSeen();
    setUnread(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  const handleItem = (item: ActivityItem) => {
    setOpen(false);
    if (item.kind === "message" && item.conversationId) {
      onOpenChat(item.conversationId);
      return;
    }
    if (
      item.kind === "collab_request" ||
      item.kind === "request_accepted" ||
      item.kind === "request_rejected"
    ) {
      openNavSection("requests");
    }
  };

  const listContent = (
    <>
      {loading && <p className="p-4 text-sm text-gray-400 m-0">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="p-4 text-sm text-gray-400 m-0">You're all caught up.</p>
      )}
      {items.map((item) => {
        const isNew =
          new Date(item.createdAt).getTime() > getNotificationsSeenAt() && !open;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleItem(item)}
            className={`w-full text-left px-4 py-3 border-0 border-b border-[#f3f4f6] dark:border-gray-800 cursor-pointer transition-colors hover:bg-[#f9fafb] dark:hover:bg-gray-800 ${
              isNew ? "bg-[#fdf2f8]" : "bg-white dark:bg-gray-900"
            }`}
          >
            <span className="flex items-start gap-3">
              <span
                className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg bg-[#f9fafb] dark:bg-gray-800 shrink-0"
                aria-hidden
              >
                <ActivityKindIcon kind={item.kind} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {item.title}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {timeShort(item.createdAt)}
                  </span>
                </span>
                <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {item.body}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </>
  );

  const panelHeader = (
    <div className="px-4 py-3 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
      <p className="m-0 text-sm font-bold text-gray-900 dark:text-gray-100">Activity Center</p>
      <p className="m-0 mt-0.5 text-[11px] text-gray-400">
        Messages · Requests · Profile views · Project updates
      </p>
    </div>
  );

  const mobilePanel =
    open && isMobile
      ? createPortal(
          <div
            className="fixed inset-0 flex flex-col"
            style={{ zIndex: NOTIFICATION_PANEL_Z_INDEX }}
            role="dialog"
            aria-modal="true"
            aria-label="Activity Center"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40 border-0 cursor-default"
              aria-label="Close"
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              className="infl-msgs-popover infl-notifications-panel relative mt-auto flex flex-col w-full max-h-[92vh] rounded-t-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
                <div>
                  <p className="m-0 text-base font-bold text-gray-900 dark:text-gray-100">
                    Activity Center
                  </p>
                  <p className="m-0 mt-0.5 text-[11px] text-gray-400">
                    Messages · Requests · Profile views · Project updates
                  </p>
                </div>
                <button
                  type="button"
                  className="infl-icon-btn"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                >
                  <X size={16} strokeWidth={HEADER_ICON_STROKE} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto infl-msgs-scroll bg-white dark:bg-gray-900">
                {listContent}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const desktopPanel =
    open && !isMobile && position.width > 0
      ? createPortal(
          <div
            ref={panelRef}
            className="infl-msgs-popover infl-notifications-panel fixed flex flex-col rounded-xl overflow-hidden shadow-xl"
            style={{
              zIndex: NOTIFICATION_PANEL_Z_INDEX,
              top: position.top,
              left: position.left,
              width: position.width,
              height: position.height,
              maxHeight: `${NOTIFICATION_PANEL_MAX_HEIGHT_VH}vh`,
              maxWidth: "min(420px, calc(100vw - 32px))",
            }}
            role="dialog"
            aria-label="Activity Center"
          >
            {panelHeader}
            <div className="flex-1 min-h-0 overflow-y-auto infl-msgs-scroll bg-white dark:bg-gray-900">
              {listContent}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <HeaderIconButton
        ref={triggerRef}
        label="Activity Center"
        tooltip="Activity Center"
        active={open}
        badge={unread}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) refresh();
        }}
      >
        <BellDot size={HEADER_ICON_SIZE} strokeWidth={HEADER_ICON_STROKE} aria-hidden />
      </HeaderIconButton>
      {mobilePanel}
      {desktopPanel}
    </>
  );
}
