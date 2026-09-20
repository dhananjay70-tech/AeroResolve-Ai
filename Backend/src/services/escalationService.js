const { eq } = require("drizzle-orm");
const { db, schema } = require("../db");
const { AppError } = require("../middleware/errorMiddleware");
const actionService = require("./actionService");

async function createEscalation({ bookingId, reason, requestedAction }) {
  const [booking] = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.id, bookingId));

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  return actionService.createEscalation(bookingId, { reason, requestedAction });
}

async function getEscalationById(id) {
  const [escalation] = await db
    .select()
    .from(schema.escalations)
    .where(eq(schema.escalations.id, id));

  if (!escalation) {
    throw new AppError("Escalation not found", 404);
  }

  return escalation;
}

module.exports = { createEscalation, getEscalationById };
