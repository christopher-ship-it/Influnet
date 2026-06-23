import type { Message } from "./types";

/** Stable fallback — never use `?? []` inline in Zustand selectors (causes React #185). */
export const EMPTY_MESSAGES: Message[] = [];

/** Desktop drawer column widths (px). */
export const DESKTOP_LIST_WIDTH = 320;
export const DESKTOP_CONTEXT_WIDTH = 320;
export const DESKTOP_CHAT_WIDTH = 450;
export const DESKTOP_DRAWER_WIDTH = 800;
export const DESKTOP_WORKSPACE_MIN_WIDTH = 1040;
export const DESKTOP_CHAT_MIN_WIDTH = DESKTOP_CHAT_WIDTH;

export const VIEWPORT_MARGIN = 24;
export const PANEL_HEIGHT_DESKTOP = 560;
export const LAUNCHER_HEIGHT = 50;
export const LAUNCHER_GAP = 12;

/** Tablet: 768–1023px — list gets ~30% of drawer. */
export const TABLET_MAX_WIDTH = 1023;

/** Notification dropdown panel */
export const NOTIFICATION_PANEL_WIDTH = 420;
export const NOTIFICATION_PANEL_HEIGHT = 500;
export const NOTIFICATION_PANEL_MAX_HEIGHT_VH = 70;
export const NOTIFICATION_PANEL_Z_INDEX = 10050;
