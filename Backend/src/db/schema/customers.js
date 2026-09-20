const { uuid, text, timestamp } = require("drizzle-orm/pg-core");
const { aeroResolveSchema } = require("../pgSchema");

const customers = aeroResolveSchema.table("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  loyaltyTier: text("loyalty_tier").notNull().default("Silver"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

module.exports = { customers };
