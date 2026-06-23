import { forwardRef, type ReactNode } from "react";

type Props = {
  label: string;
  tooltip: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
  children?: ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick">;

export const HeaderIconButton = forwardRef<HTMLButtonElement, Props>(function HeaderIconButton(
  {
    label,
    tooltip,
    active,
    badge,
    onClick,
    children,
    className = "",
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      title={tooltip}
      aria-label={label}
      onClick={onClick}
      {...rest}
      className={`infl-header-action relative inline-flex items-center justify-center w-9 h-9 rounded-lg border-0 cursor-pointer transition-all duration-150 ${
        active
          ? "bg-[#fdf2f8] text-[#ee3e96]"
          : "bg-transparent text-gray-500 hover:bg-[#fdf2f8] hover:text-[#ee3e96]"
      } ${className}`}
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ee3e96] text-white text-[9px] font-bold flex items-center justify-center leading-none ring-2 ring-white dark:ring-gray-900">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
});

/** Consistent Lucide icon sizing for header actions */
export const HEADER_ICON_SIZE = 18;
export const HEADER_ICON_STROKE = 1.75;
