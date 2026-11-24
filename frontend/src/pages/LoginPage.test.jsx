import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import LoginPage from "./LoginPage";
import SellerProtectedRoute from "../routes/SellerProtectedRoute";
import { userReducer } from "../redux/reducers/user";
import { sellerReducer } from "../redux/reducers/seller";
import { server } from "../server";

jest.mock("axios", () => ({ __esModule: true, default: { post: jest.fn(), get: jest.fn() } }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

beforeEach(() => jest.resetAllMocks());

const openSellerLogin = () => {
  const store = configureStore({ reducer: { user: userReducer, seller: sellerReducer } });
  render(<Provider store={store}><MemoryRouter initialEntries={["/login"]}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/dashboard" element={<SellerProtectedRoute>Seller dashboard</SellerProtectedRoute>} />
    <Route path="/shop-login" element={<div>Redirected to seller login</div>} />
  </Routes></MemoryRouter></Provider>);
  fireEvent.click(screen.getByRole("button", { name: "Seller" }));
  fireEvent.change(screen.getByPlaceholderText("seller@example.com"), { target: { value: "seller@example.com" } });
  fireEvent.change(screen.getByPlaceholderText("Enter your password"), { target: { value: "demo-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in as Seller" }));
  return store;
};

test("main Seller login awaits authentication and seller session before protected navigation", async () => {
  let authenticate, loadSession;
  axios.post.mockImplementationOnce(() => new Promise((resolve) => { authenticate = resolve; }));
  axios.get.mockImplementationOnce(() => new Promise((resolve) => { loadSession = resolve; }));
  const store = openSellerLogin();
  expect(axios.post).toHaveBeenCalledWith(`${server}/shop/login-shop`,
    { email: "seller@example.com", password: "demo-password" }, { withCredentials: true });
  expect(axios.get).not.toHaveBeenCalled();
  await act(async () => authenticate({ data: { success: true } }));
  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(`${server}/shop/getSeller`, { withCredentials: true }));
  expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
  expect(screen.queryByText("Seller dashboard")).not.toBeInTheDocument();
  expect(screen.queryByText("Redirected to seller login")).not.toBeInTheDocument();
  await act(async () => loadSession({ data: { seller: { _id: "seller-id" } } }));
  expect(await screen.findByText("Seller dashboard")).toBeInTheDocument();
  expect(store.getState().seller.isSeller).toBe(true);
});

test("failed main Seller login does not load a session or navigate", async () => {
  axios.post.mockRejectedValueOnce(new Error("Login failed"));
  const store = openSellerLogin();
  await waitFor(() => expect(screen.getByRole("button", { name: "Sign in as Seller" })).toBeEnabled());
  expect(axios.get).not.toHaveBeenCalled();
  expect(store.getState().seller.isSeller).toBe(false);
  expect(screen.queryByText("Seller dashboard")).not.toBeInTheDocument();
});
