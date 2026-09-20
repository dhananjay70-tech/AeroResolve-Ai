import { motion } from "framer-motion";
import { Check } from "lucide-react";
import GlassCard from "./GlassCard";
import { deriveTimelineSteps } from "../utils/timelineSteps";

const DOT_STYLE = {
  done: { backgroundColor: "#8b5cf6", borderColor: "#8b5cf6" },
  active: { backgroundColor: "rgba(139,92,246,0.25)", borderColor: "#8b5cf6" },
  pending: { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.15)" },
};

export default function ResolutionTimeline(props) {
  const steps = deriveTimelineSteps(props);

  return (
    <GlassCard className="p-6">
      <p className="mb-6 text-sm font-semibold text-white/70">Resolution Timeline</p>
      <div className="flex flex-wrap items-start sm:flex-nowrap">
        {steps.map((step, index) => (
          <div key={step.key} className="flex flex-1 basis-1/2 flex-col gap-2 py-2 sm:basis-auto sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 sm:flex-1">
              <motion.div
                initial={false}
                animate={DOT_STYLE[step.status]}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-white"
              >
                {step.status === "done" ? (
                  <Check size={13} />
                ) : (
                  <span
                    className={`h-2 w-2 rounded-full ${
                      step.status === "active" ? "bg-violet-300 animate-pulse" : "bg-white/25"
                    }`}
                  />
                )}
              </motion.div>
              <span
                className={`text-xs font-medium ${
                  step.status === "pending" ? "text-white/40" : "text-white/75"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="ml-3.5 hidden h-px flex-1 bg-white/10 sm:block">
                <motion.div
                  className="h-px bg-violet-400"
                  initial={false}
                  animate={{ width: step.status === "done" ? "100%" : "0%" }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
