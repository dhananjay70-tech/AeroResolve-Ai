const { drizzle } = require("drizzle-orm/node-postgres");
const pool = require("../config/database");

const schema = {
  ...require("./schema/users"),
  ...require("./schema/customers"),
  ...require("./schema/flights"),
  ...require("./schema/bookings"),
  ...require("./schema/policies"),
  ...require("./schema/actions"),
  ...require("./schema/escalations"),
  ...require("./schema/conversations"),
  ...require("./schema/messages"),
  ...require("./schema/voiceCalls"),
};

const db = drizzle(pool, { schema });

module.exports = { db, schema };
