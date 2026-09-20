const express = require("express");
const { z } = require("zod");
const escalationController = require("../controllers/escalationController");
const { validate } = require("../middleware/validateMiddleware");
const { authMiddleware } = require("../middleware/authMiddleware");
const { exotelWebhookMiddleware } = require("../middleware/exotelWebhookMiddleware");

const router = express.Router();

const createEscalationSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().min(1),
  requestedAction: z.record(z.string(), z.any()).optional(),
});

router.post("/", authMiddleware, validate(createEscalationSchema), escalationController.create);

// Registered before /:id so "exotel" is never mistaken for an escalation id.
// GET is the internal config check (JWT protected); POST is Exotel's own
// StatusCallback target (no JWT - Exotel can't send one), verified instead
// via exotelWebhookMiddleware's shared-secret token.
router.get("/exotel/status", authMiddleware, escalationController.exotelStatus);
router.post("/exotel/status", exotelWebhookMiddleware, escalationController.exotelWebhook);

router.get("/:id", authMiddleware, escalationController.getById);
router.post("/:id/call-supervisor", authMiddleware, escalationController.callSupervisor);

module.exports = router;
