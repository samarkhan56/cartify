# Manual November FYP presentation orders

This is the explicitly approved same-seller plan: 18 order documents, 35 units across all 32 planned products, 15 normal customers, three repeat customers and ten sellers. It does not add cancellation functionality or change the order lifecycle.

| Order | Product workbook numbers | Final status | City |
|---|---|---|---|
| 01 | 01, 04 | Delivered | Lahore |
| 02 | 08, 09, 10 | Delivered | Lahore |
| 03 | 05, 06 | Delivered | Karachi |
| 04 | 25, 26 | Delivered | Karachi |
| 05 | 02, 03 | Delivered | Islamabad |
| 06 | 18, 19 | Delivered | Islamabad |
| 07 | 28, 29, 30 | Delivered | Faisalabad |
| 08 | 24, 22 | Delivered | Rawalpindi |
| 09 | 14, 15 | On the way | Lahore |
| 10 | 11, 12, 13 | On the way | Karachi |
| 11 | 20, 21 | On the way | Islamabad |
| 12 | 27 | Processing | Rawalpindi |
| 13 | 23 | Processing | Faisalabad |
| 14 | 07, 05 | Pending | Lahore |
| 15 | 32, 31 | Pending | Islamabad |
| 16 | 16, 17 | Processing | Karachi |
| 17 | 15 | Processing | Rawalpindi |
| 18 | 04 | Processing refund | Faisalabad |

The customer sequence is customer02 through customer16, followed by customer02, customer05 and customer08. All accounts must already exist. Credentials are read privately from the local account workbook, checked using the existing model `comparePassword` method and used with the existing `getJwtToken` method. The normal API authentication/ownership middleware remains in effect; no passwords or cookies are persisted.

## Run manually

Run from `backend` while local MongoDB and FastAPI are available:

```powershell
node scripts/seed-fyp-presentation-orders.js
```

Review ignored `demo/presentation-orders/preview.json`, then apply its confirmation:

```powershell
$confirmation = (Get-Content demo/presentation-orders/preview.json -Raw | ConvertFrom-Json).confirm
node scripts/seed-fyp-presentation-orders.js --apply --confirm $confirmation --accounts-workbook '<local account workbook.xlsx>'
```

There is no startup seeding. The tool rejects execution outside November 2026 rather than backdating records. It checks all product/seller/customer identities, live captured sale prices, aggregate stock and same-seller ownership before writes. All quantities are one; shipping and platform-fee calculations are checked against the real API results.

The apply starts a temporary instance of the actual `server.js` on port 8003, with only outbound email credentials unset in that process. It uses the same database, routes, authentication, notifications and ML service as normal Cartify. It refuses to reuse an occupied port. It stops only its own temporary backend; the regular backend and FastAPI are not stopped. No transport stubs or order-model substitutes are used.

Every order is created through authenticated `/order/create-order` with COD, generating normal MongoDB IDs, captured product/shipping snapshots, stock reservations and notifications. Seller transitions follow the existing sequence to the requested final state. Order 18 is genuinely Delivered and paid before its customer calls `/order/order-refund`. There are nine Delivered transitions in total; its pending refund does not undo earnings or restore stock under the existing lifecycle.

Final payment counts are nine `Succeeded` and nine `Pending`. Eight clean Delivered orders pass the current status/payment/refund predicate. All are November purchases, so zero enter the current October feature window. The tool compares the four category-region ranking orders and the complete feature matrix before and after creation.

## Idempotency and protection

An existing optional address string carries the deterministic marker `cartify-fyp-presentation-v1:NN (synthetic address)`. There are no schema changes. The exclusive local lock prevents simultaneous runs. The ignored manifest records returned order IDs immediately after each successful creation. No automatic retry is made after an ambiguous or partial run; inspect the manifest, stock and balances before proceeding.

After successful creation, run the tool again without `--apply`. It must detect all 18 markers and report 18 reused, zero new and zero duplicates. It also rechecks lifecycle states, snapshots, quantities and the saved stock/earnings baseline. It must never repeat delivery credits or reservations.

The verification fingerprints every old order and customer, and all immutable product/shop fields including credentials. Only the exact 35 stock reservations/sales counters and the expected genuine delivery earnings may change. Historical demo references are not purchased or modified. All reports, manifests, local assets and uploads remain ignored.

```powershell
node --test tests/presentationOrders.test.js
npm test
```

No commits, pushes, deployment, ML retraining, product creation or cancellation implementation are part of this tool.
