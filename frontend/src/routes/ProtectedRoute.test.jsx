import React, { useEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import { Provider, useDispatch } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";
import ProtectedRoute from "./ProtectedRoute";
import { userReducer } from "../redux/reducers/user";
import { loadUser } from "../redux/actions/user";

jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn() } }));

const SessionCheck = () => {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(loadUser()); }, [dispatch]);
  return <Routes>
    <Route path="/profile" element={<ProtectedRoute>Customer profile</ProtectedRoute>} />
    <Route path="/login" element={<div>Customer login</div>} />
  </Routes>;
};

const refreshProfile = () => {
  const store = configureStore({ reducer: { user: userReducer } });
  render(<Provider store={store}><MemoryRouter initialEntries={["/profile"]}><SessionCheck /></MemoryRouter></Provider>);
  return store;
};

beforeEach(() => jest.resetAllMocks());

test("initial customer state waits even before the startup request is dispatched", () => {
  const store = configureStore({ reducer: { user: userReducer } });
  render(<Provider store={store}><MemoryRouter><ProtectedRoute>Private content</ProtectedRoute></MemoryRouter></Provider>);
  expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
  expect(screen.queryByText("Private content")).not.toBeInTheDocument();
});

test("authenticated refresh keeps the route while the session loads, then renders its content", async () => {
  let resolveSession;
  axios.get.mockImplementationOnce(() => new Promise((resolve) => { resolveSession = resolve; }));
  const store = refreshProfile();
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.queryByText("Customer login")).not.toBeInTheDocument();
  expect(screen.queryByText("Customer profile")).not.toBeInTheDocument();
  await act(async () => resolveSession({ data: { user: { _id: "customer-id" } } }));
  expect(await screen.findByText("Customer profile")).toBeInTheDocument();
  expect(screen.queryByText("Customer login")).not.toBeInTheDocument();
  expect(store.getState().user.isAuthenticated).toBe(true);
});

test.each(["rejected", "missing user"])("unauthenticated refresh redirects after a %s session response", async (response) => {
  if (response === "rejected") axios.get.mockRejectedValueOnce(new Error("Please login"));
  else axios.get.mockResolvedValueOnce({ data: { user: null } });
  const store = refreshProfile();
  expect(await screen.findByText("Customer login")).toBeInTheDocument();
  expect(screen.queryByText("Customer profile")).not.toBeInTheDocument();
  expect(store.getState().user.isAuthenticated).toBe(false);
});
