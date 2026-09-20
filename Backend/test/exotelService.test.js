const test = require("node:test");
const assert = require("node:assert/strict");

const env = require("../src/config/env");
const exotelService = require("../src/services/exotelService");

function configureEnv(overrides = {}) {
  Object.assign(
    env,
    {
      EXOTEL_ACCOUNT_SID: "sid123",
      EXOTEL_API_KEY: "key123",
      EXOTEL_API_TOKEN: "token123",
      EXOTEL_CALLER_ID: "0123456789",
      EXOTEL_FLOW_APP_ID: "flow123",
      SUPERVISOR_PHONE_NUMBER: "+919876543210",
    },
    overrides
  );
}

function clearEnv() {
  configureEnv({
    EXOTEL_ACCOUNT_SID: "",
    EXOTEL_API_KEY: "",
    EXOTEL_API_TOKEN: "",
    EXOTEL_CALLER_ID: "",
    EXOTEL_FLOW_APP_ID: "",
    SUPERVISOR_PHONE_NUMBER: "",
  });
}

test("isConfigured is false until every Exotel credential is present", () => {
  clearEnv();
  assert.equal(exotelService.isConfigured(), false);
  configureEnv();
  assert.equal(exotelService.isConfigured(), true);
  clearEnv();
});

test("normalizeIndianMobile accepts +91/91/0-prefixed and bare 10-digit Indian numbers", () => {
  assert.equal(exotelService.normalizeIndianMobile("+919876543210"), "+919876543210");
  assert.equal(exotelService.normalizeIndianMobile("919876543210"), "+919876543210");
  assert.equal(exotelService.normalizeIndianMobile("09876543210"), "+919876543210");
  assert.equal(exotelService.normalizeIndianMobile("9876543210"), "+919876543210");
  assert.equal(exotelService.normalizeIndianMobile("+91 98765 43210"), "+919876543210");
});

test("normalizeIndianMobile rejects non-Indian and malformed numbers", () => {
  assert.throws(() => exotelService.normalizeIndianMobile("+14155552671"), exotelService.VoiceProviderError);
  assert.throws(() => exotelService.normalizeIndianMobile("12345"), exotelService.VoiceProviderError);
  assert.throws(() => exotelService.normalizeIndianMobile(""), exotelService.VoiceProviderError);
  try {
    exotelService.normalizeIndianMobile("123");
  } catch (err) {
    assert.equal(err.statusCode, 400);
  }
});

test("maskPhoneNumber hides the middle digits", () => {
  assert.equal(exotelService.maskPhoneNumber("+919876543210"), "+91••••••3210");
});

test("mapProviderStatus maps every Exotel status to a human-handoff state", () => {
  assert.equal(exotelService.mapProviderStatus("queued"), "CALL_INITIATING");
  assert.equal(exotelService.mapProviderStatus("ringing"), "CALL_RINGING");
  assert.equal(exotelService.mapProviderStatus("in-progress"), "CALL_CONNECTED");
  assert.equal(exotelService.mapProviderStatus("completed"), "CALL_COMPLETED");
  assert.equal(exotelService.mapProviderStatus("failed"), "CALL_FAILED");
  assert.equal(exotelService.mapProviderStatus("busy"), "CALL_FAILED");
  assert.equal(exotelService.mapProviderStatus("no-answer"), "CALL_FAILED");
});

test("initiateCall throws VoiceNotConfiguredError instead of faking a call when credentials are missing", async () => {
  clearEnv();
  await assert.rejects(
    () => exotelService.initiateCall({ toNumber: "9876543210" }),
    exotelService.VoiceNotConfiguredError
  );
});

test("initiateCall never reports success when the provider request fails", async (t) => {
  configureEnv();
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false,
    status: 400,
    json: async () => ({ RestException: { Message: "Invalid CallerId" } }),
  }));

  await assert.rejects(
    () => exotelService.initiateCall({ toNumber: "9876543210" }),
    exotelService.VoiceProviderError
  );
  clearEnv();
});

test("initiateCall returns the provider call id and mapped status on success", async (t) => {
  configureEnv();
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    status: 200,
    json: async () => ({ Call: { Sid: "call-abc", Status: "queued" } }),
  }));

  const result = await exotelService.initiateCall({ toNumber: "9876543210", customField: "{}" });
  assert.equal(result.providerCallId, "call-abc");
  assert.equal(result.status, "CALL_INITIATING");
  assert.equal(result.maskedNumber, "+91••••••3210");
  clearEnv();
});

test("initiateCall calls the real Exotel Accounts/Calls/connect endpoint with From, To, CallerId, CallType and Url", async (t) => {
  configureEnv({ EXOTEL_API_BASE_URL: "https://api.exotel.com" });
  let capturedUrl;
  let capturedBody;
  t.mock.method(globalThis, "fetch", async (url, opts) => {
    capturedUrl = url;
    capturedBody = new URLSearchParams(opts.body);
    return { ok: true, status: 200, json: async () => ({ Call: { Sid: "call-1", Status: "queued" } }) };
  });

  await exotelService.initiateCall({ toNumber: "9876543210" });

  assert.equal(capturedUrl, "https://api.exotel.com/v1/Accounts/sid123/Calls/connect.json");
  assert.equal(capturedBody.get("From"), "+919876543210");
  assert.equal(capturedBody.get("To"), "+919876543210");
  assert.equal(capturedBody.get("CallerId"), "0123456789");
  assert.equal(capturedBody.get("CallType"), "trans");
  assert.equal(capturedBody.get("Url"), "http://my.exotel.in/exoml/start/flow123");
  clearEnv();
});

test("getConfigStatus reports booleans only, derived from the real env state", () => {
  clearEnv();
  assert.deepEqual(exotelService.getConfigStatus(), {
    configured: false,
    callerIdConfigured: false,
    supervisorNumberConfigured: false,
    flowConfigured: false,
  });

  configureEnv();
  assert.deepEqual(exotelService.getConfigStatus(), {
    configured: true,
    callerIdConfigured: true,
    supervisorNumberConfigured: true,
    flowConfigured: true,
  });
  clearEnv();
});

test("isConfigured is false when only the flow app id is missing", () => {
  configureEnv({ EXOTEL_FLOW_APP_ID: "" });
  assert.equal(exotelService.isConfigured(), false);
  clearEnv();
});

test("isConfigured is false when only the supervisor number is missing", () => {
  configureEnv({ SUPERVISOR_PHONE_NUMBER: "" });
  assert.equal(exotelService.isConfigured(), false);
  clearEnv();
});

test("startSupervisorCall never throws and returns a structured NOT_CONFIGURED result when credentials are missing", async () => {
  clearEnv();
  const result = await exotelService.startSupervisorCall({
    escalationId: "esc-1",
    customerName: "Priya Nair",
    pnr: "SK4821X",
    issue: "Customer requested a supervisor",
  });
  assert.deepEqual(result, {
    success: false,
    status: "NOT_CONFIGURED",
    message: "Exotel calling is not configured yet.",
  });
});

test("startSupervisorCall returns a structured FAILED result instead of throwing when the provider rejects the call", async (t) => {
  configureEnv();
  t.mock.method(globalThis, "fetch", async () => ({
    ok: false,
    status: 400,
    json: async () => ({ RestException: { Message: "Invalid CallerId" } }),
  }));

  const result = await exotelService.startSupervisorCall({ escalationId: "esc-2", pnr: "SK4821X" });

  assert.equal(result.success, false);
  assert.equal(result.status, "FAILED");
  assert.equal(result.message, "Invalid CallerId");
  clearEnv();
});

test("startSupervisorCall never logs the account SID, API key/token, or a full phone number", async (t) => {
  configureEnv();
  const logged = [];
  t.mock.method(console, "log", (...args) => logged.push(args.join(" ")));
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    status: 200,
    json: async () => ({ Call: { Sid: "call-xyz", Status: "queued" } }),
  }));

  const result = await exotelService.startSupervisorCall({
    escalationId: "esc-3",
    customerName: "Priya Nair",
    pnr: "SK4821X",
    issue: "Customer requested a supervisor",
  });

  assert.equal(result.success, true);
  assert.equal(result.status, "CALL_INITIATING");
  const joined = logged.join("\n");
  for (const secret of ["sid123", "key123", "token123", "+919876543210"]) {
    assert.equal(joined.includes(secret), false, `log output leaked "${secret}"`);
  }
  clearEnv();
});
