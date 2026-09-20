import { motion } from "framer-motion";
import { Check } from "lucide-react";
import GlassCard from "./GlassCard";

const DOT_STYLE = {
  done: { backgroundColor: "#8b5cf6", borderColor: "#8b5cf6" },
  active: { backgroundColor: "rgba(139,92,246,0.25)", borderColor: "#8b5cf6" },
  pending: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)" },
};

const CHIP_STYLE = {
  done: "border-violet-400/40 bg-violet-500/10 text-violet-200",
  active: "border-violet-400/40 bg-violet-500/5 text-violet-300",
  pending: "border-white/10 bg-white/5 text-white/40",
};

export default function AgentStateMachine({ steps, className = "" }) {
  return (
    <div className={className}>
      {/* Tablet only: compact horizontal strip */}
      <GlassCard className="hidden p-4 md:block lg:hidden">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((step) => (
            <span
              key={step.key}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${CHIP_STYLE[step.status]}`}
            >
              {step.status === "done" ? (
                <Check size={11} />
              ) : (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    step.status === "active" ? "bg-violet-300 animate-pulse" : "bg-white/25"
                  }`}
                />
              )}
              {step.label}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Mobile and desktop: full vertical checklist */}
      <GlassCard className="block p-5 md:hidden lg:block">
        <p className="mb-4 text-sm font-semibold text-white/70">Agent State</p>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.key} className="flex items-center gap-3">
              <motion.div
                initial={false}
                animate={DOT_STYLE[step.status]}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-white"
              >
                {step.status === "done" ? (
                  <Check size={12} />
                ) : (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      step.status === "active" ? "bg-violet-300 animate-pulse" : "bg-white/25"
                    }`}
                  />
                )}
              </motion.div>
              <span
                className={`text-sm font-medium tracking-wide ${
                  step.status === "pending" ? "text-white/40" : "text-white/80"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
