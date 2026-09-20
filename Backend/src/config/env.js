require("dotenv").config();

const required = ["DATABASE_URL", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const env = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://localhost:8000",

  // Base URL this backend is reachable at, used to build the StatusCallback
  // URL Exotel calls back with call status updates. Optional - only needed
  // once voice calling is configured.
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,

  // Exotel (India-only outbound supervisor calling). All optional: when any
  // are missing, voiceService reports "not configured" instead of failing -
  // see src/services/exotelService.js. Never sent to the frontend.
  EXOTEL_ACCOUNT_SID: process.env.EXOTEL_ACCOUNT_SID || "",
  EXOTEL_API_KEY: process.env.EXOTEL_API_KEY || "",
  EXOTEL_API_TOKEN: process.env.EXOTEL_API_TOKEN || "",
  // Full API host for your Exotel account's region, e.g. https://api.exotel.com
  // (Singapore) or https://api.in.exotel.com (Mumbai) - no trailing slash.
  EXOTEL_API_BASE_URL: process.env.EXOTEL_API_BASE_URL || "https://api.exotel.com",
  EXOTEL_CALLER_ID: process.env.EXOTEL_CALLER_ID || "",
  // Pre-built Exotel App Bazaar flow (ExoML) that greets the supervisor and
  // plays the case summary once they pick up. Configured once in the Exotel
  // dashboard - this backend only references its id.
  EXOTEL_FLOW_APP_ID: process.env.EXOTEL_FLOW_APP_ID || "",
  SUPERVISOR_PHONE_NUMBER: process.env.SUPERVISOR_PHONE_NUMBER || "",
  // Shared secret appended as a query param to the StatusCallback URL
  // registered with Exotel, so POST /api/escalations/exotel/status can
  // reject requests that don't carry it. Exotel has no built-in
  // request-signing mechanism, so a secret embedded in the callback URL is
  // its supported verification path.
  EXOTEL_WEBHOOK_TOKEN: process.env.EXOTEL_WEBHOOK_TOKEN || "",
};

module.exports = env;
