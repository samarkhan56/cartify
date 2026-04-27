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

export const userReducer = createReducer(initialState, {
  // ========== BUYER USER ACTIONS ==========
  LoadUserRequest: (state) => {
    state.loading = true;
  },
  LoadUserSuccess: (state, action) => {
    state.isAuthenticated = true;
    state.loading = false;
    state.user = action.payload;
  },
  LoadUserFail: (state, action) => {
    state.loading = false;
    state.error = action.payload;
    state.isAuthenticated = false;
  },

  // ========== SELLER ACTIONS ==========
  LoadSellerRequest: (state) => {
    state.sellerLoading = true;
  },
  LoadSellerSuccess: (state, action) => {
    state.isSeller = true;
    state.sellerLoading = false;
    state.seller = action.payload;
  },
  LoadSellerFail: (state, action) => {
    state.isSeller = false;
    state.sellerLoading = false;
    state.error = action.payload;
  },

  // update user information
  updateUserInfoRequest: (state) => {
    state.loading = true;
  },
  updateUserInfoSuccess: (state, action) => {
    state.loading = false;
    state.user = action.payload;
  },
  updateUserInfoFailed: (state, action) => {
    state.loading = false;
    state.error = action.payload;
  },

  // Update User address
  updateUserAddressRequest: (state) => {
    state.addressloading = true;
  },
  updateUserAddressSuccess: (state, action) => {
    state.addressloading = false;
    state.successMessage = action.payload.successMessage;
    state.user = action.payload.user;
  },
  updateUserAddressFailed: (state, action) => {
    state.addressloading = false;
    state.error = action.payload;
  },

  // delete user address
  deleteUserAddressRequest: (state) => {
    state.addressloading = true;
  },
  deleteUserAddressSuccess: (state, action) => {
    state.addressloading = false;
    state.successMessage = action.payload.successMessage;
    state.user = action.payload.user;
  },
  deleteUserAddressFailed: (state, action) => {
    state.addressloading = false;
    state.error = action.payload;
  },
  
  // get all users --- admin
  getAllUsersRequest: (state) => {
    state.usersLoading = true;
  },
  getAllUsersSuccess: (state, action) => {
    state.usersLoading = false;
    state.users = action.payload;
  },
  getAllUsersFailed: (state, action) => {
    state.usersLoading = false;
    state.error = action.payload;
  },

  // logout seller
  LogoutSeller: (state) => {
    state.isSeller = false;
    state.seller = null;
  },

  clearErrors: (state) => {
    state.error = null;
  },
});