const Order = require("../model/order");
const { mapCategory, modelConfig, normalizeText, normalizeKey } = require("../config/advertising");

const REQUIRED_MONTHS = 4;
const currency = "USD";
const monthIndex = (date) => date.getUTCFullYear() * 12 + date.getUTCMonth();
const monthName = (index) => `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`;
const displayPart = (value, isCountry) => {
  const text = normalizeKey(value);
  if (isCountry && /^[a-z]{2,3}$/.test(text)) return text.toUpperCase();
  return text.replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toUpperCase());
};
const normalizeRegion = (address) => {
  const parts = [address?.city, address?.state, address?.country].map(normalizeText);
  if (parts.some((part) => !part || part.length > 100)) return null;
  const label = parts.map((part, index) => displayPart(part, index === 2)).join(", ");
  if (label.length > 200) return null;
  return { key: JSON.stringify(parts.map(normalizeKey)), label };
};
const stableId = (value) => {
  if (typeof value === "string") return value.trim() || null;
  return value?._bsontype === "ObjectId" ? value.toHexString() : null;
};
const finiteNumber = (value) => {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const bucketKey = (region, category, month) => JSON.stringify([region, category, month]);
const emptyBucket = () => ({ orders: new Set(), customers: new Set(), revenueCents: 0 });

function buildMarketplaceHistory(orders, now = new Date()) {
  const current = monthIndex(now) - 1;
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const buckets = new Map();
  const regions = new Map();
  const categories = new Set();
  let firstMonth = null;
  const diagnostics = { paidDeliveredOrdersRead: 0, eligibleOrders: 0, eligibleLineItems: 0,
    excludedRegionOrders: 0, excludedDateOrders: 0, excludedCustomerOrders: 0,
    excludedUnmappedLineItems: 0, excludedInvalidLineItems: 0 };
  const summary = () => ({ currency, timeZone: "UTC", dateField: "createdAt",
    featureMonth: monthName(current), forecastMonth: monthName(current + 1),
    previousMonths: [1, 2, 3].map((lag) => monthName(current - lag)),
    historyStartMonth: firstMonth === null ? null : monthName(firstMonth),
    requiredCalendarMonths: REQUIRED_MONTHS,
    calendarMonthsAvailable: firstMonth === null ? 0 : current - firstMonth + 1,
    ...diagnostics });

  for (const order of orders) {
    if (order.status !== "Delivered" || order.paymentInfo?.status !== "Succeeded" ||
        ["Processing refund", "Refund Success"].includes(order.refundInfo?.status)) continue;
    diagnostics.paidDeliveredOrdersRead++;
    const date = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
    if (!order.createdAt || !Number.isFinite(date.getTime()) || date >= cutoff ||
        (order.deliveredAt && new Date(order.deliveredAt) > now)) {
      diagnostics.excludedDateOrders++;
      continue;
    }
    const explicitCurrencies = [order.currency, order.paymentInfo?.currency,
      ...(Array.isArray(order.cart) ? order.cart.map((item) => item?.currency) : [])]
      .filter((value) => value !== undefined && value !== null && value !== "");
    if (explicitCurrencies.some((value) => normalizeText(value).toUpperCase() !== currency)) {
      return { available: false, reason: "UNSUPPORTED_CURRENCY",
        message: "Marketplace history contains a currency other than USD; conversion is not configured.", history: summary() };
    }
    const region = normalizeRegion(order.shippingAddress);
    if (!region) { diagnostics.excludedRegionOrders++; continue; }
    const customer = stableId(order.user?._id);
    const orderId = stableId(order._id);
    if (!customer || !orderId) { diagnostics.excludedCustomerOrders++; continue; }
    const month = monthIndex(date);
    let included = false;
    for (const item of Array.isArray(order.cart) ? order.cart : []) {
      const mapping = mapCategory(item);
      if (!mapping) { diagnostics.excludedUnmappedLineItems++; continue; }
      const qty = finiteNumber(item.qty);
      const unitPrice = finiteNumber(item.discountPrice);
      const lineTotal = finiteNumber(item.lineTotal);
      // Only captured sale amounts; originalPrice/current catalog prices are not sale evidence.
      const hasUnitPrice = item.discountPrice !== undefined && item.discountPrice !== null && item.discountPrice !== "";
      const revenue = hasUnitPrice ? (unitPrice !== null && unitPrice >= 0 ? unitPrice * qty : null) : lineTotal;
      const cents = revenue === null ? null : Math.round(revenue * 100);
      if (!Number.isSafeInteger(qty) || qty <= 0 || cents === null ||
          !Number.isSafeInteger(cents) || cents < 0) {
        diagnostics.excludedInvalidLineItems++;
        continue;
      }
      const key = bucketKey(region.key, mapping.modelCategory, month);
      if (!buckets.has(key)) buckets.set(key, emptyBucket());
      const bucket = buckets.get(key);
      if (!Number.isSafeInteger(bucket.revenueCents + cents)) {
        return { available: false, reason: "INVALID_HISTORY", message: "Historical sale revenue exceeds supported numerical limits.", history: summary() };
      }
      bucket.orders.add(orderId);
      bucket.customers.add(customer);
      bucket.revenueCents += cents;
      regions.set(region.key, region.label);
      categories.add(mapping.modelCategory);
      firstMonth = firstMonth === null ? month : Math.min(firstMonth, month);
      diagnostics.eligibleLineItems++;
      included = true;
    }
    if (included) diagnostics.eligibleOrders++;
  }
  if (!modelConfig) return { available: false, reason: "FEATURE_CONFIG_UNAVAILABLE",
    message: "Advertisement feature configuration is unavailable.", history: summary() };
  if (firstMonth === null || current - firstMonth + 1 < REQUIRED_MONTHS) {
    return { available: false, reason: "INSUFFICIENT_HISTORY",
      message: "Not enough marketplace demand history yet. Four completed calendar months are required.", history: summary() };
  }

  const read = (region, category, month) => buckets.get(bucketKey(region, category, month));
  const values = (bucket) => ({ orders: bucket?.orders.size || 0, customers: bucket?.customers.size || 0,
    revenue: (bucket?.revenueCents || 0) / 100 });
  const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
  const features = (region, category) => {
    if (!regions.has(region) || !categories.has(category)) throw new Error("UNKNOWN_HISTORY_CANDIDATE");
    const [t, p1, p2, p3] = [0, 1, 2, 3].map((lag) => values(read(region, category, current - lag)));
    const regionRows = [...categories].map((name) => values(read(region, name, current)));
    const categoryRows = [...regions.keys()].map((key) => values(read(key, category, current)));
    // Sums of per-category/per-region distinct counts, deliberately NOT a second global nunique.
    const result = {
      orders_current: t.orders, orders_prev_1: p1.orders, orders_prev_2: p2.orders, orders_prev_3: p3.orders,
      orders_3m_avg: (p1.orders + p2.orders + p3.orders) / 3,
      orders_3m_sum: p1.orders + p2.orders + p3.orders,
      customers_prev_1: p1.customers, customers_3m_sum: p1.customers + p2.customers + p3.customers,
      revenue_prev_1: p1.revenue, revenue_3m_sum: p1.revenue + p2.revenue + p3.revenue,
      demand_trend: p1.orders - p3.orders,
      region_month_orders: sum(regionRows, "orders"), region_month_customers: sum(regionRows, "customers"),
      region_month_revenue: sum(regionRows, "revenue"), category_month_orders: sum(categoryRows, "orders"),
      category_month_customers: sum(categoryRows, "customers"), category_month_revenue: sum(categoryRows, "revenue"),
    };
    if (modelConfig.featureColumns.length !== Object.keys(result).length ||
        modelConfig.featureColumns.some((name) => !Number.isFinite(result[name]))) throw new Error("FEATURE_CONTRACT_MISMATCH");
    return Object.fromEntries(modelConfig.featureColumns.map((name) => [name, result[name]]));
  };
  return { available: true, history: summary(), regions, categories, features };
}

async function loadMarketplaceHistory(now = new Date()) {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  // No seller filter: features always describe the whole marketplace.
  const orders = await Order.find({ status: "Delivered", "paymentInfo.status": "Succeeded",
    "refundInfo.status": { $nin: ["Processing refund", "Refund Success"] },
    createdAt: { $type: "date", $lt: cutoff } })
    .select("_id status paymentInfo currency refundInfo createdAt deliveredAt shippingAddress.city shippingAddress.state shippingAddress.country user._id cart")
    .lean();
  return buildMarketplaceHistory(orders, now);
}

module.exports = { buildMarketplaceHistory, loadMarketplaceHistory, normalizeRegion };
