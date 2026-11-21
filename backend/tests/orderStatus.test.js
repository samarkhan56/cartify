const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Notification = require("../model/notification");
const router = require("../controller/order");
const errorMiddleware = require("../middleware/error");

const sellerId = "507f1f77bcf86cd799439011";
const orderId = "507f1f77bcf86cd799439012";
const originals = { findOrder: Order.findById, findShop: Shop.findById, createNotification: Notification.create };
const originalSecret = process.env.JWT_SECRET;
let api, url, cookie, order, seller, sellerSaves, orderSaves;

before(async () => {
  process.env.JWT_SECRET = "local-order-status-test-only-secret";
  cookie = `seller_token=${jwt.sign({ id: sellerId }, process.env.JWT_SECRET)}`;
  Order.findById = async (id) => id === orderId ? order : null;
  Shop.findById = async (id) => id === sellerId ? seller : null;
  Notification.create = async (data) => data;
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/v2/order", router);
  app.use(errorMiddleware);
  api = http.createServer(app);
  await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${api.address().port}/api/v2/order/update-order-status/${orderId}`;
});

beforeEach(() => {
  sellerSaves = 0;
  orderSaves = 0;
  seller = { id: sellerId, _id: sellerId, availableBalance: 25, accountStatus: "active",
    save: async () => { sellerSaves++; } };
  order = { _id: orderId, status: "On the way", statusHistory: [],
    cart: [{ shopId: sellerId }], user: { _id: "507f1f77bcf86cd799439013" },
    totalPrice: 110, platformFee: 10,
    paymentInfo: { type: "Cash On Delivery", status: "Pending" },
    save: async () => { orderSaves++; } };
});

after(async () => {
  Order.findById = originals.findOrder;
  Shop.findById = originals.findShop;
  Notification.create = originals.createNotification;
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  await new Promise((resolve) => {
    api.close(resolve);
    api.closeAllConnections();
  });
});

const updateStatus = async (status, auth = cookie) => {
  const response = await fetch(url, { method: "PUT",
    headers: { "Content-Type": "application/json", ...(auth ? { Cookie: auth } : {}) },
    body: JSON.stringify({ status }) });
  return { status: response.status, data: await response.json() };
};

test("first transition to Delivered credits net seller earnings and marks COD paid", async () => {
  const result = await updateStatus("Delivered");
  assert.equal(result.status, 200);
  assert.equal(result.data.order.status, "Delivered");
  assert.equal(seller.availableBalance, 125);
  assert.equal(sellerSaves, 1);
  assert.equal(orderSaves, 1);
  assert.equal(order.paymentInfo.status, "Succeeded");
  assert.ok(order.deliveredAt);
  assert.ok(order.paidAt);
});

test("repeating Delivered after delivery never credits again or rewrites delivery/payment times", async () => {
  await updateStatus("Delivered");
  const deliveredAt = order.deliveredAt;
  const paidAt = order.paidAt;
  const result = await updateStatus("Delivered");
  assert.equal(result.status, 200);
  assert.equal(result.data.success, true);
  assert.equal(seller.availableBalance, 125);
  assert.equal(sellerSaves, 1);
  assert.equal(order.deliveredAt, deliveredAt);
  assert.equal(order.paidAt, paidAt);
});

test("an existing Delivered order is not credited again", async () => {
  order.status = "Delivered";
  order.deliveredAt = 1000;
  order.paidAt = 1000;
  order.paymentInfo.status = "Succeeded";
  const result = await updateStatus("Delivered");
  assert.equal(result.status, 200);
  assert.equal(seller.availableBalance, 25);
  assert.equal(sellerSaves, 0);
  assert.equal(order.deliveredAt, 1000);
});

test("valid non-delivery transitions still save without crediting the seller", async () => {
  order.status = "Pending";
  const result = await updateStatus("Processing");
  assert.equal(result.status, 200);
  assert.equal(order.status, "Processing");
  assert.equal(order.statusHistory[0].status, "Processing");
  assert.equal(orderSaves, 1);
  assert.equal(sellerSaves, 0);
  assert.equal(seller.availableBalance, 25);
});

test("backward order transitions remain rejected", async () => {
  order.status = "Delivered";
  const result = await updateStatus("Processing");
  assert.equal(result.status, 400);
  assert.equal(order.status, "Delivered");
  assert.equal(orderSaves, 0);
  assert.equal(sellerSaves, 0);
});

test("seller ownership remains required", async () => {
  order.cart = [{ shopId: "another-seller" }];
  const result = await updateStatus("Delivered");
  assert.equal(result.status, 403);
  assert.equal(orderSaves, 0);
  assert.equal(sellerSaves, 0);
});

test("seller authentication remains required", async () => {
  const result = await updateStatus("Delivered", null);
  assert.equal(result.status, 401);
  assert.equal(orderSaves, 0);
  assert.equal(sellerSaves, 0);
});
