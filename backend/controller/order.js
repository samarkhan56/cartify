const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
const CoupounCode = require("../model/coupounCode");
const getStripeClient = require("../utils/stripe");
const sendMail = require("../utils/sendMail");
const { createNotification, notifyAdmins } = require("../utils/notifications");

const PLATFORM_FEE_RATE = 0.1;
const SHIPPING_RATE = 0.1;
const REFUND_STATUSES = ["Processing refund", "Refund Success", "Refund Rejected"];
const ORDER_STATUS_FLOW = [
  "Pending",
  "Processing",
  "Transferred to delivery partner",
  "Shipping",
  "Received",
  "On the way",
  "Delivered",
];

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const getPaymentType = (requestedPaymentType) => {
  const paymentTypeMap = {
    "Cash On Delivery": "Cash On Delivery",
    "Credit Card": "Stripe",
    Stripe: "Stripe",
  };

  return paymentTypeMap[requestedPaymentType];
};

const getProductPrice = (product) => {
  const discountPrice = Number(product.discountPrice);
  const originalPrice = Number(product.originalPrice);

  return Number.isFinite(discountPrice) && discountPrice > 0
    ? discountPrice
    : originalPrice;
};

const validateShippingAddress = (shippingAddress) => {
  const requiredFields = [
    "fullName",
    "email",
    "phoneNumber",
    "address1",
    "zipCode",
    "country",
    "city",
  ];

  return requiredFields.every((field) =>
    String(shippingAddress?.[field] || "").trim()
  );
};

const buildOrderItems = async (cart) => {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new ErrorHandler("Your cart is empty.", 400);
  }

  const productIds = cart.map((item) => item._id).filter(Boolean);

  if (productIds.length !== cart.length) {
    throw new ErrorHandler("One or more cart items are invalid.", 400);
  }

  const products = await Product.find({ _id: { $in: productIds } });
  const productsById = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  return cart.map((item) => {
    const product = productsById.get(String(item._id));
    const qty = Number(item.qty);

    if (!product) {
      throw new ErrorHandler(
        `${item.name || "A product"} is no longer available.`,
        404
      );
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ErrorHandler(`Invalid quantity for ${product.name}.`, 400);
    }

    if (product.stock < qty) {
      throw new ErrorHandler(
        `${product.name} has only ${product.stock} item(s) in stock.`,
        400
      );
    }

    const unitPrice = roundMoney(getProductPrice(product));

    return {
      _id: product._id.toString(),
      name: product.name,
      description: product.description,
      category: product.category,
      images: product.images,
      shopId: product.shopId,
      shop: product.shop,
      originalPrice: product.originalPrice,
      discountPrice: unitPrice,
      qty,
      isReviewed: Boolean(item.isReviewed),
      lineTotal: roundMoney(unitPrice * qty),
    };
  });
};

const getCouponDiscountsByShop = async (couponCode, orderItems) => {
  if (!couponCode) {
    return new Map();
  }

  const coupon = await CoupounCode.findOne({ name: couponCode });
  if (!coupon) {
    throw new ErrorHandler("Coupon code does not exist.", 400);
  }

  const eligibleItems = orderItems.filter(
    (item) => String(item.shopId) === String(coupon.shopId)
  );

  if (eligibleItems.length === 0) {
    throw new ErrorHandler("Coupon code is not valid for these products.", 400);
  }

  const eligibleSubtotal = roundMoney(
    eligibleItems.reduce((total, item) => total + item.lineTotal, 0)
  );

  if (coupon.minAmount && eligibleSubtotal < Number(coupon.minAmount)) {
    throw new ErrorHandler(
      `Coupon requires a minimum order of $${Number(coupon.minAmount).toFixed(2)}.`,
      400
    );
  }

  let discount = roundMoney((eligibleSubtotal * Number(coupon.value || 0)) / 100);

  if (coupon.maxAmount) {
    discount = Math.min(discount, Number(coupon.maxAmount));
  }

  return new Map([[String(coupon.shopId), roundMoney(discount)]]);
};

const groupItemsByShop = (orderItems, discountsByShop) => {
  const shopItemsMap = new Map();

  for (const item of orderItems) {
    if (!shopItemsMap.has(item.shopId)) {
      shopItemsMap.set(item.shopId, []);
    }
    shopItemsMap.get(item.shopId).push(item);
  }

  return Array.from(shopItemsMap.entries()).map(([shopId, items]) => {
    const subTotalPrice = roundMoney(
      items.reduce((total, item) => total + item.lineTotal, 0)
    );
    const shippingPrice = roundMoney(subTotalPrice * SHIPPING_RATE);
    const discountPrice = roundMoney(discountsByShop.get(String(shopId)) || 0);
    const totalPrice = roundMoney(
      Math.max(subTotalPrice + shippingPrice - discountPrice, 0)
    );

    return {
      shopId,
      items,
      subTotalPrice,
      shippingPrice,
      discountPrice,
      totalPrice,
      platformFee: roundMoney(totalPrice * PLATFORM_FEE_RATE),
    };
  });
};

const verifyStripePayment = async (paymentInfo, expectedTotal) => {
  const stripe = getStripeClient();

  if (!stripe) {
    throw new ErrorHandler(
      "Stripe is currently unavailable. Please choose another payment method.",
      503
    );
  }

  let paymentIntent;

  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentInfo.id);
  } catch (error) {
    if (error?.type === "StripeAuthenticationError") {
      throw new ErrorHandler(
        "Stripe is not configured correctly. Replace the expired test API keys and restart the backend.",
        503
      );
    }

    throw error;
  }

  if (paymentIntent.status !== "succeeded") {
    throw new ErrorHandler("Stripe payment was not completed.", 400);
  }

  const paidAmount = paymentIntent.amount_received || paymentIntent.amount;
  const expectedAmount = Math.round(roundMoney(expectedTotal) * 100);

  if (paidAmount !== expectedAmount) {
    throw new ErrorHandler(
      "Payment amount does not match the current order total.",
      400
    );
  }
};

const reserveStock = async (items) => {
  for (const item of items) {
    await Product.updateOne(
      { _id: item._id, stock: { $gte: item.qty } },
      {
        $inc: {
          stock: -item.qty,
          sold_out: item.qty,
        },
      }
    );
  }
};

const returnStock = async (items) => {
  for (const item of items) {
    await Product.updateOne(
      { _id: item._id },
      {
        $inc: {
          stock: item.qty,
          sold_out: -item.qty,
        },
      }
    );
  }
};

const assertSellerOwnsOrder = (order, sellerId) => {
  const hasSellerItem = order.cart.some(
    (item) => String(item.shopId) === String(sellerId)
  );

  if (!hasSellerItem) {
    throw new ErrorHandler("You are not allowed to update this order.", 403);
  }
};

const validateStatusTransition = (currentStatus, nextStatus) => {
  if (REFUND_STATUSES.includes(currentStatus)) {
    return REFUND_STATUSES.includes(nextStatus);
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);
  const nextIndex = ORDER_STATUS_FLOW.indexOf(nextStatus);

  return currentIndex !== -1 && nextIndex !== -1 && nextIndex >= currentIndex;
};

const getOrderNumber = (order) => `#${order._id.toString().slice(-8).toUpperCase()}`;

const runSafely = async (task, label) => {
  try {
    await task();
  } catch (error) {
    console.log(`${label} skipped: ${error.message}`);
  }
};

const sendOrderConfirmationEmail = async (orders) => {
  const firstOrder = orders[0];
  const email = firstOrder?.shippingAddress?.email || firstOrder?.user?.email;

  if (!email) {
    return;
  }

  const orderNumbers = orders.map(getOrderNumber).join(", ");
  const total = roundMoney(
    orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)
  );

  await sendMail({
    email,
    subject: `Cartify order confirmation ${orderNumbers}`,
    message: `Your Cartify order ${orderNumbers} has been placed successfully. Total: $${total.toFixed(2)}.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Thank you for your order!</h2>
        <p>Your Cartify order <strong>${orderNumbers}</strong> has been placed successfully.</p>
        <p><strong>Total:</strong> $${total.toFixed(2)}</p>
        <p>You can track the order status from your Cartify profile.</p>
      </div>
    `,
  });
};

const notifyOrderCreated = async (orders) => {
  const firstOrder = orders[0];
  const orderNumbers = orders.map(getOrderNumber).join(", ");
  const total = roundMoney(
    orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)
  );

  await createNotification({
    recipientType: "user",
    recipientId: firstOrder.user._id.toString(),
    title: "Order placed",
    message: `Your order ${orderNumbers} has been placed successfully.`,
    type: "order_created",
    link: "/profile",
    metadata: { orderIds: orders.map((order) => order._id.toString()), total },
  });

  await Promise.all(
    orders.map((order) =>
      createNotification({
        recipientType: "seller",
        recipientId: order.cart[0].shopId.toString(),
        title: "New order received",
        message: `A customer placed order ${getOrderNumber(order)} for $${Number(order.totalPrice || 0).toFixed(2)}.`,
        type: "seller_order_created",
        link: `/order/${order._id}`,
        metadata: { orderId: order._id.toString() },
      })
    )
  );

  await notifyAdmins({
    title: "New order placed",
    message: `Order ${orderNumbers} was placed for $${total.toFixed(2)}.`,
    type: "admin_order_created",
    link: "/admin-orders",
    metadata: { orderIds: orders.map((order) => order._id.toString()), total },
  });
};

const notifyUserOrderStatus = async (order, title, message, type) => {
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
    metadata: { orderId: order._id.toString(), status: order.status },
  });
};

const notifyRefundRequested = async (order) => {
  const orderNumber = getOrderNumber(order);

  await createNotification({
    recipientType: "seller",
    recipientId: order.cart[0].shopId.toString(),
    title: "Refund requested",
    message: `A customer requested a refund for order ${orderNumber}.`,
    type: "refund_requested",
    link: `/order/${order._id}`,
    metadata: { orderId: order._id.toString() },
  });

  await notifyAdmins({
    title: "Refund requested",
    message: `Refund requested for order ${orderNumber}.`,
    type: "admin_refund_requested",
    link: "/admin-orders",
    metadata: { orderId: order._id.toString() },
  });
};

const notifyRefundResolved = async (order) => {
  const orderNumber = getOrderNumber(order);
  const isApproved = order.status === "Refund Success";

  await notifyUserOrderStatus(
    order,
    isApproved ? "Refund completed" : "Refund request rejected",
    isApproved
      ? `Your refund for order ${orderNumber} has been completed.`
      : `Your refund request for order ${orderNumber} was rejected.`,
    isApproved ? "refund_success" : "refund_rejected"
  );

  await createNotification({
    recipientType: "seller",
    recipientId: order.cart[0].shopId.toString(),
    title: isApproved ? "Refund completed" : "Refund rejected",
    message: isApproved
      ? `Refund for order ${orderNumber} has been completed.`
      : `Refund request for order ${orderNumber} was rejected.`,
    type: isApproved ? "seller_refund_success" : "seller_refund_rejected",
    link: `/order/${order._id}`,
    metadata: { orderId: order._id.toString(), status: order.status },
  });
};

const resolveRefund = async (order, nextStatus, actor, note = "") => {
  const previousStatus = order.status;

  if (!["Refund Success", "Refund Rejected"].includes(nextStatus)) {
    throw new ErrorHandler("Invalid refund resolution status.", 400);
  }

  if (!REFUND_STATUSES.includes(previousStatus)) {
    throw new ErrorHandler("This order does not have an active refund request.", 400);
  }

  if (previousStatus === "Refund Success" && nextStatus === "Refund Success") {
    throw new ErrorHandler("This refund has already been completed.", 400);
  }

  if (previousStatus === "Refund Rejected") {
    throw new ErrorHandler("This refund request has already been rejected.", 400);
  }

  order.status = nextStatus;
  order.refundInfo = {
    ...(order.refundInfo || {}),
    status: nextStatus,
    resolvedAt: Date.now(),
    resolvedBy: actor,
    note,
  };
  order.statusHistory.push({
    status: nextStatus,
    changedBy: actor,
  });

  if (nextStatus === "Refund Success") {
    await returnStock(order.cart);
    order.paymentInfo = {
      ...(order.paymentInfo || {}),
      status: "Refunded",
    };
  }

  await order.save({ validateBeforeSave: false });
};

// create new order
router.post(
  "/create-order",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const { cart, shippingAddress, user, paymentInfo, couponCode } = req.body;
    const paymentType = getPaymentType(paymentInfo?.type);

    if (!paymentType) {
      return next(new ErrorHandler("Invalid payment method selected.", 400));
    }

    if (!validateShippingAddress(shippingAddress)) {
      return next(new ErrorHandler("Please provide a complete shipping address.", 400));
    }

    if (!user?._id) {
      return next(new ErrorHandler("Please login before placing an order.", 401));
    }

    if (String(user._id) !== String(req.user.id)) {
      return next(new ErrorHandler("You are not allowed to place this order.", 403));
    }

    const isOnlinePayment = paymentType === "Stripe";
    if (isOnlinePayment && !paymentInfo?.id) {
      return next(new ErrorHandler("Payment transaction id is required.", 400));
    }

    try {
      const orderItems = await buildOrderItems(cart);
      const discountsByShop = await getCouponDiscountsByShop(
        couponCode,
        orderItems
      );
      const shopOrders = groupItemsByShop(orderItems, discountsByShop);
      const grandTotal = roundMoney(
        shopOrders.reduce((total, order) => total + order.totalPrice, 0)
      );

      if (isOnlinePayment) {
        await verifyStripePayment(paymentInfo, grandTotal);
      }

      await reserveStock(orderItems);

      const normalizedPaymentInfo = isOnlinePayment
        ? {
            id: paymentInfo.id,
            status: "Succeeded",
            type: "Stripe",
          }
        : {
            type: "Cash On Delivery",
            status: "Pending",
          };

      const orderStatus = isOnlinePayment ? "Processing" : "Pending";
      const paidAt = isOnlinePayment ? Date.now() : null;

      const orders = await Promise.all(
        shopOrders.map((shopOrder) =>
          Order.create({
            cart: shopOrder.items,
            shippingAddress,
            user,
            totalPrice: shopOrder.totalPrice,
            subTotalPrice: shopOrder.subTotalPrice,
            shippingPrice: shopOrder.shippingPrice,
            discountPrice: shopOrder.discountPrice,
            platformFee: shopOrder.platformFee,
            paymentInfo: normalizedPaymentInfo,
            status: orderStatus,
            paidAt,
            stockUpdatedAt: Date.now(),
            statusHistory: [
              {
                status: orderStatus,
                changedBy: "customer",
              },
            ],
          })
        )
      );

      await runSafely(
        () => notifyOrderCreated(orders),
        "Order notification"
      );
      await runSafely(
        () => sendOrderConfirmationEmail(orders),
        "Order confirmation email"
      );

      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(error);
    }
  })
);

// get all orders of user
router.get(
  "/get-all-orders/:userId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      if (String(req.user.id) !== String(req.params.userId)) {
        return next(new ErrorHandler("You are not allowed to view these orders.", 403));
      }

      const orders = await Order.find({ "user._id": req.params.userId }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all orders of seller
router.get(
  "/get-seller-all-orders/:shopId",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      if (String(req.seller.id) !== String(req.params.shopId)) {
        return next(new ErrorHandler("You are not allowed to view these orders.", 403));
      }

      const orders = await Order.find({
        "cart.shopId": req.params.shopId,
      }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update order status for seller
router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorHandler("Order not found with this id", 404));
    }

    assertSellerOwnsOrder(order, req.seller.id);

    if (!validateStatusTransition(order.status, req.body.status)) {
      return next(new ErrorHandler("Invalid order status update.", 400));
    }

    order.status = req.body.status;
    order.statusHistory.push({
      status: req.body.status,
      changedBy: `seller:${req.seller.id}`,
    });

    if (req.body.status === "Delivered") {
      order.deliveredAt = Date.now();

      if (order.paymentInfo?.type === "Cash On Delivery") {
        order.paymentInfo.status = "Succeeded";
        order.paidAt = Date.now();
      }

      const seller = await Shop.findById(req.seller.id);
      if (seller) {
        seller.availableBalance =
          Number(seller.availableBalance || 0) +
          roundMoney(order.totalPrice - order.platformFee);
        await seller.save();
      }
    }

    await order.save({ validateBeforeSave: false });

    await runSafely(
      () =>
        notifyUserOrderStatus(
          order,
          "Order status updated",
          `Your order ${getOrderNumber(order)} is now ${order.status}.`,
          "order_status_updated"
        ),
      "Order status notification"
    );

    res.status(200).json({
      success: true,
      order,
    });
  })
);

// give a refund ----- user
router.put(
  "/order-refund/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorHandler("Order not found with this id", 404));
    }

    if (String(order.user?._id) !== String(req.user.id)) {
      return next(new ErrorHandler("You are not allowed to refund this order.", 403));
    }

    if (order.status !== "Delivered") {
      return next(
        new ErrorHandler("Refunds can only be requested after delivery.", 400)
      );
    }

    order.status = "Processing refund";
    order.refundInfo = {
      status: "Processing refund",
      requestedAt: Date.now(),
    };
    order.statusHistory.push({
      status: "Processing refund",
      changedBy: "customer",
    });

    await order.save({ validateBeforeSave: false });

    await runSafely(
      () => notifyRefundRequested(order),
      "Refund request notification"
    );

    res.status(200).json({
      success: true,
      order,
      message: "Refund request submitted successfully!",
    });
  })
);

// accept the refund ---- seller
router.put(
  "/order-refund-success/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorHandler("Order not found with this id", 404));
    }

    assertSellerOwnsOrder(order, req.seller.id);

    if (req.body.status !== "Refund Success") {
      return next(new ErrorHandler("Seller can only complete approved refunds.", 403));
    }

    if (!validateStatusTransition(order.status, req.body.status)) {
      return next(new ErrorHandler("Invalid refund status update.", 400));
    }

    await resolveRefund(
      order,
      req.body.status,
      `seller:${req.seller.id}`,
      req.body.note
    );

    await runSafely(
      () => notifyRefundResolved(order),
      "Refund resolution notification"
    );

    res.status(200).json({
      success: true,
      order,
      message: "Refund status updated successfully!",
    });
  })
);

// resolve refund request --- admin
router.put(
  "/admin-refund-status/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorHandler("Order not found with this id", 404));
    }

    await resolveRefund(
      order,
      req.body.status,
      `admin:${req.user.id}`,
      req.body.note
    );

    await runSafely(
      () => notifyRefundResolved(order),
      "Refund resolution notification"
    );

    res.status(200).json({
      success: true,
      order,
      message: "Refund request updated successfully!",
    });
  })
);

// all orders --- for admin
router.get(
  "/admin-all-orders",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find().sort({
        deliveredAt: -1,
        createdAt: -1,
      });
      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
