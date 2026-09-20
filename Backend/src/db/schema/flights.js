const { uuid, text, timestamp, integer } = require("drizzle-orm/pg-core");
const { aeroResolveSchema } = require("../pgSchema");

const flights = aeroResolveSchema.table("flights", {
  id: uuid("id").primaryKey().defaultRandom(),
  flightNumber: text("flight_number").notNull().unique(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  arrivalTime: timestamp("arrival_time").notNull(),
  status: text("status").notNull().default("scheduled"),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

module.exports = { flights };
