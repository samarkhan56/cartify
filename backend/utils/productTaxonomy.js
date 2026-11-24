const ErrorHandler = require("./ErrorHandler");

// Supplement existing category labels; do not infer types from free-text titles.
const PRODUCT_TAXONOMY = [
  { category: "Mobile and Tablets", subcategory: "Mobile Phones", productType: "smartphone" },
  { category: "Mobile and Tablets", subcategory: "Tablets", productType: "tablet" },
  { category: "Computers and Laptops", subcategory: "Laptops", productType: "laptop" },
  // Cartify has no Home/Kitchen category; retain its existing Others category.
  { category: "Others", subcategory: "Cookware Sets", productType: "cookware" },
  { category: "Shoes", subcategory: "Adult Performance Running Shoes", productType: "running_shoes" },
];
const PRODUCT_CONDITIONS = ["new", "used", "refurbished"];

const invalidInput = (message) => {
  const error = new ErrorHandler(message, 400);
  error.code = "AI_PRICE_INVALID_INPUT";
  return error;
};

const readText = (value, field, maxLength, required = false) => {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") throw invalidInput(`${field} must be text.`);
  const text = value.trim();
  if (required && !text) throw invalidInput(`${field} is required.`);
  if (text.length > maxLength) throw invalidInput(`${field} is too long.`);
  return text;
};

// Optional for legacy product creation; complete and consistent when supplied.
const validateProductTaxonomy = (input, required = false) => {
  const subcategory = readText(input.subcategory, "subcategory", 100, required);
  const productType = readText(input.productType, "productType", 50, required);
  // These two models do not use condition. Product-creation validation is unchanged.
  const conditionRequired = required && !["cookware", "running_shoes"].includes(productType);
  const condition = readText(input.condition, "condition", 20, conditionRequired);
  const category = required || subcategory || productType
    ? readText(input.category, "category", 100, required) : input.category;
  if (condition && !PRODUCT_CONDITIONS.includes(condition)) {
    throw invalidInput("condition must be new, used, or refurbished.");
  }
  if ((subcategory || productType) && !PRODUCT_TAXONOMY.some((entry) =>
    entry.category === category && entry.subcategory === subcategory && entry.productType === productType
  )) {
    throw invalidInput("Invalid category, subcategory, and productType combination.");
  }
  return { subcategory, productType, condition };
};

module.exports = { PRODUCT_TAXONOMY, PRODUCT_CONDITIONS, invalidInput, readText, validateProductTaxonomy };
