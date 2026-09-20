import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, MessageCircle } from "lucide-react";
import GlassCard from "./GlassCard";
import ActionButton from "./ActionButton";
import { deriveAgentStateMachine } from "../utils/agentStateMachine";

function currentTask({ resolutionPending, actionPending, aiEscalation, resolution, customerChooses }) {
  if (aiEscalation) return "Escalated for supervisor review";
  if (actionPending) return "Executing requested action";
  if (resolutionPending) return "Resolving flight disruption";
  if (customerChooses) return "Waiting for your decision";
  if (resolution && resolution.entitlement !== "NONE") return "Support applied for this disruption";
  return "Monitoring your booking";
}

// Compact AI agent card for the dashboard - reuses the exact same
// deriveAgentStateMachine() used on the Chat page's Agent Command Center, so
// the stage pipeline here is never a separate/invented representation.
export default function AgentStatusPanel(props) {
  const navigate = useNavigate();
  const { booking, customer, flight, resolution, resolutionPending, actionPending, aiEscalation, completedActionType } = props;

  const active = Boolean(booking);
  const steps = deriveAgentStateMachine({
    booking,
    customer,
    flight,
    resolution,
    resolutionPending,
    actionPending,
    aiEscalation,
    completedActionType,
  });

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg btn-gradient text-white">
          <Bot size={15} />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white/85">
            <motion.span
              className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-white/25"}`}
              animate={active ? { opacity: [1, 0.4, 1] } : undefined}
              transition={active ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
            />
            {active ? "Agent Active" : "Agent Idle"}
          </p>
          <p className="truncate text-xs text-white/50">{currentTask(props)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
        {steps.map((step, index) => (
          <span key={step.key} className="flex items-center gap-1.5">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                step.status === "done"
                  ? "text-violet-300"
                  : step.status === "active"
                    ? "text-violet-200"
                    : "text-white/25"
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && <span className="text-white/15">→</span>}
          </span>
        ))}
      </div>

      <ActionButton
        icon={MessageCircle}
        variant="secondary"
        className="mt-4 w-full"
        onClick={() => navigate("/chat")}
      >
        Open AI Assistant
      </ActionButton>
    </GlassCard>
  );
}
