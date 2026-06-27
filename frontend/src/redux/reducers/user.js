import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  isSeller: false,
  user: null,
  seller: null,
  loading: false,
  sellerLoading: false,
  error: null,
};

export const userReducer = createReducer(initialState, (builder) => {
  builder
  // ========== BUYER USER ACTIONS ==========
  .addCase("LoadUserRequest", (state) => {
    state.loading = true;
  })
  .addCase("LoadUserSuccess", (state, action) => {
    state.isAuthenticated = true;
    state.loading = false;
    state.user = action.payload;
    state.error = null;
  })
  .addCase("LoadUserFail", (state, action) => {
    state.loading = false;
    state.error = action.payload;
    state.isAuthenticated = false;
    state.user = null;
  })

  // ========== SELLER ACTIONS ==========
  .addCase("LoadSellerRequest", (state) => {
    state.sellerLoading = true;
  })
  .addCase("LoadSellerSuccess", (state, action) => {
    state.isSeller = true;
    state.sellerLoading = false;
    state.seller = action.payload;
    state.error = null;
  })
  .addCase("LoadSellerFail", (state, action) => {
    state.isSeller = false;
    state.sellerLoading = false;
    state.error = action.payload;
    state.seller = null;
  })

  // update user information
  .addCase("updateUserInfoRequest", (state) => {
    state.loading = true;
  })
  .addCase("updateUserInfoSuccess", (state, action) => {
    state.loading = false;
    state.user = action.payload;
  })
  .addCase("updateUserInfoFailed", (state, action) => {
    state.loading = false;
    state.error = action.payload;
  })

  // Update User address
  .addCase("updateUserAddressRequest", (state) => {
    state.addressloading = true;
  })
  .addCase("updateUserAddressSuccess", (state, action) => {
    state.addressloading = false;
    state.successMessage = action.payload.successMessage;
    state.user = action.payload.user;
  })
  .addCase("updateUserAddressFailed", (state, action) => {
    state.addressloading = false;
    state.error = action.payload;
  })

  // delete user address
  .addCase("deleteUserAddressRequest", (state) => {
    state.addressloading = true;
  })
  .addCase("deleteUserAddressSuccess", (state, action) => {
    state.addressloading = false;
    state.successMessage = action.payload.successMessage;
    state.user = action.payload.user;
  })
  .addCase("deleteUserAddressFailed", (state, action) => {
    state.addressloading = false;
    state.error = action.payload;
  })
  
  // get all users --- admin
  .addCase("getAllUsersRequest", (state) => {
    state.usersLoading = true;
  })
  .addCase("getAllUsersSuccess", (state, action) => {
    state.usersLoading = false;
    state.users = action.payload;
  })
  .addCase("getAllUsersFailed", (state, action) => {
    state.usersLoading = false;
    state.error = action.payload;
  })

  // logout seller
  .addCase("LogoutSeller", (state) => {
    state.isSeller = false;
    state.seller = null;
  })

  .addCase("clearErrors", (state) => {
    state.error = null;
  });
});
