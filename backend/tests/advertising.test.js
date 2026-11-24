const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");
const { Types } = require("mongoose");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Order = require("../model/order");
const Product = require("../model/product");
const Shop = require("../model/shop");
const { categoryMappings, mapCategory, modelConfig } = require("../config/advertising");
const { buildMarketplaceHistory, normalizeRegion, loadMarketplaceHistory } = require("../services/advertisingFeatures");
const { createAdvertisingRouter } = require("../controller/advertising");
const { scoreCandidates } = require("../utils/adMlClient");
const errorMiddleware = require("../middleware/error");

const now = new Date("2026-11-19T12:00:00Z");
const sellerId = "507f1f77bcf86cd799439011";
const otherId = "507f1f77bcf86cd799439012";
const productId = "507f1f77bcf86cd799439013";
const region = { city: "Lahore", state: "Punjab", country: "Pakistan" };
const karachi = { city: "Karachi", state: "Sindh", country: "Pakistan" };
const phone = categoryMappings.find((mapping) => mapping.productType === "smartphone");
const laptop = categoryMappings.find((mapping) => mapping.productType === "laptop");
const cookware = categoryMappings.find((mapping) => mapping.productType === "cookware");
const line = (mapping = phone, qty = 1, price = 10) => ({ category: mapping.category,
  subcategory: mapping.subcategory, productType: mapping.productType, _id: productId,
  shopId: otherId, qty, discountPrice: price, originalPrice: 9999, lineTotal: qty * price });
const order = (id, month, user, cart = [line()], address = region) => ({ _id: id,
  status: "Delivered", paymentInfo: { type: "Cash On Delivery", status: "Succeeded" },
  createdAt: new Date(`2026-${String(month).padStart(2, "0")}-10T12:00:00Z`),
  deliveredAt: new Date("2026-11-01T12:00:00Z"), user: { _id: user },
  shippingAddress: { ...address }, cart, totalPrice: 999999, shippingPrice: 999 });
const fixture = () => [
  order("j1", 7, "A", [line(phone, 2, 10)]),
  order("a1", 8, "A", [line(phone, 1, 20)]), order("a2", 8, "B", [line(phone, 1, 30)]),
  order("s1", 9, "A", [line(phone, 1, 10), line(phone, 2, 5)]),
  order("s2", 9, "A", [line(phone, 1, 40)]), order("s3", 9, "C", [line(phone, 1, 50)]),
  order("o1", 10, "A", [line(phone, 2, 10), line(laptop, 1, 100)]),
  order("o2", 10, "D", [line(phone, 1, 30)]),
  order("k1", 10, "A", [line(phone, 3, 10), line(cookware, 1, 50)], karachi),
  order("k2", 10, "E", [line(phone, 1, 40)], karachi),
];

test("central mapping accepts only complete supported taxonomies, never broad parents/tablets/titles", () => {
  assert.deepEqual(categoryMappings.map((mapping) => mapping.modelCategory),
    ["telephony", "computers_accessories", "housewares", "sports_leisure"]);
  assert.equal(mapCategory({ ...phone, category: " mobile  and tablets " }).modelCategory, "telephony");
  assert.equal(mapCategory({ category: "Mobile and Tablets", name: "Samsung phone" }), null);
  assert.equal(mapCategory({ ...phone, productType: "tablet", subcategory: "Tablets" }), null);
  assert.equal(mapCategory({ ...phone, subcategory: "Laptops" }), null);
});

test("region identity normalizes whitespace/case without changing stored snapshots or inventing states", () => {
  const original = { city: "  LAHORE  ", state: "punjab", country: " Pakistan " };
  const copy = { ...original };
  assert.equal(normalizeRegion(original).key, normalizeRegion(region).key);
  assert.equal(normalizeRegion(original).label, "Lahore, Punjab, Pakistan");
  assert.deepEqual(original, copy);
  assert.equal(normalizeRegion({ city: "Lahore", country: "Pakistan" }), null);
});

test("features exactly match purchase-month lags, prior-three-month sums/averages, and training nunique semantics", () => {
  const records = fixture().map((row, index) => ({ ...row,
    _id: new Types.ObjectId(String(index + 1).padStart(24, "0")),
    user: { _id: new Types.ObjectId(row.user._id.charCodeAt(0).toString(16).padStart(24, "0")) },
  }));
  const history = buildMarketplaceHistory(records, now);
  assert.equal(history.available, true);
  assert.deepEqual(history.features(normalizeRegion(region).key, "telephony"), {
    orders_current: 2, orders_prev_1: 3, orders_prev_2: 2, orders_prev_3: 1,
    orders_3m_avg: 2, orders_3m_sum: 6, customers_prev_1: 2, customers_3m_sum: 5,
    revenue_prev_1: 110, revenue_3m_sum: 180, demand_trend: 2,
    region_month_orders: 3, region_month_customers: 3, region_month_revenue: 150,
    category_month_orders: 4, category_month_customers: 4, category_month_revenue: 120,
  });
  assert.deepEqual(Object.keys(history.features(normalizeRegion(region).key, "telephony")), modelConfig.featureColumns);
  assert.equal(history.history.featureMonth, "2026-10");
  assert.equal(history.history.forecastMonth, "2026-11");
  assert.deepEqual(history.history.previousMonths, ["2026-09", "2026-08", "2026-07"]);
});

test("non-delivered, unpaid, refunded, current-month, and future purchase rows never affect features", () => {
  const rows = fixture();
  const expected = buildMarketplaceHistory(rows, now).features(normalizeRegion(region).key, "telephony");
  for (const status of ["Pending", "Processing", "Cancelled", "Failed", "Processing refund", "Refund Success", "Refund Rejected"])
    rows.push({ ...order(status, 10, "other", [line(phone, 100, 1000)]), status });
  rows.push({ ...order("unpaid", 10, "other"), paymentInfo: { status: "Pending" } });
  rows.push({ ...order("refunded", 10, "other"), refundInfo: { status: "Refund Success" } });
  rows.push(order("current", 11, "other", [line(phone, 100, 1000)]));
  rows.push(order("future", 12, "other", [line(phone, 100, 1000)]));
  assert.deepEqual(buildMarketplaceHistory(rows, now).features(normalizeRegion(region).key, "telephony"), expected);
});

test("legacy missing states and ambiguous historical category-only lines are excluded and reported", () => {
  const rows = fixture();
  rows.push(order("legacy", 10, "other", [line()], { city: "Lahore", country: "Pakistan" }));
  rows.push(order("broad", 10, "other", [{ category: "Mobile and Tablets", qty: 100, discountPrice: 1000 }]));
  const result = buildMarketplaceHistory(rows, now);
  assert.equal(result.history.excludedRegionOrders, 1);
  assert.equal(result.history.excludedUnmappedLineItems, 1);
  assert.equal(result.features(normalizeRegion(region).key, "telephony").orders_current, 2);
});

test("zero-demand calendar gaps and known region/category cross-products are explicitly zero-filled", () => {
  const sparse = buildMarketplaceHistory([order("first", 7, "A"), order("last", 10, "A")], now);
  assert.equal(sparse.available, true); // No invented 50/100-order minimum or four-sale-month requirement.
  assert.equal(sparse.history.eligibleOrders, 2);
  const values = sparse.features(normalizeRegion(region).key, "telephony");
  assert.equal(values.orders_prev_1, 0);
  assert.equal(values.orders_prev_2, 0);
  assert.equal(values.orders_prev_3, 1);
  assert.equal(values.orders_3m_avg, 1 / 3);
  assert.equal(values.demand_trend, -1);
  const panel = buildMarketplaceHistory(fixture(), now);
  assert.equal(panel.features(normalizeRegion(karachi).key, "computers_accessories").orders_current, 0);
  assert.equal(panel.features(normalizeRegion(karachi).key, "computers_accessories").region_month_orders, 3);
});

test("cold start requires four completed calendar slots and never consumes Pending COD demand", () => {
  assert.equal(buildMarketplaceHistory([], now).reason, "INSUFFICIENT_HISTORY");
  assert.equal(buildMarketplaceHistory([{ ...order("pending", 7, "A"), status: "Pending" }], now).reason, "INSUFFICIENT_HISTORY");
  assert.equal(buildMarketplaceHistory([order("recent", 8, "A")], now).history.calendarMonthsAvailable, 3);
  assert.equal(buildMarketplaceHistory([order("recent", 8, "A")], now).reason, "INSUFFICIENT_HISTORY");
});

test("purchase month crosses year boundaries correctly and never substitutes delivery month", () => {
  const rows = [order("first", 7, "A"), order("last", 10, "A")];
  rows[0].createdAt = new Date("2025-10-31T23:59:59Z");
  rows[1].createdAt = new Date("2025-12-01T00:00:00Z");
  const result = buildMarketplaceHistory(rows, new Date("2026-02-19T12:00:00Z"));
  assert.equal(result.available, false); // Delivery dates in November 2026 would be future information.
  rows.forEach((entry) => { entry.deliveredAt = new Date("2026-01-05T12:00:00Z"); });
  const valid = buildMarketplaceHistory(rows, new Date("2026-02-19T12:00:00Z"));
  assert.equal(valid.history.featureMonth, "2026-01");
  const values = valid.features(normalizeRegion(region).key, "telephony");
  assert.equal(values.orders_current, 0);
  assert.equal(values.orders_prev_1, 1);
  assert.equal(values.orders_prev_2, 0);
  assert.equal(values.orders_prev_3, 1);
});

test("only captured item sale price times quantity contributes revenue, excluding shipping/current/original prices", () => {
  const rows = [order("first", 7, "A"), order("last", 10, "A", [line(phone, 3, 12.34)])];
  const result = buildMarketplaceHistory(rows, now);
  assert.equal(result.features(normalizeRegion(region).key, "telephony").region_month_revenue, 37.02);
  rows[1].cart = [{ ...line(), discountPrice: undefined, lineTotal: 25 }];
  assert.equal(buildMarketplaceHistory(rows, now).features(normalizeRegion(region).key, "telephony").region_month_revenue, 25);
  rows[1].cart = [{ ...line(), discountPrice: undefined, lineTotal: undefined }];
  const missing = buildMarketplaceHistory(rows, now);
  assert.equal(missing.history.excludedInvalidLineItems, 1);
});

test("explicit foreign currencies fail closed; no currency conversion or silent revenue mixing", () => {
  const rows = fixture();
  rows[0].currency = "EUR";
  assert.equal(buildMarketplaceHistory(rows, now).reason, "UNSUPPORTED_CURRENCY");
  delete rows[0].currency;
  rows[0].cart[0].currency = "USD";
  assert.equal(buildMarketplaceHistory(rows, now).available, true);
});

test("new order timestamps are evaluated for each new document", async () => {
  const first = new Order();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const second = new Order();
  assert.ok(second.createdAt > first.createdAt);
});

const original = { findOrder: Order.find, findProduct: Product.find, productById: Product.findById,
  findShop: Shop.findById, url: process.env.ML_SERVICE_URL, timeout: process.env.ML_SERVICE_TIMEOUT_MS,
  secret: process.env.JWT_SECRET };
let api, ml, apiUrl, mlUrl, sellerCookie, otherCookie, orders, inventory, queries, calls, behavior;
const respondScores = (body, pathname) => {
  const field = pathname.endsWith("regions") ? "region" : "category";
  const context = field === "region" ? "category" : "region";
  const recommendations = body.candidates.map((row, index) => ({ [field]: row[field],
    demand_probability: 0.8, predicted_volume: index + 1, expected_demand_score: 0.8 * (index + 1), confidence: "High" }))
    .sort((a, b) => b.expected_demand_score - a.expected_demand_score).slice(0, body.top_n)
    .map((row, index) => ({ rank: index + 1, ...row }));
  return { [context]: body[context], recommendations };
};
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const stop = (server) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });

before(async () => {
  process.env.JWT_SECRET = "advertising-test-only-secret";
  process.env.ML_SERVICE_TIMEOUT_MS = "1000";
  sellerCookie = `seller_token=${jwt.sign({ id: sellerId }, process.env.JWT_SECRET)}`;
  otherCookie = `seller_token=${jwt.sign({ id: otherId }, process.env.JWT_SECRET)}`;
  Shop.findById = async (id) => [sellerId, otherId].includes(id) ? { id, _id: id, accountStatus: "active" } : null;
  Product.findById = (id) => ({ lean: async () => inventory.find((product) => product._id === id) || null });
  Product.find = (query) => { queries.push({ product: query }); return { select: () => ({ lean: async () => inventory }) }; };
  Order.find = (query) => { queries.push({ order: query }); return { select: () => ({ lean: async () => orders }) }; };
  ml = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => { const payload = JSON.parse(body); calls.push({ path: req.url, payload }); behavior(req, res, payload); });
  });
  await listen(ml);
  mlUrl = `http://127.0.0.1:${ml.address().port}`;
  const app = express();
  app.use(cookieParser());
  app.use("/api/v2/advertising", createAdvertisingRouter({ now: () => now }));
  app.use(errorMiddleware);
  api = http.createServer(app);
  await listen(api);
  apiUrl = `http://127.0.0.1:${api.address().port}/api/v2/advertising`;
});

beforeEach(() => {
  orders = fixture();
  inventory = [{ ...phone, _id: productId, name: "Own phone", shopId: sellerId, isActive: true, approvalStatus: "approved", stock: 2 },
    { ...laptop, _id: "507f1f77bcf86cd799439014", name: "Own laptop", shopId: sellerId, isActive: true, approvalStatus: "approved", stock: 2 }];
  queries = [];
  calls = [];
  behavior = (req, res, body) => res.end(JSON.stringify(respondScores(body, req.url)));
  process.env.ML_SERVICE_URL = mlUrl;
  process.env.ML_SERVICE_TIMEOUT_MS = "1000";
});

after(async () => {
  Order.find = original.findOrder;
  Product.find = original.findProduct;
  Product.findById = original.productById;
  Shop.findById = original.findShop;
  for (const [name, value] of [["ML_SERVICE_URL", original.url], ["ML_SERVICE_TIMEOUT_MS", original.timeout], ["JWT_SECRET", original.secret]]) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
  await stop(api);
  await stop(ml);
});

const get = async (route, cookie = sellerCookie) => {
  const response = await fetch(apiUrl + route, { headers: cookie ? { Cookie: cookie } : {} });
  return { status: response.status, data: await response.json() };
};
const productRoute = `/recommend-regions/${productId}`;
const regionRoute = "/recommend-products?country=Pakistan&state=Punjab&city=Lahore";

test("marketplace query is paid Delivered-only, purchase-date bounded, and never seller-scoped", async () => {
  await loadMarketplaceHistory(now);
  const query = queries.find((entry) => entry.order).order;
  assert.equal(query.status, "Delivered");
  assert.equal(query["paymentInfo.status"], "Succeeded");
  assert.equal(query.createdAt.$lt.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.ok(!JSON.stringify(query).includes(sellerId));
});

test("both endpoints require seller authentication", async () => {
  for (const route of [productRoute, regionRoute]) assert.equal((await get(route, null)).status, 401);
  assert.equal(queries.length, 0);
  assert.equal(calls.length, 0);
});

test("ownership and unsupported taxonomy are checked before reading history or calling ML", async () => {
  assert.equal((await get(productRoute, otherCookie)).status, 403);
  inventory[0] = { ...inventory[0], subcategory: "Tablets", productType: "tablet" };
  const unsupported = await get(productRoute);
  assert.equal(unsupported.data.reason, "UNSUPPORTED_CATEGORY");
  assert.equal(queries.length, 0);
  assert.equal(calls.length, 0);
});

test("product lookup errors are controlled", async () => {
  assert.equal((await get("/recommend-regions/not-an-id")).status, 400);
  assert.equal((await get("/recommend-regions/507f1f77bcf86cd799439099")).status, 404);
});

test("current real-data shape (Pending COD only) returns cold start without ML", async () => {
  orders = [{ ...order("pending", 10, "A"), status: "Pending", paymentInfo: { type: "Cash On Delivery", status: "Pending" } }];
  for (const route of [productRoute, regionRoute]) {
    const result = await get(route);
    assert.equal(result.status, 200);
    assert.equal(result.data.available, false);
    assert.equal(result.data.reason, "INSUFFICIENT_HISTORY");
    assert.equal(result.data.history.eligibleOrders, 0);
  }
  assert.equal(calls.length, 0);
});

test("region validation requires complete city/state/country text", async () => {
  for (const route of ["/recommend-products?country=Pakistan&city=Lahore", "/recommend-products?country=Pakistan&state=%20&city=Lahore",
    "/recommend-products?country=Pakistan&state=Punjab&city[x]=Lahore"]) assert.equal((await get(route)).status, 400);
  assert.equal(calls.length, 0);
});

test("Product -> Regions sends exact marketplace features to the Phase 1 route and hides model category names", async () => {
  const result = await get(productRoute);
  assert.equal(result.status, 200);
  assert.equal(result.data.available, true);
  assert.equal(calls[0].path, "/ads/recommend-regions");
  assert.equal(calls[0].payload.category, "telephony");
  const lahore = calls[0].payload.candidates.find((candidate) => candidate.region === "Lahore, Punjab, Pakistan");
  assert.equal(lahore.orders_current, 2); // Both source sellers differ from the authenticated seller.
  assert.equal(lahore.customers_3m_sum, 5);
  assert.equal(lahore.region_month_orders, 3);
  assert.equal(lahore.category_month_orders, 4);
  assert.equal(result.data.product.subcategory, "Mobile Phones");
  assert.ok(!JSON.stringify(result.data).includes("telephony"));
});

test("Region -> Products only returns the seller's approved active stocked inventory with clean category labels", async () => {
  inventory.push({ ...inventory[0], _id: "other", shopId: otherId }, { ...inventory[0], _id: "hidden", isActive: false },
    { ...inventory[0], _id: "pending", approvalStatus: "pending" }, { ...inventory[0], _id: "empty", stock: 0 });
  const result = await get(regionRoute);
  assert.equal(result.data.available, true);
  assert.equal(calls[0].path, "/ads/recommend-categories");
  assert.equal(calls[0].payload.region, "Lahore, Punjab, Pakistan");
  assert.equal(result.data.recommendations.flatMap((entry) => entry.products).length, 2);
  assert.ok(result.data.recommendations.every((entry) => ["Mobile Phones", "Laptops"].includes(entry.category)));
  assert.ok(!JSON.stringify(result.data).includes("computers_accessories"));
  const filter = queries.find((entry) => entry.product).product;
  assert.equal(filter.shopId, sellerId);
  assert.equal(filter.stock.$gt, 0);
});

test("unseen regions/categories and empty inventory return explicit unavailable results", async () => {
  assert.equal((await get("/recommend-products?country=Pakistan&state=Punjab&city=Unseen")).data.reason, "INSUFFICIENT_HISTORY");
  orders = [order("first", 7, "A", [line(laptop)]), order("last", 10, "A", [line(laptop)])];
  assert.equal((await get(productRoute)).data.reason, "INSUFFICIENT_HISTORY");
  inventory = [];
  assert.equal((await get(regionRoute)).data.reason, "NO_ELIGIBLE_INVENTORY");
  assert.equal(calls.length, 0);
});

test("ML HTTP failures, malformed responses, redirects, incorrect scores and timeouts fail gracefully", async () => {
  const failures = [
    (_req, res) => { res.statusCode = 500; res.end("failed"); },
    (_req, res) => { res.statusCode = 302; res.setHeader("Location", "http://example.invalid"); res.end(); },
    (_req, res) => res.end("not-json"),
    (req, res, body) => { const data = respondScores(body, req.url); data.recommendations[0].expected_demand_score = 999; res.end(JSON.stringify(data)); },
    (_req, res) => { res.writeHead(200); res.write("{"); },
  ];
  for (const failure of failures) {
    behavior = failure;
    process.env.ML_SERVICE_TIMEOUT_MS = "50";
    const result = await get(productRoute);
    assert.equal(result.status, 200);
    assert.equal(result.data.reason, "ML_UNAVAILABLE");
    assert.equal(result.data.available, false);
  }
});

test("Top 5 is global across batches; no candidate is discarded before ML scoring", async () => {
  const rows = Array.from({ length: 1002 }, (_, index) => ({ region: `Region ${index}`, ...Object.fromEntries(modelConfig.featureColumns.map((key) => [key, 0])) }));
  const result = await scoreCandidates("regions", "telephony", rows);
  assert.equal(calls.length, 2);
  assert.equal(calls.reduce((sum, call) => sum + call.payload.candidates.length, 0), 1002);
  assert.equal(result.length, 5);
  assert.deepEqual(result.map((row) => row.rank), [1, 2, 3, 4, 5]);
});

test("connection refusal, absent/invalid ML configuration, and history read failures remain controlled", async () => {
  const reservation = net.createServer();
  await listen(reservation);
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  for (const url of [`http://127.0.0.1:${port}`, "ftp://127.0.0.1:8001", undefined]) {
    if (url === undefined) delete process.env.ML_SERVICE_URL; else process.env.ML_SERVICE_URL = url;
    const result = await get(productRoute);
    assert.equal(result.data.reason, "ML_UNAVAILABLE");
  }
  const find = Order.find;
  try {
    Order.find = () => { throw new Error("Database connection failed"); };
    assert.equal((await get(productRoute)).data.reason, "HISTORY_UNAVAILABLE");
  } finally { Order.find = find; }
});

test("real Express -> FastAPI -> saved advertisement models works in both directions using isolated history fixtures", async () => {
  const reservation = net.createServer();
  await listen(reservation);
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const mlDir = path.resolve(__dirname, "../../ml-service");
  const script = `import sys, threading, uvicorn\nserver=uvicorn.Server(uvicorn.Config("cartify_api:app",host="127.0.0.1",port=${port},log_level="critical",access_log=False))\nserver.config.load()\ndef stop():\n    sys.stdin.readline()\n    server.should_exit=True\nthreading.Thread(target=stop,daemon=True).start()\nserver.run()\n`;
  const child = spawn(path.join(mlDir, ".venv/Scripts/python.exe"), ["-B", "-c", script], {
    cwd: mlDir, windowsHide: true, detached: false, stdio: ["pipe", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output = (output + chunk).slice(-4096); });
  child.stderr.on("data", (chunk) => { output = (output + chunk).slice(-4096); });
  try {
    const deadline = Date.now() + 30000;
    let ready = false;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(output || "Python exited before startup");
      try { ready = (await fetch(`http://127.0.0.1:${port}/health`)).ok; } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, output);
    process.env.ML_SERVICE_URL = `http://127.0.0.1:${port}`;
    process.env.ML_SERVICE_TIMEOUT_MS = "10000";
    for (const route of [productRoute, regionRoute]) {
      const result = await get(route);
      assert.equal(result.status, 200);
      assert.equal(result.data.available, true, JSON.stringify(result.data));
      assert.ok(result.data.recommendations.length > 0);
      assert.ok(result.data.recommendations.every((entry) => Number.isFinite(entry.expected_demand_score)));
    }
    assert.equal(calls.length, 0); // The controlled test server was not used for these requests.
  } finally {
    if (child.exitCode === null) {
      let timer;
      const exited = new Promise((resolve) => child.once("exit", resolve));
      child.stdin.on("error", () => {});
      child.stdin.end("shutdown\n");
      await Promise.race([exited, new Promise((resolve) => { timer = setTimeout(resolve, 10000); })]);
      clearTimeout(timer);
      if (child.exitCode === null) await new Promise((resolve) => {
        const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        killer.once("exit", resolve); killer.once("error", resolve);
      });
    }
  }
});
