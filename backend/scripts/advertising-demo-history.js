// Manual tool only. Default mode is a pure preview: no database connection or writes.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { categoryMappings } = require("../config/advertising");

const namespace = "cartify-ad-demo-v1";
const customersPerRegion = 36;
const regions = [
  { city: "Lahore", state: "Punjab", country: "Pakistan", postal: "54000" },
  { city: "Islamabad", state: "Islamabad Capital Territory", country: "Pakistan", postal: "44000" },
  { city: "Karachi", state: "Sindh", country: "Pakistan", postal: "74000" },
  { city: "Rawalpindi", state: "Punjab", country: "Pakistan", postal: "46000" },
  { city: "Faisalabad", state: "Punjab", country: "Pakistan", postal: "38000" },
];
const customerPoolSize = regions.length * customersPerRegion;
// Each row is May -> October for a November preview, oldest completed month first.
// The same deterministic shape moves with the six explicit completed months.
const demand = {
  smartphone: { price: 450, patterns: ["Growing", "Growing", "Growing", "Low / Growing", "Low / Growing"], counts: [
    [12, 14, 16, 19, 22, 24], [7, 8, 9, 10, 10, 11], [16, 18, 21, 24, 27, 30], [4, 5, 5, 6, 6, 7], [2, 3, 3, 4, 4, 5],
  ] },
  laptop: { price: 850, patterns: ["Growing", "Strong / Growing", "Moderate / Growing", "Low", "Low"], counts: [
    [6, 7, 8, 10, 12, 14], [10, 12, 14, 17, 21, 26], [6, 7, 7, 8, 9, 10], [2, 2, 3, 3, 4, 4], [1, 1, 1, 2, 2, 2],
  ] },
  cookware: { price: 140, patterns: ["Growing", "Low / Stable", "Moderate / Stable", "Stable", "Strong / Growing"], counts: [
    [7, 8, 9, 10, 11, 12], [3, 4, 4, 4, 5, 5], [5, 5, 6, 6, 7, 7], [8, 8, 9, 8, 9, 9], [10, 12, 15, 18, 22, 26],
  ] },
  running_shoes: { price: 110, patterns: ["Growing", "Stable", "Declining", "Low / Stable", "Low"], counts: [
    [2, 4, 7, 11, 17, 24], [9, 10, 9, 10, 9, 10], [24, 21, 17, 13, 9, 6], [4, 4, 5, 4, 5, 4], [0, 1, 0, 1, 1, 1],
  ] },
};
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

function createPlan(asOf = new Date()) {
  if (!Number.isFinite(asOf.getTime())) throw new Error("Invalid preview date.");
  const current = asOf.getUTCFullYear() * 12 + asOf.getUTCMonth();
  const months = Array.from({ length: 6 }, (_, index) => {
    const value = current - 6 + index;
    return `${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, "0")}`;
  });
  const customerCursors = regions.map(() => 0);
  const rows = months.flatMap((month, monthIndex) => regions.flatMap((region, regionIndex) =>
    categoryMappings.map((mapping) => {
      const entry = demand[mapping.productType];
      const count = entry.counts[regionIndex][monthIndex];
      const customers = Math.min(customersPerRegion, Math.ceil(count * 0.75));
      // Consecutive cohorts rotate around a larger regional pool, with some repeat
      // purchases within each cell and natural overlap across months/categories.
      const customerIndices = Array.from({ length: count }, (_, index) =>
        regionIndex * customersPerRegion + (customerCursors[regionIndex] + index % customers) % customersPerRegion);
      customerCursors[regionIndex] += customers;
      return { month, ...region, regionIndex, category: mapping.category, subcategory: mapping.subcategory,
        productType: mapping.productType, modelCategory: mapping.modelCategory, orders: count,
        customers, customerIndices, unitPrice: entry.price,
        revenue: count * entry.price, pattern: entry.patterns[regionIndex] };
    })));
  const totals = { orders: 0, revenue: 0, byMonth: {}, byRegion: {}, byCategory: {}, uniqueCustomers: 0, regions: 5, months: 6 };
  const activity = { byMonth: {}, byRegion: {}, byMonthAndRegion: {} };
  const customerOrders = new Map();
  for (const row of rows) {
    totals.orders += row.orders;
    totals.revenue += row.revenue;
    for (const [field, label] of [["byMonth", row.month], ["byRegion", row.city], ["byCategory", row.subcategory]])
      totals[field][label] = (totals[field][label] || 0) + row.orders;
    const monthly = activity.byMonth[row.month] ||= new Set();
    const regional = activity.byRegion[row.city] ||= new Set();
    const monthlyRegional = (activity.byMonthAndRegion[row.month] ||= {})[row.city] ||= new Set();
    for (const customer of row.customerIndices) {
      monthly.add(customer);
      regional.add(customer);
      monthlyRegional.add(customer);
      customerOrders.set(customer, (customerOrders.get(customer) || 0) + 1);
    }
  }
  totals.uniqueCustomers = customerOrders.size;
  const customerActivity = {
    byMonth: Object.fromEntries(Object.entries(activity.byMonth).map(([key, set]) => [key, set.size])),
    byRegion: Object.fromEntries(Object.entries(activity.byRegion).map(([key, set]) => [key, set.size])),
    byMonthAndRegion: Object.fromEntries(Object.entries(activity.byMonthAndRegion).map(([month, values]) =>
      [month, Object.fromEntries(Object.entries(values).map(([city, set]) => [city, set.size]))])),
    ordersPerCustomer: { min: Math.min(...customerOrders.values()), max: Math.max(...customerOrders.values()),
      average: totals.orders / totals.uniqueCustomers },
  };
  // Include actual customer assignments in the approved digest, not just order totals.
  const digest = hash(JSON.stringify({ namespace, currency: "USD", rows, customersPerRegion }));
  return { namespace, digest, currency: "USD", months, rows, totals, customerPoolSize, customersPerRegion, customerActivity,
    marker: `demo:${namespace}:${digest.slice(0, 16)}` };
}

function buildOrders(plan, references) {
  return plan.rows.flatMap((row) => Array.from({ length: row.orders }, (_, index) => {
    const product = references.products[row.productType];
    const customer = references.customers[row.customerIndices[index]];
    const purchase = new Date(`${row.month}-${String(1 + index % 20).padStart(2, "0")}T12:00:00.000Z`);
    const delivered = new Date(purchase.getTime() + 2 * 86400000);
    const id = hash(`${plan.digest}|${row.month}|${row.regionIndex}|${row.productType}|${index}`).slice(0, 24);
    return { _id: id, status: "Delivered", createdAt: purchase, deliveredAt: delivered, paidAt: delivered,
      paymentInfo: { type: "Cash On Delivery", status: "Succeeded" },
      user: { _id: String(customer._id), name: customer.name, email: customer.email },
      shippingAddress: { fullName: customer.name, email: customer.email, phoneNumber: "03000000000",
        country: row.country, state: row.state, city: row.city, zipCode: row.postal,
        address1: "DEMO history only - not a delivery address", address2: "" },
      cart: [{ _id: String(product._id), shopId: String(references.seller._id), name: product.name,
        category: row.category, subcategory: row.subcategory, productType: row.productType,
        discountPrice: row.unitPrice, originalPrice: row.unitPrice, qty: 1, lineTotal: row.unitPrice }],
      subTotalPrice: row.unitPrice, totalPrice: row.unitPrice, shippingPrice: 0, discountPrice: 0,
      platformFee: row.unitPrice * 0.1,
      statusHistory: [{ status: "Delivered", changedAt: delivered, changedBy: plan.marker }] };
  }));
}

function markdown(plan) {
  const columns = ["Month", "Country", "State / Province", "City", "Cartify category", "Model category", "Delivered orders", "Unique customers", "Merchandise USD", "Pattern"];
  const table = [columns, columns.map(() => "---"), ...plan.rows.map((row) => [row.month, row.country,
    row.state, row.city, row.subcategory, row.modelCategory, row.orders, row.customers, row.revenue.toFixed(2), row.pattern])]
    .map((row) => `| ${row.join(" | ")} |`).join("\n");
  return `# Proposed Cartify advertisement demo history — NOT INSERTED\n\nPlan SHA-256: \`${plan.digest}\`\n\n` +
    `Six completed UTC calendar months; one item (quantity 1) per order; all prices in USD, no shipping revenue.\n` +
    `${plan.customersPerRegion} dedicated customers per region (${plan.totals.uniqueCustomers} globally), reused across months and categories. Monthly customer counts must not be summed to calculate global unique customers.\n` +
    `Each customer places ${plan.customerActivity.ordersPerCustomer.min}–${plan.customerActivity.ordersPerCustomer.max} orders over six months (mean ${plan.customerActivity.ordersPerCustomer.average.toFixed(2)}). Order counts, trends and USD revenue are unchanged from the original proposal.\n\n${table}\n\n` +
    `## Totals\n\n\`\`\`json\n${JSON.stringify(plan.totals, null, 2)}\n\`\`\`\n\n` +
    `## Distinct customers by month and region\n\n` +
    `| Month | ${regions.map((region) => region.city).join(" | ")} | Marketplace distinct customers |\n` +
    `| --- | ${regions.map(() => "---").join(" | ")} | --- |\n` +
    plan.months.map((month) => `| ${month} | ${regions.map((region) => plan.customerActivity.byMonthAndRegion[month][region.city]).join(" | ")} | ${plan.customerActivity.byMonth[month]} |`).join("\n") +
    `\n| Six-month distinct total | ${regions.map((region) => plan.customerActivity.byRegion[region.city]).join(" | ")} | ${plan.totals.uniqueCustomers} |\n\n` +
    `These are synthetic input patterns, not promised model rankings. No inference against this plan has been run.\n`;
}

async function applyPlan(plan, manifest) {
  const Order = require("../model/order");
  const Product = require("../model/product");
  const User = require("../model/user");
  const Shop = require("../model/shop");
  const validId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id);
  const productIds = categoryMappings.map(({ productType }) => manifest.products?.[productType]);
  if (!validId(manifest.sellerId) || productIds.some((id) => !validId(id)) ||
      !Array.isArray(manifest.customerIds) || manifest.customerIds.length !== plan.customerPoolSize ||
      manifest.customerIds.some((id) => !validId(id)) || new Set(manifest.customerIds.map((id) => id.toLowerCase())).size !== plan.customerPoolSize)
    throw new Error(`Manifest must reference one dedicated demo seller, four products, and ${plan.customerPoolSize} distinct demo customers.`);
  const isDemo = (record) => record?.name?.startsWith("[DEMO]") && record?.email?.endsWith("@example.invalid");
  const seller = await Shop.findById(manifest.sellerId).lean();
  if (!isDemo(seller)) throw new Error("Refusing to attach demo earnings/orders to a real seller. Use a dedicated [DEMO] seller with an @example.invalid email.");
  const customers = await User.find({ _id: { $in: manifest.customerIds } }).select("_id name email").lean();
  if (customers.length !== plan.customerPoolSize || customers.some((record) => !isDemo(record))) throw new Error(`All ${plan.customerPoolSize} customer references must exist and be dedicated [DEMO] accounts with @example.invalid emails.`);
  const products = {};
  for (const mapping of categoryMappings) {
    const product = await Product.findById(manifest.products[mapping.productType]).lean();
    if (!product || String(product.shopId) !== String(seller._id) || !product.name.startsWith("[DEMO]") ||
        product.tags !== namespace || product.isActive !== false ||
        ["category", "subcategory", "productType"].some((field) => product[field] !== mapping[field]))
      throw new Error("Products must exist, belong to the dedicated demo seller, be hidden, tagged cartify-ad-demo-v1, and match all four exact taxonomies.");
    products[mapping.productType] = product;
  }
  const byCustomer = new Map(customers.map((customer) => [String(customer._id), customer]));
  const documents = buildOrders(plan, { seller, products,
    customers: manifest.customerIds.map((id) => byCustomer.get(id.toLowerCase())) })
    .map((document) => new Order(document));
  await Promise.all(documents.map((document) => document.validate()));
  const otherPlan = await Order.exists({ "statusHistory.changedBy": { $regex: `^demo:${namespace}:`, $ne: plan.marker } });
  if (otherPlan) throw new Error("Another demo history plan already exists. Review/remove it explicitly before inserting overlapping history.");
  const existing = await Order.find({ _id: { $in: documents.map((document) => document._id) } })
    .select("_id statusHistory cart user").lean();
  const planned = new Map(documents.map((document) => [String(document._id), document]));
  if (existing.some((document) => !document.statusHistory?.some((entry) => entry.changedBy === plan.marker) ||
      String(document.cart?.[0]?.shopId) !== String(seller._id) ||
      String(document.cart?.[0]?._id) !== String(planned.get(String(document._id)).cart[0]._id) ||
      String(document.user?._id) !== String(planned.get(String(document._id)).user._id)))
    throw new Error("ID collision or reference mismatch: refusing to modify existing records.");
  // Do not call application lifecycle routes: historical fixtures must not change stock,
  // balances, notifications, real payments, or any existing document.
  const operations = documents.map((document) => ({ updateOne: {
    filter: { _id: document._id, "statusHistory.changedBy": plan.marker },
    update: { $setOnInsert: document.toObject() }, upsert: true,
  } }));
  const result = await Order.bulkWrite(operations, { ordered: true });
  return { inserted: result.upsertedCount, alreadyPresent: existing.length, marker: plan.marker };
}

async function main(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (["--preview", "--apply"].includes(key)) options[key] = true;
    else if (["--as-of", "--out", "--manifest", "--approve-plan"].includes(key) && args[index + 1] && !args[index + 1].startsWith("--")) options[key] = args[++index];
    else throw new Error(`Unknown or incomplete option: ${key}`);
  }
  if (options["--preview"] && options["--apply"]) throw new Error("Choose preview or apply, not both.");
  const plan = createPlan(options["--as-of"] ? new Date(`${options["--as-of"]}T00:00:00Z`) : new Date());
  if (!options["--apply"]) {
    const preview = markdown(plan);
    if (options["--out"]) fs.writeFileSync(path.resolve(options["--out"]), preview, { flag: "wx" });
    console.log(preview);
    return;
  }
  // An explicit reviewed digest and manifest are mandatory; preview never imports/connects MongoDB.
  if (options["--approve-plan"] !== plan.digest || !options["--manifest"]) throw new Error("Insertion requires explicit distribution approval: matching --approve-plan SHA-256 and --manifest. No database connection was made.");
  const manifest = JSON.parse(fs.readFileSync(path.resolve(options["--manifest"]), "utf8"));
  const dotenv = require("dotenv");
  dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });
  dotenv.config({ path: path.resolve(__dirname, "../config/.env"), override: false, quiet: true });
  const mongoose = require("mongoose");
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cartify");
    console.log(JSON.stringify(await applyPlan(plan, manifest), null, 2));
  } finally { await mongoose.disconnect(); }
}

if (require.main === module) main(process.argv.slice(2)).catch((error) => {
  // No credentials/connection strings or raw database exceptions in console output.
  console.error(error.name === "Error" ? error.message : `Demo tool stopped (${error.name}). No existing records are intentionally changed.`);
  process.exitCode = 1;
});
module.exports = { createPlan, buildOrders, markdown, main, applyPlan };
