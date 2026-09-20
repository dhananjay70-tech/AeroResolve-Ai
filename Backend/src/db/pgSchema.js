const { pgSchema } = require("drizzle-orm/pg-core");

const aeroResolveSchema = pgSchema("aero_resolve");

module.exports = { aeroResolveSchema };
