const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const pool = require("./config/database");
const { notFoundMiddleware, errorMiddleware } = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const agentRoutes = require("./routes/agentRoutes");
const escalationRoutes = require("./routes/escalationRoutes");
const voiceRoutes = require("./routes/voiceRoutes");

const app = express();

app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/escalations", escalationRoutes);
app.use("/api/voice", voiceRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

async function start() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection failed");
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`🚀 AeroResolve AI Backend running on port ${env.PORT}`);
  });
}

start();
