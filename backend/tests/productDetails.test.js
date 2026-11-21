const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Product = require("../model/product");
const Shop = require("../model/shop");
const router = require("../controller/product");
const errorMiddleware = require("../middleware/error");

const sellerId = "507f1f77bcf86cd799439011";
const otherSellerId = "507f1f77bcf86cd799439012";
const productId = "507f1f77bcf86cd799439013";
const originals = { findProduct: Product.findOne, findShop: Shop.findById, secret: process.env.JWT_SECRET };
let api, baseUrl, ownerCookie, otherCookie, customerCookie, product, queries;

before(async () => {
  process.env.JWT_SECRET = "product-preview-test-only-secret";
  ownerCookie = `seller_token=${jwt.sign({ id: sellerId }, process.env.JWT_SECRET)}`;
  otherCookie = `seller_token=${jwt.sign({ id: otherSellerId }, process.env.JWT_SECRET)}`;
  customerCookie = `token=${jwt.sign({ id: sellerId }, process.env.JWT_SECRET)}`;
  Shop.findById = async (id) => [sellerId, otherSellerId].includes(id)
    ? { id, _id: id, accountStatus: "active" } : null;
  Product.findOne = (query) => ({ select: async (projection) => {
    queries.push(query);
    assert.equal(projection, "-shop.password");
    if (query._id !== product._id) return null;
    if (query.shopId !== undefined && query.shopId !== product.shopId) return null;
    if (query.isActive && product.isActive === false) return null;
    if (query.$or && product.approvalStatus !== undefined && product.approvalStatus !== "approved") return null;
    return product;
  } });
  const app = express();
  app.use(cookieParser());
  app.use("/api/v2/product", router);
  app.use(errorMiddleware);
  api = http.createServer(app);
  await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${api.address().port}/api/v2/product`;
});

beforeEach(() => {
  product = { _id: productId, shopId: sellerId, name: "New pending product", approvalStatus: "pending", isActive: true };
  queries = [];
});

after(async () => {
  Product.findOne = originals.findProduct;
  Shop.findById = originals.findShop;
  if (originals.secret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originals.secret;
  await new Promise((resolve) => { api.close(resolve); api.closeAllConnections(); });
});

const get = async (endpoint, cookie, id = productId) => {
  const response = await fetch(`${baseUrl}/${endpoint}/${id}`, { headers: cookie ? { Cookie: cookie } : {} });
  return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie") };
};

test("owning seller can read pending, approved, rejected, and hidden products without clearing a cookie", async () => {
  for (const status of ["pending", "approved", "rejected"]) {
    product.approvalStatus = status;
    product.isActive = status !== "rejected";
    const result = await get("get-shop-product", ownerCookie);
    assert.equal(result.status, 200);
    assert.equal(result.data.product._id, productId);
    assert.equal(result.data.product.approvalStatus, status);
    assert.equal(result.cookie, null);
    assert.deepEqual(queries.at(-1), { _id: productId, shopId: sellerId });
  }
});

test("public detail loads approved active and legacy products using the public visibility filter", async () => {
  for (const status of ["approved", undefined]) {
    product.approvalStatus = status;
    const result = await get("get-product");
    assert.equal(result.status, 200);
    assert.equal(result.data.product._id, productId);
    assert.deepEqual(queries.at(-1), { _id: productId, isActive: { $ne: false },
      $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }] });
  }
});

test("public reads cannot expose pending, rejected, or hidden products even with an owner cookie", async () => {
  for (const cookie of [null, customerCookie, ownerCookie, otherCookie]) {
    for (const status of ["pending", "rejected", "approved"]) {
      product.approvalStatus = status;
      product.isActive = status !== "approved";
      const result = await get("get-product", cookie);
      assert.equal(result.status, 404);
      assert.equal(result.data.product, undefined);
    }
  }
});

test("anonymous, customer-only, and invalid seller cookies cannot use the owner read", async () => {
  for (const cookie of [null, customerCookie, "seller_token=invalid"]) {
    const result = await get("get-shop-product", cookie);
    assert.equal(result.status, 401);
    assert.equal(result.data.product, undefined);
  }
  assert.equal(queries.length, 0);
});

test("another seller cannot read another shop's product through the preview endpoint", async () => {
  const result = await get("get-shop-product", otherCookie);
  assert.equal(result.status, 404);
  assert.equal(result.data.product, undefined);
  assert.deepEqual(queries[0], { _id: productId, shopId: otherSellerId });
});

test("invalid and missing IDs produce controlled errors", async () => {
  for (const endpoint of ["get-product", "get-shop-product"]) {
    assert.equal((await get(endpoint, ownerCookie, "not-an-id")).status, 400);
    assert.equal((await get(endpoint, ownerCookie, "507f1f77bcf86cd799439099")).status, 404);
  }
});
