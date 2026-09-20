import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ShieldAlert } from "lucide-react";
import GlassCard from "./GlassCard";
import StatusBadge from "./StatusBadge";
import SupervisorCallStatus from "./SupervisorCallStatus";

const STEPS = [
  { key: "created", label: "Request Created" },
  { key: "review", label: "Under Review" },
  { key: "contact", label: "Supervisor Contact" },
  { key: "decision", label: "Supervisor Decision" },
];

// "Created" and "Under Review" become true together the instant an
// escalation exists (the backend creates it in one atomic, already-open
// step - see AgentEscalationState.jsx's comment). "Supervisor Contact" only
// lights up once a real call has actually been placed (any callStatus other
// than NOT_STARTED). "Supervisor Decision" only lights up if the backend
// ever reports escalation.status as resolved - never assumed.
function stepIndexForStatus(escalationStatus, callStatus) {
  if (escalationStatus?.toLowerCase() === "resolved") return 3;
  if (callStatus && callStatus !== "NOT_STARTED") return 2;
  return 1;
}

export default function EscalationCard({ escalation, customer }) {
  const [call, setCall] = useState(null);
  if (!escalation) return null;
  const activeIndex = stepIndexForStatus(escalation.status, call?.callStatus);
  const pnr = escalation.requestedAction?.pnr;

  return (
    <GlassCard glow className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
          <ShieldAlert size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-lg font-bold">Supervisor Review Required</p>
            <p className="font-mono text-[11px] text-white/30" title={escalation.id}>
              #{escalation.id.slice(0, 8)}
            </p>
          </div>
          <p className="mt-1 text-sm text-white/60">{escalation.reason}</p>
          {(customer?.name || pnr) && (
            <p className="mt-1 text-xs text-white/40">
              {customer?.name}
              {customer?.name && pnr ? " · " : ""}
              {pnr}
            </p>
          )}
        </div>
        <div className="ml-auto shrink-0">
          <StatusBadge status={escalation.status} />
        </div>
      </div>

      <div className="mt-6 flex items-center">
        {STEPS.map((step, index) => (
          <div key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2 text-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: index <= activeIndex ? "#8b5cf6" : "rgba(255,255,255,0.06)",
                  borderColor: index <= activeIndex ? "#8b5cf6" : "rgba(255,255,255,0.15)",
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border text-white"
              >
                {index < activeIndex ? (
                  <Check size={16} />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </motion.div>
              <span className="max-w-[6.5rem] text-xs font-medium text-white/60">
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="mx-2 h-px flex-1 bg-white/10">
                <motion.div
                  className="h-px bg-violet-400"
                  initial={false}
                  animate={{ width: index < activeIndex ? "100%" : "0%" }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* grid-cols-2, not a viewport breakpoint - this card also renders in a
          narrow sidebar column, where `sm:grid-cols-4` would force 4 columns
          into too little width and collide. */}
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-5 text-sm">
        <div>
          <p className="text-white/40">PNR</p>
          <p className="mt-1 font-mono font-semibold">{pnr || escalation.bookingId}</p>
        </div>
        <div>
          <p className="text-white/40">Customer</p>
          <p className="mt-1 font-semibold">{customer?.name || "—"}</p>
        </div>
        <div>
          <p className="text-white/40">Requested Exception</p>
          <p className="mt-1 font-semibold">
            {escalation.requestedAction?.type?.replaceAll("_", " ") || "General review"}
          </p>
        </div>
        <div>
          <p className="text-white/40">Submitted</p>
          <p className="mt-1 font-semibold">
            {new Date(escalation.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <SupervisorCallStatus className="mt-5" escalation={escalation} onStatusChange={setCall} />
    </GlassCard>
  );
}
