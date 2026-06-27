import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  isLoading: true,
};

export const orderReducer = createReducer(initialState, (builder) => {
  builder
  // get all orders of user
  .addCase("getAllOrdersUserRequest", (state) => {
    state.isLoading = false;
  })

  .addCase("getAllOrdersUserSuccess", (state, action) => {
    state.isLoading = false;
    state.orders = action.payload;
  })
  .addCase("getAllOrdersUserFailed", (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
  })
  // get all orders of shop
  .addCase("getAllOrdersShopRequest", (state) => {
    state.isLoading = true;
  })
  .addCase("getAllOrdersShopSuccess", (state, action) => {
    state.isLoading = false;
    state.orders = action.payload;
  })
  .addCase("getAllOrdersShopFailed", (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
  })
  // get all orders for admin
  .addCase("adminAllOrdersRequest", (state) => {
    state.adminOrderLoading = true;
  })
  .addCase("adminAllOrdersSuccess", (state, action) => {
    state.adminOrderLoading = false;
    state.adminOrders = action.payload;
  })
  .addCase("adminAllOrdersFailed", (state, action) => {
    state.adminOrderLoading = false;
    state.error = action.payload;
  })
  .addCase("adminRefundStatusRequest", (state) => {
    state.adminRefundLoading = true;
  })
  .addCase("adminRefundStatusSuccess", (state, action) => {
    state.adminRefundLoading = false;
    state.adminOrders = (state.adminOrders || []).map((order) =>
      order._id === action.payload._id ? action.payload : order
    );
  })
  .addCase("adminRefundStatusFailed", (state, action) => {
    state.adminRefundLoading = false;
    state.error = action.payload;
  })
  .addCase("clearErrors", (state) => {
    state.error = null;
  });
});
