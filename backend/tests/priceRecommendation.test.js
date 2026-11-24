const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Shop = require("../model/shop");
const Product = require("../model/product");
const router = require("../controller/product");
const errorMiddleware = require("../middleware/error");
const { predictSmartphonePrice } = require("../utils/mlPricingClient");

const sellerId = "507f1f77bcf86cd799439011";
const seller = { id: sellerId, _id: sellerId, accountStatus: "active", verificationStatus: "approved" };
const originalFindShop = Shop.findById;
const originalCreate = Product.create;
const savedEnvironment = {
  JWT_SECRET: process.env.JWT_SECRET,
  ML_SERVICE_URL: process.env.ML_SERVICE_URL,
  ML_SERVICE_TIMEOUT_MS: process.env.ML_SERVICE_TIMEOUT_MS,
};
let api, ml, apiUrl, mlUrl, cookie, behavior, mlCalls, lastPayload, lastPath;
let writes = [];
const validInput = {
  name: " Samsung Galaxy A55 5G ", brand: "Samsung",
  category: "Mobile and Tablets", subcategory: "Mobile Phones", productType: "smartphone", condition: "new",
  description: "Unlocked Android phone",
  specifications: [{ name: " Storage ", value: "256GB" }, { name: "RAM", value: "8GB" }],
  variants: [{ name: "Color", options: ["Blue"] }], shopId: "untrusted-identity",
};
const laptopInput = {
  ...validInput, name: "ThinkPad T14", brand: "Lenovo",
  category: "Computers and Laptops", subcategory: "Laptops", productType: "laptop",
  specifications: "RAM: 16GB\nStorage: 512GB", features: "Backlit keyboard",
};
const cookwareInput = {
  ...validInput, name: "Stainless steel cookware set", brand: "Cuisinart",
  category: "Others", subcategory: "Cookware Sets", productType: "cookware", condition: undefined,
  specifications: "Material: Stainless steel\nPieces: 10", features: "Induction compatible",
  originalPrice: "200", discountPrice: "20", seller_original_price: 999,
};
const runningShoesInput = {
  ...validInput, name: "Adult performance running shoes", brand: "Brooks",
  category: "Shoes", subcategory: "Adult Performance Running Shoes", productType: "running_shoes", condition: undefined,
  gender: "Men", running_type: "Road Running", specifications: "Cushioning: High",
  originalPrice: "100", discountPrice: "10", seller_original_price: 999,
};
const v2Response = (category, extra = {}) => ({
  success: true, category, recommended_price: 100, recommendation_allowed: true,
  reason: null, currency: "USD", ...extra,
});
const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const stop = (server) => new Promise((resolve) => {
  server.close(resolve);
  server.closeAllConnections();
});
const post = async (body, auth = cookie) => {
  const response = await fetch(`${apiUrl}/api/v2/product/recommend-price`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { Cookie: auth } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
};

before(async () => {
  process.env.JWT_SECRET = "test-only-secret-never-used-for-live-authentication";
  process.env.ML_SERVICE_TIMEOUT_MS = "1000";
  cookie = `seller_token=${jwt.sign({ id: sellerId }, process.env.JWT_SECRET)}`;
  Shop.findById = async (id) => id === sellerId ? seller : null;
  Product.create = async (data) => {
    const product = new Product(data);
    await product.validate();
    writes.push(product.toObject());
    return product;
  };
  mlCalls = 0;
  behavior = (req, res) => res.end(JSON.stringify(req.url === "/predict"
    ? { success: true, recommended_price: 525.89, currency: "USD", raw_prediction: 525.8929 }
    : v2Response(lastPayload.category)));
  ml = http.createServer((req, res) => {
    mlCalls++;
    assert.ok(["/predict", "/predict/v2"].includes(req.url));
    assert.equal(req.method, "POST");
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      lastPayload = JSON.parse(body);
      lastPath = req.url;
      behavior(req, res);
    });
  });
  await listen(ml);
  mlUrl = `http://127.0.0.1:${ml.address().port}`;
  process.env.ML_SERVICE_URL = mlUrl;
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/v2/product", router);
  app.use(errorMiddleware);
  api = http.createServer(app);
  await listen(api);
  apiUrl = `http://127.0.0.1:${api.address().port}`;
});

after(async () => {
  Shop.findById = originalFindShop;
  Product.create = originalCreate;
  for (const [key, value] of Object.entries(savedEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await stop(api);
  await stop(ml);
});

test("authenticated smartphone recommendation uses exact ML contract and never writes a product", async () => {
  const result = await post(validInput);
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, { success: true, recommendation: { price: 525.89, currency: "USD", productType: "smartphone" } });
  assert.deepEqual(lastPayload, {
    title: "Samsung Galaxy A55 5G", brand: "Samsung", condition: "New",
    specifications: "Storage: 256GB; RAM: 8GB", features: "", description: "Unlocked Android phone",
  });
  assert.equal(writes.length, 0);
  assert.equal(lastPath, "/predict");
});

test("existing form specification text is normalized deterministically; optional text may be empty", async () => {
  const result = await post({ ...validInput, specifications: "Storage: 256GB\nRAM: 8GB", description: "", condition: "refurbished" });
  assert.equal(result.status, 200);
  assert.equal(lastPayload.specifications, "Storage: 256GB; RAM: 8GB");
  assert.equal(lastPayload.condition, "Refurbished");
  assert.equal(lastPayload.description, "");
});

test("unauthenticated, customer-only, invalid, expired, missing-account, and suspended sellers cannot call ML", async () => {
  const count = mlCalls;
  for (const auth of ["", "token=customer-only", "seller_token=invalid",
    `seller_token=${jwt.sign({ id: sellerId }, process.env.JWT_SECRET, { expiresIn: -1 })}`,
    `seller_token=${jwt.sign({ id: "missing" }, process.env.JWT_SECRET)}`]) {
    assert.equal((await post(validInput, auth)).status, 401);
  }
  seller.accountStatus = "suspended";
  try { assert.equal((await post(validInput)).status, 403); }
  finally { seller.accountStatus = "active"; }
  assert.equal(mlCalls, count);
});

test("all required fields and controlled conditions are validated before ML", async () => {
  const count = mlCalls;
  for (const field of ["name", "brand", "category", "subcategory", "productType", "condition"]) {
    for (const value of [undefined, "", 123, {}]) {
      const result = await post({ ...validInput, [field]: value });
      assert.equal(result.status, 400, `${field}=${JSON.stringify(value)}`);
      assert.equal(result.data.code, "AI_PRICE_INVALID_INPUT");
    }
  }
  for (const body of [null, [], { ...validInput, condition: "Almost new" }, { ...validInput, name: "x".repeat(301) }, { ...validInput, description: {} }]) {
    assert.equal((await post(body)).status, 400);
  }
  assert.equal(mlCalls, count);
});

test("malformed and excessive specifications are rejected before ML", async () => {
  const count = mlCalls;
  for (const specifications of [null, 12, {}, [null], [{ name: "RAM" }], [{ name: "RAM", value: 8 }],
    ["RAM: 8GB"], "RAM without separator", "RAM:", Array(51).fill({ name: "RAM", value: "8GB" }), "x".repeat(10001)]) {
    assert.equal((await post({ ...validInput, specifications })).status, 400);
  }
  assert.equal(mlCalls, count);
});

test("tablets and non-phone taxonomies never reach smartphone ML", async () => {
  const count = mlCalls;
  const tablet = await post({ ...validInput, subcategory: "Tablets", productType: "tablet" });
  assert.equal(tablet.status, 422);
  assert.equal(tablet.data.code, "AI_PRICE_UNSUPPORTED_PRODUCT_TYPE");
  for (const body of [{ ...validInput, category: "Shoes" }, { ...validInput, category: "Computers and Laptops" },
    { ...validInput, category: "Shoes", subcategory: "Sneakers", productType: "shoe" },
    { ...validInput, subcategory: "Tablets" }, { ...validInput, productType: "constructor" }]) {
    assert.equal((await post(body)).status, 400);
  }
  assert.equal(mlCalls, count);
});

test("ML non-2xx, redirect, malformed JSON, invalid values, currency, success flag, and oversized body fail safely", async () => {
  const normal = behavior;
  try {
    for (const status of [422, 500, 302]) {
      behavior = (req, res) => { res.statusCode = status; res.end("internal-service-detail"); };
      const result = await post(validInput);
      assert.equal(result.status, 502);
      assert.equal(result.data.code, "AI_PRICE_UNAVAILABLE");
      assert.ok(!JSON.stringify(result).includes("internal-service-detail"));
    }
    for (const body of ["not json", "null", "x".repeat(65537),
      ...[-1, "525.89", null, {}, 1e100].map((price) => JSON.stringify({ success: true, currency: "USD", recommended_price: price })),
      JSON.stringify({ success: false, currency: "USD", recommended_price: 500 }),
      JSON.stringify({ success: "true", currency: "USD", recommended_price: 500 }),
      JSON.stringify({ success: true, currency: "EUR", recommended_price: 500 }),
      JSON.stringify({ success: true, recommended_price: 500 })]) {
      behavior = (req, res) => res.end(body);
      assert.equal((await post(validInput)).status, 502);
    }
    behavior = (req, res) => res.end(JSON.stringify({ success: true, currency: "USD", recommended_price: 0 }));
    assert.equal((await post(validInput)).data.recommendation.price, 0);
  } finally { behavior = normal; }
});

test("wall-clock timeout covers missing headers and a stalled body", async () => {
  const normal = behavior;
  process.env.ML_SERVICE_TIMEOUT_MS = "30";
  try {
    for (const stalledBody of [false, true]) {
      behavior = (req, res) => { if (stalledBody) res.write('{"success":'); };
      assert.equal((await post(validInput)).status, 504);
    }
  } finally {
    behavior = normal;
    process.env.ML_SERVICE_TIMEOUT_MS = "1000";
  }
});

test("connection failure and invalid or absent environment configuration are controlled", async () => {
  const closedServer = http.createServer();
  await listen(closedServer);
  const closedUrl = `http://127.0.0.1:${closedServer.address().port}`;
  await stop(closedServer);
  try {
    for (const url of [closedUrl, undefined, "file:///tmp/model", "http://user:password@localhost", "broken-url"]) {
      if (url === undefined) delete process.env.ML_SERVICE_URL;
      else process.env.ML_SERVICE_URL = url;
      const result = await post(validInput);
      assert.equal(result.status, 503);
      assert.ok(!JSON.stringify(result).includes("password"));
    }
    process.env.ML_SERVICE_URL = mlUrl;
    for (const timeout of ["NaN", "0", "30001", "1.5"]) {
      process.env.ML_SERVICE_TIMEOUT_MS = timeout;
      await assert.rejects(predictSmartphonePrice({}), (error) => error.statusCode === 503);
    }
  } finally {
    process.env.ML_SERVICE_URL = mlUrl;
    process.env.ML_SERVICE_TIMEOUT_MS = "1000";
  }
});

test("legacy and new products validate; invalid taxonomy and condition are rejected", async () => {
  const base = { name: "Legacy shoes", description: "Shoes", category: "Shoes", originalPrice: 100, stock: 2, shopId: sellerId, shop: seller };
  const legacy = new Product(base);
  await legacy.validate();
  assert.equal(legacy.productType, undefined);
  assert.equal(legacy.condition, undefined);
  await new Product({ ...base, ...validInput, shopId: sellerId, shop: seller }).validate();
  await assert.rejects(new Product({ ...base, condition: "arbitrary" }).validate());
  await assert.rejects(new Product({ ...base, subcategory: "Mobile Phones", productType: "smartphone" }).validate());
});

test("multipart creation works for legacy, smartphone, and tablet products after ML failure, with original pricing semantics", async () => {
  const count = mlCalls;
  for (const extra of [{}, { subcategory: "Mobile Phones", productType: "smartphone", condition: "new" },
    { subcategory: "Tablets", productType: "tablet", condition: "used" }]) {
    const form = new FormData();
    const fields = { name: "New listing", description: "Product description", category: extra.productType ? "Mobile and Tablets" : "Shoes",
      originalPrice: "600", stock: "2", shopId: sellerId, specifications: "Storage: 256GB", ...extra };
    if (extra.productType === "smartphone") fields.discountPrice = "525.89";
    Object.entries(fields).forEach(([key, value]) => form.append(key, value));
    const response = await fetch(`${apiUrl}/api/v2/product/create-product`, { method: "POST", headers: { Cookie: cookie }, body: form });
    assert.equal(response.status, 201);
    const { product } = await response.json();
    assert.equal(product.originalPrice, 600);
    assert.equal(product.discountPrice, extra.productType === "smartphone" ? 525.89 : 600);
    assert.equal(product.approvalStatus, "pending");
    assert.equal(product.productType, extra.productType);
    assert.equal(product.condition, extra.condition);
    assert.deepEqual(product.specifications.map(({ name, value }) => ({ name, value })), [{ name: "Storage", value: "256GB" }]);
  }
  assert.equal(mlCalls, count);
  assert.equal(writes.length, 3);
});

test("Laptop New uses /predict/v2 with the exact model payload and camelCase result", async () => {
  const result = await post(laptopInput);
  assert.equal(result.status, 200);
  assert.equal(lastPath, "/predict/v2");
  assert.deepEqual(lastPayload, {
    category: "laptop", title: "ThinkPad T14", brand: "Lenovo", condition: "New",
    specifications: "RAM: 16GB; Storage: 512GB", features: "Backlit keyboard", description: laptopInput.description,
  });
  assert.deepEqual(result.data, { success: true, recommendation: {
    productType: "laptop", recommendedPrice: 100, recommendationAllowed: true, reason: null, currency: "USD",
  } });
});

test("Laptop Refurbished is supported but Used and unknown conditions never call ML", async () => {
  const refurbished = await post({ ...laptopInput, condition: "refurbished" });
  assert.equal(refurbished.status, 200);
  assert.equal(lastPayload.condition, "Refurbished");
  assert.equal(lastPath, "/predict/v2");
  const count = mlCalls;
  const used = await post({ ...laptopInput, condition: "used" });
  assert.equal(used.status, 422);
  assert.equal(used.data.code, "AI_PRICE_UNSUPPORTED_CONDITION");
  for (const condition of [undefined, "", "Almost new", 123, {}]) {
    const invalid = await post({ ...laptopInput, condition });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.data.code, "AI_PRICE_INVALID_INPUT");
  }
  assert.equal(mlCalls, count);
});

test("Cookware normalizes generic specifications and uses originalPrice exclusively as the reference", async () => {
  const result = await post(cookwareInput);
  assert.equal(result.status, 200);
  assert.equal(result.data.recommendation.productType, "cookware");
  assert.equal(lastPath, "/predict/v2");
  assert.deepEqual(lastPayload, {
    category: "cookware", title: cookwareInput.name, brand: cookwareInput.brand,
    specifications: "Material: Stainless steel; Pieces: 10", features: "Induction compatible",
    description: cookwareInput.description, seller_original_price: 200,
  });
});

test("Cookware and Running Shoes suppression preserves every guardrail field without failing or writing products", async () => {
  const normal = behavior;
  const beforeWrites = writes.length;
  try {
    for (const input of [cookwareInput, runningShoesInput]) {
      behavior = (req, res) => res.end(JSON.stringify(v2Response(lastPayload.category, {
        recommended_price: 450.126, recommendation_allowed: false, reason: "excessive_deviation",
        deviation_percent: 125.063, original_price_in_supported_range: true, prediction_in_supported_range: false,
      })));
      const result = await post(input);
      assert.equal(result.status, 200);
      assert.deepEqual(result.data, { success: true, recommendation: {
        productType: input.productType, recommendedPrice: 450.13, recommendationAllowed: false,
        reason: "excessive_deviation", deviationPercent: 125.063, originalPriceInSupportedRange: true,
        predictionInSupportedRange: false, currency: "USD",
      } });
    }
    assert.equal(writes.length, beforeWrites);
  } finally { behavior = normal; }
});

test("valid suppressed v2 responses may omit a price or return null; nullable guardrail fields survive", async () => {
  const normal = behavior;
  try {
    for (const recommended_price of [undefined, null, 0]) {
      behavior = (req, res) => res.end(JSON.stringify(v2Response("cookware", {
        recommended_price, recommendation_allowed: false, reason: "original_price_outside_supported_range",
        deviation_percent: null, original_price_in_supported_range: false, prediction_in_supported_range: null,
      })));
      const result = await post(cookwareInput);
      assert.equal(result.status, 200);
      assert.deepEqual(result.data.recommendation, {
        productType: "cookware", recommendedPrice: recommended_price === 0 ? 0 : null,
        recommendationAllowed: false, reason: "original_price_outside_supported_range",
        deviationPercent: null, originalPriceInSupportedRange: false, predictionInSupportedRange: null, currency: "USD",
      });
    }
  } finally { behavior = normal; }
});

test("Running Shoes sends validated gender, running_type, specifications, and originalPrice", async () => {
  for (const gender of ["Men", "Women"]) {
    for (const running_type of ["Running", "Road Running", "Trail Running"]) {
      const result = await post({ ...runningShoesInput, gender, running_type, originalPrice: 100 });
      assert.equal(result.status, 200);
      assert.equal(result.data.recommendation.productType, "running_shoes");
      assert.equal(lastPath, "/predict/v2");
      assert.deepEqual(lastPayload, {
        category: "running_shoes", title: runningShoesInput.name, brand: runningShoesInput.brand,
        gender, running_type, specifications: "Cushioning: High", features: "",
        description: runningShoesInput.description, seller_original_price: 100,
      });
    }
  }
});

test("Running Shoes rejects missing or unsupported gender and running_type before contacting ML", async () => {
  const count = mlCalls;
  for (const [field, invalidValues] of [
    ["gender", [undefined, "", "Unisex", "Kids", "men", 123, {}]],
    ["running_type", [undefined, "", "Casual", "Walking", "running", 123, {}]],
  ]) {
    for (const value of invalidValues) {
      const result = await post({ ...runningShoesInput, [field]: value });
      assert.equal(result.status, 400, `${field}=${JSON.stringify(value)}`);
      assert.equal(result.data.code, "AI_PRICE_INVALID_INPUT");
    }
  }
  assert.equal(mlCalls, count);
});

test("guarded models require a finite positive originalPrice and never fall back to discountPrice or supplied ML fields", async () => {
  const count = mlCalls;
  for (const input of [cookwareInput, runningShoesInput]) {
    for (const originalPrice of [undefined, null, "", " ", 0, -1, true, [], {}, "NaN", "Infinity", "1e309", 1e100]) {
      const result = await post({ ...input, originalPrice });
      assert.equal(result.status, 400, `${input.productType}: originalPrice=${JSON.stringify(originalPrice)}`);
      assert.equal(result.data.code, "AI_PRICE_INVALID_INPUT");
    }
  }
  assert.equal(mlCalls, count);
});

test("new models still require exact taxonomy; generic shoes, unsupported types, and model hints never contact ML", async () => {
  const count = mlCalls;
  for (const body of [
    { ...laptopInput, category: "Computers and Laptop" },
    { ...laptopInput, subcategory: "Desktop Computers" },
    { ...cookwareInput, category: "Kitchen" },
    { ...cookwareInput, productType: "cookware_sets" },
    { ...runningShoesInput, subcategory: "Casual Shoes" },
    { ...runningShoesInput, productType: "shoe" },
    { ...runningShoesInput, productType: "adult_performance_running_shoes" },
    { ...runningShoesInput, productType: "constructor" },
    { ...validInput, productType: "unknown", category: "Others" },
    { ...validInput, subcategory: "Tablets", productType: "tablet", name: "Smartphone Laptop Cookware Running Shoes" },
  ]) {
    const result = await post(body);
    assert.ok([400, 422].includes(result.status));
  }
  assert.equal(mlCalls, count);
});

test("v2 rejects invalid model identity, metadata, guardrail flags, and invalid or non-finite prices", async () => {
  const normal = behavior;
  try {
    for (const input of [laptopInput, cookwareInput, runningShoesInput]) {
      const valid = v2Response(input.productType);
      for (const extra of [
        { category: "smartphone" }, { category: undefined }, { success: false }, { currency: "EUR" },
        { recommendation_allowed: "false" }, { recommendation_allowed: 0 }, { recommendation_allowed: null },
        { reason: {} }, { reason: 123 }, { reason: undefined },
        ...[-1, "100", null, undefined, {}, 1e100].map((recommended_price) => ({ recommended_price })),
        { recommendation_allowed: false, recommended_price: -1, reason: "suppressed" },
        { deviation_percent: "30" }, { deviation_percent: -1 },
        { original_price_in_supported_range: "false" }, { prediction_in_supported_range: 0 },
      ]) {
        behavior = (req, res) => res.end(JSON.stringify({ ...valid, ...extra }));
        const result = await post(input);
        assert.equal(result.status, 502, JSON.stringify(extra));
        assert.equal(result.data.code, "AI_PRICE_UNAVAILABLE");
      }
      for (const field of ["recommended_price", "deviation_percent"]) {
        const body = JSON.stringify({ ...valid, [field]: "OVERFLOW" }).replace('"OVERFLOW"', "1e309");
        behavior = (req, res) => res.end(body);
        assert.equal((await post(input)).status, 502);
      }
      behavior = (req, res) => res.end(JSON.stringify({ ...valid, recommended_price: 0, recommendation_allowed: undefined }));
      const result = await post(input);
      assert.equal(result.status, 200);
      assert.equal(result.data.recommendation.recommendedPrice, 0);
      assert.equal(result.data.recommendation.recommendationAllowed, true);
    }
  } finally { behavior = normal; }
});

test("v2 uses the existing controlled HTTP, JSON, body-size, connection, and timeout error semantics", async () => {
  const normal = behavior;
  try {
    for (const status of [422, 500, 302]) {
      behavior = (req, res) => { res.statusCode = status; res.end("internal-service-detail"); };
      const result = await post(laptopInput);
      assert.equal(result.status, 502);
      assert.equal(result.data.code, "AI_PRICE_UNAVAILABLE");
      assert.ok(!JSON.stringify(result).includes("internal-service-detail"));
    }
    for (const body of ["not json", "null", "x".repeat(65537)]) {
      behavior = (req, res) => res.end(body);
      assert.equal((await post(laptopInput)).status, 502);
    }
    process.env.ML_SERVICE_TIMEOUT_MS = "30";
    for (const stalledBody of [false, true]) {
      behavior = (req, res) => { if (stalledBody) res.write('{"success":'); };
      const result = await post(laptopInput);
      assert.equal(result.status, 504);
      assert.equal(result.data.code, "AI_PRICE_UNAVAILABLE");
    }
    delete process.env.ML_SERVICE_URL;
    const unavailable = await post(laptopInput);
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.data.code, "AI_PRICE_UNAVAILABLE");
  } finally {
    behavior = normal;
    process.env.ML_SERVICE_URL = mlUrl;
    process.env.ML_SERVICE_TIMEOUT_MS = "1000";
  }
});

test("Smartphone still ignores new model fields and keeps its legacy payload and response", async () => {
  const result = await post({ ...validInput, features: "Do not add to legacy payload", originalPrice: 100,
    seller_original_price: 999, gender: "Men", running_type: "Running" });
  assert.equal(lastPath, "/predict");
  assert.deepEqual(lastPayload, {
    title: "Samsung Galaxy A55 5G", brand: "Samsung", condition: "New",
    specifications: "Storage: 256GB; RAM: 8GB", features: "", description: "Unlocked Android phone",
  });
  assert.deepEqual(result.data, { success: true, recommendation: { price: 525.89, currency: "USD", productType: "smartphone" } });
});

test("manual creation retains seller prices after unsupported Laptop condition, Cookware suppression, or Running Shoes ML failure", async () => {
  const normal = behavior;
  const beforeWrites = writes.length;
  try {
    for (const input of [{ ...laptopInput, condition: "used", originalPrice: 800 }, cookwareInput, runningShoesInput]) {
      behavior = (req, res) => {
        if (lastPayload.category === "running_shoes") { res.statusCode = 500; res.end(); }
        else res.end(JSON.stringify(v2Response("cookware", { recommendation_allowed: false, reason: "excessive_deviation" })));
      };
      const recommendation = await post(input);
      assert.equal(recommendation.status, input.productType === "laptop" ? 422 : input.productType === "cookware" ? 200 : 502);
      const count = mlCalls;
      const form = new FormData();
      const fields = {
        name: input.name, brand: input.brand, description: "Manual product listing", category: input.category,
        subcategory: input.subcategory, productType: input.productType, originalPrice: String(input.originalPrice),
        discountPrice: "75.25", stock: "2", shopId: sellerId, specifications: input.specifications,
      };
      if (input.condition) fields.condition = input.condition;
      Object.entries(fields).forEach(([key, value]) => form.append(key, value));
      const response = await fetch(`${apiUrl}/api/v2/product/create-product`, { method: "POST", headers: { Cookie: cookie }, body: form });
      assert.equal(response.status, 201);
      const { product } = await response.json();
      assert.equal(product.originalPrice, Number(input.originalPrice));
      assert.equal(product.discountPrice, 75.25);
      assert.equal(product.productType, input.productType);
      assert.equal(product.condition, input.condition);
      assert.equal(product.approvalStatus, "pending");
      assert.equal(product.recommendationAllowed, undefined);
      assert.equal(product.seller_original_price, undefined);
      assert.equal(mlCalls, count);
    }
    assert.equal(writes.length, beforeWrites + 3);
  } finally { behavior = normal; }
});
