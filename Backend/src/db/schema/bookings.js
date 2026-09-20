const { uuid, text, timestamp } = require("drizzle-orm/pg-core");
const { aeroResolveSchema } = require("../pgSchema");
const { customers } = require("./customers");
const { flights } = require("./flights");

const bookings = aeroResolveSchema.table("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  pnr: text("pnr").notNull().unique(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  flightId: uuid("flight_id")
    .notNull()
    .references(() => flights.id),
  status: text("status").notNull().default("confirmed"),
  fareClass: text("fare_class").notNull().default("economy"),
  paymentMethod: text("payment_method").notNull().default("card"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

module.exports = { bookings };
