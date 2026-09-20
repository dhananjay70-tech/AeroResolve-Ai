const express = require("express");
const { z } = require("zod");
const agentController = require("../controllers/agentController");
const { validate } = require("../middleware/validateMiddleware");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

const chatSchema = z.object({
  pnr: z.string().min(1),
  message: z.string().min(1),
  conversationId: z.string().uuid().optional(),
});

router.post("/chat", authMiddleware, validate(chatSchema), agentController.chat);
router.post("/ai-chat", authMiddleware, validate(chatSchema), agentController.aiChat);

module.exports = router;
