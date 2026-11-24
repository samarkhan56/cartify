# Regional advertisements: Phase 2 data contract

This module reads Cartify orders only. It does not read external training datasets,
seed orders, or call MongoDB from Python. Existing price inference is unchanged.

## Endpoints

Both routes use the existing `seller_token` / `isSeller` middleware:

- `GET /api/v2/advertising/recommend-regions/:productId`
- `GET /api/v2/advertising/recommend-products?country=Pakistan&state=Punjab&city=Lahore`

The first route requires product ownership, including a seller's own pending product
for planning. The second considers only the seller's approved (or legacy approval
absent), active, in-stock inventory. Requests cannot provide their own features/date.
Model category names are internal. Region-to-products results are ranked category
groups containing matching seller products; the model does not score individual SKUs.

Authentication/ownership/invalid-input errors use 401/403/400; missing products use
404. Business/data/ML unavailability returns HTTP 200 with `available:false`, a
`reason`, and a message. Success returns `available:true`, history metadata, and
ranked recommendations. No customer/order IDs are exposed in history metadata.

## Mapping and historical snapshots

`config/advertising.js` is the only category mapping:

| Cartify category | Subcategory | Product type | Model category |
| --- | --- | --- | --- |
| Mobile and Tablets | Mobile Phones | smartphone | telephony |
| Computers and Laptops | Laptops | laptop | computers_accessories |
| Others | Cookware Sets | cookware | housewares |
| Shoes | Adult Performance Running Shoes | running_shoes | sports_leisure |

All three taxonomy fields must agree. A broad parent, product title, or current
catalog lookup cannot establish a historical item's subtype. Such legacy lines are
excluded and counted in `excludedUnmappedLineItems`. New order items capture the
actual product's subcategory/productType alongside the existing category. Existing
records are not changed or backfilled.

## Eligibility, region, dates, and money

- Only `status:Delivered` and `paymentInfo.status:Succeeded`; pending/refunded or
  other statuses are excluded. Active/successful refund records are excluded too.
- Month comes from the historical order's **createdAt**, never delivery date.
  UTC is used consistently. Purchase dates in the current/future month are excluded.
- Current feature month is the latest fully completed UTC month. For 19 November
  2026 it is October, prior months are September/August/July, forecast month November.
- `shippingAddress.city/state/country` form the region. Whitespace/casing is
  normalized in memory only; missing state is never invented. Use the same country
  and province names as the shipping snapshot; no geocoding/ISO-code translation occurs.
- Stable customer identity is `user._id`; stable order identity is order `_id`.
  Shop-split Order documents are distinct orders: Cartify has no parent checkout ID.
- Revenue is captured `cart.discountPrice * cart.qty`, or captured `lineTotal` when
  unit sale price is absent. It excludes shipping and original/current catalog prices.
  Order-level coupon discounts are not redistributed because item snapshots do not
  contain that allocation. Money is accumulated as cents within each monthly cell.
- The current FYP uses effective USD (including Stripe's `usd` configuration).
  Missing currency fields mean USD under that existing app contract. Explicit foreign
  currencies fail closed with `UNSUPPORTED_CURRENCY`; no conversion/mixing occurs.
- `createdAt` now defaults per document (`Date.now`), rather than once per server
  startup. Old timestamps are not guessed or repaired; review their provenance before
  relying on imported/older historical records.

## Exact features

First group by normalized Region x mapped Category x purchase Month, counting
distinct order IDs, distinct customer IDs, and summed captured item sale revenue.
Multiple lines/quantities in one category do not multiply its order count. Aggregate
across the **whole marketplace**, never by the requesting seller.

For current month t, read cells t, t-1, t-2, t-3. Missing calendar cells are real zero
observations within the known history panel. The authoritative ordered feature list
comes from `ml-service/models/ad_recommendation/cartify_ad_model_config.json`.

- `orders_current`: t orders.
- `orders_prev_1/2/3`: t-1/t-2/t-3 orders.
- `orders_3m_sum`: prev1 + prev2 + prev3; `orders_3m_avg`: that sum / 3.
- `customers_prev_1`: previous month's distinct customers.
- `customers_3m_sum`: sum of each prior month's distinct-customer count, NOT distinct
  customers recalculated across the entire three-month window.
- `revenue_prev_1`: prior month; `revenue_3m_sum`: prior three months' revenue.
- `demand_trend`: orders_prev_1 - orders_prev_3 (not a percentage).
- `region_month_*`: sums of current-month category-cell orders/customers/revenue in
  that region. A customer/order spanning categories contributes to each category.
- `category_month_*`: sums of current-month region-cell orders/customers/revenue for
  that category. A customer purchasing in different regions contributes in each.

## Cold start and failure policy

The panel starts at the earliest eligible, mappable, complete-region purchase month
and ends at the latest completed month. Require at least four consecutive calendar
slots; zero-sale months count as zero, not missing rows. Collection history is assumed
complete since that first eligible purchase. Candidate regions/categories must have
been observed somewhere in eligible history; known region/category cross-products
can have zero pair sales. **No 50/100-order, support, recency, or confidence cutoff is
imposed in Phase 2.** Additional support policy is deferred for review.

An empty or Pending-only local database returns `INSUFFICIENT_HISTORY` without
calling ML. No demo data is created automatically. Diagnostics identify exclusions
for missing regions, ambiguous categories,
invalid amounts/customer IDs/dates. ML errors return `ML_UNAVAILABLE`; database errors
return `HISTORY_UNAVAILABLE`. Ineligible inventory returns `NO_ELIGIBLE_INVENTORY`.

All candidates are scored; batches of up to 1000 use the existing FastAPI endpoints.
Per-batch Top 5 are merged into a global Top 5. Responses are checked for known
candidate IDs, scores/probabilities, ordering, ranks, and configured confidence.

## Verification

`npm test` includes arithmetic, eligibility, ownership, historical-data quality,
failures, and real Express-to-FastAPI tests using isolated in-memory history fixtures
and the saved models. Those fixtures are never inserted into Cartify MongoDB.
