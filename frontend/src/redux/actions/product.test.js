import axios from "axios";
import { configureStore } from "@reduxjs/toolkit";
import { recommendProductPrice } from "./product";
import { productReducer } from "../reducers/product";

jest.mock("axios", () => ({ __esModule: true, default: { post: jest.fn() } }));

let store;
const v2 = (extra = {}) => ({ productType: "cookware", recommendedPrice: 153.51,
  recommendationAllowed: true, reason: null, currency: "USD", ...extra });
const request = async (recommendation, productType = "cookware", success = true) => {
  axios.post.mockResolvedValueOnce({ data: { success, recommendation } });
  await store.dispatch(recommendProductPrice({ productType }, "current-input"));
  return store.getState().products;
};

beforeEach(() => {
  jest.resetAllMocks();
  store = configureStore({ reducer: { products: productReducer } });
});

test("legacy Smartphone price normalizes without changing the API payload or auth", async () => {
  const state = await request({ productType: "smartphone", price: 464.1, currency: "USD" }, "smartphone");
  expect(state.priceRecommendation).toEqual({ productType: "smartphone", price: 464.1,
    currency: "USD", recommendationAllowed: true, reason: null });
  expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/product\/recommend-price$/),
    { productType: "smartphone" }, { withCredentials: true, timeout: 35000 });
});

test.each(["laptop", "cookware", "running_shoes"])("%s v2 zero price is accepted and normalized", async (productType) => {
  const state = await request(v2({ productType, recommendedPrice: 0 }), productType);
  expect(state.priceRecommendation).toEqual({ productType, price: 0, currency: "USD", recommendationAllowed: true, reason: null });
  expect(state.priceRecommendationError).toBeNull();
});

test.each([null, undefined, 153.51])("suppressed v2 price %s is a valid result with nullable guardrail metadata", async (recommendedPrice) => {
  const state = await request(v2({ recommendedPrice, recommendationAllowed: false,
    reason: "seller_price_outside_supported_range", deviationPercent: null,
    originalPriceInSupportedRange: false, predictionInSupportedRange: null }));
  expect(state.priceRecommendation).toEqual({ price: recommendedPrice ?? null, productType: "cookware", currency: "USD",
    recommendationAllowed: false, reason: "seller_price_outside_supported_range", deviationPercent: null,
    originalPriceInSupportedRange: false, predictionInSupportedRange: null });
  expect(state.priceRecommendationError).toBeNull();
  expect(state.error).toBeUndefined();
});

test.each([
  ["mismatched model", { productType: "laptop" }],
  ["unsupported model", { productType: "tablet" }],
  ["unexpected currency", { currency: "EUR" }],
  ["string price", { recommendedPrice: "153.51" }],
  ["negative price", { recommendedPrice: -1 }],
  ["infinite price", { recommendedPrice: Infinity }],
  ["NaN price", { recommendedPrice: NaN }],
  ["unsafe price", { recommendedPrice: 1e100 }],
  ["allowed null price", { recommendedPrice: null }],
  ["allowed missing price", { recommendedPrice: undefined }],
  ["invalid suppressed price", { recommendationAllowed: false, recommendedPrice: -1 }],
  ["string allowed flag", { recommendationAllowed: "false" }],
  ["missing allowed flag", { recommendationAllowed: undefined }],
  ["malformed reason", { reason: {} }],
  ["missing reason", { reason: undefined }],
  ["string deviation", { deviationPercent: "23.24" }],
  ["negative deviation", { deviationPercent: -1 }],
  ["infinite deviation", { deviationPercent: Infinity }],
  ["malformed original range flag", { originalPriceInSupportedRange: "false" }],
  ["malformed prediction range flag", { predictionInSupportedRange: 0 }],
])("%s fails safely without touching product creation state", async (_label, extra) => {
  const state = await request(v2(extra));
  expect(state.priceRecommendation).toBeNull();
  expect(state.priceRecommendationLoading).toBe(false);
  expect(state.priceRecommendationError).toContain("You can still enter the price manually");
  expect(state.error).toBeUndefined();
  expect(state.success).toBeUndefined();
});

test("an unsuccessful response cannot provide a recommendation", async () => {
  const state = await request(v2(), "cookware", false);
  expect(state.priceRecommendation).toBeNull();
  expect(state.priceRecommendationError).toContain("You can still enter the price manually");
});

test("unsupported product types never send an AI request from Redux", async () => {
  await store.dispatch(recommendProductPrice({ productType: "tablet" }, "tablet-input"));
  expect(axios.post).not.toHaveBeenCalled();
  expect(store.getState().products.priceRecommendation).toBeNull();
});
