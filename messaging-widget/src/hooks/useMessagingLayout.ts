import { useEffect, useState } from "react";
import {
  DESKTOP_CHAT_WIDTH,
  DESKTOP_DRAWER_WIDTH,
  DESKTOP_LIST_WIDTH,
  LAUNCHER_GAP,
  LAUNCHER_HEIGHT,
  PANEL_HEIGHT_DESKTOP,
  TABLET_MAX_WIDTH,
  VIEWPORT_MARGIN,
} from "../constants";

export type MessagingLayout = {
  listOnlyWidth: number;
  drawerWidth: number;
  listWidth: number;
  chatWidth: number;
  panelHeight: number;
  launcherWidth: number;
  isTablet: boolean;
};

function computeLayout(viewportWidth: number, viewportHeight: number): MessagingLayout {
  const isTablet = viewportWidth >= 768 && viewportWidth <= TABLET_MAX_WIDTH;
  const maxDrawer = Math.max(DESKTOP_LIST_WIDTH + 200, viewportWidth - VIEWPORT_MARGIN * 2);

  const listOnlyWidth = Math.min(DESKTOP_LIST_WIDTH, maxDrawer);
  let drawerWidth = Math.min(DESKTOP_DRAWER_WIDTH, maxDrawer);
  let listWidth = DESKTOP_LIST_WIDTH;
  let chatWidth = DESKTOP_CHAT_WIDTH;

  if (isTablet) {
    listWidth = Math.max(200, Math.round(drawerWidth * 0.3));
    chatWidth = drawerWidth - listWidth;
  } else if (drawerWidth < DESKTOP_DRAWER_WIDTH) {
    listWidth = Math.min(DESKTOP_LIST_WIDTH, Math.round(drawerWidth * 0.4));
    chatWidth = drawerWidth - listWidth;
  }

  const panelHeight = Math.min(
    PANEL_HEIGHT_DESKTOP,
    Math.max(320, viewportHeight - LAUNCHER_HEIGHT - LAUNCHER_GAP - VIEWPORT_MARGIN * 2 - 16)
  );

  return {
    listOnlyWidth,
    drawerWidth,
    listWidth,
    chatWidth,
    panelHeight,
    launcherWidth: listOnlyWidth,
    isTablet,
  };
}

export function useMessagingLayout(isMobile: boolean): MessagingLayout {
  const [layout, setLayout] = useState(() =>
    computeLayout(window.innerWidth, window.innerHeight)
  );

  useEffect(() => {
    if (isMobile) return;
    const update = () => setLayout(computeLayout(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isMobile]);

  return layout;
}
