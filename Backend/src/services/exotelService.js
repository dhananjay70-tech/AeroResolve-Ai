const env = require("../config/env");

// The ONLY module in this codebase that talks to Exotel. Nothing else may
// hold or reference EXOTEL_* credentials - controllers/services call the
// functions below, never the Exotel API directly.

class VoiceNotConfiguredError extends Error {
  constructor(message = "Voice calling is not configured.") {
    super(message);
    this.name = "VoiceNotConfiguredError";
  }
}

class VoiceProviderError extends Error {
  constructor(message, { statusCode = 502, cause } = {}) {
    super(message);
    this.name = "VoiceProviderError";
    this.statusCode = statusCode;
    if (cause) this.cause = cause;
  }
}

const INDIAN_MOBILE_REGEX = /^(?:\+91|91|0)?([6-9]\d{9})$/;

// Every credential/number a real call needs - single source of truth so
// nothing downstream has to separately remember to also check
// SUPERVISOR_PHONE_NUMBER or EXOTEL_FLOW_APP_ID.
function isConfigured() {
  return Boolean(
    env.EXOTEL_ACCOUNT_SID &&
      env.EXOTEL_API_KEY &&
      env.EXOTEL_API_TOKEN &&
      env.EXOTEL_CALLER_ID &&
      env.SUPERVISOR_PHONE_NUMBER &&
      env.EXOTEL_FLOW_APP_ID
  );
}

// Safe to expose to authenticated internal callers (e.g. GET
// /api/escalations/exotel/status) - booleans only, never credential values.
function getConfigStatus() {
  return {
    configured: isConfigured(),
    callerIdConfigured: Boolean(env.EXOTEL_CALLER_ID),
    supervisorNumberConfigured: Boolean(env.SUPERVISOR_PHONE_NUMBER),
    flowConfigured: Boolean(env.EXOTEL_FLOW_APP_ID),
  };
}

// India-only: accepts +91/91/0-prefixed or bare 10-digit Indian mobile
// numbers and normalizes to E.164 (+91XXXXXXXXXX). Rejects everything else,
// including other countries' numbers - this system does not do
// international calling.
function normalizeIndianMobile(rawNumber) {
  const trimmed = (rawNumber || "").replace(/[\s-()]/g, "");
  const match = trimmed.match(INDIAN_MOBILE_REGEX);
  if (!match) {
    throw new VoiceProviderError("Supervisor phone number is not a valid Indian mobile number.", {
      statusCode: 400,
    });
  }
  return `+91${match[1]}`;
}

function maskPhoneNumber(e164Number) {
  if (!e164Number || e164Number.length < 4) return "+91••••••••••";
  return `${e164Number.slice(0, 3)}••••••${e164Number.slice(-4)}`;
}

// Maps Exotel's call status vocabulary to this app's human-handoff states.
// Exotel: queued | ringing | in-progress | completed | failed | busy | no-answer
function mapProviderStatus(providerStatus) {
  switch ((providerStatus || "").toLowerCase()) {
    case "queued":
      return "CALL_INITIATING";
    case "ringing":
      return "CALL_RINGING";
    case "in-progress":
      return "CALL_CONNECTED";
    case "completed":
      return "CALL_COMPLETED";
    case "busy":
    case "no-answer":
    case "failed":
      return "CALL_FAILED";
    default:
      return "CALL_INITIATING";
  }
}

// Places a real outbound call to `toNumber` (the supervisor's phone) and
// connects it into the pre-built Exotel App Bazaar flow (EXOTEL_FLOW_APP_ID)
// once picked up, which plays the case summary. Never simulates success:
// any non-2xx/network failure raises VoiceProviderError.
async function initiateCall({ toNumber, customField, statusCallbackUrl }) {
  if (!isConfigured()) {
    throw new VoiceNotConfiguredError();
  }

  const normalizedNumber = normalizeIndianMobile(toNumber);

  // From = the number Exotel dials first (the supervisor); To is set to the
  // same number, matching the account's outbound call configuration. Once
  // picked up, Url routes the leg into the configured App Bazaar flow
  // (EXOTEL_FLOW_APP_ID), which is what actually handles the voice
  // interaction - this call only connects the phone line to it.
  const params = new URLSearchParams({
    From: normalizedNumber,
    To: normalizedNumber,
    CallerId: env.EXOTEL_CALLER_ID,
    CallType: "trans",
    Url: `http://my.exotel.in/exoml/start/${env.EXOTEL_FLOW_APP_ID}`,
    TimeLimit: "1800",
    TimeOut: "45",
  });
  if (customField) params.set("CustomField", customField.slice(0, 128));
  if (statusCallbackUrl) {
    params.set("StatusCallback", statusCallbackUrl);
    params.append("StatusCallbackEvents[]", "terminal");
    params.append("StatusCallbackEvents[]", "answered");
    // The backend only parses JSON bodies (express.json()) - ask Exotel to
    // deliver the callback as JSON rather than its multipart/form-data default.
    params.set("StatusCallbackContentType", "application/json");
  }

  const authHeader = `Basic ${Buffer.from(`${env.EXOTEL_API_KEY}:${env.EXOTEL_API_TOKEN}`).toString("base64")}`;
  const baseUrl = env.EXOTEL_API_BASE_URL.replace(/\/+$/, "");
  // Path segments are capitalized ("Accounts"/"Calls") with a .json suffix -
  // this is the exact casing Exotel's own developer docs (Voice v1 API
  // reference) specify; their API is case-sensitive here, so this isn't
  // optional styling.
  const url = `${baseUrl}/v1/Accounts/${env.EXOTEL_ACCOUNT_SID}/Calls/connect.json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      signal: controller.signal,
    });
  } catch (err) {
    throw new VoiceProviderError("Could not reach the voice provider.", { cause: err });
  } finally {
    clearTimeout(timeout);
  }

  let body = {};
  try {
    body = await response.json();
  } catch {
    // fall through - handled by the !response.ok check below
  }

  if (!response.ok || !body.Call) {
    throw new VoiceProviderError(
      body?.RestException?.Message || "The voice provider rejected the call request.",
      { statusCode: 502 }
    );
  }

  return {
    providerCallId: body.Call.Sid,
    status: mapProviderStatus(body.Call.Status),
    maskedNumber: maskPhoneNumber(normalizedNumber),
  };
}

function buildStatusCallbackUrl() {
  const path = "/api/escalations/exotel/status";
  return env.EXOTEL_WEBHOOK_TOKEN
    ? `${env.PUBLIC_BASE_URL}${path}?token=${encodeURIComponent(env.EXOTEL_WEBHOOK_TOKEN)}`
    : `${env.PUBLIC_BASE_URL}${path}`;
}

// High-level entry point: places a real outbound call to the configured
// SUPERVISOR_PHONE_NUMBER for the given escalation and NEVER throws - every
// expected failure (missing config, invalid number, provider rejection,
// network failure) comes back as a structured { success: false, status,
// message } result instead, so callers never need to fake success on error.
// Logs are safe by design: only the escalation id is logged, never the
// account SID, API key/token, or a full phone number.
async function startSupervisorCall({ escalationId, customerName, pnr, issue, summary }) {
  console.log("[Exotel] Supervisor call requested");

  if (!isConfigured()) {
    console.log(`[Exotel] Call failed for escalation ${escalationId}: not configured`);
    return { success: false, status: "NOT_CONFIGURED", message: "Exotel calling is not configured yet." };
  }

  console.log(`[Exotel] Calling supervisor for escalation ${escalationId}`);

  try {
    const customField = JSON.stringify({ escalationId, pnr, issue }).slice(0, 128);
    const result = await initiateCall({
      toNumber: env.SUPERVISOR_PHONE_NUMBER,
      customField,
      statusCallbackUrl: buildStatusCallbackUrl(),
    });

    console.log(`[Exotel] Call initiated successfully for escalation ${escalationId}`);
    return {
      success: true,
      status: result.status,
      providerCallId: result.providerCallId,
      maskedNumber: result.maskedNumber,
      // Not sent to Exotel (CustomField is too small to carry it) - returned
      // so the caller can persist/display what the call was about.
      context: { customerName, pnr, issue, summary },
    };
  } catch (err) {
    console.log(`[Exotel] Call failed for escalation ${escalationId}`);
    if (err instanceof VoiceNotConfiguredError) {
      return { success: false, status: "NOT_CONFIGURED", message: "Exotel calling is not configured yet." };
    }
    return {
      success: false,
      status: "FAILED",
      message: err instanceof VoiceProviderError ? err.message : "Supervisor calling is temporarily unavailable.",
    };
  }
}

module.exports = {
  isConfigured,
  getConfigStatus,
  normalizeIndianMobile,
  maskPhoneNumber,
  mapProviderStatus,
  initiateCall,
  startSupervisorCall,
  VoiceNotConfiguredError,
  VoiceProviderError,
};
