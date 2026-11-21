const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const crypto = require("node:crypto");
const { createPlan, buildOrders, markdown, applyPlan } = require("../scripts/advertising-demo-history");
const { categoryMappings } = require("../config/advertising");
const Order = require("../model/order");
const session = require("../scripts/advertising-demo-session");
const plan = createPlan(new Date("2026-11-19T12:00:00Z"));
const id = (index) => index.toString(16).padStart(24, "0");
const references = { seller: { _id: id(1) },
  products: Object.fromEntries(categoryMappings.map((mapping, index) => [mapping.productType, { _id: id(index + 10), name: `[DEMO] ${mapping.subcategory}` }])),
  customers: Array.from({ length: 180 }, (_, index) => ({ _id: id(index + 100), name: `[DEMO] Customer ${index + 1}`, email: `demo${index + 1}@example.invalid` })),
};

test("preview covers exactly six completed months, five regions, and four exact supported taxonomies", () => {
  assert.deepEqual(plan.months, ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
  assert.equal(plan.rows.length, 120);
  assert.equal(plan.totals.uniqueCustomers, 180);
  assert.equal(plan.customerPoolSize, 180);
  assert.equal(new Set(plan.rows.map((row) => row.city)).size, 5);
  assert.ok(plan.rows.some((row) => row.orders === 0));
  for (const row of plan.rows) {
    assert.ok(categoryMappings.some((mapping) => ["category", "subcategory", "productType", "modelCategory"].every((field) => mapping[field] === row[field])));
    assert.equal(row.revenue, row.orders * row.unitPrice);
  }
});

test("planned order counts, monthly unique customers, and revenue match every preview row", async () => {
  const orders = buildOrders(plan, references);
  assert.equal(orders.length, plan.totals.orders);
  assert.equal(new Set(orders.map((order) => order._id)).size, orders.length);
  assert.equal(new Set(orders.map((order) => order.user._id)).size, 180);
  for (const row of plan.rows) {
    const matching = orders.filter((order) => order.createdAt.toISOString().slice(0, 7) === row.month &&
      order.shippingAddress.city === row.city && order.cart[0].productType === row.productType);
    assert.equal(matching.length, row.orders);
    assert.equal(new Set(matching.map((order) => order.user._id)).size, row.customers);
    assert.equal(matching.reduce((sum, order) => sum + order.cart[0].discountPrice * order.cart[0].qty, 0), row.revenue);
  }
  for (const order of orders) {
    assert.equal(order.status, "Delivered");
    assert.equal(order.paymentInfo.status, "Succeeded");
    assert.equal(order.statusHistory[0].changedBy, plan.marker);
    assert.ok(order.createdAt < order.deliveredAt);
    assert.ok(order.deliveredAt < new Date("2026-11-01T00:00:00Z"));
    await new Order(order).validate();
  }
});

test("all 120 approved order counts, locations, category mappings, revenue values and trends remain unchanged", () => {
  const distribution = plan.rows.map((row) => [row.month, row.country, row.state, row.city, row.subcategory,
    row.modelCategory, String(row.orders), row.revenue.toFixed(2), row.pattern]);
  // Fingerprint captured from the previously reviewed 120-row preview, excluding customer counts.
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(distribution)).digest("hex"),
    "8cf7980b382a1a6990e577e12e1f0d1e9fc78daecd9ee9aa9437e8ff6a0a5c31");
  assert.equal(plan.totals.orders, 1097);
  assert.equal(plan.totals.revenue, 419450);
});

test("customer summaries use true distinct identities; recurring customers are spread across the full pool", () => {
  const orders = buildOrders(plan, references);
  const usage = new Map();
  for (const order of orders) usage.set(order.user._id, (usage.get(order.user._id) || 0) + 1);
  assert.equal(Math.min(...usage.values()), 2);
  assert.equal(Math.max(...usage.values()), 11);
  assert.equal(plan.customerActivity.ordersPerCustomer.average, 1097 / 180);
  for (const month of plan.months) {
    const monthly = orders.filter((order) => order.createdAt.toISOString().startsWith(month));
    assert.equal(new Set(monthly.map((order) => order.user._id)).size, plan.customerActivity.byMonth[month]);
    for (const city of Object.keys(plan.totals.byRegion)) {
      const cell = monthly.filter((order) => order.shippingAddress.city === city);
      assert.equal(new Set(cell.map((order) => order.user._id)).size, plan.customerActivity.byMonthAndRegion[month][city]);
    }
  }
  for (const city of Object.keys(plan.totals.byRegion)) {
    const regional = orders.filter((order) => order.shippingAddress.city === city);
    assert.equal(new Set(regional.map((order) => order.user._id)).size, 36);
    assert.equal(plan.customerActivity.byRegion[city], 36);
  }
  assert.deepEqual(plan.customerActivity.byMonth,
    { "2026-05": 107, "2026-06": 117, "2026-07": 129, "2026-08": 141, "2026-09": 149, "2026-10": 154 });
});

test("IDs and plan digest are stable for reruns within the same completed-month window", () => {
  const second = createPlan(new Date("2026-11-30T22:00:00Z"));
  assert.equal(second.digest, plan.digest);
  assert.deepEqual(buildOrders(second, references), buildOrders(plan, references));
  assert.notEqual(createPlan(new Date("2026-12-01T00:00:00Z")).digest, plan.digest);
  assert.match(markdown(plan), /NOT INSERTED/);
});

test("preview is pure and unapproved apply refuses before connecting to MongoDB", () => {
  const script = path.resolve(__dirname, "../scripts/advertising-demo-history.js");
  const preview = spawnSync(process.execPath, [script, "--preview", "--as-of", "2026-11-19"], {
    encoding: "utf8", windowsHide: true, env: { ...process.env, MONGO_URI: "mongodb://127.0.0.1:1/not-used" }, timeout: 5000,
  });
  assert.equal(preview.status, 0);
  assert.match(preview.stdout, new RegExp(plan.digest));
  const apply = spawnSync(process.execPath, [script, "--apply", "--as-of", "2026-11-19"], {
    encoding: "utf8", windowsHide: true, env: { ...process.env, MONGO_URI: "mongodb://127.0.0.1:1/not-used" }, timeout: 5000,
  });
  assert.equal(apply.status, 1);
  assert.match(apply.stderr, /requires explicit distribution approval/);
  const oldApproval = spawnSync(process.execPath, [script, "--apply", "--as-of", "2026-11-19",
    "--approve-plan", "3c5daeafb065bfd98450440a99db5735c073631b8c92cde4c1162fcb32a8a507",
    "--manifest", "not-read-with-an-obsolete-approval.json"], {
    encoding: "utf8", windowsHide: true, env: { ...process.env, MONGO_URI: "mongodb://127.0.0.1:1/not-used" }, timeout: 5000,
  });
  assert.equal(oldApproval.status, 1);
  assert.match(oldApproval.stderr, /requires explicit distribution approval/);
});

test("in-memory writer preflight rejects real accounts and ID collisions; reruns use insert-only operations", async () => {
  const Shop = require("../model/shop");
  const User = require("../model/user");
  const Product = require("../model/product");
  const originals = { shop: Shop.findById, users: User.find, product: Product.findById,
    exists: Order.exists, find: Order.find, bulk: Order.bulkWrite };
  const demoSeller = { _id: id(1), name: "[DEMO] History seller", email: "history@example.invalid" };
  const products = Object.fromEntries(categoryMappings.map((mapping, index) => [id(index + 10), {
    ...mapping, _id: id(index + 10), shopId: id(1), name: `[DEMO] ${mapping.subcategory}`,
    tags: plan.namespace, isActive: false,
  }]));
  const manifest = { sellerId: id(1), customerIds: references.customers.map((customer) => customer._id),
    products: Object.fromEntries(categoryMappings.map((mapping, index) => [mapping.productType, id(index + 10)])) };
  const memory = new Map();
  let bulkCalls = 0;
  try {
    Shop.findById = () => ({ lean: async () => ({ ...demoSeller, name: "A real seller" }) });
    User.find = () => ({ select: () => ({ lean: async () => references.customers }) });
    Product.findById = (productId) => ({ lean: async () => products[productId] });
    Order.exists = async () => false;
    Order.find = () => ({ select: () => ({ lean: async () => [...memory.values()] }) });
    Order.bulkWrite = async (operations) => {
      bulkCalls++;
      let inserted = 0;
      for (const { updateOne } of operations) {
        assert.deepEqual(Object.keys(updateOne.update), ["$setOnInsert"]);
        assert.equal(updateOne.filter["statusHistory.changedBy"], plan.marker);
        const key = String(updateOne.filter._id);
        if (!memory.has(key)) { memory.set(key, updateOne.update.$setOnInsert); inserted++; }
      }
      return { upsertedCount: inserted };
    };
    await assert.rejects(applyPlan(plan, manifest), /real seller/);
    assert.equal(bulkCalls, 0);
    await assert.rejects(applyPlan(plan, { ...manifest, customerIds: manifest.customerIds.slice(0, 40) }), /180 distinct demo customers/);
    assert.equal(bulkCalls, 0);
    Shop.findById = () => ({ lean: async () => demoSeller });
    const first = await applyPlan(plan, manifest);
    assert.equal(first.inserted, plan.totals.orders);
    const before = JSON.stringify([...memory.values()]);
    const second = await applyPlan(plan, manifest);
    assert.equal(second.inserted, 0);
    assert.equal(second.alreadyPresent, plan.totals.orders);
    assert.equal(JSON.stringify([...memory.values()]), before);
    memory.values().next().value.statusHistory = [{ changedBy: "real-customer" }];
    await assert.rejects(applyPlan(plan, manifest), /ID collision/);
    assert.equal(bulkCalls, 2);
    Order.exists = async () => ({ _id: "older-demo-plan" });
    await assert.rejects(applyPlan(plan, manifest), /Another demo history plan/);
    assert.equal(bulkCalls, 2);
  } finally {
    Shop.findById = originals.shop; User.find = originals.users; Product.findById = originals.product;
    Order.exists = originals.exists; Order.find = originals.find; Order.bulkWrite = originals.bulk;
  }
});

test("execution references are deterministic, dedicated, complete and do not collide across the planned entities", () => {
  const first = session.referenceManifest();
  assert.deepEqual(first, session.referenceManifest());
  assert.equal(first.customerIds.length, 180);
  const ids = [first.sellerId, ...Object.values(first.products), ...first.customerIds];
  assert.equal(new Set(ids).size, 185);
  assert.ok(ids.every((value) => /^[a-f0-9]{24}$/.test(value)));
  assert.equal(buildOrders(plan, session.placeholderReferences()).length, 1097);
});

test("document fingerprints preserve data and are independent of object key order", () => {
  assert.equal(session.fingerprint({ a: new Date("2026-05-01T00:00:00Z"), b: { z: 1, a: 2 } }),
    session.fingerprint({ b: { a: 2, z: 1 }, a: new Date("2026-05-01T00:00:00Z") }));
  assert.notEqual(session.fingerprint({ status: "Pending" }), session.fingerprint({ status: "Delivered" }));
});

test("cleanup manifest rejects unknown IDs, changed references, and overlap with protected data", () => {
  const manifest = { digest: plan.digest, marker: plan.marker, references: session.referenceManifest(),
    orderIds: buildOrders(plan, session.placeholderReferences()).map((order) => order._id),
    createdRecords: [{ kind: "users", id: session.referenceManifest().customerIds[0], sha256: "example" }], protectedRecords: [] };
  session.validateManifest(manifest);
  assert.throws(() => session.validateManifest({ ...manifest, orderIds: [id(123)] }), /Unexpected cleanup order IDs/);
  assert.throws(() => session.validateManifest({ ...manifest, references: { ...manifest.references, sellerId: id(1) } }), /identity/);
  assert.throws(() => session.validateManifest({ ...manifest, createdRecords: [{ kind: "orders", id: id(1) }] }), /outside deterministic/);
  assert.throws(() => session.validateManifest({ ...manifest, protectedRecords: [{ kind: "users", id: manifest.createdRecords[0].id }] }), /protected/);
});

test("execution and cleanup require explicit confirmation before connecting, while the default is a pure preview", () => {
  const script = path.resolve(__dirname, "../scripts/advertising-demo-session.js");
  for (const action of ["--apply", "--cleanup"]) {
    const run = spawnSync(process.execPath, [script, action], { encoding: "utf8", windowsHide: true, timeout: 5000 });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Explicit matching/);
  }
  const preview = spawnSync(process.execPath, [script], { encoding: "utf8", windowsHide: true, timeout: 5000 });
  assert.equal(preview.status, 0);
  assert.equal(JSON.parse(preview.stdout).totals.orders, 1097);
});
