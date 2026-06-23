import { createReducer } from "@reduxjs/toolkit";

const storedCart = localStorage.getItem("cartItems")
  ? JSON.parse(localStorage.getItem("cartItems"))
  : [];

const storedSelectedItemIds = localStorage.getItem("selectedCartItemIds")
  ? JSON.parse(localStorage.getItem("selectedCartItemIds"))
  : storedCart.map((item) => item._id);

const initialState = {
  cart: storedCart,
  selectedCartItemIds: storedSelectedItemIds.filter((id) =>
    storedCart.some((item) => item._id === id)
  ),
};

export const cartReducer = createReducer(initialState, {
  addToCart: (state, action) => {
    const item = action.payload;
    const selectedItemIds =
      state.selectedCartItemIds || state.cart.map((cartItem) => cartItem._id);
    /* The line `const isItemExist = state.cart((i) => i._id == item._id);` is checking if an item with 
   the same `_id` as the `item` being added already exists in the `cart` array. */ //[19.48]
    const isItemExist = state.cart.find((i) => i._id === item._id);
    if (isItemExist) {
      return {
        ...state,
        /* The line `cart: state.cart.map((i) => (i._id === isItemExist._id ? item : i))` is updating the
      `cart` array in the state. */
        cart: state.cart.map((i) => (i._id === isItemExist._id ? item : i)),
      };
    } else {
      return {
        ...state,
        /* The line `cart: [...state.cart, item],` is adding the `item` to the `cart` array in the
       state. It uses the spread operator (`...`) to create a new array that includes all the
       elements from the existing `state.cart` array, and then appends the `item` to the end of the
       new array. This ensures that the original `state.cart` array is not mutated, and a new array
       is created with the updated items. */
        cart: [...state.cart, item],
        selectedCartItemIds: [...selectedItemIds, item._id],
      };
    }
  },

  // Remove from cart
  removeFromCart: (state, action) => {
    return {
      ...state,
      cart: state.cart.filter((i) => i._id !== action.payload),
      selectedCartItemIds: (
        state.selectedCartItemIds || state.cart.map((item) => item._id)
      ).filter(
        (id) => id !== action.payload
      ),
    };
  },

  toggleCartItemSelection: (state, action) => {
    const itemId = action.payload;
    const selectedItemIds =
      state.selectedCartItemIds || state.cart.map((item) => item._id);
    const isSelected = selectedItemIds.includes(itemId);

    state.selectedCartItemIds = isSelected
      ? selectedItemIds.filter((id) => id !== itemId)
      : [...selectedItemIds, itemId];
  },

  setAllCartItemsSelected: (state, action) => {
    state.selectedCartItemIds = action.payload
      ? state.cart.map((item) => item._id)
      : [];
  },

  removePurchasedCartItems: (state, action) => {
    const purchasedItemIds = action.payload;
    state.cart = state.cart.filter(
      (item) => !purchasedItemIds.includes(item._id)
    );
    state.selectedCartItemIds = (
      state.selectedCartItemIds || state.cart.map((item) => item._id)
    ).filter(
      (id) => !purchasedItemIds.includes(id)
    );
  },
});
