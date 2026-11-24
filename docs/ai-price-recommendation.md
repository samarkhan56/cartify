# Multi-category AI price recommendation

Price suggestions are advisory. They neither create products nor overwrite manual
pricing automatically. Manual pricing remains available when AI is unavailable.

## Supported taxonomy and routes

| Cartify category | Subcategory | Product type | Python route |
| --- | --- | --- | --- |
| Mobile and Tablets | Mobile Phones | smartphone | /predict |
| Computers and Laptops | Laptops | laptop | /predict/v2 |
| Others | Cookware Sets | cookware | /predict/v2 |
| Shoes | Adult Performance Running Shoes | running_shoes | /predict/v2 |

Exact category/subcategory/productType combinations are validated centrally.
Tablets and other unsupported types are rejected before ML is contacted.
Smartphone retains its legacy request and response contract.

## Seller interaction

Create Product accepts a name, brand, taxonomy and relevant specifications/description.
Smartphone condition remains new/used/refurbished. Laptop recommendations support
new/refurbished; used laptops can still use manual pricing. Cookware and running
shoes require a positive originalPrice, mapped to Python seller_original_price.
Running shoes also require validated gender and running_type values.

Get AI Price Recommendation requests a suggestion. Only Use Recommended Price
populates discountPrice; originalPrice and product submission are unchanged.
Changing a relevant input invalidates the card and in-flight request. A price still
owned by an applied AI suggestion is cleared; a manually entered/edited discountPrice
is retained. Request IDs discard late responses, including after another request
starts or the component unmounts.

For guarded models, recommendationAllowed:false is a valid result rather than an
ML error. Reason, deviation and supported-range metadata survive Express mapping.
The apply action is unavailable for a suppressed result. A new recommendation alone
never changes seller prices.

## Authenticated integration

The public endpoint is POST /api/v2/product/recommend-price with the existing
HTTP-only seller_token cookie. Existing account/suspension checks remain active.
The backend ignores submitted shop identity as proof of authentication.

React -> Express validation -> native Node ML client -> FastAPI -> mapped response.

The client applies a wall-clock timeout and bounded response size, rejects
redirects and invalid/non-finite output, and returns controlled errors. No request
writes a product. Frontend failures preserve manual creation and pricing.

Set ML_SERVICE_URL and ML_SERVICE_TIMEOUT_MS through the backend environment.
The normal Windows backend launcher starts or reuses the local ML service; see
ml-service/README.md. No virtual environment or account workbook belongs in Git.

## Product and compatibility behavior

Taxonomy fields remain optional for legacy catalog records, but supplied combinations
must be consistent. New supported products capture the explicit subtype. Seller-only
product-by-ID preview supports the authenticated owner's pending/hidden products;
public details keep normal approval/visibility filters.

Order snapshots capture sale price/quantity plus taxonomy and full shipping location.
Price recommendation and regional advertisement inference are separate features.
See backend/ADVERTISING.md for historical-demand eligibility and exact features.

## Verification

Backend price tests cover all four contracts, authentication, validation, transport
failures, guardrails and absence of product writes. Frontend tests cover advisory
application, manual edits, stale-input invalidation, late requests and creation retry.
The Python suite checks all four saved-model price predictions against existing
baselines while also exercising advertisement inference.

Run the existing backend/frontend test scripts and the ML unittest suite documented
in ml-service/README.md. Tests use isolated fixtures; no live accounts/orders need
to be seeded or modified to run the regressions.
