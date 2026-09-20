// Seeds the exact customers, bookings, and flights supplied by the
// assignment Data Pack. This is prototype/demo data only — no policies or
// compensation rules are invented here; those live in policyService.js.
//
// Idempotent for local development: clears existing rows from aero_resolve's
// seeded tables (in FK-safe order) before reinserting, so re-running this
// script never fails on stale data from a previous partial seed. It never
// touches the public/AgentOps schema, and it never touches the `users`
// table (application login accounts), since seeding doesn't create any.
const { db, schema } = require("./index");

async function clearSeedData() {
  await db.delete(schema.messages);
  await db.delete(schema.conversations);
  await db.delete(schema.actions);
  await db.delete(schema.escalations);
  await db.delete(schema.bookings);
  await db.delete(schema.flights);
  await db.delete(schema.customers);
}

async function seed() {
  console.log("Seeding database...");

  await clearSeedData();

  const [priya, arvind, meher] = await db
    .insert(schema.customers)
    .values([
      { name: "Priya Nair", loyaltyTier: "Gold" },
      { name: "Arvind Kulkarni", loyaltyTier: "Silver" },
      { name: "Meher Kaur", loyaltyTier: "Platinum" },
    ])
    .returning();

  // Scheduled (pre-disruption) departure/arrival times. Delayed flights'
  // actual departure is derived as scheduled departure + delayMinutes,
  // matching how policyService/agentController compute delay entitlements.
  const [flightSk204, flightSk118, flightSk305] = await db
    .insert(schema.flights)
    .values([
      {
        // Delhi -> Goa, cancelled, scheduled 23 Sep 2026 18:40
        flightNumber: "SK-204",
        origin: "DEL",
        destination: "GOI",
        departureTime: new Date("2026-09-23T18:40:00"),
        arrivalTime: new Date("2026-09-23T20:40:00"),
        status: "cancelled",
        delayMinutes: 0,
      },
      {
        // Mumbai -> Bengaluru, delayed 4h, new departure 11:10 (07:10 + 4h)
        flightNumber: "SK-118",
        origin: "BOM",
        destination: "BLR",
        departureTime: new Date("2026-09-23T07:10:00"),
        arrivalTime: new Date("2026-09-23T09:10:00"),
        status: "delayed",
        delayMinutes: 240,
      },
      {
        // Delhi -> Hyderabad, delayed 6h, new departure 20:00 (14:00 + 6h)
        flightNumber: "SK-305",
        origin: "DEL",
        destination: "HYD",
        departureTime: new Date("2026-09-23T14:00:00"),
        arrivalTime: new Date("2026-09-23T16:00:00"),
        status: "delayed",
        delayMinutes: 360,
      },
    ])
    .returning();

  await db.insert(schema.bookings).values([
    {
      pnr: "SK4821X",
      customerId: priya.id,
      flightId: flightSk204.id,
      status: "cancelled",
    },
    {
      pnr: "TR1190B",
      customerId: arvind.id,
      flightId: flightSk118.id,
      status: "confirmed",
    },
    {
      pnr: "WL7742",
      customerId: meher.id,
      flightId: flightSk305.id,
      status: "confirmed",
    },
  ]);

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
