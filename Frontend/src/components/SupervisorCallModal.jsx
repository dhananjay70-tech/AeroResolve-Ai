import ConfirmationModal from "./ConfirmationModal";

// Fixed confirmation-flow copy for every "Call Supervisor" entry point
// (Dashboard hero, AI Assistant, Escalation page). Only ever renders the
// states a real call can be in - idle/confirm, loading ("calling"), success
// ("initiated") and error ("failed"). It never shows a fake CONNECTED or
// COMPLETED state; those only ever come from the polled call status shown
// alongside this modal's trigger (see SupervisorCallStatus).
export default function SupervisorCallModal({ open, status, errorMessage, onConfirm, onClose }) {
  return (
    <ConfirmationModal
      open={open}
      title="Contact Supervisor?"
      whatWillHappen="Your case will be transferred to a supervisor for further assistance."
      status={status}
      successTitle="Supervisor call initiated"
      successMessage="Your supervisor connection has been started."
      errorMessage={errorMessage}
      errorPrefix=""
      confirmLabel="Call Supervisor"
      loadingLabel="Calling Supervisor..."
      retryLabel="Try Again"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
