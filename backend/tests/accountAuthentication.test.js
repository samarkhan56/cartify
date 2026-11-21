const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const Shop = require("../model/shop");
const User = require("../model/user");
const shopRouter = require("../controller/shop");
const userRouter = require("../controller/user");
const errors = require("../middleware/error");

const password = "authentication-fixture-only";
const shopId = "507f1f77bcf86cd799439080";
const userId = "507f1f77bcf86cd799439081";
const original = { secret: process.env.JWT_SECRET, shopFind: Shop.findOne, shopId: Shop.findById, userFind: User.findOne, userId: User.findById };
let seller, customer, server, base, sellerHash, customerHash;

before(async () => {
  process.env.JWT_SECRET = "isolated-account-authentication-fixture-secret";
  sellerHash = await bcrypt.hash(password, 10); customerHash = await bcrypt.hash(password, 10);
  seller = new Shop({ _id: shopId, name: "Urban Harbor Finds", email: "seller-fixture@example.invalid",
    password: sellerHash, address: "Fixture address", phoneNumber: "03000000000", zipCode: "54000", verificationStatus: "pending", accountStatus: "active" });
  customer = new User({ _id: userId, name: "Fixture customer", email: "customer-fixture@example.invalid", password: customerHash, avatar: "default-avatar.png" });
  Shop.findOne = (query) => ({ select: async () => query.email === seller.email ? seller : null });
  User.findOne = (query) => ({ select: async () => query.email === customer.email ? customer : null });
  Shop.findById = async (id) => String(id) === shopId ? seller : null;
  User.findById = async (id) => String(id) === userId ? customer : null;
  const app = express(); app.use(express.json()); app.use(cookieParser());
  app.use("/shop", shopRouter); app.use("/user", userRouter); app.use(errors);
  server = http.createServer(app); await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  Shop.findOne = original.shopFind; Shop.findById = original.shopId; User.findOne = original.userFind; User.findById = original.userId;
  if (original.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original.secret;
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
});
const login = (kind, body) => fetch(base + (kind === "seller" ? "/shop/login-shop" : "/user/login-user"), {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const cookie = (response) => response.headers.get("set-cookie").split(";")[0];

test("a normal pending seller can log in and load their session without gaining approval or changing the public shop name", async () => {
  const response = await login("seller", { email: seller.email, password });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).success, true);
  const session = await fetch(base + "/shop/getSeller", { headers: { Cookie: cookie(response) } });
  const body = await session.json();
  assert.equal(session.status, 200); assert.equal(body.seller.name, "Urban Harbor Finds");
  assert.equal(body.seller.verificationStatus, "pending"); assert.equal(body.seller.isVerified, false);
  assert.equal(seller.password, sellerHash);
});

test("a normal customer can log in with the existing bcrypt comparison and load their session", async () => {
  const response = await login("customer", { email: customer.email, password });
  assert.equal(response.status, 201);
  const session = await fetch(base + "/user/getuser", { headers: { Cookie: cookie(response) } });
  assert.equal(session.status, 200); assert.equal((await session.json()).user._id, userId);
  assert.equal(customer.password, customerHash);
});

test("incorrect passwords fail for both roles without issuing a session or resetting hashes", async () => {
  for (const [kind, account] of [["seller", seller], ["customer", customer]]) {
    const response = await login(kind, { email: account.email, password: "incorrect-fixture-value" });
    assert.equal(response.status, 400); assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.equal(seller.password, sellerHash); assert.equal(customer.password, customerHash);
});

test("suspended seller protection remains enforced even when credentials match", async () => {
  seller.accountStatus = "suspended";
  try {
    const response = await login("seller", { email: seller.email, password });
    assert.equal(response.status, 403); assert.equal(response.headers.get("set-cookie"), null);
  } finally { seller.accountStatus = "active"; }
});

test("unknown accounts cannot log in as either role", async () => {
  for (const kind of ["seller", "customer"]) {
    const response = await login(kind, { email: "unknown@example.invalid", password });
    assert.equal(response.status, 400); assert.equal(response.headers.get("set-cookie"), null);
  }
});

test("customer and seller session endpoints still reject missing authentication", async () => {
  for (const endpoint of ["/shop/getSeller", "/user/getuser"])
    assert.equal((await fetch(base + endpoint)).status, 401);
});
