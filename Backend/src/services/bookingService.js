const { eq } = require("drizzle-orm");
const { db, schema } = require("../db");
const { AppError } = require("../middleware/errorMiddleware");

async function getBookingByPnr(pnr) {
  const [booking] = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.pnr, pnr));

  if (!booking) {
    throw new AppError("Booking not found for the given PNR", 404);
  }

  const [flight] = await db
    .select()
    .from(schema.flights)
    .where(eq(schema.flights.id, booking.flightId));

  return { ...booking, flight };
}

async function getBookingStatus(pnr) {
  const booking = await getBookingByPnr(pnr);

  return {
    pnr: booking.pnr,
    bookingStatus: booking.status,
    flightNumber: booking.flight?.flightNumber,
    flightStatus: booking.flight?.status,
    delayMinutes: booking.flight?.delayMinutes ?? 0,
  };
}

module.exports = { getBookingByPnr, getBookingStatus };
