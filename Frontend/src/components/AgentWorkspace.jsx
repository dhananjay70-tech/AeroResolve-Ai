import { Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";
import AgentStateMachine from "./AgentStateMachine";
import AgentDecision from "./AgentDecision";

export default function AgentWorkspace({
  statusText,
  steps,
  resolution,
  onRebook,
  onRefund,
  onEscalate,
}) {
  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl btn-gradient text-white">
            <Bot size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold">Agent is handling this case</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={statusText}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="text-sm text-violet-300"
              >
                {statusText}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </GlassCard>

      <AgentStateMachine steps={steps} />

      <AgentDecision resolution={resolution} onRebook={onRebook} onRefund={onRefund} onEscalate={onEscalate} />
    </div>
  );
}
