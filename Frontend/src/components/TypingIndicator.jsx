import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-xl glass px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-violet-300"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}
