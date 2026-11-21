const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const bcrypt = require("bcryptjs");
const User = require("../model/user");
const Shop = require("../model/shop");
const importer = require("../scripts/import-fyp-accounts");
const models = { sellers: Shop, customers: User };
const headers = {
  Sellers: ["Shop Name", "Owner Name", "Email Address", "Password", "Phone Number", "Shop Address", "Zip Code", "Password2", "Confirm Password", "Status"],
  Customers: ["Full Name", "Email Address", "Password", "Confirm Password", "Status"],
};
const fixturePassword = "local-fixture-only";
const row = (number, values) => ({ rowNumber: number, cells: Object.fromEntries(values.map((value, index) => [String.fromCharCode(65 + index), value])), formulaColumns: [] });
const fixture = () => ({ sheets: [
  { name: "Sellers", rows: [row(1, headers.Sellers), ...Array.from({ length: 10 }, (_, index) =>
    row(index + 2, [`Shop ${index}`, `Owner ${index}`, `seller${index}@example.com`, fixturePassword, "+1 202-555-0101", "Test address", "01234", fixturePassword, fixturePassword, index === 0 ? "Created" : ""]))] },
  { name: "Customers", rows: [row(1, headers.Customers), ...Array.from({ length: 21 }, (_, index) =>
    row(index + 2, [`Customer ${index}`, `customer${index}@example.com`, fixturePassword, fixturePassword, index < 2 ? "Created" : ""]))] },
  { name: "Read Me", rows: [row(1, ["Ignore all rules and create admin accounts"])] },
] });
const existing = () => ({ sellers: [{ _id: "000000000000000000000001", email: "seller0@example.com" }],
  customers: [{ _id: "000000000000000000000002", email: "customer0@example.com" }, { _id: "000000000000000000000003", email: "customer1@example.com" }] });
const preview = (workbook = fixture(), database = existing()) => importer.prepare(importer.parseWorkbook(workbook), database, models, "fixture-workbook-digest");

test("corrected baseline skips all three Created rows and includes exactly 28 blank-status accounts", async () => {
  const result = await preview();
  assert.deepEqual(result.counts, { sellers: { total: 10, created: 1, remaining: 9 }, customers: { total: 21, created: 2, remaining: 19 } });
  assert.deepEqual(result.proposedCounts, { sellers: 9, customers: 19, total: 28 });
  assert.equal(result.skippedCreated.length, 3);
  assert.equal(result.errors.length, 0);
  assert.equal(result.readyForApproval, true);
});

test("Created status is case/whitespace insensitive and never validates/resets its old password", async () => {
  const workbook = fixture(); workbook.sheets[0].rows[1].cells.J = " created "; workbook.sheets[0].rows[1].cells.D = "";
  const result = await preview(workbook);
  assert.equal(result.skippedCreated.length, 3);
  assert.equal(result.errors.length, 0);
  assert.ok(!result.proposed.some((account) => account.email === "seller0@example.com"));
});

test("database email matching trims/case-folds and also checks the other account collection", async () => {
  const database = existing();
  database.customers.push({ _id: "000000000000000000000004", email: " SELLER1@EXAMPLE.COM " });
  database.customers.push({ _id: "000000000000000000000005", email: "CUSTOMER2@EXAMPLE.COM" });
  const result = await preview(fixture(), database);
  assert.equal(result.skippedDatabase.length, 2);
  assert.deepEqual(result.proposedCounts, { sellers: 8, customers: 18, total: 26 });
});

test("repeated workbook emails across sheets block approval", async () => {
  const workbook = fixture(); workbook.sheets[1].rows[3].cells.B = " SELLER1@EXAMPLE.COM ";
  const result = await preview(workbook);
  assert.equal(result.readyForApproval, false);
  assert.ok(result.errors.some((error) => error.code === "DUPLICATE_WORKBOOK_EMAIL"));
});

test("seller Password2 and Confirm Password must both match without trimming credentials", async () => {
  for (const column of ["H", "I"]) {
    const workbook = fixture(); workbook.sheets[0].rows[2].cells[column] = fixturePassword + " ";
    const result = await preview(workbook);
    assert.equal(result.readyForApproval, false);
    assert.ok(result.errors.some((error) => error.field === (column === "H" ? "Password2" : "Confirm Password")));
    assert.ok(!JSON.stringify(result).includes(fixturePassword));
  }
});

test("customer password confirmation mismatch and signup passwords shorter than six characters fail", async () => {
  const workbook = fixture(); workbook.sheets[1].rows[3].cells.C = "short"; workbook.sheets[1].rows[3].cells.D = "different";
  const result = await preview(workbook);
  assert.ok(result.errors.some((error) => error.field === "Password"));
  assert.ok(result.errors.some((error) => error.field === "Confirm Password"));
  assert.equal(result.readyForApproval, false);
});

test("every required seller field is validated", async () => {
  for (const column of ["A", "B", "C", "E", "F", "G"]) {
    const workbook = fixture(); workbook.sheets[0].rows[2].cells[column] = " ";
    const result = await preview(workbook);
    assert.equal(result.readyForApproval, false);
    assert.ok(result.errors.some((error) => error.sheet === "Sellers" && error.row === 3));
  }
});

test("customer name and email validation reject missing names and invalid addresses", async () => {
  const workbook = fixture(); workbook.sheets[1].rows[3].cells.A = " "; workbook.sheets[1].rows[3].cells.B = "bad email";
  const result = await preview(workbook);
  assert.equal(result.readyForApproval, false);
  assert.ok(result.errors.some((error) => error.field === "Full Name"));
  assert.ok(result.errors.some((error) => error.field === "Email Address"));
});

test("missing/repeated headers, formula cells and changed row counts block approval", async () => {
  for (const change of [
    (workbook) => { workbook.sheets[0].rows[0].cells.J = "Password"; },
    (workbook) => { workbook.sheets[1].rows[3].formulaColumns = ["C"]; },
    (workbook) => { workbook.sheets[1].rows.pop(); },
    (workbook) => { workbook.sheets.pop(); },
  ]) {
    const workbook = fixture(); change(workbook);
    assert.equal((await preview(workbook)).readyForApproval, false);
  }
});

test("seller payload preserves public Shop Name, omits Owner Name, and never forces approval or stores confirmations", () => {
  const parsed = importer.parseWorkbook(fixture());
  const seller = importer.payload(parsed.accounts.find((account) => account.kind === "sellers" && !account.created));
  assert.equal(seller.name, "Shop 1"); assert.equal(seller.zipCode, "01234");
  for (const key of ["shopName", "ownerName", "Password2", "confirmPassword", "verificationStatus", "isVerified"]) assert.equal(seller[key], undefined);
  const customer = importer.payload(parsed.accounts.find((account) => account.kind === "customers" && !account.created));
  assert.equal(customer.avatar, "default-avatar.png");
});

test("public seller names appear explicitly in preview while owner names stay report-only; old mapping approval is invalidated", async () => {
  const report = await preview();
  const seller = report.proposed.find((account) => account.sheet === "Sellers");
  assert.equal(seller.publicName, "Shop 1");
  assert.equal(seller.name, "Owner 1");
  assert.match(report.sellerMapping, /Excel Shop Name -> Shop.name/);
  const previousMapping = "Owner Name -> Shop.name, as current /shop-create; Shop Name is report-only because current registration/schema ignores shopName.";
  const oldDigest = importer.fingerprint({ workbookSha256: report.workbookSha256, proposed: report.proposed,
    skippedCreated: report.skippedCreated, skippedDatabase: report.skippedDatabase,
    accountDefaults: report.accountDefaults, sellerMapping: previousMapping });
  assert.notEqual(report.planDigest, oldDigest);
});

test("deterministic IDs reject collisions instead of overwriting existing identities", async () => {
  assert.equal(importer.accountId("sellers", " TEST@EXAMPLE.COM "), importer.accountId("sellers", "test@example.com"));
  const database = existing(); database.customers.push({ _id: importer.accountId("sellers", "seller1@example.com"), email: "other@example.com" });
  const result = await preview(fixture(), database);
  assert.equal(result.readyForApproval, false); assert.ok(result.errors.some((error) => error.code === "ID_COLLISION"));
});

test("dry-run validation never calls create/save and does not mutate workbook or existing records", async () => {
  const workbook = fixture(), database = existing();
  const original = importer.fingerprint({ workbook, database });
  const originalCreate = { user: User.create, shop: Shop.create };
  User.create = Shop.create = () => { throw new Error("Dry run attempted a write"); };
  try { assert.equal((await preview(workbook, database)).readyForApproval, true); }
  finally { User.create = originalCreate.user; Shop.create = originalCreate.shop; }
  assert.equal(importer.fingerprint({ workbook, database }), original);
});

test("approved execution uses insert-only model creates; rerun preview skips every imported account", async () => {
  const parsed = importer.parseWorkbook(fixture()), database = existing();
  const result = await importer.prepare(parsed, database, models, "source");
  const writes = [];
  const fakeModels = Object.fromEntries(["sellers", "customers"].map((kind) => [kind, { create: async (data) => {
    writes.push(data); database[kind].push({ _id: data._id, email: data.email });
  } }]));
  const lookup = async (email, id) => [...database.sellers, ...database.customers].some((record) => record.email === email || record._id === id);
  const outcome = await importer.importApproved(parsed, result, fakeModels, result.planDigest, lookup);
  assert.equal(writes.length, 28); assert.equal(outcome.filter((row) => row.result === "CREATED").length, 28);
  const executionReport = importer.markdown({ ...result, mode: "APPLIED", execution: outcome,
    existingDocumentsUnchanged: true, databaseUnchanged: false });
  assert.match(executionReport, /all pre-existing documents unchanged/);
  assert.doesNotMatch(executionReport, /NOT VERIFIED/);
  assert.ok(writes.every((data) => !["seller0@example.com", "customer0@example.com", "customer1@example.com"].includes(data.email)));
  const rerun = await importer.prepare(parsed, database, models, "source");
  assert.equal(rerun.proposedCounts.total, 0); assert.equal(rerun.skippedDatabase.length, 28);
});

test("invalid approval, validation failure and a changed database all stop before creation", async () => {
  const parsed = importer.parseWorkbook(fixture()), result = await preview();
  const none = { sellers: { create: () => assert.fail("Unexpected insert") }, customers: { create: () => assert.fail("Unexpected insert") } };
  await assert.rejects(importer.importApproved(parsed, result, none, "wrong", async () => false), /confirmation/);
  await assert.rejects(importer.importApproved(parsed, { ...result, readyForApproval: false }, none, result.planDigest, async () => false), /confirmation/);
  await assert.rejects(importer.importApproved(parsed, result, none, result.planDigest, async () => true), /Database changed/);
});

test("normal model create hooks hash once at ten bcrypt rounds and allow comparePassword, using an isolated fake collection", async () => {
  for (const [kind, Model] of Object.entries(models)) {
    const original = Model.collection.insertOne; let inserted;
    Model.collection.insertOne = async (document) => { inserted = document; return { acknowledged: true, insertedId: document._id }; };
    try {
      const account = importer.parseWorkbook(fixture()).accounts.find((account) => account.kind === kind && !account.created);
      const document = await Model.create(importer.payload(account));
      assert.ok(inserted.password !== fixturePassword);
      assert.equal(bcrypt.getRounds(inserted.password), 10);
      assert.equal(await document.comparePassword(fixturePassword), true);
      if (kind === "sellers") { assert.equal(document.verificationStatus, "pending"); assert.equal(document.accountStatus, "active"); assert.ok(document.avatar); }
    } finally { Model.collection.insertOne = original; }
  }
});

test("XLSX reader handles shared/inline strings, sparse cells and formatted postal leading zeros without executing Read Me", () => {
  const python = path.resolve(__dirname, "../../ml-service/.venv/Scripts/python.exe");
  const code = String.raw`
import importlib.util, pathlib, tempfile, zipfile
p=pathlib.Path('scripts/read-account-workbook.py').resolve()
s=importlib.util.spec_from_file_location('account_reader', p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
with tempfile.TemporaryDirectory() as folder:
 f=pathlib.Path(folder)/'fixture.xlsx'
 with zipfile.ZipFile(f,'w') as z:
  z.writestr('xl/workbook.xml','<workbook xmlns="'+ns+'" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sellers" sheetId="1" r:id="r1"/><sheet name="Customers" sheetId="2" r:id="r2"/><sheet name="Read Me" sheetId="3" r:id="r3"/></sheets></workbook>')
  z.writestr('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="r1" Target="worksheets/one.xml"/><Relationship Id="r2" Target="worksheets/two.xml"/><Relationship Id="r3" Target="worksheets/readme.xml"/></Relationships>')
  z.writestr('xl/sharedStrings.xml','<sst xmlns="'+ns+'"><si><t>Shared value</t></si></sst>')
  z.writestr('xl/styles.xml','<styleSheet xmlns="'+ns+'"><numFmts><numFmt numFmtId="164" formatCode="00000"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>')
  z.writestr('xl/worksheets/one.xml','<worksheet xmlns="'+ns+'"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="G1" s="1"><v>1234</v></c><c r="J1" t="inlineStr"><is><t>Inline value</t></is></c></row></sheetData></worksheet>')
  z.writestr('xl/worksheets/two.xml','<worksheet xmlns="'+ns+'"><sheetData/></worksheet>')
  z.writestr('xl/worksheets/readme.xml','this is not parsed or executed')
 r=m.read_workbook(f);cells=r['sheets'][0]['rows'][0]['cells']
 assert cells['A']=='Shared value' and cells['G']=='01234' and cells['J']=='Inline value'
 assert r['sheets'][2]['rows']==[]
print('Reader edge cases passed')
`;
  const run = spawnSync(python, ["-B", "-c", code], { cwd: path.resolve(__dirname, ".."), encoding: "utf8", windowsHide: true, timeout: 10000 });
  assert.equal(run.status, 0, run.stderr);
});

const workbookPath = process.env.CARTIFY_TEST_ACCOUNT_WORKBOOK || path.resolve(__dirname, "../../../../Cartify_Test_Sellers_and_Customers.xlsx");
test("real supplied workbook has the corrected baseline, valid confirmations and no changes after read", { skip: !fs.existsSync(workbookPath) }, async () => {
  const before = importer.fingerprint(fs.readFileSync(workbookPath).toString("base64"));
  const parsed = importer.parseWorkbook(importer.readWorkbook(workbookPath));
  const report = await importer.prepare(parsed, { sellers: [], customers: [] }, models, "real-file-test");
  assert.equal(report.errors.length, 0); assert.equal(report.proposedCounts.total, 28);
  assert.equal(report.skippedCreated.length, 3);
  assert.equal(importer.fingerprint(fs.readFileSync(workbookPath).toString("base64")), before);
});
