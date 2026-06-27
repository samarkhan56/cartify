const express = require("express");
const router = express.Router();
const Notification = require("../model/notification");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");

const listNotifications = async (recipientType, recipientId, res) => {
  const notifications = await Notification.find({
    recipientType,
    recipientId: recipientId.toString(),
  })
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    recipientType,
    recipientId: recipientId.toString(),
    isRead: false,
  });

  res.status(200).json({
    success: true,
    notifications,
    unreadCount,
  });
};

const markAsRead = async (recipientType, recipientId, notificationId, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipientType,
      recipientId: recipientId.toString(),
    },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new ErrorHandler("Notification not found.", 404));
  }

  res.status(200).json({
    success: true,
    notification,
  });
};

const markAllAsRead = async (recipientType, recipientId, res) => {
  await Notification.updateMany(
    {
      recipientType,
      recipientId: recipientId.toString(),
      isRead: false,
    },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    unreadCount: 0,
  });
};

router.get(
  "/user",
  isAuthenticated,
  catchAsyncErrors(async (req, res) => {
    await listNotifications("user", req.user._id, res);
  })
);

router.get(
  "/seller",
  isSeller,
  catchAsyncErrors(async (req, res) => {
    await listNotifications("seller", req.seller._id, res);
  })
);

router.get(
  "/admin",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res) => {
    await listNotifications("admin", req.user._id, res);
  })
);

router.put(
  "/user/:id/read",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    await markAsRead("user", req.user._id, req.params.id, res, next);
  })
);

router.put(
  "/user/read-all",
  isAuthenticated,
  catchAsyncErrors(async (req, res) => {
    await markAllAsRead("user", req.user._id, res);
  })
);

router.put(
  "/seller/:id/read",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    await markAsRead("seller", req.seller._id, req.params.id, res, next);
  })
);

router.put(
  "/seller/read-all",
  isSeller,
  catchAsyncErrors(async (req, res) => {
    await markAllAsRead("seller", req.seller._id, res);
  })
);

router.put(
  "/admin/:id/read",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    await markAsRead("admin", req.user._id, req.params.id, res, next);
  })
);

router.put(
  "/admin/read-all",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res) => {
    await markAllAsRead("admin", req.user._id, res);
  })
);

module.exports = router;
