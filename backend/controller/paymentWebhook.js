const express = require("express");
const router = express.Router();
const Order = require("../model/order");
const getStripeClient = require("../utils/stripe");
const { createNotification } = require("../utils/notifications");

const appendStatusHistory = (order, status, changedBy) => {
  order.statusHistory = order.statusHistory || [];
  order.statusHistory.push({ status, changedBy });
};

const notifyPaymentUpdate = async (order, title, message, type) => {
  if (!order?.user?._id) {
    return;
  }

  await createNotification({
    recipientType: "user",
    recipientId: order.user._id.toString(),
    title,
    message,
    type,
    link: `/user/order/${order._id}`,
    metadata: { orderId: order._id.toString() },
  });
};

const handlePaymentSucceeded = async (paymentIntent) => {
  const orders = await Order.find({ "paymentInfo.id": paymentIntent.id });

  await Promise.all(
    orders.map(async (order) => {
      order.paymentInfo = {
        ...(order.paymentInfo || {}),
        id: paymentIntent.id,
        type: "Stripe",
        status: "Succeeded",
      };
      order.paidAt = order.paidAt || Date.now();

      if (order.status === "Pending") {
        order.status = "Processing";
        appendStatusHistory(order, "Processing", "stripe:webhook");
      }

      await order.save({ validateBeforeSave: false });
      await notifyPaymentUpdate(
        order,
        "Payment confirmed",
        `Your payment for order #${order._id.toString().slice(-8).toUpperCase()} has been confirmed.`,
        "payment_success"
      );
    })
  );
};

const handlePaymentFailed = async (paymentIntent) => {
  const orders = await Order.find({ "paymentInfo.id": paymentIntent.id });

  await Promise.all(
    orders.map(async (order) => {
      order.paymentInfo = {
        ...(order.paymentInfo || {}),
        id: paymentIntent.id,
        type: "Stripe",
        status: "Failed",
      };
      appendStatusHistory(order, order.status, "stripe:webhook");

      await order.save({ validateBeforeSave: false });
      await notifyPaymentUpdate(
        order,
        "Payment failed",
        `Payment failed for order #${order._id.toString().slice(-8).toUpperCase()}. Please try again or contact support.`,
        "payment_failed"
      );
    })
  );
};

router.post("/", async (req, res) => {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe) {
    return res.status(503).json({ received: false, message: "Stripe is not configured." });
  }

  if (!webhookSecret) {
    return res.status(200).json({ received: true, skipped: true });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      webhookSecret
    );
  } catch (error) {
    return res.status(400).json({ received: false, message: error.message });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      await handlePaymentSucceeded(event.data.object);
    }

    if (event.type === "payment_intent.payment_failed") {
      await handlePaymentFailed(event.data.object);
    }
  } catch (error) {
    return res.status(500).json({ received: false, message: error.message });
  }

  res.status(200).json({ received: true });
});

module.exports = router;
