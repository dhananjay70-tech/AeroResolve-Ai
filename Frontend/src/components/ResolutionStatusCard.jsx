import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import { deriveTimelineSteps } from "../utils/timelineSteps";

const GLYPH = { done: "✓", active: "→", pending: "○" };
const GLYPH_STYLE = {
  done: "text-emerald-400",
  active: "text-violet-300",
  pending: "text-white/30",
};

// Compact sidebar checklist - reuses the exact same real-state derivation as
// ResolutionTimeline (deriveTimelineSteps), just rendered densely. No status
// here is invented independently of what the timeline already shows.
export default function ResolutionStatusCard(props) {
  const steps = deriveTimelineSteps(props);

  return (
    <GlassCard className="p-5">
      <p className="text-sm font-semibold text-white/70">Resolution Status</p>
      <div className="mt-3 space-y-2">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-2 text-sm">
            <motion.span
              animate={step.status === "active" ? { opacity: [1, 0.4, 1] } : undefined}
              transition={step.status === "active" ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : undefined}
              className={`w-4 shrink-0 text-center font-bold ${GLYPH_STYLE[step.status]}`}
            >
              {GLYPH[step.status]}
            </motion.span>
            <span className={step.status === "pending" ? "text-white/40" : "text-white/80"}>{step.label}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
