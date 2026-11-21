// Explicit, local-only seed execution, auditing, and guarded cleanup for the approved FYP plan.
// No server imports this file. Preview is the default; cleanup is never automatic.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createPlan, buildOrders, applyPlan } = require("./advertising-demo-history");
const { categoryMappings } = require("../config/advertising");
const plan = createPlan(new Date("2026-11-19T00:00:00Z"));
const approvedDigest = "ff381f662b6e6eddc991a1d8f897481f5018502f45ee8b290aec3e1b65791a92";
const directory = path.resolve(__dirname, "../demo/advertising");
const manifestPath = path.join(directory, "cleanup-manifest.json");
const deterministicId = (label) => crypto.createHash("sha256").update(`${plan.namespace}|references-v1|${label}`).digest("hex").slice(0, 24);
const canonical = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (value?._bsontype === "ObjectId") return value.toHexString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
};
const fingerprint = (value) => crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const save = (manifest) => fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const referenceManifest = () => ({ sellerId: deterministicId("seller"),
  products: Object.fromEntries(categoryMappings.map((mapping) => [mapping.productType, deterministicId(`product:${mapping.productType}`)])),
  customerIds: Array.from({ length: 180 }, (_, index) => deterministicId(`customer:${index + 1}`)) });

async function connect() {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });
  dotenv.config({ path: path.resolve(__dirname, "../config/.env"), quiet: true, override: false });
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/cartify";
  const hostname = new URL(uri).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(hostname)) throw new Error("This approved FYP tool only operates on local MongoDB.");
  const mongoose = require("mongoose");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  return { mongoose, models: { orders: require("../model/order"), users: require("../model/user"),
    shops: require("../model/shop"), products: require("../model/product") } };
}

async function verifyProtected(manifest, models) {
  for (const record of manifest.protectedRecords) {
    const actual = await models[record.kind].collection.findOne({ _id: new models[record.kind].base.Types.ObjectId(record.id) });
    if (!actual || fingerprint(actual) !== record.sha256) throw new Error(`Protected pre-existing ${record.kind} record changed: ${record.id}`);
  }
}

function validateManifest(manifest) {
  const references = referenceManifest();
  if (manifest.digest !== approvedDigest || manifest.marker !== plan.marker ||
      fingerprint(manifest.references) !== fingerprint(references)) throw new Error("Cleanup manifest identity does not match this approved plan.");
  const expectedOrders = buildOrders(plan, placeholderReferences()).map((order) => order._id).sort();
  if (fingerprint([...manifest.orderIds].sort()) !== fingerprint(expectedOrders)) throw new Error("Unexpected cleanup order IDs.");
  const allowed = { orders: new Set(expectedOrders), shops: new Set([references.sellerId]),
    users: new Set(references.customerIds), products: new Set(Object.values(references.products)) };
  for (const record of manifest.createdRecords) {
    if (!allowed[record.kind]?.has(record.id)) throw new Error("Cleanup contains an ID outside deterministic demo records.");
    if (manifest.protectedRecords.some((entry) => entry.kind === record.kind && entry.id === record.id)) throw new Error("Cleanup overlaps a protected record.");
  }
}

function placeholderReferences() {
  const references = referenceManifest();
  return { seller: { _id: references.sellerId }, products: Object.fromEntries(categoryMappings.map((mapping) =>
    [mapping.productType, { _id: references.products[mapping.productType], name: `[DEMO] ${mapping.subcategory}` }])),
  customers: references.customerIds.map((id, index) => ({ _id: id, name: `[DEMO] Advertisement Customer ${String(index + 1).padStart(3, "0")}`,
    email: `cartify-ad-customer-${String(index + 1).padStart(3, "0")}@example.invalid` })) };
}

async function seed(models) {
  fs.mkdirSync(directory, { recursive: true });
  const references = referenceManifest();
  let manifest;
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    validateManifest(manifest);
    await verifyProtected(manifest, models);
  } else {
    const protectedRecords = [];
    for (const [kind, Model] of Object.entries(models)) {
      for (const document of await Model.collection.find({}).toArray()) protectedRecords.push({ kind, id: String(document._id), sha256: fingerprint(document) });
    }
    const planned = placeholderReferences();
    const orderIds = buildOrders(plan, planned).map((order) => order._id);
    const idsByKind = { orders: orderIds, users: references.customerIds, shops: [references.sellerId], products: Object.values(references.products) };
    for (const [kind, ids] of Object.entries(idsByKind)) {
      if (protectedRecords.some((record) => record.kind === kind && ids.includes(record.id))) throw new Error("Demo ID collides with pre-existing data; no references were created.");
    }
    if (await models.orders.exists({ "statusHistory.changedBy": { $regex: `^demo:${plan.namespace}:` } })) throw new Error("Untracked advertisement demo history already exists.");
    manifest = { version: 1, digest: plan.digest, marker: plan.marker, asOf: "2026-11-19", references, orderIds,
      protectedRecords, createdRecords: [], presenterProducts: [], phase: "prepared" };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  }
  const record = async (kind, id) => {
    const document = await models[kind].collection.findOne({ _id: new models[kind].base.Types.ObjectId(id) });
    const entry = { kind, id, sha256: fingerprint(document) };
    const prior = manifest.createdRecords.find((existing) => existing.kind === kind && existing.id === id);
    if (prior && prior.sha256 !== entry.sha256) throw new Error("Previously created demo document changed; refusing to overwrite or re-fingerprint it.");
    if (!prior) { manifest.createdRecords.push(entry); save(manifest); }
  };
  const date = new Date("2026-05-01T00:00:00Z");
  let seller = await models.shops.findById(references.sellerId);
  if (!seller) {
    if (await models.shops.exists({ email: "cartify-ad-history@example.invalid" })) throw new Error("Dedicated seller email collision.");
    seller = await models.shops.create({ _id: references.sellerId, name: "[DEMO] Advertisement History",
      email: "cartify-ad-history@example.invalid", password: crypto.randomBytes(48).toString("hex"),
      address: "DEMO history only", phoneNumber: "03000000000", zipCode: "54000", verificationStatus: "approved",
      accountStatus: "active", isVerified: true, approvedAt: date, availableBalance: 0, createdAt: date });
  }
  if (seller.name !== "[DEMO] Advertisement History" || seller.email !== "cartify-ad-history@example.invalid") throw new Error("Dedicated seller identity mismatch.");
  await record("shops", references.sellerId);
  const planned = placeholderReferences();
  for (let index = 0; index < planned.customers.length; index++) {
    const customer = planned.customers[index];
    const existing = await models.users.findById(customer._id);
    if (!existing) {
      if (await models.users.exists({ email: customer.email })) throw new Error("Dedicated customer email collision.");
      await models.users.create({ ...customer, password: crypto.randomBytes(48).toString("hex"), avatar: "Cartify.png", role: "user", createdAt: date });
    } else if (existing.name !== customer.name || existing.email !== customer.email) throw new Error("Dedicated customer identity mismatch.");
    await record("users", customer._id);
    if ((index + 1) % 30 === 0) console.log(`Dedicated demo customers ready: ${index + 1}/180`);
  }
  for (const mapping of categoryMappings) {
    const productId = references.products[mapping.productType];
    const existing = await models.products.findById(productId);
    if (!existing) {
      const price = plan.rows.find((row) => row.productType === mapping.productType).unitPrice;
      await models.products.create({ _id: productId, name: `[DEMO] ${mapping.subcategory}`, description: "Dedicated synthetic historical demand reference; hidden from normal browsing.",
        category: mapping.category, subcategory: mapping.subcategory, productType: mapping.productType, condition: "new",
        originalPrice: price, discountPrice: price, stock: 0, shopId: references.sellerId,
        shop: { _id: seller._id, name: seller.name }, tags: plan.namespace, approvalStatus: "approved",
        approvedAt: date, isActive: false, createdAt: date });
    } else if (existing.tags !== plan.namespace || existing.isActive !== false || existing.shopId !== references.sellerId) throw new Error("Dedicated historical product identity mismatch.");
    await record("products", productId);
  }
  manifest.phase = "references-created"; save(manifest);
  const result = await applyPlan(plan, references);
  for (const id of manifest.orderIds) await record("orders", id);
  await verifyProtected(manifest, models);
  manifest.phase = "inserted"; save(manifest);
  return { ...result, customers: references.customerIds.length, historicalProducts: 4, historicalSeller: references.sellerId };
}

function orderSnapshot(document) {
  const fields = ["_id", "status", "createdAt", "deliveredAt", "paidAt", "paymentInfo", "user", "shippingAddress", "cart",
    "subTotalPrice", "totalPrice", "shippingPrice", "discountPrice", "platformFee"];
  return { ...Object.fromEntries(fields.map((field) => [field, document[field]])),
    statusHistory: document.statusHistory?.map(({ status, changedAt, changedBy }) => ({ status, changedAt, changedBy })) };
}

async function audit(models) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  validateManifest(manifest);
  await verifyProtected(manifest, models);
  const planned = buildOrders(plan, placeholderReferences());
  const expected = new Map(planned.map((order) => [order._id, fingerprint(orderSnapshot(order))]));
  const orders = await models.orders.collection.find({ "statusHistory.changedBy": plan.marker }).toArray();
  if (orders.length !== 1097 || new Set(orders.map((order) => String(order._id))).size !== 1097) throw new Error("Demo order count/uniqueness mismatch.");
  for (const order of orders) if (fingerprint(orderSnapshot(order)) !== expected.get(String(order._id)) ||
      ["Processing refund", "Refund Success"].includes(order.refundInfo?.status)) throw new Error("Actual MongoDB order differs from the approved snapshot.");
  for (const row of plan.rows) {
    const cell = orders.filter((order) => order.createdAt.toISOString().startsWith(row.month) &&
      order.shippingAddress.city === row.city && order.cart[0].productType === row.productType);
    if (cell.length !== row.orders || new Set(cell.map((order) => order.user._id)).size !== row.customers ||
        cell.reduce((sum, order) => sum + order.cart[0].discountPrice * order.cart[0].qty, 0) !== row.revenue)
      throw new Error("Actual Month × Region × Category counts differ from the approved preview.");
  }
  const eligible = await models.orders.countDocuments({ "statusHistory.changedBy": plan.marker, status: "Delivered",
    "paymentInfo.status": "Succeeded", "refundInfo.status": { $nin: ["Processing refund", "Refund Success"] },
    createdAt: { $gte: new Date("2026-05-01T00:00:00Z"), $lt: new Date("2026-11-01T00:00:00Z") } });
  if (eligible !== 1097) throw new Error("Eligibility count mismatch.");
  const customerCount = await models.users.countDocuments({ _id: { $in: manifest.references.customerIds } });
  if (customerCount !== 180) throw new Error("Missing demo customer references.");
  const result = { digest: plan.digest, marker: plan.marker, demoOrders: orders.length, eligibleDemoOrders: eligible,
    distinctCustomers: new Set(orders.map((order) => order.user._id)).size, customerDocuments: customerCount,
    totals: plan.totals, customerActivity: plan.customerActivity, protectedRecordsUnchanged: true,
    protectedOrderCount: manifest.protectedRecords.filter((record) => record.kind === "orders").length,
    rowsChecked: plan.rows.length, unintendedNovemberDemoOrders: orders.filter((order) => order.createdAt >= new Date("2026-11-01T00:00:00Z")).length };
  fs.writeFileSync(path.join(directory, "seed-audit.json"), JSON.stringify(result, null, 2) + "\n");
  return result;
}

async function cleanup(models, execute = false) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  validateManifest(manifest);
  if (manifest.presenterProducts.length) throw new Error("Unrecognized presenter cleanup references; review explicitly before removal.");
  await verifyProtected(manifest, models);
  for (const record of manifest.createdRecords) {
    const actual = await models[record.kind].collection.findOne({ _id: new models[record.kind].base.Types.ObjectId(record.id) });
    if (actual && fingerprint(actual) !== record.sha256) throw new Error("Demo document changed after insertion; cleanup refused for review.");
  }
  const otherOrders = await models.orders.exists({ _id: { $nin: manifest.orderIds }, $or: [
    { "cart.shopId": manifest.references.sellerId }, { "cart._id": { $in: Object.values(manifest.references.products) } },
    { "user._id": { $in: manifest.references.customerIds } },
    { "user._id": { $in: manifest.references.customerIds.map((id) => new models.users.base.Types.ObjectId(id)) } },
  ] });
  const otherProducts = await models.products.exists({ shopId: manifest.references.sellerId, _id: { $nin: Object.values(manifest.references.products) } });
  if (otherOrders || otherProducts) throw new Error("Dedicated references are now used by other records; cleanup refused.");
  const summary = { execute, exactIdsOnly: true, counts: Object.fromEntries(Object.keys(models).map((kind) =>
    [kind, manifest.createdRecords.filter((record) => record.kind === kind).length])), protectedRecords: manifest.protectedRecords.length };
  if (execute) {
    for (const kind of ["orders", "products", "users", "shops"]) {
      const ids = manifest.createdRecords.filter((record) => record.kind === kind).map((record) => new models[kind].base.Types.ObjectId(record.id));
      await models[kind].collection.deleteMany({ _id: { $in: ids } });
    }
    await verifyProtected(manifest, models);
    manifest.phase = "cleaned"; save(manifest);
  }
  return summary;
}

async function main(args) {
  if (plan.digest !== approvedDigest) throw new Error("Approved distribution digest mismatch.");
  const mode = args[0] || "--preview";
  if (!["--preview", "--apply", "--audit", "--cleanup-preview", "--cleanup"].includes(mode)) throw new Error("Unknown demo action.");
  if (mode === "--preview") { console.log(JSON.stringify({ digest: plan.digest, totals: plan.totals, references: referenceManifest(), manifestPath }, null, 2)); return; }
  if (["--apply", "--cleanup"].includes(mode) && (args[1] !== "--confirm" || args[2] !== approvedDigest || args.length !== 3))
    throw new Error("Explicit matching --confirm approved plan hash is required before any write.");
  const { mongoose, models } = await connect();
  try { console.log(JSON.stringify(mode === "--apply" ? await seed(models) : mode === "--audit" ? await audit(models) : await cleanup(models, mode === "--cleanup"), null, 2)); }
  finally { await mongoose.disconnect(); }
}
if (require.main === module) main(process.argv.slice(2)).catch((error) => { console.error(`Demo action stopped: ${error.message}`); process.exitCode = 1; });
module.exports = { deterministicId, referenceManifest, fingerprint, validateManifest, placeholderReferences, orderSnapshot };
