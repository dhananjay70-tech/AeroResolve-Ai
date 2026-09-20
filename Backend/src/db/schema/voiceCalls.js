const { uuid, text, integer, timestamp } = require("drizzle-orm/pg-core");
const { aeroResolveSchema } = require("../pgSchema");
const { escalations } = require("./escalations");

// Records real outbound supervisor-escalation calls placed through a voice
// provider (Exotel). One row per call attempt - retries create new rows so
// history is preserved. Never store the raw phone number: only the masked
// form is kept here.
const voiceCalls = aeroResolveSchema.table("voice_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  escalationId: uuid("escalation_id")
    .notNull()
    .references(() => escalations.id),
  provider: text("provider").notNull().default("exotel"),
  providerCallId: text("provider_call_id"),
  phoneNumberMasked: text("phone_number_masked").notNull(),
  status: text("status").notNull().default("CALL_REQUESTED"),
  failureReason: text("failure_reason"),
  startedAt: timestamp("started_at"),
  connectedAt: timestamp("connected_at"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

module.exports = { voiceCalls };
