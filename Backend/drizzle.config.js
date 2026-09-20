require("dotenv").config();
const { defineConfig } = require("drizzle-kit");

module.exports = defineConfig({
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // AeroResolve shares this Supabase database with other projects (e.g. AgentOps).
  // Keep every AeroResolve concern - tables and migration bookkeeping - inside its
  // own "aero_resolve" schema so nothing here ever touches public/other schemas.
  schemaFilter: ["aero_resolve"],
  migrations: {
    table: "__drizzle_migrations",
    schema: "aero_resolve",
  },
  strict: true,
  verbose: true,
});
