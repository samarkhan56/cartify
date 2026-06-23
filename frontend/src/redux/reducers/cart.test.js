import { cartReducer } from "./cart";

const serum = { _id: "serum", name: "Glow Serum", qty: 1 };
const graphicsCard = { _id: "gpu", name: "Graphics Card", qty: 1 };

describe("cart selection", () => {
  test("toggles a single product for checkout", () => {
    const state = {
      cart: [serum, graphicsCard],
      selectedCartItemIds: [serum._id, graphicsCard._id],
    };

    const nextState = cartReducer(state, {
      type: "toggleCartItemSelection",
      payload: graphicsCard._id,
    });

    expect(nextState.selectedCartItemIds).toEqual([serum._id]);
  });

  test("removes purchased products while keeping unchecked products", () => {
    const state = {
      cart: [serum, graphicsCard],
      selectedCartItemIds: [serum._id],
    };

    const nextState = cartReducer(state, {
      type: "removePurchasedCartItems",
      payload: [serum._id],
    });

    expect(nextState.cart).toEqual([graphicsCard]);
    expect(nextState.selectedCartItemIds).toEqual([]);
  });
});
