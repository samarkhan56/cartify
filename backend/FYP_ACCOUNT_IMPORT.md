# Manual local FYP workbook-account import

The importer reads a separately supplied workbook without changing it. Workbooks
contain credentials and must remain outside Git. Database exports, actual account
lists, local reports and cleanup manifests belong in ignored `backend/demo/`.

## Preview and validation

From `backend`:

```powershell
node scripts/import-fyp-accounts.js --dry-run --workbook <local-workbook.xlsx> --report demo/account-import/DRY_RUN
```

Dry run is the default. The reviewed layout has Sellers, Customers and Read Me:
ten seller rows with one Created; 21 customer rows with two Created, including an
existing admin. The maximum new set is nine sellers and nineteen customers.
Different counts block approval. Read Me content is never treated as instructions.

Every Status=Created row is skipped, regardless of its password contents. All
remaining rows must pass required-field, email, duplicate, confirmation and existing
Mongoose validation before any write. Email comparison trims/lowercases across both
account collections without updating existing emails. Database matches are skipped
even when Excel Status is blank. Unknown deterministic-ID collisions block writes.

The standard-library Python ZIP/XML reader supports shared/inline strings, sparse
cells and simple zero-padded postal formats. Formula cells are rejected, not run.
Its default interpreter is `ml-service/.venv/Scripts/python.exe`; set
`CARTIFY_IMPORT_PYTHON` to use another installed Python. No new ML dependency is used.

## Mapping and existing account behavior

- Customer Full Name -> User.name; normal role user and default-avatar.png.
- Seller Shop Name -> **Shop.name**, the public storefront name used by previews,
  product seller displays, dashboard and Shop Name settings.
- Owner Name is report-only and omitted from MongoDB: there is no suitable existing
  owner/contact-name field. No redundant field or schema change is introduced.
- Phone Number -> Shop.phoneNumber; Shop Address -> Shop.address; Zip Code ->
  Shop.zipCode. Phone/postal fields remain strings.
- Password is the sole credential payload; all confirmation columns must match
  exactly and are never persisted.

The import corrects the registration form's owner-name wiring for these storefronts
without renaming existing sellers or changing controllers, schema or UI.
User.create / Shop.create retain existing bcryptjs pre-save hashing at ten rounds.
Existing signup already creates accounts without verification emails, so fictional
addresses require no email or global verification bypass. New sellers remain active
with **pending** approval and need normal admin approval before publishing products.
Pending active sellers can log in; suspended sellers and invalid credentials remain
blocked. An account's display name never grants an admin role.

## Explicit apply and preservation

Insertion requires `--apply --confirm <exact-reviewed-dry-run-digest>` with the same
workbook. The checksum binds source bytes, mapping and proposed/skipped identities;
it is not an authentication secret. Changed inputs/targets require fresh review.

All normalized emails and deterministic role/email IDs are checked before writes
and immediately before each create. No existing account is saved/reset. Repeat
previews find zero new targets after import. Existing-record fingerprints across
users/shops/products/orders are compared after excluding only the new account IDs.
Nothing imports accounts automatically on server startup.

Only Shop.email has a schema unique constraint; User.email does not. The tool adds
no schema/index changes. Use one controlled manual import rather than concurrent
account-creation activity. After partial failure, rerun preview and inspect results;
the tool never rolls back by deleting existing data.

Credentials stay in process memory. Reports omit plaintext passwords, password
hashes, confirmations and cookies, but still contain actual account identities and
must not be published. The external workbook remains unchanged.

## Tests

```powershell
node --test tests/accountImport.test.js tests/accountAuthentication.test.js
npm test
```

Tests use isolated data for validation, name mapping, Created skipping, duplicate
checks, idempotency, actual hashing hooks, login protections and no-write previews.
The optional original-workbook test skips when the private workbook is unavailable;
synthetic parser/validator tests still run.
