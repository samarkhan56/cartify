import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import AllProducts from "./AllProducts";
import ShopInfo from "./ShopInfo";
import { productReducer } from "../../redux/reducers/product";
import { server } from "../../server";

jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn(), delete: jest.fn() } }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("react-lottie", () => () => null);
jest.mock("@material-ui/data-grid", () => ({
  DataGrid: ({ rows, columns }) => <div>{rows.map((row) => <div key={row.id}>
    {columns.find((column) => column.field === "Delete").renderCell({ id: row.id })}
  </div>)}</div>,
}));

const originalLocation = window.location;
const product = { _id: "product-id", name: "Demo product", discountPrice: 100, stock: 2, sold_out: 0, reviews: [] };
let store;

beforeAll(() => {
  delete window.location;
  window.location = { ...originalLocation, reload: jest.fn() };
});
afterAll(() => { window.location = originalLocation; });
beforeEach(() => {
  jest.resetAllMocks();
  axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes("get-shop-info")
    ? { shop: { name: "Demo shop", avatar: "shop.png" } } : { products: [product] } }));
  store = configureStore({ reducer: {
    products: productReducer,
    seller: () => ({ seller: { _id: "seller-id" } }),
  } });
});

const mount = (component) => render(<Provider store={store}><MemoryRouter>{component}</MemoryRouter></Provider>);

test("product deletion reloads only after its authenticated request succeeds", async () => {
  let finishDelete;
  axios.delete.mockImplementationOnce(() => new Promise((resolve) => { finishDelete = resolve; }));
  mount(<AllProducts />);
  fireEvent.click(await screen.findByRole("button"));
  expect(axios.delete).toHaveBeenCalledWith(`${server}/product/delete-shop-product/product-id`, { withCredentials: true });
  expect(window.location.reload).not.toHaveBeenCalled();
  await act(async () => finishDelete({ data: { success: true, message: "Deleted" } }));
  expect(window.location.reload).toHaveBeenCalledTimes(1);
});

test("failed product deletion retains the page, error state, and retry control", async () => {
  axios.delete.mockRejectedValueOnce({ response: { data: { message: "Delete failed" } } });
  mount(<AllProducts />);
  fireEvent.click(await screen.findByRole("button"));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(window.location.reload).not.toHaveBeenCalled();
  expect(store.getState().products.error).toBe("Delete failed");
  expect(screen.getByRole("button")).toBeEnabled();
  axios.delete.mockResolvedValueOnce({ data: { success: true, message: "Deleted" } });
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(window.location.reload).toHaveBeenCalledTimes(1));
});

test("seller logout waits for cookie-clearing request before reloading", async () => {
  let finishLogout;
  axios.get.mockImplementation((url) => url.endsWith("/logout")
    ? new Promise((resolve) => { finishLogout = resolve; })
    : Promise.resolve({ data: url.includes("get-shop-info") ? { shop: {} } : { products: [] } }));
  mount(<ShopInfo isOwner />);
  fireEvent.click(await screen.findByText("Log Out"));
  expect(axios.get).toHaveBeenCalledWith(`${server}/shop/logout`, { withCredentials: true });
  expect(window.location.reload).not.toHaveBeenCalled();
  await act(async () => finishLogout({ data: { success: true } }));
  expect(window.location.reload).toHaveBeenCalledTimes(1);
});

test("failed seller logout keeps the page and displays the failure", async () => {
  axios.get.mockImplementation((url) => url.endsWith("/logout")
    ? Promise.reject({ response: { data: { message: "Logout unavailable" } } })
    : Promise.resolve({ data: url.includes("get-shop-info") ? { shop: {} } : { products: [] } }));
  mount(<ShopInfo isOwner />);
  fireEvent.click(await screen.findByText("Log Out"));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Logout unavailable"));
  expect(window.location.reload).not.toHaveBeenCalled();
  expect(screen.getByText("Log Out")).toBeInTheDocument();
});
