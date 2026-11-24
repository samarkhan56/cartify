# Manual local advertisement demo history

A fresh checkout contains code, model artifacts and a synthetic proposal, not a
MongoDB database. Runtime manifests, database fingerprints, account lists and
verification outputs belong in ignored backend/demo/. Keep local cleanup manifests.

## Dashboard and data source

The seller-only route /dashboard-advertisements has By Product and By Region
modes. It uses the existing authenticated advertisement endpoints documented in
ADVERTISING.md. Presenter inventory must be approved (or valid legacy-approved),
active, in stock and correctly mapped. Normal product submission and admin
approval remain required; hidden historical products are not presenter inventory.

Runtime features come only from eligible marketplace-wide Cartify order snapshots.
No training CSV or repository-specific real seller ID is needed at inference time.

## Synthetic proposal and preview

ADVERTISING_DEMO_PREVIEW.md is a reproducible 120-cell proposal: 1,097 historical
orders, 180 customers, five Pakistan regions and May–October 2026. Each order has
one purchased item. Synthetic USD-equivalent merchandise revenue excludes shipping.
Growing, stable, declining, low and genuine zero-demand patterns vary by category.
The proposed inputs do not guarantee specific model rankings.

From backend:

    node scripts/advertising-demo-history.js --preview --as-of 2026-11-19
    node scripts/advertising-demo-session.js --preview

Preview does not connect to or write to MongoDB. The reviewed proposal date is
fixed explicitly; runtime inference still uses the latest completed calendar month.

## Explicit insertion

The session wrapper requires --apply --confirm followed by the full reviewed plan
digest. Inspect the preview and local database before authorizing it. That public
checksum describes the synthetic plan; it is not a password or authentication token.

It creates dedicated [DEMO] customers, a historical seller and four hidden,
zero-stock historical products with fictional @example.invalid emails and
deterministic IDs. Generated passwords are hashed through existing model hooks.
Existing accounts, products, orders, balances and stock are not modified.

Orders use Delivered/Succeeded status, full shipping snapshots, captured taxonomy,
unit sale price, quantity and line total, and explicit historical purchase/delivery/
payment dates. The tool does not trigger payments, mail, notifications or lifecycle
credits. These are demand-history fixtures; admin aggregate totals include them.

The standalone history script also supports an explicitly approved reference
manifest. The session wrapper prepares the dedicated references and local evidence.

## Audit, repeat safety and cleanup

    node scripts/advertising-demo-session.js --audit
    node scripts/advertising-demo-session.js --cleanup-preview

The audit checks actual monthly region/category cells, essential snapshots,
eligibility, references and fingerprints of every pre-existing document.
Deterministic IDs with insert-only operations prevent duplicate reruns. Another
marked plan blocks overlapping history.

statusHistory.changedBy is an existing free String for actor labels. Demo orders
record demo:cartify-ad-demo-v1:<digest-prefix> there; no Order schema change or
invalid ObjectId value is introduced.

The ignored cleanup manifest preserves exact created IDs and fingerprints. Keep
it locally; it is recovery evidence, not shareable source or a database export.
Do not substitute another environment's manifest.

Actual cleanup is separate: --cleanup --confirm <full-reviewed-plan-digest>.
It validates deterministic IDs, unchanged fingerprints, protected records and
outside references before removing only recorded demo orders/products/customers/
seller. Changed or reused records require review. Presenter products are never
created or deleted by this workflow. Preview/tests do not authorize actual cleanup.

There is no automatic seed, backfill, migration or cleanup at server startup.
