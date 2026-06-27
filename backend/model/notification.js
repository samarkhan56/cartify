const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipientType: {
    type: String,
    enum: ["user", "seller", "admin"],
    required: true,
  },
  recipientId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: "general",
  },
  link: {
    type: String,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: Object,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
