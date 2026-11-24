// Manual, local-only account import. Default is a read-only dry run.
// Workbook credentials stay in memory and never appear in reports/logs/intermediate files.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const EXPECTED = { sellers: { total: 10, created: 1, remaining: 9 }, customers: { total: 21, created: 2, remaining: 19 } };
const HEADERS = { sellers: ["Shop Name", "Owner Name", "Email Address", "Password", "Phone Number", "Shop Address", "Zip Code", "Password2", "Confirm Password", "Status"],
  customers: ["Full Name", "Email Address", "Password", "Confirm Password", "Status"] };
const text = (value) => typeof value === "string" ? value.trim() : "";
const normalizeEmail = (value) => text(value).toLowerCase();
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const accountId = (kind, email) => digest(`cartify-fyp-workbook-account-v1|${kind}|${normalizeEmail(email)}`).slice(0, 24);
const canonical = (value) => value instanceof Date ? value.toISOString() : value?._bsontype === "ObjectId" ? value.toHexString()
  : Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const fingerprint = (value) => digest(JSON.stringify(canonical(value)));
const columnIndex = (column) => [...column].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0);

function readWorkbook(filename) {
  const python = process.env.CARTIFY_IMPORT_PYTHON || path.resolve(__dirname, "../../ml-service/.venv/Scripts/python.exe");
  const result = spawnSync(python, [path.join(__dirname, "read-account-workbook.py"), path.resolve(filename)], {
    windowsHide: true, encoding: "utf8", maxBuffer: 2 * 1024 * 1024, timeout: 30000,
  });
  if (result.error || result.status !== 0) throw new Error("Could not read XLSX. Check the workbook and local Python path; no account data was written.");
  try { return JSON.parse(result.stdout); } catch { throw new Error("Invalid workbook-reader output."); }
}

function parseWorkbook(workbook) {
  const errors = [], accounts = [];
  const sheetNames = workbook.sheets.map((sheet) => sheet.name);
  if (["Sellers", "Customers", "Read Me"].some((name) => sheetNames.filter((sheet) => sheet === name).length !== 1))
    errors.push({ code: "SHEETS", message: "Exactly one Sellers, Customers and Read Me sheet is required." });
  for (const [kind, name] of [["sellers", "Sellers"], ["customers", "Customers"]]) {
    const sheet = workbook.sheets.find((sheet) => sheet.name === name);
    if (!sheet?.rows.length) { errors.push({ code: "HEADERS", sheet: name, message: "Missing header row." }); continue; }
    const [header, ...rows] = sheet.rows;
    const columns = Object.entries(header.cells).sort(([a], [b]) => columnIndex(a) - columnIndex(b));
    const names = columns.map(([, value]) => text(value));
    if (header.formulaColumns.length || HEADERS[kind].some((field) => names.filter((value) => value === field).length !== 1)) {
      errors.push({ code: "HEADERS", sheet: name, message: "Missing or repeated account headers." }); continue;
    }
    for (const source of rows) {
      const fields = Object.fromEntries(columns.map(([column, field]) => [text(field), source.cells[column] ?? ""]));
      if (!Object.values(fields).some((value) => value !== "")) continue;
      const email = normalizeEmail(fields["Email Address"]);
      const created = text(fields.Status).toLowerCase() === "created";
      const row = { kind, sheet: name, row: source.rowNumber, email, created, fields,
        name: text(fields[kind === "sellers" ? "Owner Name" : "Full Name"]), shopName: kind === "sellers" ? text(fields["Shop Name"]) : undefined };
      const fail = (field, message) => errors.push({ code: "ROW_VALIDATION", sheet: name, row: source.rowNumber, field, message });
      if (source.formulaColumns.length) fail("cells", "Formulas are not permitted in account rows.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Email Address", "A valid email address is required.");
      // Created rows are never imported; their passwords are neither compared with MongoDB nor reset.
      if (!created) {
        for (const field of kind === "sellers" ? ["Shop Name", "Owner Name", "Phone Number", "Shop Address", "Zip Code"] : ["Full Name"])
          if (!text(fields[field])) fail(field, "This field is required.");
        const password = fields.Password;
        if (typeof password !== "string" || password.length < 6 || !password.trim()) fail("Password", "A password of at least six characters is required by the signup forms.");
        for (const field of kind === "sellers" ? ["Password2", "Confirm Password"] : ["Confirm Password"])
          if (typeof fields[field] !== "string" || fields[field] !== password) fail(field, "Password confirmation must match exactly.");
      }
      accounts.push(row);
    }
  }
  const counts = Object.fromEntries(Object.keys(EXPECTED).map((kind) => {
    const rows = accounts.filter((row) => row.kind === kind);
    return [kind, { total: rows.length, created: rows.filter((row) => row.created).length, remaining: rows.filter((row) => !row.created).length }];
  }));
  for (const kind of Object.keys(EXPECTED)) if (fingerprint(counts[kind]) !== fingerprint(EXPECTED[kind]))
    errors.push({ code: "BASELINE_MISMATCH", sheet: kind, message: "Workbook counts differ from the confirmed 10/1/9 sellers and 21/2/19 customers baseline." });
  const seen = new Set();
  for (const row of accounts) {
    if (seen.has(row.email)) errors.push({ code: "DUPLICATE_WORKBOOK_EMAIL", sheet: row.sheet, row: row.row, message: "Email is repeated in the workbook (normalized comparison)." });
    seen.add(row.email);
  }
  return { sheets: sheetNames, counts, accounts, errors };
}

function payload(row) {
  // Shop.name is the public storefront identity used by previews, products and settings.
  // The registration form's separate owner-name wiring is not reproduced for this approved import.
  const base = { _id: accountId(row.kind, row.email), name: row.kind === "sellers" ? row.shopName : row.name, email: row.email, password: row.fields.Password };
  return row.kind === "sellers" ? { ...base, address: text(row.fields["Shop Address"]), phoneNumber: text(row.fields["Phone Number"]), zipCode: text(row.fields["Zip Code"]) }
    : { ...base, avatar: "default-avatar.png" };
}

function safeIdentity(row) {
  return { sheet: row.sheet, row: row.row, name: row.name, ...(row.shopName ? { shopName: row.shopName,
    ...(!row.created ? { publicName: row.shopName } : {}) } : {}), email: row.email };
}

async function prepare(parsed, existing, models, workbookSha256) {
  const errors = [...parsed.errors], proposed = [], skippedCreated = [], skippedDatabase = [];
  const all = [...existing.sellers.map((record) => ({ ...record, kind: "sellers" })), ...existing.customers.map((record) => ({ ...record, kind: "customers" }))];
  for (const row of parsed.accounts) {
    const matches = all.filter((record) => normalizeEmail(record.email) === row.email);
    const identity = safeIdentity(row);
    if (row.created) { skippedCreated.push({ ...identity, reason: "STATUS_CREATED", databaseMatches: matches.map((record) => ({ kind: record.kind, id: String(record._id) })) }); continue; }
    if (matches.length) { skippedDatabase.push({ ...identity, reason: "DATABASE_EMAIL_EXISTS", databaseMatches: matches.map((record) => ({ kind: record.kind, id: String(record._id) })) }); continue; }
    const id = accountId(row.kind, row.email);
    if (all.some((record) => String(record._id) === id)) {
      errors.push({ code: "ID_COLLISION", sheet: row.sheet, row: row.row, message: "Deterministic account ID is already in use. No record will be overwritten." }); continue;
    }
    try { await new models[row.kind](payload(row)).validate(); }
    catch (error) {
      // Mongoose errors can include plaintext credential values: never log their messages.
      for (const field of Object.keys(error.errors || { document: true })) errors.push({ code: "SCHEMA_VALIDATION", sheet: row.sheet, row: row.row, field, message: "Account fails the existing Cartify model validation." });
      continue;
    }
    proposed.push({ ...identity, id });
  }
  const report = { mode: "DRY_RUN", sheets: parsed.sheets, counts: parsed.counts, skippedCreated, skippedDatabase,
    proposed, errors, readyForApproval: errors.length === 0,
    proposedCounts: { sellers: proposed.filter((row) => row.sheet === "Sellers").length, customers: proposed.filter((row) => row.sheet === "Customers").length, total: proposed.length },
    workbookSha256, normalization: "Trim + lowercase for email comparison in both collections; new accounts store that canonical email. Existing accounts are never normalized/updated.",
    sellerMapping: "Excel Shop Name -> Shop.name (public storefront). Owner Name remains report-only and is omitted from MongoDB because no owner/contact-name field exists. Existing records, schema, registration controllers and UI are unchanged.",
    accountDefaults: { sellers: { verificationStatus: "pending", accountStatus: "active", isVerified: false, avatar: "existing model-generated initials" }, customers: { role: "user", avatar: "default-avatar.png" } },
    emailVerification: "Both current registration controllers create accounts directly without sending verification emails.",
    passwordHandling: "Exact workbook password retained in memory only; future Model.create uses existing bcryptjs pre-save hooks (10 rounds). No redundant confirmations are persisted." };
  report.planDigest = fingerprint({ workbookSha256, proposed, skippedCreated, skippedDatabase, accountDefaults: report.accountDefaults, sellerMapping: report.sellerMapping });
  return report;
}

async function capture(models, excluded = {}) {
  const result = {};
  for (const [name, Model] of Object.entries(models)) {
    const ids = excluded[name] || [];
    const filter = ids.length ? { _id: { $nin: ids.map((id) => new Model.base.Types.ObjectId(id)) } } : {};
    const documents = await Model.collection.find(filter).sort({ _id: 1 }).toArray();
    result[name] = { count: documents.length, fingerprint: fingerprint(documents) };
  }
  return result;
}

async function importApproved(parsed, report, models, confirm, lookup) {
  if (!report.readyForApproval || confirm !== report.planDigest) throw new Error("A valid dry run and explicit matching plan confirmation are required.");
  const results = [];
  // Recheck every target before the first write; all rows have already passed validation.
  for (const account of report.proposed) if (await lookup(account.email, account.id)) throw new Error("Database changed since preview; rerun the dry run before insertion.");
  for (const account of report.proposed) {
    // Also check immediately before each create. No existing document is ever saved/updated.
    if (await lookup(account.email, account.id)) { results.push({ email: account.email, result: "SKIPPED_DATABASE_CHANGED" }); continue; }
    const row = parsed.accounts.find((entry) => entry.sheet === account.sheet && entry.row === account.row);
    await models[row.kind].create({ ...payload(row), createdAt: new Date() });
    results.push({ email: account.email, result: "CREATED" });
  }
  return results;
}

function markdown(report) {
  const table = (rows, fields) => [fields, fields.map(() => "---"), ...rows.map((row) => fields.map((field) => String(row[field] ?? "")))]
    .map((row) => `| ${row.join(" | ")} |`).join("\n");
  return (report.mode === "DRY_RUN" ? `# Cartify FYP account import — dry run only\n\nNo accounts were inserted. Workbook and MongoDB documents were not modified.\n\n`
    : `# Cartify FYP account import — execution result\n\nNew accounts: ${report.execution.filter((row) => row.result === "CREATED").length}. Existing documents unchanged: ${report.existingDocumentsUnchanged}.\n\n`) +
    `Plan digest: \`${report.planDigest}\`\n\nSheets: ${report.sheets.join(", ")}.\n\n` +
    `## Counts\n\n${table(Object.entries(report.counts).map(([kind, value]) => ({ kind, ...value })), ["kind", "total", "created", "remaining"])}\n\n` +
    `## Skipped: Status Created\n\n${table(report.skippedCreated, ["sheet", "row", "name", "shopName", "email"])}\n\n` +
    `## Skipped: email already present\n\n${report.skippedDatabase.length ? table(report.skippedDatabase, ["sheet", "row", "name", "email"]) : "None among remaining rows."}\n\n` +
    `## Proposed accounts\n\n${table(report.proposed, ["sheet", "row", "name", "shopName", "publicName", "email"])}\n\n` +
    `Proposed counts: ${report.proposedCounts.sellers} sellers, ${report.proposedCounts.customers} customers, ${report.proposedCounts.total} total.\n\n` +
    `Validation errors: ${report.errors.length}.\n\n${report.errors.length ? JSON.stringify(report.errors, null, 2) : "All remaining rows and confirmations passed parser and existing-model validation."}\n\n` +
    `## Existing registration behavior\n\n${report.sellerMapping}\n\n${report.emailVerification}\n\n${report.passwordHandling}\n\n` +
    `Sellers retain normal pending approval / active account defaults; they are not auto-approved. Customers use role user and default-avatar.png, matching current signup.\n\n` +
    `Read Me cells are not interpreted as instructions. Workbook not rewritten. Existing passwords are never compared/reset by this tool.\n\n` +
    `Database preservation: ${report.mode === "APPLIED"
      ? report.existingDocumentsUnchanged ? "all pre-existing documents unchanged; only the reported new accounts were added" : "NOT VERIFIED"
      : report.databaseUnchanged ? "identical across users, shops, products and orders" : "NOT VERIFIED"}.\n`;
}

async function main(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (["--dry-run", "--apply"].includes(key)) options[key] = true;
    else if (["--workbook", "--confirm", "--report"].includes(key) && args[index + 1] && !args[index + 1].startsWith("--")) options[key] = args[++index];
    else throw new Error("Unknown or incomplete import option.");
  }
  if (!options["--workbook"] || options["--dry-run"] && options["--apply"]) throw new Error("Provide --workbook and choose dry-run or apply.");
  if (options["--apply"] && !/^[a-f0-9]{64}$/.test(options["--confirm"] || "")) throw new Error("Explicit --confirm dry-run digest is required before insertion.");
  const workbookSha256 = digest(fs.readFileSync(path.resolve(options["--workbook"])));
  const parsed = parseWorkbook(readWorkbook(options["--workbook"]));
  if (digest(fs.readFileSync(path.resolve(options["--workbook"]))) !== workbookSha256) throw new Error("Workbook changed while reading; no database connection was made.");
  require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
  require("dotenv").config({ path: path.resolve(__dirname, "../config/.env"), quiet: true, override: false });
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/cartify";
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(uri).hostname)) throw new Error("This FYP import tool only targets local MongoDB.");
  const mongoose = require("mongoose");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, autoIndex: false, autoCreate: false });
  try {
    const models = { sellers: require("../model/shop"), customers: require("../model/user") };
    const observed = { ...models, products: require("../model/product"), orders: require("../model/order") };
    const before = await capture(observed);
    const existing = { sellers: await models.sellers.find().select("_id email").lean(), customers: await models.customers.find().select("_id email").lean() };
    const report = await prepare(parsed, existing, models, workbookSha256);
    const after = await capture(observed);
    report.databaseUnchanged = fingerprint(before) === fingerprint(after);
    report.databaseSnapshot = after;
    if (!report.databaseUnchanged) throw new Error("Database changed during dry run. Review and rerun before approving.");
    if (options["--apply"]) {
      const lookup = async (email, id) => {
        // Import-only normalized checks: do not alter application authentication or indexes.
        for (const Model of Object.values(models)) {
          const records = await Model.find().select("_id email").lean();
          if (records.some((record) => normalizeEmail(record.email) === email || String(record._id) === id)) return true;
        }
        return false;
      };
      report.execution = await importApproved(parsed, report, models, options["--confirm"], lookup);
      const inserted = report.proposed.filter((account) => report.execution.some((row) => row.email === account.email && row.result === "CREATED"));
      const excludingNew = Object.fromEntries(Object.keys(models).map((kind) => [kind, inserted.filter((account) => account.sheet === (kind === "sellers" ? "Sellers" : "Customers")).map((account) => account.id)]));
      report.existingDocumentsUnchanged = fingerprint(before) === fingerprint(await capture(observed, excludingNew));
      report.databaseUnchanged = inserted.length === 0 && report.existingDocumentsUnchanged;
      if (!report.existingDocumentsUnchanged) throw new Error("Pre-existing database documents changed during import; review before proceeding.");
      report.mode = "APPLIED";
    }
    if (options["--report"]) {
      const base = path.resolve(options["--report"]);
      fs.mkdirSync(path.dirname(base), { recursive: true });
      fs.writeFileSync(`${base}.json`, JSON.stringify(report, null, 2) + "\n");
      fs.writeFileSync(`${base}.md`, markdown(report));
    }
    console.log(JSON.stringify(report, null, 2));
    if (report.errors.length) process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) main(process.argv.slice(2)).catch((error) => {
  console.error(error.name === "Error" ? error.message : `Import stopped (${error.name}); no credentials logged.`);
  process.exitCode = 1;
});
module.exports = { normalizeEmail, accountId, fingerprint, readWorkbook, parseWorkbook, payload, prepare, capture, importApproved, markdown };
