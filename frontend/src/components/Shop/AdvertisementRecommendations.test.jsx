import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdvertisementRecommendations from "./AdvertisementRecommendations";
import SellerProtectedRoute from "../../routes/SellerProtectedRoute";
import { server } from "../../server";

jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("country-state-city", () => ({
  Country: { getAllCountries: () => [{ isoCode: "PK", name: "Pakistan" }, { isoCode: "XX", name: "Example" }],
    getCountryByCode: (code) => code === "PK" ? { name: "Pakistan" } : { name: "Example" } },
  State: { getStatesOfCountry: (code) => code === "PK" ? [{ isoCode: "PB", name: "Punjab" }, { isoCode: "SD", name: "Sindh" }] : [],
    getStateByCodeAndCountry: (code) => code === "PB" ? { name: "Punjab" } : code === "SD" ? { name: "Sindh" } : null },
  City: { getCitiesOfState: (country, state) => state === "PB" ? [{ name: "Lahore" }] : state === "SD" ? [{ name: "Karachi" }] : [] },
}));

const product = { _id: "p1", shopId: "seller1", name: "Samsung Galaxy A55", category: "Mobile and Tablets",
  subcategory: "Mobile Phones", productType: "smartphone", stock: 4, approvalStatus: "approved" };
const shoes = { ...product, _id: "p2", name: "Brooks Ghost 15", category: "Shoes",
  subcategory: "Adult Performance Running Shoes", productType: "running_shoes" };
let store;
const mount = (products = [product, shoes]) => {
  axios.get.mockImplementation((url) => url.includes("get-all-products-shop-dashboard")
    ? Promise.resolve({ data: { products } }) : Promise.resolve({ data: { available: false, reason: "INSUFFICIENT_HISTORY" } }));
  store = configureStore({ reducer: { seller: () => ({ seller: { _id: "seller1" }, isSeller: true, isLoading: false }) } });
  return render(<Provider store={store}><MemoryRouter><SellerProtectedRoute><AdvertisementRecommendations /></SellerProtectedRoute></MemoryRouter></Provider>);
};
const chooseProduct = async () => {
  fireEvent.change(await screen.findByLabelText("Your product"), { target: { value: "p1" } });
};
const chooseRegion = async () => {
  await screen.findByLabelText("Your product");
  fireEvent.click(screen.getByRole("button", { name: "By Region" }));
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "PK" } });
  fireEvent.change(screen.getByLabelText("State / Province"), { target: { value: "PB" } });
  fireEvent.change(screen.getByLabelText("City"), { target: { value: "Lahore" } });
};
beforeEach(() => jest.resetAllMocks());

test("loads only the seller's eligible exact-taxonomy inventory with credentials", async () => {
  mount([product, shoes, { ...product, _id: "other", shopId: "seller2", name: "Other seller" },
    { ...product, _id: "pending", approvalStatus: "pending", name: "Pending" },
    { ...product, _id: "hidden", isActive: false, name: "Hidden" },
    { ...product, _id: "empty", stock: 0, name: "Sold out" },
    { ...product, _id: "tablet", productType: "tablet", name: "Tablet" },
    { ...product, _id: "wrong", subcategory: "Laptops", name: "Wrong taxonomy" }]);
  const select = await screen.findByLabelText("Your product");
  expect(select.options).toHaveLength(3);
  expect(axios.get).toHaveBeenCalledWith(`${server}/product/get-all-products-shop-dashboard/seller1`,
    expect.objectContaining({ withCredentials: true }));
  expect(screen.getByRole("button", { name: "Find Best Regions" })).toBeDisabled();
});

test("By Product renders top regions and demand confidence without raw model internals", async () => {
  mount(); await chooseProduct();
  axios.get.mockResolvedValueOnce({ data: { available: true, recommendations: [
    { rank: 1, region: "Lahore, Punjab, Pakistan", confidence: "High", demand_probability: 0.93, expected_demand_score: 123.45 },
  ] } });
  fireEvent.click(screen.getByRole("button", { name: "Find Best Regions" }));
  expect(await screen.findByRole("cell", { name: "Lahore" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Punjab" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "High" })).toBeInTheDocument();
  expect(screen.queryByText(/0.93|123.45|telephony/)).not.toBeInTheDocument();
  expect(axios.get).toHaveBeenLastCalledWith(`${server}/advertising/recommend-regions/p1`,
    expect.objectContaining({ withCredentials: true }));
  expect(store.getState().seller.isSeller).toBe(true);
});

test("By Region sends full location names and shows clean categories with seller preview links", async () => {
  mount(); await chooseRegion();
  axios.get.mockResolvedValueOnce({ data: { available: true, recommendations: [{ rank: 1,
    category: "Adult Performance Running Shoes", confidence: "High", products: [{ id: "p2", name: "Brooks Ghost 15" }] }] } });
  fireEvent.click(screen.getByRole("button", { name: "Find Best Products" }));
  expect(await screen.findByRole("link", { name: "Brooks Ghost 15" })).toHaveAttribute("href", "/dashboard-product/p2");
  expect(axios.get).toHaveBeenLastCalledWith(`${server}/advertising/recommend-products`, expect.objectContaining({
    withCredentials: true, params: { country: "Pakistan", state: "Punjab", city: "Lahore" },
  }));
  expect(screen.queryByText("sports_leisure")).not.toBeInTheDocument();
});

test.each([
  ["INSUFFICIENT_HISTORY", /Not enough marketplace demand history yet/],
  ["UNSUPPORTED_CATEGORY", /not available for this product category/],
  ["NO_ELIGIBLE_INVENTORY", /no matching active/],
  ["ML_UNAVAILABLE", /temporarily unavailable/],
  ["HISTORY_UNAVAILABLE", /history is temporarily unavailable/],
])("handles %s with a safe user-facing message", async (reason, message) => {
  mount(); await chooseProduct();
  axios.get.mockResolvedValueOnce({ data: { available: false, reason, message: "SECRET_STACK_TRACE" } });
  fireEvent.click(screen.getByRole("button", { name: "Find Best Regions" }));
  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.queryByText("SECRET_STACK_TRACE")).not.toBeInTheDocument();
});

test("shows empty results and permits a retry after an HTTP error", async () => {
  mount(); await chooseProduct();
  axios.get.mockRejectedValueOnce({ response: { status: 500, data: { message: "SECRET_STACK_TRACE" } } });
  fireEvent.click(screen.getByRole("button", { name: "Find Best Regions" }));
  expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument();
  axios.get.mockResolvedValueOnce({ data: { available: true, recommendations: [] } });
  fireEvent.click(screen.getByRole("button", { name: "Find Best Regions" }));
  expect(await screen.findByText(/No recommendations are available/)).toBeInTheDocument();
});

test("auth failure offers sign in without dispatching a seller logout/reset", async () => {
  mount(); await chooseProduct();
  axios.get.mockRejectedValueOnce({ response: { status: 401 } });
  fireEvent.click(screen.getByRole("button", { name: "Find Best Regions" }));
  expect(await screen.findByRole("link", { name: "Seller sign in" })).toHaveAttribute("href", "/shop-login");
  expect(store.getState().seller.isSeller).toBe(true);
});

test("changing selection while loading drops stale results and allows another request", async () => {
  mount(); await chooseProduct();
  let finish;
  axios.get.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Find Best Regions" }));
  expect(screen.getByRole("button", { name: "Finding recommendations..." })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Your product"), { target: { value: "p2" } });
  await act(async () => finish({ data: { available: true, recommendations: [{ rank: 1, region: "Old, Old, Old", confidence: "High" }] } }));
  expect(screen.queryByText("Old")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Find Best Regions" })).toBeEnabled();
});

test("changing country or province resets dependent location selections and results", async () => {
  mount(); await chooseRegion();
  expect(screen.getByRole("button", { name: "Find Best Products" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("State / Province"), { target: { value: "SD" } });
  expect(screen.getByLabelText("City")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Find Best Products" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "XX" } });
  expect(screen.getByLabelText("State / Province")).toHaveValue("");
  expect(screen.getByLabelText("City")).toBeDisabled();
});

test("no eligible inventory disables requests and displays supported category guidance", async () => {
  mount([]);
  expect(await screen.findByText(/Your shop has no matching active/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Find Best Regions" })).toBeDisabled();
});

test("inventory failure has a working retry without exposing backend errors", async () => {
  axios.get.mockRejectedValueOnce({ response: { status: 500, data: { message: "SECRET_STACK_TRACE" } } });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Retry loading products" }));
  await waitFor(() => expect(screen.getByLabelText("Your product")).toBeInTheDocument());
  expect(screen.queryByText("SECRET_STACK_TRACE")).not.toBeInTheDocument();
});
