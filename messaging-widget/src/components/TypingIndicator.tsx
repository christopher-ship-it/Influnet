import { motion } from "framer-motion";

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="infl-glass border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.12 }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
