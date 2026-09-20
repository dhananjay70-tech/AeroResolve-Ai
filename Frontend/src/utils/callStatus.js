// Human Handoff call states - mirrors Backend/src/services/voiceCallService.js
// CALL_STATUSES exactly, plus the two states the backend reports without a
// call row ever existing (NOT_CONFIGURED, NOT_STARTED).
export const CALL_STATUS_META = {
  CALL_REQUESTED: { label: "Supervisor Call Initiated", icon: "◉", tone: "pending" },
  CALL_INITIATING: { label: "Calling Supervisor…", icon: "◉", tone: "pending" },
  CALL_RINGING: { label: "Supervisor phone is ringing…", icon: "📞", tone: "pending" },
  CALL_CONNECTED: { label: "Supervisor connected", icon: "🟢", tone: "connected" },
  AI_HANDLING: { label: "AI is explaining the case…", icon: "🟢", tone: "connected" },
  SUPERVISOR_TAKEOVER: { label: "Supervisor has taken over", icon: "🟢", tone: "connected" },
  CALL_COMPLETED: { label: "Supervisor call completed", icon: "✓", tone: "done" },
  CALL_FAILED: { label: "Unable to connect to supervisor", icon: "⚠", tone: "failed" },
  CALL_CANCELLED: { label: "Supervisor call cancelled", icon: "⚠", tone: "failed" },
  NOT_CONFIGURED: { label: "Voice calling is not configured.", icon: "⚠", tone: "failed" },
  NOT_STARTED: { label: "No supervisor call yet", icon: "●", tone: "idle" },
};

export const TERMINAL_CALL_STATUSES = [
  "CALL_COMPLETED",
  "CALL_FAILED",
  "CALL_CANCELLED",
  "NOT_CONFIGURED",
  "NOT_STARTED",
];

export function callStatusMeta(status) {
  return CALL_STATUS_META[status] || CALL_STATUS_META.NOT_STARTED;
}
