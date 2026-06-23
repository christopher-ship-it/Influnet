import { useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { loadMessagingPrefs, saveMessagingPrefs } from "../api/activityApi";
import type { MessagingPrefs } from "../types";
import { useMessagingStore } from "../store/messagingStore";
import { openNavSection } from "../utils/nav";
import { HeaderIconButton, HEADER_ICON_SIZE, HEADER_ICON_STROKE } from "./HeaderIconButton";

type Section = {
  title: string;
  items: Array<{
    id: string;
    label: string;
    description: string;
    pref?: keyof MessagingPrefs;
    action?: () => void;
  }>;
};

export function WorkspaceMenu() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<MessagingPrefs>(() => loadMessagingPrefs());
  const rootRef = useRef<HTMLDivElement>(null);
  const setListTab = useMessagingStore((s) => s.setListTab);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const togglePref = (key: keyof MessagingPrefs) => {
    const next = saveMessagingPrefs({ [key]: !prefs[key] });
    setPrefs(next);
  };

  const sections: Section[] = [
    {
      title: "Messaging Preferences",
      items: [
        {
          id: "notifyMessages",
          label: "Message alerts",
          description: "New message notifications",
          pref: "notifyMessages",
        },
        {
          id: "muteAll",
          label: "Mute all conversations",
          description: "Pause message alerts",
          pref: "muteAll",
        },
      ],
    },
    {
      title: "Collaboration Settings",
      items: [
        {
          id: "notifyRequests",
          label: "Request alerts",
          description: "Collaboration request notifications",
          pref: "notifyRequests",
        },
        {
          id: "notifyResponses",
          label: "Response alerts",
          description: "Acceptance and decline updates",
          pref: "notifyResponses",
        },
      ],
    },
    {
      title: "Workspace Settings",
      items: [
        {
          id: "archived",
          label: "Archived conversations",
          description: "View archived threads",
          action: () => {
            setListTab("archived");
            setOpen(false);
          },
        },
        {
          id: "collaborations",
          label: "Collaborations hub",
          description: "Manage active projects",
          action: () => {
            setOpen(false);
            openNavSection("Collaborations");
          },
        },
      ],
    },
  ];

  const handleItem = (item: Section["items"][0]) => {
    if (item.pref) {
      togglePref(item.pref);
      return;
    }
    item.action?.();
  };

  return (
    <div ref={rootRef} className="relative">
      <HeaderIconButton
        label="Workspace"
        tooltip="Workspace"
        active={open}
        onClick={() => setOpen((v) => !v)}
      >
        <LayoutGrid size={HEADER_ICON_SIZE} strokeWidth={HEADER_ICON_STROKE} aria-hidden />
      </HeaderIconButton>

      {open && (
        <div
          role="menu"
          aria-label="Workspace settings"
          className="infl-msgs-workspace-menu infl-msgs-popover absolute right-0 top-full mt-2 z-50 w-72 origin-top-right rounded-xl border border-slate-100 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="overflow-hidden rounded-lg border border-slate-100/80 dark:border-gray-700">
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-900">
              <p className="m-0 text-sm font-bold text-gray-900 dark:text-gray-100">Workspace</p>
              <p className="m-0 mt-0.5 text-[11px] text-gray-400">
                Preferences and collaboration settings
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 max-h-80 overflow-y-auto infl-msgs-scroll">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="px-4 pt-3 pb-1 m-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const checked = item.pref ? prefs[item.pref] : undefined;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItem(item)}
                      className="w-full text-left px-4 py-2.5 border-0 border-b border-[#f3f4f6] dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-[#fdf2f8] dark:hover:bg-gray-800/80 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                            {item.label}
                          </span>
                          <span className="block text-[11px] text-gray-400 mt-0.5">
                            {item.description}
                          </span>
                        </span>
                        {item.pref && (
                          <span
                            className={`shrink-0 w-9 h-5 rounded-full relative transition-colors ${
                              checked ? "bg-[#ee3e96]" : "bg-gray-200 dark:bg-gray-700"
                            }`}
                            aria-hidden
                          >
                            <span
                              className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                                checked ? "translate-x-4" : "translate-x-0.5"
                              }`}
                            />
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
