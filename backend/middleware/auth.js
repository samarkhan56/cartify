const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const Shop = require("../model/shop");

// Check if user is authenticated or not
exports.isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  if (!process.env.JWT_SECRET) {
    return next(new ErrorHandler("Authentication is not configured", 500));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  req.user = await User.findById(decoded.id);
  if (!req.user) {
    return next(new ErrorHandler("User account no longer exists", 401));
  }

  next();
});

exports.isSeller = catchAsyncErrors(async (req, res, next) => {
  const { seller_token } = req.cookies;
  if (!seller_token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  if (!process.env.JWT_SECRET) {
    return next(new ErrorHandler("Authentication is not configured", 500));
  }

  const decoded = jwt.verify(seller_token, process.env.JWT_SECRET);

  req.seller = await Shop.findById(decoded.id);
  if (!req.seller) {
    return next(new ErrorHandler("Seller account no longer exists", 401));
  }

  if (req.seller.accountStatus === "suspended") {
    return next(new ErrorHandler("Seller account is suspended", 403));
  }

  next();
});

exports.isAdmin = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorHandler("Please login to continue", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler("You do not have permission to access this resource", 403)
      );
    }
    next();
  };
};

// Why this auth?
// This auth is for the user to login and get the token
// This token will be used to access the protected routes like create, update, delete, etc. (autharization)
