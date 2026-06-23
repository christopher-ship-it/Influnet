export type PopoverRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type PopoverPositionOptions = {
  triggerRect: DOMRect;
  panelWidth: number;
  panelHeight: number;
  viewportWidth?: number;
  viewportHeight?: number;
  margin?: number;
  gap?: number;
};

/**
 * Viewport-aware popover placement (flip + shift + preventOverflow).
 * Preferred: below trigger, right-aligned to trigger's right edge.
 */
export function computePopoverPosition({
  triggerRect,
  panelWidth,
  panelHeight,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
  margin = 16,
  gap = 8,
}: PopoverPositionOptions): PopoverRect {
  const maxWidth = Math.max(200, viewportWidth - margin * 2);
  const maxHeight = Math.max(160, viewportHeight - margin * 2);

  const width = Math.min(panelWidth, maxWidth);
  let height = Math.min(panelHeight, maxHeight);

  // Below trigger, panel's right edge aligned with trigger's right edge
  let left = triggerRect.right - width;
  let top = triggerRect.bottom + gap;

  // Shift horizontally — prevent left/right overflow
  if (left + width > viewportWidth - margin) {
    left = viewportWidth - margin - width;
  }
  if (left < margin) {
    left = margin;
  }

  // Flip above trigger if bottom overflow
  if (top + height > viewportHeight - margin) {
    top = triggerRect.top - gap - height;
  }
  if (top < margin) {
    top = margin;
    height = Math.min(height, viewportHeight - margin * 2);
  }

  // Final clamp
  left = Math.max(margin, Math.min(left, viewportWidth - margin - width));
  top = Math.max(margin, Math.min(top, viewportHeight - margin - height));

  return { top, left, width, height };
}
