const express = require("express");
const { z } = require("zod");
const voiceController = require("../controllers/voiceController");
const { validate } = require("../middleware/validateMiddleware");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

const escalationIdParamSchema = z.object({ escalationId: z.string().uuid() });

// Kept for the Python AI service (Ai_Services/app/services/backend_client.py
// calls this exact path when a customer explicitly asks for a supervisor) -
// functionally identical to POST /api/escalations/:id/call-supervisor.
// The Exotel StatusCallback webhook itself now lives at
// POST /api/escalations/exotel/status (see escalationRoutes.js).
router.post(
  "/escalations/:escalationId/call",
  authMiddleware,
  validate(escalationIdParamSchema, "params"),
  voiceController.initiateCall
);
router.get(
  "/escalations/:escalationId/call",
  authMiddleware,
  validate(escalationIdParamSchema, "params"),
  voiceController.getCallStatus
);

module.exports = router;
