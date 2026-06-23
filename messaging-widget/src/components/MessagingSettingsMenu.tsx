import { useEffect, useRef, useState } from "react";
import { loadMessagingPrefs, saveMessagingPrefs } from "../api/activityApi";
import type { MessagingPrefs } from "../types";
import { useMessagingStore } from "../store/messagingStore";
import { openNavSection } from "../utils/nav";
import { HeaderIconButton } from "./HeaderIconButton";

const MENU_ITEMS: Array<{
  id: keyof MessagingPrefs | "nav";
  label: string;
  description: string;
  nav?: string;
  pref?: keyof MessagingPrefs;
}> = [
  {
    id: "notifyMessages",
    label: "Notification Preferences",
    description: "Alerts for new messages",
    pref: "notifyMessages",
  },
  {
    id: "muteAll",
    label: "Mute Conversations",
    description: "Pause all message alerts",
    pref: "muteAll",
  },
  {
    id: "nav",
    label: "Archive Settings",
    description: "View archived conversations",
    nav: "archived",
  },
  {
    id: "nav",
    label: "Blocked Users",
    description: "Manage blocked accounts",
  },
  {
    id: "notifyRequests",
    label: "Message Requests",
    description: "Collaboration request alerts",
    pref: "notifyRequests",
  },
  {
    id: "notifyResponses",
    label: "Privacy Settings",
    description: "Request response notifications",
    pref: "notifyResponses",
  },
];

export function MessagingSettingsMenu() {
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

  const handleItem = (item: (typeof MENU_ITEMS)[0]) => {
    if (item.pref) {
      togglePref(item.pref);
      return;
    }
    if (item.label === "Archive Settings") {
      setListTab("archived");
      setOpen(false);
      return;
    }
    if (item.label === "Blocked Users") {
      setOpen(false);
      openNavSection("settings");
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <HeaderIconButton
        label="Messaging Settings"
        tooltip="Messaging Settings"
        active={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-base leading-none" aria-hidden>
          ⚙️
        </span>
      </HeaderIconButton>

      {open && (
        <div className="infl-msgs-popover absolute right-0 top-full mt-2 w-[min(280px,calc(100vw-2rem))] rounded-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e5e7eb] dark:border-gray-700 bg-white dark:bg-gray-900">
            <p className="m-0 text-sm font-bold text-gray-900 dark:text-gray-100">
              Messaging Preferences
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 max-h-80 overflow-y-auto infl-msgs-scroll">
            {MENU_ITEMS.map((item) => {
              const checked = item.pref ? prefs[item.pref] : undefined;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleItem(item)}
                  className="w-full text-left px-4 py-3 border-0 border-b border-[#f3f4f6] dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-[#f9fafb] dark:hover:bg-gray-800 cursor-pointer transition-colors"
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
        </div>
      )}
    </div>
  );
}
