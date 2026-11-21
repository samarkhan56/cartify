const fs = require("fs");
const path = require("path");
const { PRODUCT_TAXONOMY } = require("../utils/productTaxonomy");

// The only Cartify -> model-category mapping. Broad parent categories never infer a subtype.
const categoryMappings = Object.freeze([
  ["smartphone", "telephony"],
  ["laptop", "computers_accessories"],
  ["cookware", "housewares"],
  ["running_shoes", "sports_leisure"],
].map(([productType, modelCategory]) => Object.freeze({
  ...PRODUCT_TAXONOMY.find((entry) => entry.productType === productType), modelCategory,
})));

const normalizeText = (value) => typeof value === "string"
  ? value.normalize("NFC").trim().replace(/\s+/g, " ") : "";
const normalizeKey = (value) => normalizeText(value).toLowerCase();
const mapCategory = (item) => categoryMappings.find((mapping) =>
  ["category", "subcategory", "productType"].every((field) =>
    normalizeKey(item?.[field]) === normalizeKey(mapping[field]))
) || null;

let modelConfig = null;
try {
  const config = JSON.parse(fs.readFileSync(path.resolve(__dirname,
    "../../ml-service/models/ad_recommendation/cartify_ad_model_config.json"), "utf8"));
  if (!Array.isArray(config.feature_columns) || !config.feature_columns.length ||
      config.feature_columns.some((field) => typeof field !== "string" || !field) ||
      new Set(config.feature_columns).size !== config.feature_columns.length ||
      !Number.isFinite(config.classification_threshold) ||
      config.classification_threshold < 0 || config.classification_threshold > 1) throw new Error("Invalid config");
  modelConfig = Object.freeze({ featureColumns: Object.freeze([...config.feature_columns]),
    classificationThreshold: config.classification_threshold });
} catch {
  console.warn("[Cartify] Advertisement feature config is unavailable; advertisement requests will be disabled.");
}

module.exports = { categoryMappings, mapCategory, modelConfig, normalizeText, normalizeKey };
