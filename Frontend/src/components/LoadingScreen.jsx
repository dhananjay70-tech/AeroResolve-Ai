import { motion } from "framer-motion";
import { Plane } from "lucide-react";

export default function LoadingScreen({ label = "Loading AeroResolve AI" }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-(--color-bg)">
      <motion.div
        className="relative flex h-20 w-20 items-center justify-center rounded-full"
        style={{ boxShadow: "var(--shadow-glow-violet)" }}
      >
        <motion.div
          className="absolute inset-0 rounded-full border border-violet-400/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          className="flex h-14 w-14 items-center justify-center rounded-full glass"
        >
          <Plane className="text-violet-300" size={22} />
        </motion.div>
      </motion.div>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium text-white/70">{label}</p>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-violet-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
