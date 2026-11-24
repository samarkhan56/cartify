import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Checkout from "./Checkout";
import Payment from "../Payment/Payment";
import { userReducer } from "../../redux/reducers/user";
import { cartReducer } from "../../redux/reducers/cart";
import { checkoutAddressDraftKey } from "../../utils/shippingAddress";
import { server } from "../../server";

jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@stripe/react-stripe-js", () => ({ useStripe: () => null, useElements: () => null,
  CardNumberElement: () => null, CardExpiryElement: () => null, CardCvcElement: () => null }));

const customer = { _id: "customer-id", name: "Demo Customer", email: "demo@example.com", phoneNumber: "03001234567" };
const item = { _id: "product-id", name: "Selected product", qty: 2, discountPrice: 100, shopId: "shop-id" };
const expectedAddress = { fullName: customer.name, email: customer.email, phoneNumber: customer.phoneNumber,
  country: "Pakistan", state: "Punjab", city: "Lahore", zipCode: "054000", address1: "12 Demo Street", address2: "" };
let store;

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  window.scrollTo = jest.fn();
  store = configureStore({ reducer: { user: userReducer, cart: cartReducer }, preloadedState: {
    cart: { cart: [item, { ...item, _id: "unselected", name: "Unselected product", discountPrice: 999 }],
      selectedCartItemIds: [item._id] },
  } });
  store.dispatch({ type: "LoadUserSuccess", payload: customer });
});

const mount = (path = "/checkout") => render(<Provider store={store}><MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/checkout" element={<Checkout />} />
  <Route path="/payment" element={<Payment />} />
  <Route path="/order/success" element={<div>Order complete</div>} />
</Routes></MemoryRouter></Provider>);
const change = (element, value) => fireEvent.change(element, { target: { value } });
const fillLocation = () => {
  change(screen.getByLabelText(/^Country/), "PK");
  change(screen.getByLabelText(/^State \/ Province/), "PB");
  change(screen.getByLabelText(/^City/), "Lahore");
  change(screen.getByLabelText(/^ZIP \/ Postal Code/), "054000");
  change(screen.getByLabelText(/^Address Line 1/), "12 Demo Street");
};
const proceed = () => fireEvent.click(screen.getByRole("button", { name: "Proceed to Payment" }));

test("visible required hierarchy is Country, State / Province, City, ZIP with actual Lahore city data", () => {
  mount();
  const country = screen.getByLabelText(/^Country/);
  const state = screen.getByLabelText(/^State \/ Province/);
  const city = screen.getByLabelText(/^City/);
  const zip = screen.getByLabelText(/^ZIP \/ Postal Code/);
  for (const input of [country, state, city, zip]) {
    expect(input).toBeVisible();
    expect(input).toBeRequired();
  }
  expect(country.compareDocumentPosition(state) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(state.compareDocumentPosition(city) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(city.compareDocumentPosition(zip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(state).toBeDisabled();
  expect(city).toBeDisabled();
  fillLocation();
  expect(state).toHaveValue("PB");
  expect(city).toHaveValue("Lahore");
  expect(screen.getByPlaceholderText("Apartment, suite, etc.")).not.toBeRequired();
});

test.each(["country", "state", "city", "zip", "address1", "name", "email", "phone"])("missing %s prevents payment navigation", (field) => {
  mount();
  fillLocation();
  const inputs = { country: screen.getByLabelText(/^Country/), state: screen.getByLabelText(/^State \/ Province/),
    city: screen.getByLabelText(/^City/), zip: screen.getByLabelText(/^ZIP \/ Postal Code/),
    address1: screen.getByLabelText(/^Address Line 1/), name: screen.getByPlaceholderText("Enter your full name"),
    email: screen.getByPlaceholderText("Enter your email"), phone: screen.getByPlaceholderText("Enter your phone number") };
  change(inputs[field], ["zip", "address1", "name"].includes(field) ? "   " : "");
  proceed();
  expect(toast.error).toHaveBeenCalledWith("Please fill in all required fields!");
  expect(screen.queryByRole("heading", { name: "Payment Method" })).not.toBeInTheDocument();
  expect(localStorage.getItem("latestOrder")).toBeNull();
  expect(axios.post).not.toHaveBeenCalled();
});

test("changing country or province clears dependent location values", () => {
  mount();
  fillLocation();
  change(screen.getByLabelText(/^State \/ Province/), "SD");
  expect(screen.getByLabelText(/^City/)).toHaveValue("");
  change(screen.getByLabelText(/^Country/), "US");
  expect(screen.getByLabelText(/^State \/ Province/)).toHaveValue("");
  expect(screen.getByLabelText(/^City/)).toHaveValue("");
  expect(screen.getByLabelText(/^City/)).toBeDisabled();
});

test("checkout refresh restores the draft, payment refresh submits readable snapshot names, and profile changes cannot replace it", async () => {
  let view = mount();
  fillLocation();
  view.unmount();
  view = mount();
  expect(screen.getByLabelText(/^State \/ Province/)).toHaveValue("PB");
  expect(screen.getByLabelText(/^City/)).toHaveValue("Lahore");
  proceed();
  expect(await screen.findByRole("heading", { name: "Payment Method" })).toBeInTheDocument();
  const pendingOrder = JSON.parse(localStorage.getItem("latestOrder"));
  expect(pendingOrder.shippingAddress).toEqual(expectedAddress);
  expect(pendingOrder.cart).toHaveLength(1);
  expect(pendingOrder.subTotalPrice).toBe(200);
  expect(pendingOrder.shipping).toBe(20);
  expect(pendingOrder.totalPrice).toBe("220.00");
  view.unmount();
  mount("/payment");
  await screen.findByRole("button", { name: "Confirm Order" });
  act(() => store.dispatch({ type: "updateUserInfoSuccess", payload: { ...customer,
    addresses: [{ country: "Pakistan", state: "Islamabad Capital Territory", city: "Islamabad" }] } }));
  axios.post.mockResolvedValueOnce({ data: { success: true, orders: [{ _id: "order-id", cart: [item],
    shippingAddress: expectedAddress, totalPrice: 220, subTotalPrice: 200, shippingPrice: 20, discountPrice: 0 }] } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Order" }));
  expect(await screen.findByText("Order complete")).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith(`${server}/order/create-order`, expect.objectContaining({
    shippingAddress: expectedAddress, paymentInfo: { type: "Cash On Delivery", status: "Pending" },
  }), expect.objectContaining({ withCredentials: true }));
  expect(axios.post.mock.calls[0][1].user.addresses[0].city).toBe("Islamabad");
  expect(sessionStorage.getItem(checkoutAddressDraftKey(customer._id))).toBeNull();
  expect(store.getState().cart.cart.map((entry) => entry._id)).toEqual(["unselected"]);
});

test("legacy saved addresses still fill street/postal data and require an actual city", () => {
  store.dispatch({ type: "updateUserInfoSuccess", payload: { ...customer, addresses: [{
    addressType: "Home", country: "PK", city: "PB", address1: "Old street", zipCode: 54000,
  }] } });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Choose from saved addresses" }));
  fireEvent.click(screen.getByRole("radio"));
  expect(screen.getByLabelText(/^Country/)).toHaveValue("PK");
  expect(screen.getByLabelText(/^State \/ Province/)).toHaveValue("PB");
  expect(screen.getByLabelText(/^City/)).toHaveValue("");
  expect(screen.getByLabelText(/^Address Line 1/)).toHaveValue("Old street");
  expect(screen.getByLabelText(/^ZIP \/ Postal Code/)).toHaveValue("54000");
  proceed();
  expect(toast.error).toHaveBeenCalled();
  change(screen.getByLabelText(/^City/), "Lahore");
  proceed();
  expect(JSON.parse(localStorage.getItem("latestOrder")).shippingAddress.state).toBe("Punjab");
});

test("countries missing subdivision/city data allow required manual entry without a paid API", () => {
  mount();
  change(screen.getByLabelText(/^Country/), "VA");
  expect(screen.getByLabelText(/^State \/ Province/).tagName).toBe("INPUT");
  change(screen.getByLabelText(/^State \/ Province/), "Vatican City");
  change(screen.getByLabelText(/^City/), "Vatican City");
  change(screen.getByLabelText(/^ZIP \/ Postal Code/), "00120");
  change(screen.getByLabelText(/^Address Line 1/), "Demo address");
  proceed();
  expect(JSON.parse(localStorage.getItem("latestOrder")).shippingAddress.zipCode).toBe("00120");
});

test("existing coupon and selected-cart calculations are unchanged", async () => {
  mount();
  fillLocation();
  axios.get.mockResolvedValueOnce({ data: { couponCode: { name: "DEMO10", shopId: item.shopId, value: 10 } } });
  change(screen.getByPlaceholderText("Enter coupon code"), "DEMO10");
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Coupon applied successfully!"));
  proceed();
  expect(JSON.parse(localStorage.getItem("latestOrder"))).toMatchObject({ subTotalPrice: 200, shipping: 20,
    discountPrice: 20, totalPrice: "200.00", couponCode: "DEMO10", shippingAddress: expectedAddress });
});

test("old incomplete payment drafts return to checkout before an order or payment can be submitted", async () => {
  const { state, ...legacyAddress } = expectedAddress;
  localStorage.setItem("latestOrder", JSON.stringify({ cart: [item], shippingAddress: legacyAddress, totalPrice: 220 }));
  mount("/payment");
  expect(await screen.findByLabelText(/^State \/ Province/)).toBeRequired();
  expect(screen.queryByRole("button", { name: "Confirm Order" })).not.toBeInTheDocument();
  expect(axios.post).not.toHaveBeenCalled();
});
