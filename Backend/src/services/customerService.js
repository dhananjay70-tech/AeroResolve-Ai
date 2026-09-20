const { eq } = require("drizzle-orm");
const { db, schema } = require("../db");
const { AppError } = require("../middleware/errorMiddleware");

async function getCustomerByPnr(pnr) {
  const [booking] = await db
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.pnr, pnr));

  if (!booking) {
    throw new AppError("Booking not found for the given PNR", 404);
  }

  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.id, booking.customerId));

  if (!customer) {
    throw new AppError("Customer not found for the given PNR", 404);
  }

  return customer;
}

module.exports = { getCustomerByPnr };
