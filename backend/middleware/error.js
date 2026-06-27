const ErrorHandler = require("../utils/ErrorHandler");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal server Error";

  if (err.type === "entity.too.large") {
    err = new ErrorHandler("Request payload is too large", 413);
  }

  // wrong mongodb id error
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate key ${Object.keys(err.keyValue)} Entered`;
    err = new ErrorHandler(message, 400);
  }

  // wrong jwt error
  if (err.name === "JsonWebTokenError") {
    const message = "Your session is invalid. Please login again.";
    err = new ErrorHandler(message, 401);
  }

  // jwt expired
  if (err.name === "TokenExpiredError") {
    const message = "Your session has expired. Please login again.";
    err = new ErrorHandler(message, 401);
  }

  if (err.message === "Not allowed by CORS") {
    err = new ErrorHandler("This origin is not allowed to access the API", 403);
  }

  const response = {
    success: false,
    message: err.message,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
};
