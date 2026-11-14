import axios from "axios";
import { nanoid } from "@reduxjs/toolkit";
import { server } from "../../server";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

export const resetPriceRecommendation = () => ({ type: "priceRecommendationReset" });

const recommendationTypes = ["smartphone", "laptop", "cookware", "running_shoes"];
const validRecommendationPrice = (price) => typeof price === "number" &&
  Number.isFinite(price) && price >= 0 && price <= Number.MAX_SAFE_INTEGER / 100;

const normalizeRecommendation = (data, productType) => {
  const recommendation = data?.recommendation;
  if (data?.success !== true || !recommendationTypes.includes(productType) ||
    recommendation?.productType !== productType || recommendation?.currency !== "USD") {
    throw new Error("Invalid AI recommendation");
  }
  // Smartphone keeps its legacy API contract; the UI always consumes price.
  if (productType === "smartphone") {
    if (!validRecommendationPrice(recommendation.price)) throw new Error("Invalid AI price");
    return { price: recommendation.price, currency: "USD", productType,
      recommendationAllowed: true, reason: null };
  }
  const { recommendedPrice, recommendationAllowed, reason } = recommendation;
  if (typeof recommendationAllowed !== "boolean" ||
    (reason !== null && typeof reason !== "string") ||
    (!validRecommendationPrice(recommendedPrice) &&
      (recommendationAllowed || (recommendedPrice !== null && recommendedPrice !== undefined)))) {
    throw new Error("Invalid AI recommendation");
  }
  const normalized = { price: recommendedPrice ?? null, currency: "USD", productType,
    recommendationAllowed, reason };
  if (recommendation.deviationPercent !== undefined) {
    const deviation = recommendation.deviationPercent;
    if (deviation !== null && (typeof deviation !== "number" || !Number.isFinite(deviation) || deviation < 0)) {
      throw new Error("Invalid AI deviation");
    }
    normalized.deviationPercent = deviation;
  }
  for (const field of ["originalPriceInSupportedRange", "predictionInSupportedRange"]) {
    if (recommendation[field] !== undefined) {
      if (recommendation[field] !== null && typeof recommendation[field] !== "boolean") {
        throw new Error("Invalid AI range metadata");
      }
      normalized[field] = recommendation[field];
    }
  }
  return normalized;
};

export const recommendProductPrice = (productInfo, inputKey) => async (dispatch, getState) => {
  if (getState().products.priceRecommendationLoading) return;
  const requestId = nanoid();
  const meta = { requestId, inputKey };
  dispatch({ type: "priceRecommendationRequest", meta });
  try {
    if (!recommendationTypes.includes(productInfo.productType)) throw new Error("Unsupported AI product type");
    const { data } = await axios.post(`${server}/product/recommend-price`, productInfo, {
      withCredentials: true,
      timeout: 35000,
    });
    const recommendation = normalizeRecommendation(data, productInfo.productType);
    dispatch({ type: "priceRecommendationSuccess", payload: recommendation, meta });
  } catch (error) {
    dispatch({
      type: "priceRecommendationFail",
      payload: error?.response?.data?.message ||
        "AI price recommendation is temporarily unavailable. You can still enter the price manually.",
      meta,
    });
  }
};

// create product
export const createProduct = (newForm) => async (dispatch) => {
  try {
    dispatch({
      type: "productCreateRequest",
    });

    const config = {
      headers: { "Content-Type": "multipart/form-data" },
      withCredentials: true,
    };

    const { data } = await axios.post(
      `${server}/product/create-product`,
      newForm,
      config
    );
    dispatch({
      type: "productCreateSuccess",
      payload: data.product,
    });
  } catch (error) {
    dispatch({
      type: "productCreateFail",
      payload: getErrorMessage(error),
    });
  }
};

// get All Products of a shop
export const getAllProductsShop = (id, includeAll = false) => async (dispatch) => {
  try {
    if (!id) {
      return;
    }

    dispatch({
      type: "getAllProductsShopRequest",
    });

    const endpoint = includeAll
      ? `${server}/product/get-all-products-shop-dashboard/${id}`
      : `${server}/product/get-all-products-shop/${id}`;

    const { data } = await axios.get(endpoint, {
      withCredentials: includeAll,
    });
    dispatch({
      type: "getAllProductsShopSuccess",
      payload: data.products,
    });
  } catch (error) {
    dispatch({
      type: "getAllProductsShopFailed",
      payload: getErrorMessage(error),
    });
  }
};

// delete product of a shop
export const deleteProduct = (id) => async (dispatch) => {
  try {
    dispatch({
      type: "deleteProductRequest",
    });

    const { data } = await axios.delete(
      `${server}/product/delete-shop-product/${id}`,
      {
        withCredentials: true,
      }
    );

    dispatch({
      type: "deleteProductSuccess",
      payload: data.message,
    });
  } catch (error) {
    dispatch({
      type: "deleteProductFailed",
      payload: getErrorMessage(error),
    });
  }
};

// get all products
export const getAllProducts = (filters = {}) => async (dispatch) => {
  try {
    dispatch({
      type: "getAllProductsRequest",
    });

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });

    const query = params.toString();
    const { data } = await axios.get(
      `${server}/product/get-all-products${query ? `?${query}` : ""}`
    );
    dispatch({
      type: "getAllProductsSuccess",
      payload: data.products,
    });
  } catch (error) {
    dispatch({
      type: "getAllProductsFailed",
      payload: getErrorMessage(error),
    });
  }
};
