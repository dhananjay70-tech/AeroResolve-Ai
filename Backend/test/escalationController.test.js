const test = require("node:test");
const assert = require("node:assert/strict");

const escalationController = require("../src/controllers/escalationController");

test("toPublicCallStatus maps every internal call status to the documented public vocabulary", () => {
  assert.equal(escalationController.toPublicCallStatus("NOT_CONFIGURED"), "not_configured");
  assert.equal(escalationController.toPublicCallStatus("CALL_FAILED"), "failed");
  assert.equal(escalationController.toPublicCallStatus("CALL_CANCELLED"), "failed");
  assert.equal(escalationController.toPublicCallStatus("CALL_COMPLETED"), "completed");
  assert.equal(escalationController.toPublicCallStatus("CALL_REQUESTED"), "initiated");
  assert.equal(escalationController.toPublicCallStatus("CALL_INITIATING"), "initiated");
  assert.equal(escalationController.toPublicCallStatus("CALL_RINGING"), "initiated");
  assert.equal(escalationController.toPublicCallStatus("CALL_CONNECTED"), "initiated");
});
