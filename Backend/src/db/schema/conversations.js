const { uuid, timestamp } = require("drizzle-orm/pg-core");
const { aeroResolveSchema } = require("../pgSchema");
const { users } = require("./users");
const { bookings } = require("./bookings");

const conversations = aeroResolveSchema.table("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  bookingId: uuid("booking_id").references(() => bookings.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

module.exports = { conversations };
