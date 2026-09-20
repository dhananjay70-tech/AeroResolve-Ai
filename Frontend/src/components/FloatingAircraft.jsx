import { motion, useReducedMotion } from "framer-motion";
import { Plane } from "lucide-react";

export default function FloatingAircraft({ size = 220 }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size, perspective: 900 }}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/30 via-blue-500/20 to-cyan-400/20 blur-3xl"
        animate={
          prefersReducedMotion
            ? undefined
            : { scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }
        }
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-6 rounded-full glass"
        style={{ boxShadow: "var(--shadow-glow-violet)" }}
      />
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
        animate={
          prefersReducedMotion
            ? undefined
            : {
                y: [0, -14, 0],
                rotateZ: [-6, 6, -6],
                rotateY: [0, 12, 0],
              }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <Plane
          size={size * 0.4}
          className="-rotate-45 text-white drop-shadow-[0_0_25px_rgba(139,92,246,0.65)]"
          strokeWidth={1.5}
        />
      </motion.div>
    </div>
  );
}
