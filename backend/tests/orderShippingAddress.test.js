const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Order = require("../model/order");
const User = require("../model/user");
const Product = require("../model/product");
const Notification = require("../model/notification");

// Exercise the real controllers/schema without sending email or touching live data.
const mailPath = require.resolve("../utils/sendMail");
const originalMail = require(mailPath);
require.cache[mailPath].exports = async () => ({ skipped: true });
const orderRouter = require("../controller/order");
const userRouter = require("../controller/user");
require.cache[mailPath].exports = originalMail;
const errorMiddleware = require("../middleware/error");

const userId = "507f1f77bcf86cd799439011";
const shopId = "507f1f77bcf86cd799439012";
const productId = "507f1f77bcf86cd799439013";
const address = { fullName: "Demo Customer", email: "demo@example.com", phoneNumber: "+923001234567",
  country: "Pakistan", state: "Punjab", city: "Lahore", zipCode: "054000", address1: "12 Demo Street" };
const original = { create: Order.create, find: Order.find, findUser: User.findById, findUsers: User.find,
  findProducts: Product.find, updateProduct: Product.updateOne, notify: Notification.create, secret: process.env.JWT_SECRET };
let api, baseUrl, cookie, customer, records, stockUpdates, products;

before(async () => {
  process.env.JWT_SECRET = "shipping-snapshot-test-only-secret";
  cookie = `token=${jwt.sign({ id: userId }, process.env.JWT_SECRET)}`;
  User.findById = async (id) => id === userId ? customer : null;
  User.find = () => ({ select: async () => [] });
  Notification.create = async (data) => data;
  Product.find = async () => products;
  Product.updateOne = async () => { stockUpdates++; return { modifiedCount: 1 }; };
  Order.create = async (data) => {
    const document = new Order(data);
    await document.validate();
    records.push(JSON.parse(JSON.stringify(document)));
    return document;
  };
  Order.find = (query) => ({ sort: async () => records.filter((order) => order.user._id === query["user._id"]) });
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/v2/order", orderRouter);
  app.use("/api/v2/user", userRouter);
  app.use(errorMiddleware);
  api = http.createServer(app);
  await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${api.address().port}/api/v2`;
});

beforeEach(() => {
  records = [];
  stockUpdates = 0;
  customer = { id: userId, _id: userId, name: "Demo Customer", email: "demo@example.com",
    addresses: [{ _id: "old-address", addressType: "Home", ...address }], save: async () => {} };
  products = [{ _id: productId, shopId, name: "Demo product", category: "Mobile and Tablets",
    subcategory: "Mobile Phones", productType: "smartphone",
    stock: 10, discountPrice: 100, originalPrice: 120, images: ["demo.png"] }];
});

after(async () => {
  Order.create = original.create;
  Order.find = original.find;
  User.findById = original.findUser;
  User.find = original.findUsers;
  Product.find = original.findProducts;
  Product.updateOne = original.updateProduct;
  Notification.create = original.notify;
  if (original.secret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = original.secret;
  await new Promise((resolve) => { api.close(resolve); api.closeAllConnections(); });
});

const request = async (route, method = "GET", body, auth = cookie) => {
  const response = await fetch(`${baseUrl}${route}`, { method,
    headers: { "Content-Type": "application/json", ...(auth ? { Cookie: auth } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
};
const placeOrder = (shippingAddress = address, cart = [{ _id: productId, qty: 2 }]) =>
  request("/order/create-order", "POST", { cart, shippingAddress, user: { _id: userId },
    paymentInfo: { type: "Cash On Delivery" } });

test("COD creation stores typed, trimmed shipping fields and preserves postal leading zeros", async () => {
  const result = await placeOrder({ ...address, country: " Pakistan ", state: " Punjab ", city: " Lahore " });
  assert.equal(result.status, 201);
  assert.deepEqual(records[0].shippingAddress, { ...address, address2: "" });
  assert.equal(records[0].totalPrice, 220);
  assert.equal(records[0].subTotalPrice, 200);
  assert.equal(records[0].shippingPrice, 20);
  assert.equal(records[0].platformFee, 22);
  assert.equal(records[0].cart[0].qty, 2);
  assert.equal(records[0].cart[0].subcategory, "Mobile Phones");
  assert.equal(records[0].cart[0].productType, "smartphone");
  assert.equal(stockUpdates, 1);
});

test("each seller order receives its own complete shipping snapshot", async () => {
  const secondId = "507f1f77bcf86cd799439014";
  products.push({ ...products[0], _id: secondId, shopId: "507f1f77bcf86cd799439015" });
  const result = await placeOrder({ ...address, address2: "Apartment 4" },
    [{ _id: productId, qty: 1 }, { _id: secondId, qty: 1 }]);
  assert.equal(result.status, 201);
  assert.equal(records.length, 2);
  for (const record of records) assert.deepEqual(record.shippingAddress, { ...address, address2: "Apartment 4" });
  assert.notEqual(records[0].shippingAddress, records[1].shippingAddress);
});

test("missing, blank, whitespace, and structured required values cannot create orders or reserve stock", async () => {
  for (const field of ["country", "state", "city", "zipCode", "address1", "fullName", "email", "phoneNumber"]) {
    for (const invalid of [undefined, "", " \t ", null, {}, []]) {
      const result = await placeOrder({ ...address, [field]: invalid });
      assert.equal(result.status, 400, `${field}: ${JSON.stringify(invalid)}`);
    }
  }
  assert.equal(records.length, 0);
  assert.equal(stockUpdates, 0);
});

test("existing numeric phone/postal clients remain supported when state is supplied", async () => {
  const result = await placeOrder({ ...address, phoneNumber: 3001234567, zipCode: 54000 });
  assert.equal(result.status, 201);
  assert.equal(records[0].shippingAddress.zipCode, "54000");
  assert.equal(records[0].shippingAddress.phoneNumber, "3001234567");
});

test("changing a profile address through its API does not modify a previously created order", async () => {
  await placeOrder();
  const snapshot = JSON.stringify(records[0].shippingAddress);
  const updated = await request("/user/update-user-addresses", "PUT", { _id: "old-address",
    addressType: "Office", country: "Pakistan", state: "Islamabad Capital Territory", city: "Islamabad",
    zipCode: "44000", address1: "New address", address2: "" });
  assert.equal(updated.status, 200);
  assert.equal(customer.addresses[0].city, "Islamabad");
  const history = await request(`/order/get-all-orders/${userId}`);
  assert.equal(history.status, 200);
  assert.equal(JSON.stringify(history.data.orders[0].shippingAddress), snapshot);
  assert.equal(history.data.orders[0].shippingAddress.city, "Lahore");
  assert.equal(history.data.orders[0].shippingAddress.state, "Punjab");
});

test("legacy orders without state can hydrate, validate, and load without rewriting their historical location", async () => {
  await placeOrder();
  delete records[0].shippingAddress.state;
  const legacy = Order.hydrate(records[0]);
  legacy.status = "Delivered";
  await legacy.validate();
  assert.equal(legacy.shippingAddress.state, undefined);
  const history = await request(`/order/get-all-orders/${userId}`);
  assert.equal(history.status, 200);
  assert.equal(history.data.orders[0].shippingAddress.city, "Lahore");
  assert.equal(history.data.orders[0].shippingAddress.state, undefined);
});

test("the schema independently rejects new orders without state", async () => {
  const { state, ...legacyAddress } = address;
  const order = new Order({ cart: [], shippingAddress: legacyAddress, user: { _id: userId }, totalPrice: 100 });
  await assert.rejects(order.validate(), (error) => Boolean(error.errors["shippingAddress.state"]));
});

test("customer authentication is still required", async () => {
  const result = await request("/order/create-order", "POST", { shippingAddress: address }, null);
  assert.equal(result.status, 401);
  assert.equal(records.length, 0);
});
