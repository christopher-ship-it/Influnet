import { useEffect, useRef, useState } from "react";
import { Handshake, MessageSquarePlus, FolderKanban } from "lucide-react";
import type { AuthUser } from "../types";
import { openNavSection } from "../utils/nav";
import { HeaderIconButton, HEADER_ICON_SIZE, HEADER_ICON_STROKE } from "./HeaderIconButton";
import { NewConversationDialog } from "./NewConversationDialog";
import { CreateCollaborationDialog } from "./CreateCollaborationDialog";

type Props = {
  currentUser: AuthUser | null;
  onOpenChat: (id: string) => void;
};

const MENU_ITEMS = [
  {
    id: "conversation",
    label: "Start Conversation",
    description: "Message a creator or business",
    icon: MessageSquarePlus,
  },
  {
    id: "collaboration",
    label: "Create Collaboration",
    description: "Begin a new partnership project",
    icon: Handshake,
  },
  {
    id: "project",
    label: "Create Project",
    description: "Open the collaborations workspace",
    icon: FolderKanban,
  },
] as const;

export function CollaborateMenu({ currentUser, onOpenChat }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = () => {
      setMenuOpen(false);
      setConversationOpen(true);
    };
    window.addEventListener("influnet-open-new-conversation", onOpen);
    return () => window.removeEventListener("influnet-open-new-conversation", onOpen);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const handleItem = (id: (typeof MENU_ITEMS)[number]["id"]) => {
    setMenuOpen(false);
    if (id === "conversation") setConversationOpen(true);
    else if (id === "collaboration") setCollaborationOpen(true);
    else if (id === "project") openNavSection("Collaborations");
  };

  return (
    <>
      <div ref={rootRef} className="relative">
        <HeaderIconButton
          label="Collaborate"
          tooltip="Collaborate"
          active={menuOpen}
          data-infl-new-conversation=""
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Handshake size={HEADER_ICON_SIZE} strokeWidth={HEADER_ICON_STROKE} aria-hidden />
        </HeaderIconButton>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Collaborate actions"
            className="infl-msgs-collaborate-menu infl-msgs-popover absolute right-0 top-full mt-2 z-50 w-72 origin-top-right rounded-xl border border-slate-100 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="overflow-hidden rounded-lg border border-slate-100/80 dark:border-gray-700">
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-900">
                <p className="m-0 text-sm font-bold text-gray-900 dark:text-gray-100">Collaborate</p>
                <p className="m-0 mt-0.5 text-[11px] text-gray-400">
                  Start conversations and partnerships
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900">
                {MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      onClick={() => handleItem(item.id)}
                      className="w-full text-left px-3 py-2.5 border-0 border-b border-slate-100 last:border-b-0 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-[#fdf2f8] dark:hover:bg-gray-800/80 cursor-pointer transition-colors"
                    >
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 text-gray-500">
                          <Icon size={16} strokeWidth={HEADER_ICON_STROKE} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                            {item.label}
                          </span>
                          <span className="block text-[11px] text-gray-400 mt-0.5">
                            {item.description}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <NewConversationDialog
        open={conversationOpen}
        onClose={() => setConversationOpen(false)}
        currentUser={currentUser}
        onOpenChat={onOpenChat}
      />
      <CreateCollaborationDialog
        open={collaborationOpen}
        onClose={() => setCollaborationOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
}
