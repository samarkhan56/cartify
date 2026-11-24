import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import ProductDetailsPage from "./ProductDetailsPage";
import AllProducts from "../components/Shop/AllProducts";
import SellerProtectedRoute from "../routes/SellerProtectedRoute";
import { productReducer } from "../redux/reducers/product";
import { sellerReducer } from "../redux/reducers/seller";
import { userReducer } from "../redux/reducers/user";
import { cartReducer } from "../redux/reducers/cart";
import { wishlistReducer } from "../redux/reducers/wishlist";
import { server } from "../server";

jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("react-lottie", () => () => null);
jest.mock("../components/Layout/Footer", () => () => <footer>Customer footer</footer>);
jest.mock("../components/Products/SuggestedProduct", () => () => <div>Related products</div>);
jest.mock("@material-ui/data-grid", () => ({ DataGrid: ({ rows, columns }) => <div>
  {rows.map((row) => <div key={row.id}>{row.name}
    {columns.find((column) => column.field === "Preview").renderCell({ id: row.id })}
  </div>)}
</div> }));

const productId = "507f1f77bcf86cd799439013";
const product = { _id: productId, name: "New pending demo product", description: "Actual listing description",
  category: "Mobile and Tablets", brand: "Samsung", discountPrice: 400, originalPrice: 500,
  images: ["demo.png"], stock: 2, reviews: [], specifications: [{ name: "Storage", value: "256GB" }],
  shopId: "seller-id", shop: { _id: "seller-id", name: "Demo seller", avatar: "shop.png" },
  approvalStatus: "pending", isActive: true };
let store, actions;

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  window.scrollTo = jest.fn();
  actions = [];
  store = configureStore({ reducer: { products: productReducer, seller: sellerReducer, user: userReducer,
    cart: cartReducer, wishlist: wishlistReducer, events: () => ({ allEvents: [] }) },
    middleware: (getDefault) => getDefault().concat(() => (next) => (action) => {
      actions.push(action.type);
      return next(action);
    }) });
  store.dispatch({ type: "LoadSellerSuccess", payload: { _id: "seller-id", name: "Demo seller", avatar: "shop.png" } });
  store.dispatch({ type: "LoadUserFail", payload: null });
  axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes("get-all-products-shop")
    ? { products: [product] } : { success: true, product } }));
});

const mount = (path = `/dashboard-product/${productId}`) => render(<Provider store={store}>
  <MemoryRouter initialEntries={[path]}>
    <Link to={`/product/${productId}`}>Open public route</Link>
    <Routes>
      <Route path="/dashboard-products" element={<SellerProtectedRoute><AllProducts /></SellerProtectedRoute>} />
      <Route path="/dashboard-product/:id" element={<SellerProtectedRoute><ProductDetailsPage sellerPreview /></SellerProtectedRoute>} />
      <Route path="/product/:id" element={<ProductDetailsPage />} />
      <Route path="/shop-login" element={<div>Seller login required</div>} />
    </Routes>
  </MemoryRouter>
</Provider>);

test("dashboard View loads a newly created pending product by ID and retains seller authentication", async () => {
  const session = store.getState().seller;
  mount("/dashboard-products");
  const view = await screen.findByRole("link", { name: "View product" });
  expect(view).toHaveAttribute("href", `/dashboard-product/${productId}`);
  fireEvent.click(view);
  expect(await screen.findByRole("heading", { name: product.name })).toBeInTheDocument();
  expect(screen.getByText("Pending Approval")).toBeInTheDocument();
  expect(screen.getAllByText(product.description)).toHaveLength(2);
  expect(screen.getByText("256GB")).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith(`${server}/product/get-shop-product/${productId}`,
    expect.objectContaining({ withCredentials: true }));
  expect(store.getState().seller).toBe(session);
  expect(actions).not.toContain("LoadSellerFail");
  expect(axios.get.mock.calls.some(([url]) => url.endsWith("/logout"))).toBe(false);
  expect(screen.queryByRole("link", { name: "Sign In" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add to Cart" })).not.toBeInTheDocument();
  expect(screen.queryByText("Related products")).not.toBeInTheDocument();
  expect(localStorage.getItem("recentlyViewedProducts")).toBeNull();
  expect(store.getState().products.allProducts).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: "Back to All Products" }));
  expect(await screen.findByRole("link", { name: "View product" })).toBeInTheDocument();
  expect(store.getState().seller).toBe(session);
});

test("approved seller preview works on a fresh direct load with empty product lists", async () => {
  axios.get.mockResolvedValueOnce({ data: { success: true, product: { ...product, approvalStatus: "approved" } } });
  mount();
  expect(await screen.findByRole("heading", { name: product.name })).toBeInTheDocument();
  expect(screen.getByText("Approved")).toBeInTheDocument();
  expect(store.getState().seller.isSeller).toBe(true);
});

test("public approved product loads by ID without the global list and retains customer actions", async () => {
  axios.get.mockResolvedValueOnce({ data: { success: true, product: { ...product, approvalStatus: "approved" } } });
  mount(`/product/${productId}`);
  expect(await screen.findByRole("heading", { name: product.name })).toBeInTheDocument();
  expect(axios.get).toHaveBeenCalledWith(`${server}/product/get-product/${productId}`,
    expect.objectContaining({ withCredentials: false }));
  expect(screen.getByRole("button", { name: "Add to Cart" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Add to Wishlist" })).toBeEnabled();
  expect(screen.getByText("Related products")).toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem("recentlyViewedProducts")).toContain(productId));
});

test.each(["anonymous", "customer"])("%s cannot enter the seller-only preview route", async (identity) => {
  store.dispatch({ type: "LoadSellerFail", payload: null });
  if (identity === "customer") store.dispatch({ type: "LoadUserSuccess", payload: { _id: "customer-id" } });
  mount();
  expect(await screen.findByText("Seller login required")).toBeInTheDocument();
  expect(axios.get).not.toHaveBeenCalled();
  expect(screen.queryByText(product.name)).not.toBeInTheDocument();
});

test("public pending product is unavailable even if it is in a local seller creation result", async () => {
  store.dispatch({ type: "productCreateSuccess", payload: product });
  axios.get.mockRejectedValueOnce({ response: { status: 404, data: { message: "Product not found or unavailable." } } });
  mount(`/product/${productId}`);
  expect(await screen.findByRole("alert")).toHaveTextContent("Product not found or unavailable");
  expect(screen.queryByRole("heading", { name: product.name })).not.toBeInTheDocument();
});

test("ownership-denied preview shows an error without clearing the unrelated seller session", async () => {
  const session = store.getState().seller;
  axios.get.mockRejectedValueOnce({ response: { status: 404, data: { message: "Product not found or unavailable." } } });
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("Product not found or unavailable");
  expect(store.getState().seller).toBe(session);
  expect(screen.queryByText(product.name)).not.toBeInTheDocument();
});

test("a late seller-only response cannot appear after switching to the public route", async () => {
  let finishPreview;
  axios.get.mockImplementationOnce(() => new Promise((resolve) => { finishPreview = resolve; }));
  mount();
  await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));
  axios.get.mockRejectedValueOnce({ response: { status: 404, data: { message: "Product not found or unavailable." } } });
  fireEvent.click(screen.getByRole("link", { name: "Open public route" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  await act(async () => finishPreview({ data: { success: true, product } }));
  expect(screen.queryByText(product.name)).not.toBeInTheDocument();
  expect(localStorage.getItem("recentlyViewedProducts")).toBeNull();
});
