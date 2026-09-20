const voiceCallService = require("../services/voiceCallService");
const { success } = require("../utils/response");

async function initiateCall(req, res, next) {
  try {
    const result = await voiceCallService.initiateSupervisorCall(req.params.escalationId);
    success(res, result, result.callId ? 201 : 200);
  } catch (err) {
    next(err);
  }
}

async function getCallStatus(req, res, next) {
  try {
    const result = await voiceCallService.getCallStatusForEscalation(req.params.escalationId);
    success(res, result, 200);
  } catch (err) {
    next(err);
  }
}

module.exports = { initiateCall, getCallStatus };
