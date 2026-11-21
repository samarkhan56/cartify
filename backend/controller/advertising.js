const express = require("express");
const { isValidObjectId } = require("mongoose");
const { isSeller } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Product = require("../model/product");
const { mapCategory } = require("../config/advertising");
const { loadMarketplaceHistory, normalizeRegion } = require("../services/advertisingFeatures");
const { scoreCandidates } = require("../utils/adMlClient");

function createAdvertisingRouter({ now = () => new Date() } = {}) {
  const router = express.Router();
  router.use(isSeller);
  const unavailable = (reason, message, history) => ({ available: false, reason, message, ...(history ? { history } : {}) });
  const scores = (row) => ({ rank: row.rank, demand_probability: row.demand_probability,
    predicted_volume: row.predicted_volume, expected_demand_score: row.expected_demand_score, confidence: row.confidence });
  const serviceFailure = (error) => error?.message === "FEATURE_CONTRACT_MISMATCH"
    ? unavailable("FEATURE_CONTRACT_MISMATCH", "Advertisement feature configuration does not match the feature builder.")
    : error?.message === "AD_ML_UNAVAILABLE"
      ? unavailable("ML_UNAVAILABLE", "Advertisement recommendations are temporarily unavailable.")
      : unavailable("HISTORY_UNAVAILABLE", "Marketplace demand history is temporarily unavailable.");

  router.get("/recommend-regions/:productId", catchAsyncErrors(async (req, res) => {
    if (!isValidObjectId(req.params.productId)) return res.status(400).json(unavailable("INVALID_PRODUCT", "Invalid product ID."));
    try {
      const product = await Product.findById(req.params.productId).lean();
      if (!product) return res.status(404).json(unavailable("PRODUCT_NOT_FOUND", "Product not found."));
      if (String(product.shopId) !== String(req.seller.id)) return res.status(403).json(unavailable("FORBIDDEN", "You can only request recommendations for your own products."));
      const mapping = mapCategory(product);
      if (!mapping) return res.json(unavailable("UNSUPPORTED_CATEGORY", "This product taxonomy is not supported for advertisement recommendations."));
      const demand = await loadMarketplaceHistory(now());
      if (!demand.available) return res.json(demand);
      if (!demand.categories.has(mapping.modelCategory)) return res.json(unavailable("INSUFFICIENT_HISTORY", "No supported completed purchase history exists for this product category.", demand.history));
      const candidates = [...demand.regions.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, region]) =>
        ({ region, ...demand.features(key, mapping.modelCategory) }));
      const recommendations = await scoreCandidates("regions", mapping.modelCategory, candidates);
      return res.json({ available: true, product: { id: String(product._id), name: product.name,
        category: mapping.category, subcategory: mapping.subcategory, productType: mapping.productType },
        history: demand.history, recommendations: recommendations.map((row) => ({ ...scores(row), region: row.region })) });
    } catch (error) { return res.json(serviceFailure(error)); }
  }));

  router.get("/recommend-products", catchAsyncErrors(async (req, res) => {
    const region = normalizeRegion(req.query);
    if (!region) return res.status(400).json(unavailable("INVALID_REGION", "Provide city, state, and country as non-empty text."));
    try {
      const inventory = await Product.find({ shopId: String(req.seller.id), isActive: { $ne: false }, stock: { $gt: 0 },
        $or: [{ approvalStatus: "approved" }, { approvalStatus: { $exists: false } }] })
        .select("_id name category subcategory productType shopId isActive approvalStatus stock").lean();
      const supported = inventory.map((product) => ({ product, mapping: mapCategory(product) }))
        .filter(({ product, mapping }) => mapping && String(product.shopId) === String(req.seller.id) &&
          product.isActive !== false && product.stock > 0 && (!product.approvalStatus || product.approvalStatus === "approved"));
      if (!supported.length) return res.json(unavailable("NO_ELIGIBLE_INVENTORY", "No active, in-stock products with supported taxonomies are available in your shop."));
      const demand = await loadMarketplaceHistory(now());
      if (!demand.available) return res.json(demand);
      if (!demand.regions.has(region.key)) return res.json(unavailable("INSUFFICIENT_HISTORY", "No supported completed purchase history exists for this region.", demand.history));
      const candidates = [...new Set(supported.map(({ mapping }) => mapping.modelCategory))]
        .filter((category) => demand.categories.has(category)).sort().map((category) =>
          ({ category, ...demand.features(region.key, category) }));
      if (!candidates.length) return res.json(unavailable("INSUFFICIENT_HISTORY", "Your inventory categories do not yet have completed marketplace history.", demand.history));
      const ranked = await scoreCandidates("categories", region.label, candidates);
      // The score belongs to a category. Never pretend that identical category scores predict individual-product demand.
      const recommendations = ranked.map((row) => {
        const products = supported.filter(({ mapping }) => mapping.modelCategory === row.category)
          .map(({ product, mapping }) => ({ id: String(product._id), name: product.name, category: mapping.category,
            subcategory: mapping.subcategory, productType: mapping.productType }));
        return { ...scores(row), category: products[0].subcategory, products };
      });
      return res.json({ available: true, region: demand.regions.get(region.key), history: demand.history, recommendations });
    } catch (error) { return res.json(serviceFailure(error)); }
  }));

  return router;
}

module.exports = createAdvertisingRouter();
module.exports.createAdvertisingRouter = createAdvertisingRouter;
