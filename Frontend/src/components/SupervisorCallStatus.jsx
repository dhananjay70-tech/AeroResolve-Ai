import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PhoneCall } from "lucide-react";
import { callStatusMeta } from "../utils/callStatus";
import { ensureEscalationAndCall, pollCallStatus } from "../utils/supervisorCall";
import ActionButton from "./ActionButton";
import SupervisorCallModal from "./SupervisorCallModal";

const ACTIVE_CALL_STATUSES = ["CALL_REQUESTED", "CALL_INITIATING", "CALL_RINGING"];

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Shown wherever an escalation is displayed (Agent Command Center + the
// Escalation page): the real supervisor-call state for that escalation, and
// - if no call has been placed yet - a "Contact Supervisor" action that
// always confirms before dialing. Shares its call/escalation logic with
// SupervisorCallButton via utils/supervisorCall.js.
export default function SupervisorCallStatus({ escalation, initialCall, onStatusChange, className = "" }) {
  const [call, setCall] = useState(initialCall || null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState("idle");
  const [confirmError, setConfirmError] = useState("");
  const escalationId = escalation?.id;

  function reportStatus(next) {
    setCall(next);
    onStatusChange?.(next);
  }

  // Re-subscribes whenever the call identity changes (e.g. NOT_STARTED -> a
  // freshly initiated call), not just when escalationId changes - otherwise
  // an initial poll that ends immediately on NOT_STARTED (a terminal status
  // with nothing to watch) would never resume once placeCall() actually
  // starts a call, and the final Exotel status would never be picked up.
  const callId = call?.callId;
  useEffect(() => {
    if (!escalationId) return undefined;
    return pollCallStatus(escalationId, reportStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escalationId, callId]);

  async function placeCall() {
    setConfirmStatus("loading");
    setConfirmError("");
    try {
      const result = await ensureEscalationAndCall({ escalation, reason: "" });
      reportStatus(result.call);

      // A successful initiation (result.success, i.e. response.success from
      // the backend) is never itself a failure - it only means the call
      // attempt was recorded. The only real failures are the explicit
      // terminal states the backend reports back in call.callStatus, or
      // result.success being false/the request throwing outright.
      const failedToStart =
        !result.success ||
        result.call.callStatus === "NOT_CONFIGURED" ||
        result.call.callStatus === "CALL_FAILED";
      if (failedToStart) {
        setConfirmError("Unable to connect to supervisor. Please try again.");
        setConfirmStatus("error");
        return;
      }
      setConfirmStatus("success");
    } catch (err) {
      setConfirmError(err.message);
      setConfirmStatus("error");
    }
  }

  if (!escalationId) return null;

  const status = call?.callStatus || "NOT_STARTED";
  const meta = callStatusMeta(status);
  const showContactButton = status === "NOT_STARTED" || status === "CALL_FAILED";
  const isActive = ACTIVE_CALL_STATUSES.includes(status);
  const duration = formatDuration(call?.duration);

  return (
    <div className={`rounded-xl bg-white/5 p-4 ring-1 ring-white/10 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Human Handoff</p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <motion.span
            animate={isActive ? { opacity: [1, 0.4, 1] } : undefined}
            transition={isActive ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" } : undefined}
            className={
              meta.tone === "connected"
                ? "text-emerald-300"
                : meta.tone === "failed"
                ? "text-rose-300"
                : meta.tone === "done"
                ? "text-emerald-300"
                : "text-violet-300"
            }
          >
            {meta.icon}
          </motion.span>
          <span className="font-medium text-white/85">{meta.label}</span>
          {duration && status === "CALL_COMPLETED" && (
            <span className="text-white/40">· {duration}</span>
          )}
        </div>

        {showContactButton && (
          <ActionButton
            icon={PhoneCall}
            variant={status === "CALL_FAILED" ? "danger" : "secondary"}
            onClick={() => setConfirmOpen(true)}
          >
            {status === "CALL_FAILED" ? "Retry Call" : "Contact Supervisor"}
          </ActionButton>
        )}
      </div>

      <SupervisorCallModal
        open={confirmOpen}
        status={confirmStatus}
        errorMessage={confirmError}
        onConfirm={placeCall}
        onClose={() => {
          setConfirmOpen(false);
          setConfirmStatus("idle");
          setConfirmError("");
        }}
      />
    </div>
  );
}
