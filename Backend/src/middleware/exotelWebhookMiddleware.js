const env = require("../config/env");
const { AppError } = require("./errorMiddleware");

// Exotel has no request-signing mechanism, so the StatusCallback URL
// registered with them carries a shared-secret query param instead - this
// checks it matches before any webhook payload is trusted. Never applied to
// customer-facing routes.
function exotelWebhookMiddleware(req, res, next) {
  if (!env.EXOTEL_WEBHOOK_TOKEN) {
    return next(new AppError("Voice webhook is not configured", 503));
  }
  if (req.query.token !== env.EXOTEL_WEBHOOK_TOKEN) {
    return next(new AppError("Invalid webhook token", 401));
  }
  next();
}

module.exports = { exotelWebhookMiddleware };
