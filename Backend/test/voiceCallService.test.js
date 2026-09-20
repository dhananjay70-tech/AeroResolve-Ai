const test = require("node:test");
const assert = require("node:assert/strict");

const { db } = require("../src/db");
const { AppError } = require("../src/middleware/errorMiddleware");
const escalationService = require("../src/services/escalationService");
const exotelService = require("../src/services/exotelService");
const env = require("../src/config/env");
const voiceCallService = require("../src/services/voiceCallService");

const FAKE_ESCALATION = { id: "esc-1", bookingId: "booking-1", status: "open", reason: "Customer requested manager" };

// Minimal stand-in for a drizzle query builder: every chain method returns
// itself, and awaiting at any point (via `.then`) or calling `.returning()`
// resolves to the configured result.
function chainable(result) {
  const q = {
    from: () => q,
    where: () => q,
    orderBy: () => q,
    limit: () => q,
    values: () => q,
    set: () => q,
    returning: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return q;
}

function setSupervisorEnvConfigured() {
  Object.assign(env, {
    EXOTEL_ACCOUNT_SID: "sid123",
    EXOTEL_API_KEY: "key123",
    EXOTEL_API_TOKEN: "token123",
    EXOTEL_CALLER_ID: "0123456789",
    EXOTEL_FLOW_APP_ID: "flow123",
    SUPERVISOR_PHONE_NUMBER: "+919876543210",
  });
}

test("initiateSupervisorCall rejects when the escalation does not exist", async (t) => {
  t.mock.method(escalationService, "getEscalationById", async () => {
    throw new AppError("Escalation not found", 404);
  });

  await assert.rejects(() => voiceCallService.initiateSupervisorCall("missing-esc"), (err) => {
    assert.equal(err.statusCode, 404);
    return true;
  });
});

test("initiateSupervisorCall reports NOT_CONFIGURED and leaves the escalation untouched when Exotel isn't set up", async (t) => {
  Object.assign(env, {
    EXOTEL_ACCOUNT_SID: "",
    EXOTEL_API_KEY: "",
    EXOTEL_API_TOKEN: "",
    EXOTEL_CALLER_ID: "",
    EXOTEL_FLOW_APP_ID: "",
  });
  t.mock.method(escalationService, "getEscalationById", async () => FAKE_ESCALATION);
  t.mock.method(db, "select", () => chainable([]));
  const insertMock = t.mock.method(db, "insert", () => chainable([]));

  const result = await voiceCallService.initiateSupervisorCall(FAKE_ESCALATION.id);

  assert.equal(result.callStatus, "NOT_CONFIGURED");
  assert.equal(result.callId, null);
  assert.equal(insertMock.mock.callCount(), 0);
});

test("initiateSupervisorCall does not start a second call when one is already active", async (t) => {
  setSupervisorEnvConfigured();
  const activeCall = { id: "call-1", status: "CALL_RINGING" };
  t.mock.method(escalationService, "getEscalationById", async () => FAKE_ESCALATION);
  t.mock.method(db, "select", () => chainable([activeCall]));
  const insertMock = t.mock.method(db, "insert", () => chainable([]));

  const result = await voiceCallService.initiateSupervisorCall(FAKE_ESCALATION.id);

  assert.equal(result.duplicate, true);
  assert.equal(result.callId, "call-1");
  assert.equal(result.callStatus, "CALL_RINGING");
  assert.equal(insertMock.mock.callCount(), 0);
});

test("initiateSupervisorCall creates a call and reflects the provider's status on success", async (t) => {
  setSupervisorEnvConfigured();
  t.mock.method(escalationService, "getEscalationById", async () => FAKE_ESCALATION);
  t.mock.method(db, "select", () => chainable([]));
  t.mock.method(db, "insert", () => chainable([{ id: "call-2", status: "CALL_REQUESTED" }]));
  t.mock.method(db, "update", () => chainable([{ id: "call-2", status: "CALL_INITIATING" }]));
  t.mock.method(exotelService, "startSupervisorCall", async () => ({
    success: true,
    status: "CALL_INITIATING",
    providerCallId: "provider-call-2",
    maskedNumber: "+91••••••3210",
  }));

  const result = await voiceCallService.initiateSupervisorCall(FAKE_ESCALATION.id);

  assert.equal(result.callId, "call-2");
  assert.equal(result.callStatus, "CALL_INITIATING");
});

test("initiateSupervisorCall marks the call failed (not the escalation) when the provider rejects it", async (t) => {
  setSupervisorEnvConfigured();
  t.mock.method(escalationService, "getEscalationById", async () => FAKE_ESCALATION);
  t.mock.method(db, "select", () => chainable([]));
  t.mock.method(db, "insert", () => chainable([{ id: "call-3", status: "CALL_REQUESTED" }]));
  const updateMock = t.mock.method(db, "update", () => chainable([]));
  t.mock.method(exotelService, "startSupervisorCall", async () => ({
    success: false,
    status: "FAILED",
    message: "The voice provider rejected the call request.",
  }));

  const result = await voiceCallService.initiateSupervisorCall(FAKE_ESCALATION.id);

  assert.equal(result.callStatus, "CALL_FAILED");
  assert.match(result.message, /escalation has still been created/i);
  assert.equal(updateMock.mock.callCount(), 1);
});

test("applyProviderWebhook updates the matching call's status and connected/ended timestamps", async (t) => {
  const call = { id: "call-4", providerCallId: "provider-call-4" };
  t.mock.method(db, "select", () => chainable([call]));
  const updateMock = t.mock.method(db, "update", () => chainable([]));

  const result = await voiceCallService.applyProviderWebhook({
    CallSid: "provider-call-4",
    Status: "in-progress",
  });

  assert.equal(result.matched, true);
  assert.equal(result.status, "CALL_CONNECTED");
  assert.equal(updateMock.mock.callCount(), 1);
});

test("applyProviderWebhook ignores callbacks for calls it doesn't recognize instead of throwing", async (t) => {
  t.mock.method(db, "select", () => chainable([]));

  const result = await voiceCallService.applyProviderWebhook({ CallSid: "unknown-call", Status: "completed" });

  assert.equal(result.matched, false);
});

test("applyProviderWebhook rejects a payload with no CallSid", async () => {
  await assert.rejects(() => voiceCallService.applyProviderWebhook({ Status: "completed" }), (err) => {
    assert.equal(err.statusCode, 400);
    return true;
  });
});

test("applyProviderWebhook reads lowercase field names as a defensive fallback", async (t) => {
  const call = { id: "call-5", providerCallId: "provider-call-5" };
  t.mock.method(db, "select", () => chainable([call]));
  const updateMock = t.mock.method(db, "update", () => chainable([]));

  const result = await voiceCallService.applyProviderWebhook({
    callsid: "provider-call-5",
    status: "completed",
    dateupdated: "2026-01-01T00:00:00Z",
  });

  assert.equal(result.matched, true);
  assert.equal(result.status, "CALL_COMPLETED");
  assert.equal(updateMock.mock.callCount(), 1);
});
