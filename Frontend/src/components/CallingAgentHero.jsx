import { useEffect } from "react";
import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import GlassCard from "./GlassCard";
import SupervisorCallButton from "./SupervisorCallButton";
import { callStatusMeta } from "../utils/callStatus";
import { pollCallStatus } from "../utils/supervisorCall";

const ACTIVE_CALL_STATUSES = ["CALL_REQUESTED", "CALL_INITIATING", "CALL_RINGING"];

// Same disruption phrasing already used across DisruptionBanner/CaseContextPanel -
// derived only from the real flight fields, nothing invented for this card.
function disruptionSummary(flight) {
  if (!flight) return null;
  if (flight.status === "cancelled") return "Flight cancelled";
  if (flight.status === "delayed" && flight.delayMinutes > 0) {
    const h = Math.floor(flight.delayMinutes / 60);
    const m = flight.delayMinutes % 60;
    return `Flight delayed ${h}h${m ? ` ${m}m` : ""}`;
  }
  return null;
}

// The primary hero of the dashboard: the AI Calling Agent that can connect
// this case to a real supervisor. Always renders a genuine state - idle,
// live call progress from the polled call status, or the request to call -
// and never fabricates a CONNECTED/COMPLETED state on its own.
export default function CallingAgentHero({
  booking,
  customer,
  flight,
  escalation,
  call,
  onEscalationCreated,
  onCallStatusChange,
}) {
  const escalationId = escalation?.id;
  // Re-subscribes whenever the call identity changes (e.g. NOT_STARTED -> a
  // freshly initiated call), not just when escalationId changes - otherwise
  // an initial poll that ends immediately on NOT_STARTED (a terminal status
  // with nothing to watch) would never resume once a call is actually
  // started via SupervisorCallButton, and the final Exotel status would
  // never be picked up.
  const callId = call?.callId;

  useEffect(() => {
    if (!escalationId) return undefined;
    return pollCallStatus(escalationId, (next) => onCallStatusChange?.(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escalationId, callId]);

  const callStatus = call?.callStatus;
  const meta = callStatus ? callStatusMeta(callStatus) : null;
  const isActive = ACTIVE_CALL_STATUSES.includes(callStatus);
  const disruption = disruptionSummary(flight);

  return (
    <GlassCard glow className="relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-600/20 blur-[90px]" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">AI Calling Agent</p>
          <p className="mt-1 text-lg font-bold text-white/90">Your AI Resolution Agent is ready</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          Agent Active
        </span>
      </div>

      <div className="relative mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <motion.div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl btn-gradient text-white"
            animate={isActive ? { scale: [1, 1.08, 1] } : undefined}
            transition={isActive ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : undefined}
          >
            <Phone size={22} />
          </motion.div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/70">Supervisor Connection</p>
            {customer?.name && (
              <p className="mt-1 truncate text-base font-bold text-white/95">{customer.name}</p>
            )}
            <p className="mt-0.5 truncate text-sm text-white/55">
              {[
                flight?.flightNumber,
                flight?.origin && flight?.destination ? `${flight.origin} → ${flight.destination}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {disruption && <p className="mt-0.5 text-sm font-medium text-amber-300">{disruption}</p>}
            <p className="mt-2 text-sm text-white/50">
              {meta ? meta.label : "Supervisor assistance is available for this case."}
            </p>
          </div>
        </div>

        <SupervisorCallButton
          booking={booking}
          escalation={escalation}
          reason="Customer requested supervisor assistance from the AI Calling Agent."
          variant="primary"
          icon={Phone}
          className="w-full shrink-0 sm:w-auto"
          onEscalationCreated={onEscalationCreated}
          onCallStarted={onCallStatusChange}
        >
          Call Supervisor
        </SupervisorCallButton>
      </div>
    </GlassCard>
  );
}
