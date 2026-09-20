import { escalationApi, voiceApi } from "../services/api";
import { TERMINAL_CALL_STATUSES } from "./callStatus";

// The one place that turns "the customer wants a supervisor" into real
// backend calls. If this case doesn't have an escalation yet, one is created
// first (through the existing POST /api/escalations contract) so the call
// always has a real escalationId to attach to - the frontend never talks to
// Exotel directly and never invents a call result.
export async function ensureEscalationAndCall({ escalation, bookingId, pnr, reason }) {
  let activeEscalation = escalation;
  if (!activeEscalation) {
    const res = await escalationApi.create(bookingId, reason, {
      type: "SUPERVISOR_CALL_REQUEST",
      pnr,
    });
    activeEscalation = res.data;
  }
  const callRes = await voiceApi.initiateCall(activeEscalation.id);
  return { escalation: activeEscalation, call: callRes.data };
}

// Polls GET /api/voice/escalations/:id/call until the call reaches a
// terminal state. Shared by every surface that shows a live call status
// (SupervisorCallStatus, SupervisorCallButton) so there is exactly one
// polling implementation.
export function pollCallStatus(escalationId, onUpdate, intervalMs = 3000) {
  let cancelled = false;
  let timer = null;

  async function tick() {
    try {
      const res = await voiceApi.getStatus(escalationId);
      if (cancelled) return;
      onUpdate(res.data);
      if (!TERMINAL_CALL_STATUSES.includes(res.data.callStatus)) {
        timer = setTimeout(tick, intervalMs);
      }
    } catch {
      // Transient polling failure - the next scheduled/manual check retries.
    }
  }

  tick();
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}
