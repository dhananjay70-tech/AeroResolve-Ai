const express = require("express");
const customerController = require("../controllers/customerController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:pnr", authMiddleware, customerController.getByPnr);

module.exports = router;
