const { eq, and, desc, ne } = require("drizzle-orm");
const { db, schema } = require("../db");
const { AppError } = require("../middleware/errorMiddleware");
const escalationService = require("./escalationService");
const exotelService = require("./exotelService");
const env = require("../config/env");

const CALL_STATUSES = {
  REQUESTED: "CALL_REQUESTED",
  INITIATING: "CALL_INITIATING",
  RINGING: "CALL_RINGING",
  CONNECTED: "CALL_CONNECTED",
  AI_HANDLING: "AI_HANDLING",
  SUPERVISOR_TAKEOVER: "SUPERVISOR_TAKEOVER",
  COMPLETED: "CALL_COMPLETED",
  FAILED: "CALL_FAILED",
  CANCELLED: "CALL_CANCELLED",
};

const TERMINAL_STATUSES = [CALL_STATUSES.COMPLETED, CALL_STATUSES.FAILED, CALL_STATUSES.CANCELLED];

async function getLatestCallForEscalation(escalationId) {
  const [call] = await db
    .select()
    .from(schema.voiceCalls)
    .where(eq(schema.voiceCalls.escalationId, escalationId))
    .orderBy(desc(schema.voiceCalls.createdAt))
    .limit(1);
  return call || null;
}

async function getActiveCallForEscalation(escalationId) {
  const [call] = await db
    .select()
    .from(schema.voiceCalls)
    .where(
      and(
        eq(schema.voiceCalls.escalationId, escalationId),
        ne(schema.voiceCalls.status, CALL_STATUSES.FAILED),
        ne(schema.voiceCalls.status, CALL_STATUSES.CANCELLED),
        ne(schema.voiceCalls.status, CALL_STATUSES.COMPLETED)
      )
    )
    .orderBy(desc(schema.voiceCalls.createdAt))
    .limit(1);
  return call || null;
}

// Pulls the customer/booking facts already stored in Postgres for this
// escalation, so the supervisor call carries only verified case context -
// never invented details. Best-effort: a lookup failure here should not
// block the call, it just means less context is available.
async function loadCaseContext(escalation) {
  try {
    const [booking] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, escalation.bookingId));
    if (!booking) return {};
    const [customer] = await db.select().from(schema.customers).where(eq(schema.customers.id, booking.customerId));
    return {
      customerName: customer?.name,
      pnr: booking.pnr,
      issue: escalation.reason,
      summary: `${customer?.name || "Customer"} (${booking.pnr}): ${escalation.reason}`,
    };
  } catch {
    return { issue: escalation.reason };
  }
}

// Creates a real outbound supervisor call for an escalation, or - if a call
// is already active for it - returns that call's current status instead of
// starting a second one. If Exotel isn't configured, or the provider call
// fails outright, the escalation itself is left completely untouched.
async function initiateSupervisorCall(escalationId) {
  const escalation = await escalationService.getEscalationById(escalationId);

  const activeCall = await getActiveCallForEscalation(escalationId);
  if (activeCall) {
    return {
      escalationId: escalation.id,
      callId: activeCall.id,
      callStatus: activeCall.status,
      duplicate: true,
      message: "A supervisor call is already in progress for this escalation.",
    };
  }

  if (!exotelService.isConfigured()) {
    return {
      escalationId: escalation.id,
      callId: null,
      callStatus: "NOT_CONFIGURED",
      message: "Voice calling is not configured.",
    };
  }

  const maskedNumber = exotelService.maskPhoneNumber(
    (() => {
      try {
        return exotelService.normalizeIndianMobile(env.SUPERVISOR_PHONE_NUMBER);
      } catch {
        return "";
      }
    })()
  );

  const [call] = await db
    .insert(schema.voiceCalls)
    .values({
      escalationId: escalation.id,
      provider: "exotel",
      phoneNumberMasked: maskedNumber,
      status: CALL_STATUSES.INITIATING,
      startedAt: new Date(),
    })
    .returning();

  const context = await loadCaseContext(escalation);
  const result = await exotelService.startSupervisorCall({ escalationId: escalation.id, ...context });

  if (!result.success) {
    await db
      .update(schema.voiceCalls)
      .set({
        status: CALL_STATUSES.FAILED,
        failureReason: result.message,
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.voiceCalls.id, call.id));

    return {
      escalationId: escalation.id,
      callId: call.id,
      callStatus: CALL_STATUSES.FAILED,
      message:
        result.status === "NOT_CONFIGURED"
          ? result.message
          : "Supervisor calling is temporarily unavailable. Your escalation has still been created.",
    };
  }

  const [updated] = await db
    .update(schema.voiceCalls)
    .set({
      providerCallId: result.providerCallId,
      status: result.status,
      updatedAt: new Date(),
    })
    .where(eq(schema.voiceCalls.id, call.id))
    .returning();

  return {
    escalationId: escalation.id,
    callId: updated.id,
    callStatus: updated.status,
    message: "Supervisor call is being initiated.",
  };
}

async function getCallStatusForEscalation(escalationId) {
  // Confirms the escalation exists (throws 404 otherwise) before reporting
  // call status for it.
  await escalationService.getEscalationById(escalationId);
  const call = await getLatestCallForEscalation(escalationId);
  if (!call) {
    return { escalationId, callId: null, callStatus: "NOT_STARTED" };
  }
  return {
    escalationId,
    callId: call.id,
    callStatus: call.status,
    phoneNumberMasked: call.phoneNumberMasked,
    startedAt: call.startedAt,
    connectedAt: call.connectedAt,
    endedAt: call.endedAt,
    duration: call.duration,
  };
}

function deriveTimestampUpdates(status) {
  const updates = { status, updatedAt: new Date() };
  if (status === CALL_STATUSES.CONNECTED) {
    updates.connectedAt = new Date();
  }
  if (TERMINAL_STATUSES.includes(status)) {
    updates.endedAt = new Date();
  }
  return updates;
}

// Exotel's own docs use PascalCase field names (CallSid, Status, ...), but
// this reads case-insensitively as a defensive fallback in case a given
// account/region delivers lowercase field names instead.
function readField(payload, name) {
  if (payload[name] !== undefined) return payload[name];
  const lower = name.toLowerCase();
  const key = Object.keys(payload).find((k) => k.toLowerCase() === lower);
  return key ? payload[key] : undefined;
}

// Applies an Exotel StatusCallback webhook payload to the matching call row.
// Unknown/duplicate CallSids are ignored (logged, not errored) - webhooks
// can be redelivered and must be handled idempotently.
async function applyProviderWebhook(payload) {
  const providerCallId = readField(payload, "CallSid");
  if (!providerCallId) {
    throw new AppError("Missing CallSid in webhook payload", 400);
  }

  const [call] = await db
    .select()
    .from(schema.voiceCalls)
    .where(eq(schema.voiceCalls.providerCallId, providerCallId));

  if (!call) {
    return { matched: false };
  }

  const status = exotelService.mapProviderStatus(readField(payload, "Status"));
  const updates = deriveTimestampUpdates(status);
  const duration = readField(payload, "Duration");
  if (duration) {
    const parsed = Number.parseInt(duration, 10);
    if (Number.isFinite(parsed)) updates.duration = parsed;
  }

  await db.update(schema.voiceCalls).set(updates).where(eq(schema.voiceCalls.id, call.id));

  return { matched: true, callId: call.id, status };
}

module.exports = {
  CALL_STATUSES,
  TERMINAL_STATUSES,
  initiateSupervisorCall,
  getCallStatusForEscalation,
  getActiveCallForEscalation,
  getLatestCallForEscalation,
  applyProviderWebhook,
};
