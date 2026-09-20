const { verifyToken } = require("../utils/jwt");
const { AppError } = require("./errorMiddleware");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authentication token missing", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.userId };
    next();
  } catch (err) {
    next(new AppError("Invalid or expired token", 401));
  }
}

module.exports = { authMiddleware };
