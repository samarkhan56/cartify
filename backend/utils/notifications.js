const Notification = require("../model/notification");
const User = require("../model/user");

const createNotification = async ({
  recipientType,
  recipientId,
  title,
  message,
  type = "general",
  link,
  metadata,
}) => {
  if (!recipientType || !recipientId || !title || !message) {
    return null;
  }

  return Notification.create({
    recipientType,
    recipientId,
    title,
    message,
    type,
    link,
    metadata,
  });
};

const notifyAdmins = async ({ title, message, type = "admin", link, metadata }) => {
  const admins = await User.find({ role: "Admin" }).select("_id");

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        recipientType: "admin",
        recipientId: admin._id.toString(),
        title,
        message,
        type,
        link,
        metadata,
      })
    )
  );
};

module.exports = {
  createNotification,
  notifyAdmins,
};
