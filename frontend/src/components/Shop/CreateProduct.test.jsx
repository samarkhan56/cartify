import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import CreateProduct from "./CreateProduct";
import { productReducer } from "../../redux/reducers/product";
import { productTaxonomy } from "../../static/data";
import { toast } from "react-toastify";

jest.mock("axios", () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

let store, container;
const recommendation = { price: 525.89, currency: "USD", productType: "smartphone" };
const response = { data: { success: true, recommendation } };
const change = (selector, value) => fireEvent.change(container.querySelector(selector), { target: { value } });
const selectPhone = () => {
  change('select[required]', "Mobile and Tablets");
  fireEvent.change(screen.getByLabelText("Subcategory"), { target: { value: "Mobile Phones" } });
};
const fillPhone = () => {
  selectPhone();
  change('input[name="name"]', "Samsung Galaxy A55 5G");
  change('input[placeholder="e.g. Nike, Apple, Samsung"]', "Samsung");
  fireEvent.change(screen.getByLabelText("Condition"), { target: { value: "new" } });
};
const fillCreationFields = () => {
  change('textarea[name="description"]', "Unlocked Android phone");
  change('input[name="originalPrice"]', "600");
  change('input[name="stock"]', "2");
  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: { files: [new File(["image"], "phone.png", { type: "image/png" })] },
  });
};
const requestRecommendation = () => fireEvent.click(screen.getByRole("button", { name: "Get AI Price Recommendation" }));
const submitProduct = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Create Product" }));
  });
};
const lastCreateForm = () => axios.post.mock.calls.find(([url]) => url.endsWith("/create-product"))[1];

beforeEach(() => {
  jest.clearAllMocks();
  axios.post.mockResolvedValue(response);
  URL.createObjectURL = jest.fn(() => "blob:test-image");
  store = configureStore({ reducer: {
    products: productReducer,
    seller: () => ({ seller: { _id: "seller-id", verificationStatus: "approved", accountStatus: "active" } }),
  } });
  ({ container } = render(<Provider store={store}><MemoryRouter><CreateProduct /></MemoryRouter></Provider>));
});

test("form loads and legacy non-smartphone creation works without a recommendation", async () => {
  expect(screen.getByRole("heading", { name: "Create Product" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Get AI Price Recommendation" })).not.toBeInTheDocument();
  change('input[name="name"]', "Shoes");
  change('select[required]', "Shoes");
  fillCreationFields();
  axios.post.mockResolvedValue({ data: { product: { _id: "new-product" } } });
  await submitProduct();
  await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
  expect(lastCreateForm().get("discountPrice")).toBe("600");
  expect(lastCreateForm().get("productType")).toBeNull();
});

test("phone and tablet controls preserve category and unsupported tablets still submit", async () => {
  fillPhone();
  expect(screen.getByText("Product Type: Smartphone")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Subcategory"), { target: { value: "Tablets" } });
  expect(screen.getByText("Product Type: Tablet")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Get AI Price Recommendation" })).not.toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
  fillCreationFields();
  axios.post.mockResolvedValue({ data: { product: { _id: "tablet" } } });
  await submitProduct();
  await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
  expect(lastCreateForm().get("category")).toBe("Mobile and Tablets");
  expect(lastCreateForm().get("subcategory")).toBe("Tablets");
  expect(lastCreateForm().get("productType")).toBe("tablet");
});

test("recommendations require name, brand, and condition and do not request on keystrokes", () => {
  selectPhone();
  requestRecommendation();
  expect(axios.post).not.toHaveBeenCalled();
  fillPhone();
  expect(axios.post).not.toHaveBeenCalled();
});

test("loading prevents duplicates; explicit acceptance updates only discountPrice and remains manually editable", async () => {
  fillPhone();
  fillCreationFields();
  change('input[name="discountPrice"]', "400");
  let resolve;
  axios.post.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  requestRecommendation();
  const loadingButton = screen.getByRole("button", { name: "Getting AI recommendation..." });
  expect(loadingButton).toBeDisabled();
  fireEvent.click(loadingButton);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(store.getState().products.isLoading).toBe(true);
  expect(store.getState().products.success).toBeUndefined();
  expect(axios.post.mock.calls[0][0]).toMatch(/\/api\/v2\/product\/recommend-price$/);
  expect(axios.post.mock.calls[0][2].withCredentials).toBe(true);
  expect(axios.post.mock.calls[0][1]).toMatchObject({ category: "Mobile and Tablets", subcategory: "Mobile Phones", productType: "smartphone", condition: "new" });
  await act(async () => resolve(response));
  expect(screen.getByText("$525.89 USD")).toBeInTheDocument();
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("400");
  expect(container.querySelector('input[name="originalPrice"]').value).toBe("600");
  fireEvent.click(screen.getByRole("button", { name: "Use Recommended Price" }));
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("525.89");
  expect(container.querySelector('input[name="originalPrice"]').value).toBe("600");
  expect(axios.post).toHaveBeenCalledTimes(1);
  change('input[name="discountPrice"]', "510.50");
  axios.post.mockResolvedValue({ data: { product: { _id: "phone" } } });
  await submitProduct();
  await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
  expect(lastCreateForm().get("discountPrice")).toBe("510.50");
  expect(lastCreateForm().get("originalPrice")).toBe("600");
  expect(lastCreateForm().get("condition")).toBe("new");
});

test("accepted recommendation submits decimal selling price without changing reference price", async () => {
  fillPhone();
  fillCreationFields();
  requestRecommendation();
  fireEvent.click(await screen.findByRole("button", { name: "Use Recommended Price" }));
  axios.post.mockResolvedValue({ data: { product: { _id: "phone" } } });
  await submitProduct();
  await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
  expect(lastCreateForm().get("discountPrice")).toBe("525.89");
  expect(lastCreateForm().get("originalPrice")).toBe("600");
});

test("ignoring a recommendation preserves manual price and normal creation", async () => {
  fillPhone();
  fillCreationFields();
  change('input[name="discountPrice"]', "450");
  requestRecommendation();
  await screen.findByText("$525.89 USD");
  axios.post.mockResolvedValue({ data: { product: { _id: "phone" } } });
  await submitProduct();
  await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
  expect(lastCreateForm().get("discountPrice")).toBe("450");
});

test("ML failure shows a controlled message and does not block manual creation", async () => {
  fillPhone();
  fillCreationFields();
  axios.post.mockRejectedValueOnce(new Error("connection failed"));
  requestRecommendation();
  expect(await screen.findByRole("alert")).toHaveTextContent("You can still enter the price manually");
  expect(screen.queryByRole("button", { name: "Use Recommended Price" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create Product" })).toBeEnabled();
  axios.post.mockResolvedValue({ data: { product: { _id: "phone" } } });
  await submitProduct();
  await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
});

test.each([
  ['input[name="name"]', "Different phone"],
  ['input[placeholder="e.g. Nike, Apple, Samsung"]', "Apple"],
  ['select[required]', "Shoes"],
  ['#product-subcategory', "Tablets"],
  ['#product-condition', "used"],
  ['textarea[placeholder="One per line, e.g. Material: Cotton"]', "RAM: 16GB"],
  ['textarea[name="description"]', "Changed description"],
])("editing %s clears an applied price and its recommendation", async (selector, value) => {
  fillPhone();
  requestRecommendation();
  fireEvent.click(await screen.findByRole("button", { name: "Use Recommended Price" }));
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("525.89");
  change(selector, value);
  expect(screen.queryByText("$525.89 USD")).not.toBeInTheDocument();
  expect(store.getState().products.priceRecommendation).toBeNull();
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("");
});

test.each(["success", "failure"])("late %s from an edited request is discarded, including when a newer request is pending", async (outcome) => {
  fillPhone();
  let resolve, reject;
  axios.post.mockImplementationOnce(() => new Promise((done, fail) => { resolve = done; reject = fail; }));
  requestRecommendation();
  change('input[name="name"]', "Updated smartphone");
  let resolveNew;
  axios.post.mockImplementationOnce(() => new Promise((done) => { resolveNew = done; }));
  requestRecommendation();
  await act(async () => {
    if (outcome === "success") resolve(response);
    else reject(new Error("old failure"));
  });
  expect(screen.getByRole("button", { name: "Getting AI recommendation..." })).toBeDisabled();
  expect(screen.queryByText("$525.89 USD")).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  await act(async () => resolveNew({ data: { success: true, recommendation: { ...recommendation, price: 550 } } }));
  expect(screen.getByText("$550.00 USD")).toBeInTheDocument();
});

test("malformed API recommendation is rejected in the frontend", async () => {
  fillPhone();
  axios.post.mockResolvedValueOnce({ data: { success: true, recommendation: { ...recommendation, price: "525.89" } } });
  requestRecommendation();
  expect(await screen.findByRole("alert")).toHaveTextContent("You can still enter the price manually");
});

const v2Response = (productType, extra = {}) => ({ data: { success: true, recommendation: {
  productType, recommendedPrice: 111.73, recommendationAllowed: true, reason: null, currency: "USD", ...extra,
} } });
const fillModel = (productType) => {
  const [category, entries] = Object.entries(productTaxonomy).find(([, types]) => types.some((entry) => entry.productType === productType));
  const type = entries.find((entry) => entry.productType === productType);
  change('select[required]', category);
  fireEvent.change(screen.getByLabelText("Subcategory"), { target: { value: type.subcategory } });
  change('input[name="name"]', productType === "laptop" ? "Lenovo ThinkPad E14" : productType === "cookware" ? "Cuisinart Stainless Steel 10-Piece Set" : "Brooks Men's Ghost 15 Neutral Running Shoe");
  change('input[placeholder="e.g. Nike, Apple, Samsung"]', productType === "laptop" ? "Lenovo" : productType === "cookware" ? "Cuisinart" : "Brooks");
  change('textarea[name="description"]', "Product description");
  change('textarea[placeholder="One per line, e.g. Material: Cotton"]', "Material: Stainless steel");
  if (productType === "laptop") change('#product-condition', "new");
  else change('input[name="originalPrice"]', productType === "cookware" ? "199.99" : "120");
  if (productType === "running_shoes") {
    fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "Men" } });
    fireEvent.change(screen.getByLabelText("Running Type"), { target: { value: "Running" } });
  }
};

const prepareRecommendation = (productType) => {
  if (productType === "smartphone") fillPhone();
  else fillModel(productType);
  if (productType === "smartphone" || productType === "laptop") change('input[name="originalPrice"]', "600");
  axios.post.mockResolvedValueOnce(productType === "smartphone" ? response : v2Response(productType));
};

test.each(["smartphone", "laptop", "cookware", "running_shoes"])("%s AI-applied price clears on Brand change without changing originalPrice", async (productType) => {
  prepareRecommendation(productType);
  const originalPrice = container.querySelector('input[name="originalPrice"]').value;
  requestRecommendation();
  fireEvent.click(await screen.findByRole("button", { name: "Use Recommended Price" }));
  expect(container.querySelector('input[name="discountPrice"]').value).not.toBe("");
  change('input[placeholder="e.g. Nike, Apple, Samsung"]', "Changed brand");
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("");
  expect(container.querySelector('input[name="originalPrice"]').value).toBe(originalPrice);
  expect(screen.queryByRole("button", { name: "Use Recommended Price" })).not.toBeInTheDocument();
  expect(store.getState().products.priceRecommendation).toBeNull();
  expect(screen.getByRole("button", { name: "Create Product" })).toBeEnabled();
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test.each(["smartphone", "laptop", "cookware", "running_shoes"])("%s manually edited price survives invalidation after AI application", async (productType) => {
  prepareRecommendation(productType);
  requestRecommendation();
  fireEvent.click(await screen.findByRole("button", { name: "Use Recommended Price" }));
  change('input[name="discountPrice"]', "98.76");
  change('input[placeholder="e.g. Nike, Apple, Samsung"]', "Changed brand");
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("98.76");
  expect(store.getState().products.priceRecommendation).toBeNull();
});

test.each(["smartphone", "laptop", "cookware", "running_shoes"])("%s unapplied recommendation never changes a manual price, including after invalidation", async (productType) => {
  prepareRecommendation(productType);
  change('input[name="discountPrice"]', "98.76");
  requestRecommendation();
  await screen.findByRole("button", { name: "Use Recommended Price" });
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("98.76");
  change('input[placeholder="e.g. Nike, Apple, Samsung"]', "Changed brand");
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("98.76");
  expect(store.getState().products.priceRecommendation).toBeNull();
});

test("a manual edit back to the same AI price remains seller-controlled", async () => {
  prepareRecommendation("smartphone");
  requestRecommendation();
  fireEvent.click(await screen.findByRole("button", { name: "Use Recommended Price" }));
  change('input[name="discountPrice"]', "500");
  change('input[name="discountPrice"]', "525.89");
  change('input[placeholder="e.g. Nike, Apple, Samsung"]', "Changed brand");
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("525.89");
});

test("a newer recommendation alone does not replace the applied price, which still clears when inputs change", async () => {
  prepareRecommendation("smartphone");
  requestRecommendation();
  fireEvent.click(await screen.findByRole("button", { name: "Use Recommended Price" }));
  axios.post.mockResolvedValueOnce({ data: { success: true, recommendation: { ...recommendation, price: 550 } } });
  requestRecommendation();
  await screen.findByText("$550.00 USD");
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("525.89");
  change('input[placeholder="e.g. Nike, Apple, Samsung"]', "Changed brand");
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("");
});

test("only the four exact supported taxonomies expose AI pricing", () => {
  expect(Object.entries(productTaxonomy).flatMap(([category, entries]) => entries.filter((entry) => entry.aiPriceSupported).map(({ subcategory, productType }) => ({ category, subcategory, productType })))).toEqual([
    { category: "Mobile and Tablets", subcategory: "Mobile Phones", productType: "smartphone" },
    { category: "Computers and Laptops", subcategory: "Laptops", productType: "laptop" },
    { category: "Others", subcategory: "Cookware Sets", productType: "cookware" },
    { category: "Shoes", subcategory: "Adult Performance Running Shoes", productType: "running_shoes" },
  ]);
  for (const category of ["Shoes", "Others"]) {
    change('select[required]', category);
    expect(screen.queryByRole("button", { name: "Get AI Price Recommendation" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Gender")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Running Type")).not.toBeInTheDocument();
  }
});

test.each(["new", "refurbished"])("Laptop %s accepts v2 pricing without dedicated inputs", async (condition) => {
  fillModel("laptop");
  change('#product-condition', condition);
  axios.post.mockResolvedValueOnce(v2Response("laptop", { recommendedPrice: 647.06 }));
  requestRecommendation();
  expect(await screen.findByText("$647.06 USD")).toBeInTheDocument();
  expect(axios.post.mock.calls[0][1]).toEqual({
    name: "Lenovo ThinkPad E14", brand: "Lenovo", category: "Computers and Laptops", subcategory: "Laptops",
    productType: "laptop", condition, description: "Product description", specifications: "Material: Stainless steel",
  });
  expect(screen.queryByLabelText("Gender")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Running Type")).not.toBeInTheDocument();
  expect(store.getState().products.priceRecommendation.price).toBe(647.06);
});

test("Laptop Used disables AI requests, clears the old result, and preserves manual creation", async () => {
  fillModel("laptop");
  axios.post.mockResolvedValueOnce(v2Response("laptop"));
  requestRecommendation();
  await screen.findByRole("button", { name: "Use Recommended Price" });
  change('#product-condition', "used");
  expect(screen.getByText(/laptops are currently available only for New or Refurbished/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Get AI Price Recommendation" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Use Recommended Price" })).not.toBeInTheDocument();
  requestRecommendation();
  expect(axios.post).toHaveBeenCalledTimes(1);
  fillCreationFields();
  change('input[name="discountPrice"]', "450");
  axios.post.mockResolvedValueOnce({ data: { product: { _id: "manual-laptop" } } });
  await submitProduct();
  expect(lastCreateForm().get("condition")).toBe("used");
  expect(lastCreateForm().get("discountPrice")).toBe("450");
});

test("Cookware sends originalPrice exclusively, requires no condition, and preserves guardrail metadata", async () => {
  fillModel("cookware");
  change('input[name="discountPrice"]', "20");
  axios.post.mockResolvedValueOnce(v2Response("cookware", { recommendedPrice: 153.51, deviationPercent: 23.24,
    originalPriceInSupportedRange: true, predictionInSupportedRange: true }));
  requestRecommendation();
  await screen.findByText("$153.51 USD");
  expect(axios.post.mock.calls[0][1]).toEqual({ name: "Cuisinart Stainless Steel 10-Piece Set", brand: "Cuisinart",
    category: "Others", subcategory: "Cookware Sets", productType: "cookware", originalPrice: 199.99,
    specifications: "Material: Stainless steel", description: "Product description" });
  expect(store.getState().products.priceRecommendation).toMatchObject({ price: 153.51, recommendationAllowed: true,
    deviationPercent: 23.24, originalPriceInSupportedRange: true, predictionInSupportedRange: true });
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("20");
});

test.each(["cookware", "running_shoes"])("%s requires name, brand, and a positive originalPrice for AI only", (productType) => {
  fillModel(productType);
  for (const [selector, value, restore] of [
    ['input[name="name"]', " ", "Product name"],
    ['input[placeholder="e.g. Nike, Apple, Samsung"]', " ", "Brand"],
    ['input[name="originalPrice"]', "", "120"],
    ['input[name="originalPrice"]', "0", "120"],
    ['input[name="originalPrice"]', "-1", "120"],
  ]) {
    change(selector, value);
    requestRecommendation();
    expect(axios.post).not.toHaveBeenCalled();
    change(selector, restore);
  }
  expect(toast.error).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Create Product" })).toBeEnabled();
});

test.each([
  ["excessive_price_deviation", /differs too much/],
  ["original_price_out_of_supported_range", /not available for this price range/],
  ["seller_price_outside_supported_range", /not available for this price range/],
  ["original_price_outside_supported_range", /not available for this price range/],
  ["prediction_out_of_supported_range", /falls outside the supported pricing range/],
  ["prediction_outside_supported_range", /falls outside the supported pricing range/],
  ["unknown_guard", /could not safely provide/],
  [null, /could not safely provide/],
])("Cookware suppression reason %s is non-blocking and cannot be applied", async (reason, message) => {
  fillModel("cookware");
  change('input[name="discountPrice"]', "140");
  axios.post.mockResolvedValueOnce(v2Response("cookware", { recommendedPrice: null, recommendationAllowed: false,
    reason, deviationPercent: null, originalPriceInSupportedRange: false, predictionInSupportedRange: null }));
  requestRecommendation();
  expect(await screen.findByRole("status")).toHaveTextContent(message);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Use Recommended Price" })).not.toBeInTheDocument();
  expect(store.getState().products.priceRecommendationError).toBeNull();
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("140");
  expect(container.querySelector('input[name="originalPrice"]').value).toBe("199.99");
  change('input[name="stock"]', "1");
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(["image"], "set.png", { type: "image/png" })] } });
  expect(container.querySelector('input[name="originalPrice"]').checkValidity()).toBe(true);
  axios.post.mockResolvedValueOnce({ data: { product: { _id: "manual-set" } } });
  await submitProduct();
  expect(lastCreateForm().get("originalPrice")).toBe("199.99");
  expect(lastCreateForm().get("discountPrice")).toBe("140");
});

test("Running Shoes exposes exact choices and sends gender, running_type and originalPrice", async () => {
  fillModel("running_shoes");
  expect(Array.from(screen.getByLabelText("Gender").options).map((option) => option.value)).toEqual(["", "Men", "Women"]);
  expect(Array.from(screen.getByLabelText("Running Type").options).map((option) => option.value)).toEqual(["", "Running", "Road Running", "Trail Running"]);
  change('input[name="discountPrice"]', "90");
  axios.post.mockResolvedValueOnce(v2Response("running_shoes", { deviationPercent: 6.89,
    originalPriceInSupportedRange: true, predictionInSupportedRange: true }));
  requestRecommendation();
  await screen.findByText("$111.73 USD");
  expect(axios.post.mock.calls[0][1]).toEqual({ name: "Brooks Men's Ghost 15 Neutral Running Shoe", brand: "Brooks",
    category: "Shoes", subcategory: "Adult Performance Running Shoes", productType: "running_shoes",
    description: "Product description", specifications: "Material: Stainless steel", originalPrice: 120, gender: "Men", running_type: "Running" });
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("90");
  fireEvent.click(screen.getByRole("button", { name: "Use Recommended Price" }));
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("111.73");
  expect(container.querySelector('input[name="originalPrice"]').value).toBe("120");
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(store.getState().products.priceRecommendation).toMatchObject({ deviationPercent: 6.89,
    originalPriceInSupportedRange: true, predictionInSupportedRange: true });
});

test("Running Shoes requires its extra fields for AI, but not manual product submission", async () => {
  fillModel("running_shoes");
  change('#ai-running-gender', "");
  requestRecommendation();
  expect(axios.post).not.toHaveBeenCalled();
  change('#ai-running-gender', "Women");
  change('#ai-running-type', "");
  requestRecommendation();
  expect(axios.post).not.toHaveBeenCalled();
  change('#ai-running-gender', "");
  fillCreationFields();
  axios.post.mockResolvedValueOnce({ data: { product: { _id: "manual-shoes" } } });
  await submitProduct();
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(lastCreateForm().get("productType")).toBe("running_shoes");
  expect(lastCreateForm().has("gender")).toBe(false);
  expect(lastCreateForm().has("running_type")).toBe(false);
  expect(lastCreateForm().has("recommendationAllowed")).toBe(false);
});

test("a suppressed Running Shoes price is never displayed or applied", async () => {
  fillModel("running_shoes");
  axios.post.mockResolvedValueOnce(v2Response("running_shoes", { recommendationAllowed: false, reason: "excessive_price_deviation" }));
  requestRecommendation();
  expect(await screen.findByRole("status")).toHaveTextContent(/differs too much/);
  expect(screen.queryByText("$111.73 USD")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Use Recommended Price" })).not.toBeInTheDocument();
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("");
});

test.each([
  ["cookware", 'input[name="originalPrice"]', "220"],
  ["running_shoes", 'input[name="originalPrice"]', "130"],
  ["running_shoes", '#ai-running-gender', "Women"],
  ["running_shoes", '#ai-running-type', "Trail Running"],
])("editing %s %s clears and prevents applying a stale recommendation", async (productType, selector, value) => {
  fillModel(productType);
  axios.post.mockResolvedValueOnce(v2Response(productType));
  requestRecommendation();
  fireEvent.click(await screen.findByRole("button", { name: "Use Recommended Price" }));
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("111.73");
  change(selector, value);
  expect(screen.queryByRole("button", { name: "Use Recommended Price" })).not.toBeInTheDocument();
  expect(store.getState().products.priceRecommendation).toBeNull();
  expect(container.querySelector('input[name="discountPrice"]').value).toBe("");
});

test("a late Running Shoes response cannot overwrite a newer response after guardrail inputs change", async () => {
  fillModel("running_shoes");
  let resolveOld, resolveNew;
  axios.post.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  requestRecommendation();
  change('#ai-running-type', "Road Running");
  axios.post.mockImplementationOnce(() => new Promise((resolve) => { resolveNew = resolve; }));
  requestRecommendation();
  await act(async () => resolveNew(v2Response("running_shoes", { recommendedPrice: 105 })));
  await act(async () => resolveOld(v2Response("running_shoes", { recommendedPrice: 999 })));
  expect(screen.getByText("$105.00 USD")).toBeInTheDocument();
  expect(screen.queryByText("$999.00 USD")).not.toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledTimes(2);
});

test.each(["laptop", "cookware", "running_shoes"])("%s ML failure leaves normal manual product creation usable", async (productType) => {
  fillModel(productType);
  fillCreationFields();
  axios.post.mockRejectedValueOnce({ response: { data: { message: "AI is unavailable. You can still enter the price manually." } } });
  requestRecommendation();
  expect(await screen.findByRole("alert")).toHaveTextContent("You can still enter the price manually");
  expect(screen.getByRole("button", { name: "Create Product" })).toBeEnabled();
  expect(store.getState().products.error).toBeUndefined();
  axios.post.mockResolvedValueOnce({ data: { product: { _id: "manual-product" } } });
  await submitProduct();
  expect(lastCreateForm().get("discountPrice")).toBe("600");
  expect(lastCreateForm().get("originalPrice")).toBe("600");
});
