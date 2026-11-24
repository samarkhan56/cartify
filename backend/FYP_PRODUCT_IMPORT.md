# Manual FYP product import

This tool reads only the `Product Allocation` sheet and numbered image folders. It never runs automatically at server startup. The workbook and source images remain unchanged inside ignored `FYP Product Assets/`.

The approved plan contains 32 products allocated to ten sellers. The original Samsung must already exist under the presenting seller's account; its document, images, price and ownership are preserved. Ordinary products omit unsupported `subcategory` and `productType` fields. Eight AI products retain the centralized exact taxonomies.

## Prerequisites

- Local MongoDB and the regular Express backend are running.
- All ten intended sellers are active and approved through the normal Admin UI.
- A local Python environment with Pillow is available for full signature/decode validation. Set `CARTIFY_PRODUCT_PYTHON` to that environment's Python executable. This is an importer dependency; do not change the ML environment merely to run it.
- For an apply that needs new records, provide the original local account workbook. Its passwords are used only in memory to call normal seller login; cookies and tokens are never written to reports.

From `backend`, run:

```powershell
$env:CARTIFY_PRODUCT_PYTHON = '<Python executable with Pillow>'
node scripts/import-fyp-products.js --report demo/fyp-products-dry-run.json
```

Inspect the dry-run report, then use its confirmation fingerprint:

```powershell
$confirmation = (Get-Content demo/fyp-products-dry-run.json -Raw | ConvertFrom-Json).confirm
node scripts/import-fyp-products.js --apply --confirm $confirmation --accounts-workbook '<local account workbook.xlsx>' --report demo/fyp-products-applied.json
```

The confirmation binds workbook bytes, validated image hashes, seller identities, product matches, proposed fields and the database snapshot. All required sellers authenticate successfully before the first product upload. An exclusive local lock prevents overlapping runs of this tool. A stale lock after a crash requires manual inspection before removal.

Each product is submitted through `/api/v2/product/create-product` using its owning seller's real session. Multer saves the image in `backend/uploads`, and the existing controller stores the returned filename, sets `approvalStatus: pending`, and keeps the product active. No source path is stored as an image. Prices use the workbook's USD-equivalent merchandise values without requesting or applying AI prices.

The importer uses deterministic MongoDB IDs and SKUs for new records. It checks normalized owner/title matches and ID collisions before each request. It does not edit or delete existing products. A rerun skips matching products and does not upload their images again. Concurrent changes or request errors stop the process; review the report and obtain a fresh dry run rather than blindly repeating an apply.

## Standard category mapping

Numbers refer to the workbook and image-folder prefixes. These are existing category labels, including Cartify's spelling of `Accesories` and `Cloths`. There are no existing ordinary subcategories to invent.

| Category | Product numbers |
|---|---|
| Mobile and Tablets | 06, 25, 26 |
| Computers and Laptops | 19, 20, 21, 27 |
| Accesories | 07, 16, 31 |
| Cloths | 17, 32 |
| Gifts | 13 |
| Others | 08, 09, 10, 11, 12, 15, 22, 23, 24, 29, 30 |

## Verification and moderation

Run another dry run after apply. An unchanged complete dataset must report 32 reused and zero proposed creations. The report fingerprints every pre-existing collection, excluding only records created by this run when verifying preservation. Local reports and upload files remain ignored by Git.

```powershell
node scripts/import-fyp-products.js --report demo/fyp-products-idempotency.json
node --test tests/productImport.test.js
npm test
```

New products still require manual approval through `/admin-products`. Until then, owner previews may display them, while public listings/details and approved-inventory advertisement selectors retain the existing moderation restrictions. The importer never approves products or creates presentation orders.
