import { motion } from "framer-motion";

type Props = {
  count: number;
  color: "#ee3e96" | "#f26e59";
  pulse: boolean;
};

export function SidebarBadge({ count, color, pulse }: Props) {
  if (count <= 0) return null;

  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{
        scale: pulse ? [1, 1.2, 1] : 1,
        opacity: 1,
      }}
      transition={{
        scale: { duration: 0.35, ease: "easeOut" },
        opacity: { duration: 0.2 },
      }}
      className="infl-sidebar-badge shrink-0 ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-white font-bold"
      style={{
        backgroundColor: color,
        fontSize: 11,
        lineHeight: 1,
      }}
      aria-label={`${count} notifications`}
    >
      {count > 99 ? "99+" : count}
    </motion.span>
  );
}
