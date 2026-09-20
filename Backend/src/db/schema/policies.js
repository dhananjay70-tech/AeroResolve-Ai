const { uuid, text, jsonb, timestamp } = require("drizzle-orm/pg-core");
const { aeroResolveSchema } = require("../pgSchema");

const policies = aeroResolveSchema.table("policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  rules: jsonb("rules").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

module.exports = { policies };
