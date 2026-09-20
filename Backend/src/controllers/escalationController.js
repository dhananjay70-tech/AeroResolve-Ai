const escalationService = require("../services/escalationService");
const voiceCallService = require("../services/voiceCallService");
const exotelService = require("../services/exotelService");
const { success } = require("../utils/response");

async function create(req, res, next) {
  try {
    const escalation = await escalationService.createEscalation(req.body);
    success(res, escalation, 201);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const escalation = await escalationService.getEscalationById(req.params.id);
    success(res, escalation, 200);
  } catch (err) {
    next(err);
  }
}

// Internal CALL_STATUSES -> the small public vocabulary the frontend/API
// consumers see from POST /:id/call-supervisor.
function toPublicCallStatus(internalStatus) {
  switch (internalStatus) {
    case "NOT_CONFIGURED":
      return "not_configured";
    case "CALL_FAILED":
    case "CALL_CANCELLED":
      return "failed";
    case "CALL_COMPLETED":
      return "completed";
    default:
      // CALL_REQUESTED / CALL_INITIATING / CALL_RINGING / CALL_CONNECTED /
      // AI_HANDLING / SUPERVISOR_TAKEOVER - the call is real and in flight.
      return "initiated";
  }
}

const PUBLIC_CALL_MESSAGES = {
  initiated: "Supervisor call initiated",
  not_configured: "Exotel calling is not configured",
  failed: "Supervisor call could not be initiated",
  completed: "Supervisor call completed",
};

// POST /api/escalations/:id/call-supervisor - starts (or reports the status
// of) a real Exotel call to the supervisor for this escalation. Never fakes
// success, and a call failure never rolls back the escalation itself - see
// voiceCallService.initiateSupervisorCall.
async function callSupervisor(req, res, next) {
  try {
    const result = await voiceCallService.initiateSupervisorCall(req.params.id);
    const callStatus = toPublicCallStatus(result.callStatus);
    res.status(200).json({
      success: callStatus !== "not_configured" && callStatus !== "failed",
      message: PUBLIC_CALL_MESSAGES[callStatus],
      callStatus,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/escalations/exotel/status - safe internal config check. Booleans
// only, never the actual Exotel credentials.
async function exotelStatus(req, res, next) {
  try {
    success(res, exotelService.getConfigStatus(), 200);
  } catch (err) {
    next(err);
  }
}

// POST /api/escalations/exotel/status - Exotel's StatusCallback target.
// Always acknowledges quickly and never exposes internal error detail - a
// webhook delivery failure just means the call status won't update, not
// that anything else breaks.
async function exotelWebhook(req, res) {
  try {
    await voiceCallService.applyProviderWebhook(req.body || {});
  } catch (err) {
    console.error("Exotel webhook processing failed:", err);
  }
  res.status(200).json({ success: true });
}

module.exports = {
  create,
  getById,
  callSupervisor,
  exotelStatus,
  exotelWebhook,
  toPublicCallStatus,
};
