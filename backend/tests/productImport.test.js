const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const Product = require("../model/product");
const { definitions, sellers, aiTypes } = require("../scripts/fyp-product-plan");
const { PRODUCT_TAXONOMY } = require("../utils/productTaxonomy");
const { mapCategory } = require("../config/advertising");
const importer = require("../scripts/import-fyp-products");
const headers = ["#", "Seller", "Product", "Cartify Category", "Subcategory", "Product Type", "AI Supported", "Existing/Create", "Suggested Original Price (USD)", "Stock", "Required Status", "Purpose / Notes"];
const cells = (values) => Object.fromEntries(values.map((v, i) => [String.fromCharCode(65 + i), String(v)]));
function fixture() {
  const shops = sellers.map(([name, email], i) => ({ _id: String(i + 1).padStart(24, "0"), name, email, verificationStatus: "approved", accountStatus: "active" }));
  shops[0].name = "Ava Mitchell";
  const rows = [cells(headers), ...definitions.map(([seller, name], i) => {
    const taxonomy = PRODUCT_TAXONOMY.find((t) => t.productType === aiTypes[i + 1]);
    return cells([i + 1, seller, name, taxonomy?.category || "Use existing matching category", taxonomy?.subcategory || "Use existing matching subcategory",
      taxonomy?.productType || "standard", taxonomy ? "Yes" : "No", i ? "Create" : "Existing", i ? 99.99 : "Keep current", 10, "Create + Admin Approve", ""]);
  })];
  const images = definitions.map((_, i) => ({ number: i + 1, relativePath: `${String(i + 1).padStart(2, "0")} Product/01.jpg`, sha256: "fixture" }));
  const products = [{ _id: "507f1f77bcf86cd799439011", shopId: shops[0]._id, name: definitions[0][1], category: "Mobile and Tablets",
    subcategory: "Mobile Phones", productType: "smartphone", images: ["keep-existing.png"], stock: 10, isActive: true, originalPrice: 451.46, approvalStatus: "approved" }];
  return { assets: { rows, images, workbookSha256: "fixture" }, shops, products };
}
const planFor = (f) => importer.buildPlan(f.assets, f.shops, f.products);

test("approved plan preserves all 32 allocations and reuses the original Samsung without mutation", () => {
  const f = fixture(), before = JSON.stringify(f);
  const plan = planFor(f);
  assert.equal(plan.filter((r) => r.action === "REUSE").length, 1);
  assert.equal(plan.filter((r) => r.action === "CREATE").length, 31);
  assert.equal(plan[0].existingId, f.products[0]._id);
  assert.equal(plan[0].originalPrice, undefined);
  assert.equal(JSON.stringify(f), before);
  assert.deepEqual(sellers.map(([seller]) => plan.filter((p) => p.seller === seller).length), [4, 3, 3, 3, 4, 4, 3, 3, 3, 2]);
});

test("eight AI products retain exact taxonomies and advertisement category mappings", () => {
  const plan = planFor(fixture());
  const ai = plan.filter((p) => p.productType);
  assert.equal(ai.length, 8);
  for (const type of ["smartphone", "laptop", "cookware", "running_shoes"]) {
    assert.equal(ai.filter((p) => p.productType === type).length, 2);
    ai.filter((p) => p.productType === type).forEach((p) => assert.ok(mapCategory(p)));
  }
  assert.equal(plan[3].specifications.find((s) => s.name === "Gender").value, "Men");
  assert.equal(plan[13].specifications.find((s) => s.name === "Gender").value, "Women");
});

test("ordinary products omit unsupported taxonomy and every proposed payload validates against the real schema", async () => {
  const plan = planFor(fixture());
  for (const row of plan.slice(1)) {
    const fields = importer.fieldsFor(row);
    if (!row.productType) {
      assert.equal(fields.productType, undefined);
      assert.equal(fields.subcategory, undefined);
      assert.equal(mapCategory(row), null);
    }
    await new Product({ ...fields, specifications: row.specifications, shop: {}, images: ["fixture.png"] }).validate();
  }
});

test("any unapproved/suspended/missing/mismatched seller blocks the entire plan", () => {
  for (const status of ["pending", "rejected"]) {
    const f = fixture(); f.shops[9].verificationStatus = status;
    assert.throws(() => planFor(f), /active and approved/);
  }
  const f = fixture(); f.shops[9].accountStatus = "suspended";
  assert.throws(() => planFor(f), /active and approved/);
  f.shops.pop(); assert.throws(() => planFor(f), /Missing\/duplicate seller/);
  const wrong = fixture(); wrong.shops[1].name = "Different shop";
  assert.throws(() => planFor(wrong), /identity mismatch/);
});

test("changed titles, seller allocations, AI taxonomy, prices, images or duplicate numbers fail closed", () => {
  for (const mutate of [
    (f) => { f.assets.rows[2].C = "Other laptop"; },
    (f) => { f.assets.rows[2].B = "Other seller"; },
    (f) => { f.assets.rows[2].F = "standard"; },
    (f) => { f.assets.rows[2].I = "-1"; },
    (f) => { f.assets.rows[2].J = "0"; },
    (f) => { f.assets.rows[2].A = "1"; },
    (f) => { f.assets.images[1].number = 99; },
  ]) {
    const f = fixture(); mutate(f); assert.throws(() => planFor(f));
  }
});

test("missing Samsung, duplicate titles and colliding deterministic IDs cannot create replacements", () => {
  const f = fixture(); f.products = []; assert.throws(() => planFor(f), /must never be recreated/);
  const duplicate = fixture(); duplicate.products.push({ ...duplicate.products[0], _id: "507f1f77bcf86cd799439012", name: "  SAMSUNG   Galaxy A55 5G 256GB 8GB RAM Unlocked Smartphone " });
  assert.throws(() => planFor(duplicate), /Duplicate existing/);
  const collision = fixture(); const row = planFor(collision)[1];
  collision.products.push({ _id: row.id, shopId: row.shopId, name: "Unrelated item" });
  assert.throws(() => planFor(collision), /ID collision/);
});

test("a second plan detects all 32 products and proposes zero new records", () => {
  const f = fixture(); const plan = planFor(f);
  for (const row of plan.slice(1)) f.products.push({ ...importer.fieldsFor(row), _id: row.id, images: ["uploaded.png"], stock: row.stock, isActive: true, approvalStatus: "pending" });
  const again = planFor(f);
  assert.equal(again.filter((r) => r.action === "REUSE").length, 32);
  assert.equal(again.filter((r) => r.action === "CREATE").length, 0);
});

test("normalization is stable and local-only URL/argument guards reject unsafe execution", () => {
  assert.equal(importer.productId(2, " SELLER@example.com ", " A   LAPTOP "), importer.productId(2, "seller@example.com", "a laptop"));
  assert.equal(importer.localUrl("http://localhost:8000"), "http://localhost:8000");
  for (const url of ["https://example.com", "http://user:pass@localhost:8000", "http://localhost:8000/other", "http://localhost:8000/?token=x"]) assert.throws(() => importer.localUrl(url));
  assert.deepEqual(importer.options([]), {});
  assert.throws(() => importer.options(["--force"]));
  assert.throws(() => importer.options(["--apply", "--confirm"]));
});

test("normal seller login uses the existing user response/cookie and rejects a different identity", async () => {
  let seen;
  const api = http.createServer((req, res) => {
    let body = ""; req.on("data", (part) => { body += part; }); req.on("end", () => {
      seen = { path: req.url, origin: req.headers.origin, body: JSON.parse(body) };
      res.writeHead(201, { "Content-Type": "application/json", "Set-Cookie": "seller_token=isolated-fixture-cookie; HttpOnly; Path=/" });
      res.end(JSON.stringify({ success: true, user: { _id: "fixture-owner" } }));
    });
  });
  await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
  try {
    const base = `http://127.0.0.1:${api.address().port}`;
    const cookie = await importer.login(base, { _id: "fixture-owner", name: "Fixture", email: "fixture@example.invalid" }, "fixture-only");
    assert.equal(cookie, "seller_token=isolated-fixture-cookie");
    assert.equal(seen.path, "/api/v2/shop/login-shop");
    assert.equal(seen.origin, "http://localhost:3000");
    assert.deepEqual(seen.body, { email: "fixture@example.invalid", password: "fixture-only" });
    await assert.rejects(importer.login(base, { _id: "other", name: "Other", email: "fixture@example.invalid" }, "fixture-only"), /login failed/);
  } finally { await new Promise((resolve) => { api.close(resolve); api.closeAllConnections(); }); }
});
