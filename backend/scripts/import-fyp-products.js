// Manual only. Dry run by default; writes use the real authenticated create-product API and Multer.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const { definitions, sellers, aiTypes } = require("./fyp-product-plan");
const { PRODUCT_TAXONOMY, validateProductTaxonomy } = require("../utils/productTaxonomy");
const { fingerprint, readWorkbook, parseWorkbook } = require("./import-fyp-accounts");

const backendDir = path.resolve(__dirname, "..");
const projectDir = path.dirname(backendDir);
const normalize = (value) => String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const productId = (number, email, name) => hash(`cartify-fyp-products-v1|${number}|${normalize(email)}|${normalize(name)}`).slice(0, 24);
const matchProducts = (products, row) => products.filter((p) => String(p.shopId) === String(row.shopId) && normalize(p.name) === normalize(row.name));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function readAssets(workbook, images) {
  const python = process.env.CARTIFY_PRODUCT_PYTHON || "python";
  const result = spawnSync(python, [path.join(__dirname, "read-product-assets.py"), workbook, images], {
    windowsHide: true, encoding: "utf8", timeout: 60000, maxBuffer: 2 * 1024 * 1024,
  });
  assert(!result.error && result.status === 0, `Product/image preflight failed: ${(result.stderr || "Set CARTIFY_PRODUCT_PYTHON to a Python environment with Pillow.").trim()}`);
  return JSON.parse(result.stdout);
}

function buildPlan(assets, shops, products) {
  const columns = ["#", "Seller", "Product", "Cartify Category", "Subcategory", "Product Type", "AI Supported", "Existing/Create", "Suggested Original Price (USD)", "Stock", "Required Status", "Purpose / Notes"];
  const header = assets.rows[0];
  assert(header && columns.every((name, i) => header[String.fromCharCode(65 + i)] === name), "Unexpected Product Allocation headers.");
  assert(assets.rows.length === 33 && assets.images.length === 32, "The approved plan requires 32 rows and 32 images.");
  const matchedShops = new Map();
  for (const [label, email] of sellers) {
    const matches = shops.filter((s) => normalize(s.email) === normalize(email));
    assert(matches.length === 1, `Missing/duplicate seller: ${label}.`);
    const shop = matches[0];
    assert(normalize(shop.name) === normalize(label) || (label === "Maple & Main Home" && normalize(shop.name) === "ava mitchell"), `Seller identity mismatch: ${label}.`);
    assert(shop.accountStatus === "active" && shop.verificationStatus === "approved", `Seller must be active and approved: ${label}.`);
    matchedShops.set(label, shop);
  }
  const seen = new Set();
  return assets.rows.slice(1).map((source) => {
    const number = Number(source.A);
    assert(Number.isInteger(number) && number >= 1 && number <= 32 && !seen.has(number), "Invalid/repeated product number.");
    seen.add(number);
    const [seller, name, category, brand, description, specifications = {}] = definitions[number - 1];
    assert(normalize(source.B) === normalize(seller) && normalize(source.C) === normalize(name), `Workbook allocation/title changed for #${number}.`);
    const shop = matchedShops.get(seller);
    const originalPrice = number === 1 ? undefined : Number(source.I);
    const stock = Number(source.J);
    assert(Number.isInteger(stock) && stock > 0 && (number === 1 || (Number.isFinite(originalPrice) && originalPrice > 0)), `Invalid price/stock for #${number}.`);
    assert(normalize(source.H) === (number === 1 ? "existing" : "create"), `Unexpected Existing/Create status for #${number}.`);
    const productType = aiTypes[number];
    const taxonomy = productType ? PRODUCT_TAXONOMY.find((t) => t.productType === productType) : null;
    if (taxonomy) {
      assert(source.D === taxonomy.category && source.E === taxonomy.subcategory && source.F === taxonomy.productType && source.G === "Yes", `AI taxonomy changed for #${number}.`);
    } else {
      assert(source.D === "Use existing matching category" && source.E === "Use existing matching subcategory" && source.F === "standard" && source.G === "No", `Unexpected ordinary taxonomy for #${number}.`);
    }
    const id = productId(number, shop.email, name);
    const row = { number, seller, shopId: String(shop._id), email: shop.email, id, name, category, brand, description,
      stock, ...(originalPrice !== undefined ? { originalPrice, discountPrice: originalPrice } : {}),
      ...(taxonomy ? { subcategory: taxonomy.subcategory, productType, condition: "new" } : {}),
      specifications: Object.entries(specifications).map(([name, value]) => ({ name, value })),
      image: assets.images.find((image) => image.number === number) };
    assert(row.image, `Missing validated image for #${number}.`);
    validateProductTaxonomy(row);
    const matches = matchProducts(products, row);
    assert(matches.length <= 1, `Duplicate existing seller/title for #${number}.`);
    assert(!products.some((p) => String(p._id) === id && !matches.includes(p)), `Deterministic ID collision for #${number}.`);
    const existing = matches[0];
    if (number === 1) assert(existing, "The original Samsung must exist; it must never be recreated.");
    if (existing) {
      assert(existing.category === category && (!taxonomy || (existing.subcategory === row.subcategory && existing.productType === productType)), `Existing product taxonomy differs for #${number}; no automatic updates permitted.`);
      assert(existing.isActive !== false && existing.stock > 0 && existing.images?.length, `Existing product needs manual review for #${number}.`);
    }
    return { ...row, existingId: existing ? String(existing._id) : null, action: existing ? "REUSE" : "CREATE" };
  }).sort((a, b) => a.number - b.number);
}

function fieldsFor(row) {
  const fields = { _id: row.id, name: row.name, description: row.description, category: row.category,
    brand: row.brand, stock: String(row.stock), originalPrice: String(row.originalPrice), discountPrice: String(row.discountPrice),
    shopId: row.shopId, sku: `CARTIFY-FYP-PRODUCT-${String(row.number).padStart(2, "0")}`,
    specifications: row.specifications.map((s) => `${s.name}: ${s.value}`).join("\n") };
  if (row.productType) Object.assign(fields, { subcategory: row.subcategory, productType: row.productType, condition: row.condition });
  return fields;
}

function localUrl(value) {
  const url = new URL(value);
  assert(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash, "Only a local Express base URL is allowed.");
  return url.origin;
}

async function login(baseUrl, shop, password) {
  const response = await fetch(`${baseUrl}/api/v2/shop/login-shop`, { method: "POST", redirect: "error",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify({ email: shop.email, password }), signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  const cookie = response.headers.get("set-cookie")?.match(/(?:^|,\s*)(seller_token=[^;]+)/)?.[1];
  assert(response.ok && data.success && String(data.user?._id) === String(shop._id) && cookie, `Normal seller login failed for ${shop.name} (HTTP ${response.status}); no products created by this login.`);
  return cookie;
}

async function submit(row, { baseUrl, cookie, imagesRoot }) {
  const filename = path.resolve(imagesRoot, row.image.relativePath);
  assert(filename.startsWith(path.resolve(imagesRoot) + path.sep), "Source image escaped its root.");
  const bytes = fs.readFileSync(filename);
  assert(hash(bytes) === row.image.sha256, `Source image changed after preflight for #${row.number}.`);
  const form = new FormData();
  Object.entries(fieldsFor(row)).forEach(([key, value]) => form.append(key, value));
  const mime = { JPEG: "image/jpeg", PNG: "image/png", WEBP: "image/webp" }[row.image.format];
  form.append("images", new Blob([bytes], { type: mime }), `fyp-product-${String(row.number).padStart(2, "0")}.${row.image.format.toLowerCase()}`);
  const response = await fetch(`${baseUrl}/api/v2/product/create-product`, { method: "POST", redirect: "error",
    headers: { Cookie: cookie, Origin: "http://localhost:3000" }, body: form, signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  assert(response.status === 201 && data.success && data.product?._id === row.id, `Product #${row.number} creation failed (HTTP ${response.status}). Stop and inspect the local report; never approve or retry blindly.`);
  assert(data.product.approvalStatus === "pending" && data.product.isActive === true && data.product.shopId === row.shopId && data.product.images?.length, `Unexpected create-product contract for #${row.number}.`);
  return data.product;
}

async function capture(db, excludeProducts = []) {
  const result = {};
  for (const { name } of (await db.listCollections({}, { nameOnly: true }).toArray()).sort((a, b) => a.name.localeCompare(b.name))) {
    const filter = name === "products" && excludeProducts.length ? { _id: { $nin: excludeProducts } } : {};
    const documents = await db.collection(name).find(filter).sort({ _id: 1 }).toArray();
    result[name] = { count: documents.length, sha256: fingerprint(documents) };
  }
  return result;
}

function options(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    assert(["--workbook", "--images", "--accounts-workbook", "--base-url", "--report", "--confirm", "--apply"].includes(key) && result[key] === undefined, "Unknown/repeated argument.");
    result[key] = key === "--apply" ? true : args[++i];
    assert(result[key] && (key === "--apply" || !result[key].startsWith("--")), `Missing value for ${key}.`);
  }
  return result;
}

async function main(args) {
  const opt = options(args);
  require("dotenv").config({ path: path.join(backendDir, ".env") });
  require("dotenv").config({ path: path.join(backendDir, "config/.env"), override: false });
  const mongoose = require("mongoose");
  const Shop = require("../model/shop");
  const Product = require("../model/product");
  const workbook = path.resolve(opt["--workbook"] || path.join(projectDir, "FYP Product Assets/Cartify FYP Product Order and Image Plan.xlsx"));
  const imagesRoot = path.resolve(opt["--images"] || path.join(projectDir, "FYP Product Assets/Cartify Product Images"));
  const baseUrl = localUrl(opt["--base-url"] || "http://localhost:8000");
  const reportFile = path.resolve(opt["--report"] || path.join(backendDir, "demo/fyp-products-report.json"));
  assert(reportFile.startsWith(path.join(backendDir, "demo") + path.sep), "Keep runtime reports inside ignored backend/demo.");
  assert(/\.json$/i.test(reportFile), "Report must be JSON.");
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  const lock = path.join(backendDir, "demo/fyp-product-import.lock");
  let lockFd, report;
  try {
    // Lock before reading: simultaneous dry runs/applies must not race this manual tool.
    lockFd = fs.openSync(lock, "wx"); fs.writeSync(lockFd, String(process.pid));
    const assets = readAssets(workbook, imagesRoot);
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cartify", { serverSelectionTimeoutMS:10000 });
    assert(["localhost", "127.0.0.1", "::1"].includes(mongoose.connection.host), "This importer is for a local MongoDB only.");
    const shops = await Shop.find().lean();
    const products = await Product.find().lean();
    const plan = buildPlan(assets, shops, products);
    // Validate the entire proposed set before any login/upload/write.
    for (const row of plan.filter((r) => r.action === "CREATE")) await new Product({ ...fieldsFor(row), specifications: row.specifications,
      images: ["preflight-only.png"], shop: { _id: row.shopId }, approvalStatus: "pending", isActive: true }).validate();
    const before = await capture(mongoose.connection.db);
    const confirm = fingerprint({ workbook: assets.workbookSha256, plan, before });
    report = { mode: opt["--apply"] ? "APPLY" : "DRY_RUN", approvedActiveSellers: sellers.length,
      workbookSha256: assets.workbookSha256, confirm, imageValidation: { checked: 32, valid: 32, missing: 0, corrupt: 0 },
      reused: plan.filter((r) => r.action === "REUSE").length, proposed: plan.filter((r) => r.action === "CREATE").length,
      created: 0, before, results: [], plan: plan.map(({ email, ...row }) => row) };
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");
    if (opt["--apply"]) {
      assert(opt["--confirm"] === confirm, "Confirmation fingerprint differs from the dry run; review a fresh dry run before writes.");
      const pending = plan.filter((r) => r.action === "CREATE");
      const cookies = new Map();
      if (pending.length) {
        assert(opt["--accounts-workbook"], "Apply requires --accounts-workbook for normal seller logins; credentials are kept only in memory.");
        const parsed = parseWorkbook(readWorkbook(path.resolve(opt["--accounts-workbook"])));
        assert(parsed.errors.length === 0, "Account workbook validation failed; no credentials logged.");
        // Authenticate every required seller before creating the first product.
        for (const id of new Set(pending.map((r) => r.shopId))) {
          const shop = shops.find((s) => String(s._id) === id);
          const accounts = parsed.accounts.filter((a) => a.kind === "sellers" && normalize(a.email) === normalize(shop.email));
          assert(accounts.length === 1 && accounts[0].fields.Password, `Missing normal login credential for ${shop.name}.`);
          cookies.set(id, await login(baseUrl, shop, accounts[0].fields.Password));
        }
      }
      for (const row of pending) {
        const shop = await Shop.findById(row.shopId).lean();
        assert(shop?.verificationStatus === "approved" && shop.accountStatus === "active", `Seller status changed for #${row.number}.`);
        const fresh = await Product.find().lean();
        assert(matchProducts(fresh, row).length === 0 && !fresh.some((p) => String(p._id) === row.id), `Product #${row.number} appeared since preflight; stop and rerun dry run.`);
        const product = await submit(row, { baseUrl, cookie: cookies.get(row.shopId), imagesRoot });
        report.results.push({ number: row.number, id: product._id, seller: row.seller, name: product.name, images: product.images, approvalStatus: product.approvalStatus });
        report.created++;
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");
      }
    }
    const after = await capture(mongoose.connection.db, report.results.map((r) => new mongoose.Types.ObjectId(r.id)));
    report.existingCollectionsUnchanged = fingerprint(before) === fingerprint(after);
    assert(report.existingCollectionsUnchanged, "Pre-existing data changed during import/check. Review before continuing.");
    const finalPlan = buildPlan(assets, await Shop.find().lean(), await Product.find().lean());
    report.finalDetected = finalPlan.filter((r) => r.action === "REUSE").length;
    report.finalToCreate = finalPlan.filter((r) => r.action === "CREATE").length;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ mode: report.mode, approvedActiveSellers: 10, imagesValid: 32, reused: report.reused,
      proposed: report.proposed, created: report.created, finalDetected: report.finalDetected,
      finalToCreate: report.finalToCreate, existingCollectionsUnchanged: report.existingCollectionsUnchanged, confirm, reportFile }, null, 2));
  } catch (error) {
    if (report) { report.error = error.message; fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + "\n"); }
    throw error;
  } finally {
    await mongoose.disconnect();
    if (lockFd !== undefined) { fs.closeSync(lockFd); fs.unlinkSync(lock); }
  }
}

if (require.main === module) main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { normalize, productId, matchProducts, buildPlan, fieldsFor, localUrl, readAssets, capture, login, submit, options };
