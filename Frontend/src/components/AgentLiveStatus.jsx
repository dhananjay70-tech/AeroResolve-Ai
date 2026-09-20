import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Generic, static process-phase labels - not chain-of-thought, not derived
// from any real per-step telemetry (the backend call is a single atomic
// request/response). This purely indicates "a request is in flight" with a
// bit more texture than a spinner, and always resolves back to "Online".
const PHASES = [
  "Analyzing request",
  "Checking verified booking",
  "Evaluating available resolution",
  "Preparing response",
];

const IDLE_STYLE = {
  "AGENT ACTIVE": "text-emerald-300 bg-emerald-400",
  "WAITING FOR CUSTOMER": "text-amber-300 bg-amber-400",
  "REQUEST CONFIRMED": "text-emerald-300 bg-emerald-400",
  "SUPPORT APPLIED": "text-cyan-300 bg-cyan-400",
  "SUPERVISOR REVIEW": "text-amber-300 bg-amber-400",
  "CALL INITIATING": "text-amber-300 bg-amber-400",
  "HUMAN HANDOFF": "text-cyan-300 bg-cyan-400",
  "EXECUTING ACTION": "text-violet-300 bg-violet-400",
};

export default function AgentLiveStatus({ active, mode = "AGENT ACTIVE" }) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhaseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setPhaseIndex((i) => (i + 1) % PHASES.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) {
    const [textClass, dotClass] = (IDLE_STYLE[mode] || IDLE_STYLE["AGENT ACTIVE"]).split(" ");
    return (
      <span className={`flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide ${textClass}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {mode}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-violet-400"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      />
      <AnimatePresence mode="wait">
        <motion.span
          key={phaseIndex}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {PHASES[phaseIndex]}…
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
