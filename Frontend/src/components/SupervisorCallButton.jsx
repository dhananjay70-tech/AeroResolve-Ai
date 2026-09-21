import { useState } from "react";
import { PhoneCall } from "lucide-react";
import ActionButton from "./ActionButton";
import SupervisorCallModal from "./SupervisorCallModal";
import { ensureEscalationAndCall } from "../utils/supervisorCall";

// Reusable "Call Supervisor" trigger. Dashboard (AI Calling Agent hero), the
// AI Assistant workspace and the Escalation page all render this exact
// component so there is a single call/escalation code path (see
// utils/supervisorCall.js) - never a second implementation that talks to
// Exotel or the escalation API directly.
export default function SupervisorCallButton({
  booking,
  pnr,
  escalation,
  reason = "Customer requested supervisor assistance.",
  variant = "secondary",
  icon = PhoneCall,
  disabled = false,
  onEscalationCreated,
  onCallStarted,
  className = "",
  children = "Call Supervisor",
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function placeCall() {
    setStatus("loading");
    setError("");
    try {
      const result = await ensureEscalationAndCall({
        escalation,
        bookingId: booking?.id,
        pnr: pnr || booking?.pnr,
        reason,
      });

      if (result.escalation.id !== escalation?.id) {
        onEscalationCreated?.(result.escalation);
      }
      onCallStarted?.(result.call, result.escalation);

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
        setError("Unable to connect to supervisor. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <>
      <ActionButton
        icon={icon}
        variant={variant}
        disabled={disabled || !booking}
        className={className}
        onClick={() => {
          setStatus("idle");
          setError("");
          setConfirmOpen(true);
        }}
      >
        {children}
      </ActionButton>

      <SupervisorCallModal
        open={confirmOpen}
        status={status}
        errorMessage={error}
        onConfirm={placeCall}
        onClose={() => {
          setConfirmOpen(false);
          setStatus("idle");
          setError("");
        }}
      />
    </>
  );
}
