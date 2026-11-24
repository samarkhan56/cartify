const { invalidInput, readText, validateProductTaxonomy } = require("./productTaxonomy");
const { predictSmartphonePrice, predictMultiCategoryPrice } = require("./mlPricingClient");

// Extend only when a corresponding model and taxonomy are available.
const MODEL_REGISTRY = new Map([
  ["smartphone", predictSmartphonePrice],
  ...["laptop", "cookware", "running_shoes"].map((category) =>
    [category, (payload) => predictMultiCategoryPrice(category, payload)]),
]);
const CONDITION_LABELS = { new: "New", used: "Used", refurbished: "Refurbished" };

const readOriginalPrice = (value) => {
  if (!["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim())) {
    throw invalidInput("originalPrice must be a finite positive number for this recommendation.");
  }
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0 || price > Number.MAX_SAFE_INTEGER / 100) {
    throw invalidInput("originalPrice must be a finite positive number for this recommendation.");
  }
  return price;
};

const normalizeSpecifications = (value) => {
  if (value === undefined || value === "") return "";
  let items = value;
  // The existing creation form uses one Name: Value per line.
  if (typeof value === "string") {
    if (value.length > 10000) throw invalidInput("specifications is too long.");
    items = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const separator = line.indexOf(":");
      if (separator < 1) throw invalidInput("Each specification must have a name and value.");
      return { name: line.slice(0, separator), value: line.slice(separator + 1) };
    });
  }
  if (!Array.isArray(items) || items.length > 50) {
    throw invalidInput("specifications must contain at most 50 name/value entries.");
  }
  const text = items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw invalidInput("Each specification must have a name and value.");
    }
    const name = readText(item.name, "specification name", 100, true);
    const value = readText(item.value, "specification value", 500, true);
    return `${name}: ${value}`;
  }).join("; ");
  if (text.length > 10000) throw invalidInput("specifications is too long.");
  return text;
};

const recommendPrice = async (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalidInput("A product information object is required.");
  }
  const title = readText(input.name, "name", 300, true);
  const brand = readText(input.brand, "brand", 100, true);
  const taxonomy = validateProductTaxonomy(input, true);
  const description = readText(input.description, "description", 10000);
  const specifications = normalizeSpecifications(input.specifications);
  const predict = MODEL_REGISTRY.get(taxonomy.productType);
  if (!predict) {
    const error = invalidInput("AI price recommendation is not currently available for this product type.");
    error.statusCode = 422;
    error.code = "AI_PRICE_UNSUPPORTED_PRODUCT_TYPE";
    throw error;
  }
  if (taxonomy.productType === "laptop" && !["new", "refurbished"].includes(taxonomy.condition)) {
    const error = invalidInput("Laptop AI price recommendations support only New or Refurbished condition.");
    error.statusCode = 422;
    error.code = "AI_PRICE_UNSUPPORTED_CONDITION";
    throw error;
  }
  const payload = {
    title, brand, specifications, description,
    features: taxonomy.productType === "smartphone" ? "" : readText(input.features, "features", 10000),
  };
  if (["smartphone", "laptop"].includes(taxonomy.productType)) {
    payload.condition = CONDITION_LABELS[taxonomy.condition];
  }
  if (["cookware", "running_shoes"].includes(taxonomy.productType)) {
    payload.seller_original_price = readOriginalPrice(input.originalPrice);
  }
  if (taxonomy.productType === "running_shoes") {
    payload.gender = readText(input.gender, "gender", 20, true);
    payload.running_type = readText(input.running_type, "running_type", 30, true);
    if (!["Men", "Women"].includes(payload.gender)) {
      throw invalidInput("gender must be Men or Women for running shoes.");
    }
    if (!["Running", "Road Running", "Trail Running"].includes(payload.running_type)) {
      throw invalidInput("running_type must be Running, Road Running, or Trail Running.");
    }
  }
  const result = await predict(payload);
  return { ...result, productType: taxonomy.productType };
};

module.exports = { recommendPrice };
