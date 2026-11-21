import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  isLoading: true,
  priceRecommendationLoading: false,
  priceRecommendation: null,
  priceRecommendationError: null,
  priceRecommendationRequestId: null,
  priceRecommendationInputKey: null,
};

export const productReducer = createReducer(initialState, (builder) => {
  builder
  .addCase("priceRecommendationRequest", (state, action) => {
    state.priceRecommendationLoading = true;
    state.priceRecommendation = null;
    state.priceRecommendationError = null;
    state.priceRecommendationRequestId = action.meta.requestId;
    state.priceRecommendationInputKey = action.meta.inputKey;
  })
  .addCase("priceRecommendationSuccess", (state, action) => {
    if (state.priceRecommendationRequestId !== action.meta.requestId) return;
    state.priceRecommendationLoading = false;
    state.priceRecommendation = action.payload;
  })
  .addCase("priceRecommendationFail", (state, action) => {
    if (state.priceRecommendationRequestId !== action.meta.requestId) return;
    state.priceRecommendationLoading = false;
    state.priceRecommendationError = action.payload;
  })
  .addCase("priceRecommendationReset", (state) => {
    state.priceRecommendationLoading = false;
    state.priceRecommendation = null;
    state.priceRecommendationError = null;
    state.priceRecommendationRequestId = null;
    state.priceRecommendationInputKey = null;
  })
  .addCase("productCreateRequest", (state) => {
    state.isLoading = true;
    state.error = null;
    state.success = false;
  })
  .addCase("productCreateSuccess", (state, action) => {
    state.isLoading = false;
    state.product = action.payload;
    state.success = true;
  })
  .addCase("productCreateFail", (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
    state.success = false;
  })

  // get all products of shop
  .addCase("getAllProductsShopRequest", (state) => {
    state.isLoading = true;
  })
  .addCase("getAllProductsShopSuccess", (state, action) => {
    state.isLoading = false;
    state.products = action.payload;
  })
  .addCase("getAllProductsShopFailed", (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
  })

  // delete product of a shop
  .addCase("deleteProductRequest", (state) => {
    state.isLoading = true;
  })
  .addCase("deleteProductSuccess", (state, action) => {
    state.isLoading = false;
    state.message = action.payload;
  })
  .addCase("deleteProductFailed", (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
  })

  // get all products
  .addCase("getAllProductsRequest", (state) => {
    state.isLoading = true;
  })
  .addCase("getAllProductsSuccess", (state, action) => {
    state.isLoading = false;
    state.allProducts = action.payload;
  })
  .addCase("getAllProductsFailed", (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
  })

  .addCase("clearErrors", (state) => {
    state.error = null;
  });
});
