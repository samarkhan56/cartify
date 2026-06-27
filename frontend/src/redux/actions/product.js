import axios from "axios";
import { server } from "../../server";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong";

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
