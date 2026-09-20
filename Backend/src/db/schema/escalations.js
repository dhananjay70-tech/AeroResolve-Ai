const { uuid, text, jsonb, timestamp } = require("drizzle-orm/pg-core");
const { aeroResolveSchema } = require("../pgSchema");
const { bookings } = require("./bookings");

const escalations = aeroResolveSchema.table("escalations", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  requestedAction: jsonb("requested_action").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

module.exports = { escalations };
