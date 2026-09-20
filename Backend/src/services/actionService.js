const { db, schema } = require("../db");

// Prototype/demo implementation: these functions simulate airline actions by
// writing records to the database. They do not integrate with a real airline
// reservation system.

async function recordAction(bookingId, type, details) {
  const [action] = await db
    .insert(schema.actions)
    .values({ bookingId, type, status: "completed", details })
    .returning();

  return action;
}

async function rebookFlight(bookingId, { newFlightId } = {}) {
  return recordAction(bookingId, "rebook", { newFlightId, simulated: true });
}

async function initiateRefund(bookingId, { amountInr, paymentMethod } = {}) {
  return recordAction(bookingId, "refund", {
    amountInr,
    paymentMethod: "original",
    requestedPaymentMethod: paymentMethod,
    processingBusinessDays: 7,
    simulated: true,
  });
}

async function issueMealVoucher(bookingId, { amountInr = 500 } = {}) {
  return recordAction(bookingId, "meal_voucher", { amountInr, simulated: true });
}

async function grantLoungeAccess(bookingId) {
  return recordAction(bookingId, "lounge_access", { simulated: true });
}

async function arrangeHotel(bookingId, { delayedHours } = {}) {
  return recordAction(bookingId, "hotel", {
    delayedHours,
    coversDelayedHoursOnly: true,
    simulated: true,
  });
}

async function createEscalation(bookingId, { reason, requestedAction } = {}) {
  const [escalation] = await db
    .insert(schema.escalations)
    .values({ bookingId, reason, requestedAction: requestedAction || {} })
    .returning();

  return escalation;
}

module.exports = {
  rebookFlight,
  initiateRefund,
  issueMealVoucher,
  grantLoungeAccess,
  arrangeHotel,
  createEscalation,
};
