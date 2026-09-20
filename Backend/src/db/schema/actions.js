const { uuid, text, jsonb, timestamp } = require("drizzle-orm/pg-core");
const { aeroResolveSchema } = require("../pgSchema");
const { bookings } = require("./bookings");

const actions = aeroResolveSchema.table("actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("completed"),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

module.exports = { actions };
