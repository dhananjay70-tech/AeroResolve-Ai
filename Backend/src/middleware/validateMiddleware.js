const { AppError } = require("./errorMiddleware");

function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return next(new AppError(message || "Validation failed", 400));
    }

    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
