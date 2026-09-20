const express = require("express");
const { z } = require("zod");
const authController = require("../controllers/authController");
const { validate } = require("../middleware/validateMiddleware");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", authMiddleware, authController.me);

module.exports = router;
