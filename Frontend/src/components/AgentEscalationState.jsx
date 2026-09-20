import { motion } from "framer-motion";
import { Check, ShieldAlert } from "lucide-react";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import SupervisorCallStatus from "./SupervisorCallStatus";

// The backend creates an escalation in one atomic step (see
// Ai_Services/app/graph/nodes.py handle_escalation), so there's no genuine
// intermediate state to show - all three lines become true together the
// moment `escalation` exists. Showing them as already-complete is honest,
// not simulated progress.
const STEPS = ["Exception detected", "Supervisor review required", "Escalation created"];

export default function AgentEscalationState({
  escalation,
  customer,
  initialCall,
  onCallStatusChange,
  onView,
  className = "",
}) {
  if (!escalation) return null;
  const pnr = escalation.requestedAction?.pnr;

  return (
    <GlassCard className={`border-amber-400/30 p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
          <ShieldAlert size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">Supervisor Review Required</p>
            <StatusBadge status={escalation.status} />
          </div>
          <p className="mt-0.5 text-sm text-white/60">{escalation.reason}</p>
          {(customer?.name || pnr) && (
            <p className="mt-1 text-xs text-white/40">
              {customer?.name}
              {customer?.name && pnr ? " · " : ""}
              {pnr}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {STEPS.map((label, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            className="flex items-center gap-2.5 text-sm text-white/75"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <Check size={11} />
            </span>
            {label}
          </motion.div>
        ))}
      </div>

      <SupervisorCallStatus
        className="mt-5"
        escalation={escalation}
        initialCall={initialCall}
        onStatusChange={onCallStatusChange}
      />

      <button
        type="button"
        onClick={onView}
        className="mt-5 text-xs font-semibold text-violet-300 hover:text-violet-200 cursor-pointer"
      >
        View Escalation →
      </button>
    </GlassCard>
  );
}
