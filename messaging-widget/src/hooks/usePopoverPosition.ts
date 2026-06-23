import { useLayoutEffect, useState, type RefObject } from "react";
import { NOTIFICATION_PANEL_MAX_HEIGHT_VH } from "../constants";
import { computePopoverPosition, type PopoverRect } from "../utils/popoverPosition";

const EMPTY: PopoverRect = { top: 0, left: 0, width: 0, height: 0 };

export function usePopoverPosition(
  open: boolean,
  triggerRef: RefObject<HTMLElement | null>,
  panelWidth: number,
  panelHeight: number
): PopoverRect {
  const [rect, setRect] = useState<PopoverRect>(EMPTY);

  useLayoutEffect(() => {
    if (!open) {
      setRect(EMPTY);
      return;
    }

    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const triggerRect = el.getBoundingClientRect();
      const vhCap = Math.floor(
        window.innerHeight * (NOTIFICATION_PANEL_MAX_HEIGHT_VH / 100)
      );
      setRect(
        computePopoverPosition({
          triggerRect,
          panelWidth,
          panelHeight: Math.min(panelHeight, vhCap),
        })
      );
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, triggerRef, panelWidth, panelHeight]);

  return rect;
}
