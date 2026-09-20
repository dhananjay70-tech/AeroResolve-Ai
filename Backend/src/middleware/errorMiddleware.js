class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFoundMiddleware(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : "Something went wrong";

  if (!err.statusCode) {
    console.error(err);
  }

  res.status(statusCode).json({ success: false, message });
}

module.exports = { AppError, notFoundMiddleware, errorMiddleware };
