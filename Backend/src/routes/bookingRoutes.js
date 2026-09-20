const express = require("express");
const bookingController = require("../controllers/bookingController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:pnr", authMiddleware, bookingController.getByPnr);
router.get("/:pnr/status", authMiddleware, bookingController.getStatus);

module.exports = router;
