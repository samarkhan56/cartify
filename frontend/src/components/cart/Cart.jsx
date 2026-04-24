import React, { useState } from "react";
import { RxCross1 } from "react-icons/rx";
import styles from "../../styles/styles";
import { Link } from "react-router-dom";
import { IoBagHandleOutline } from "react-icons/io5";
import { HiOutlineMinus, HiPlus } from "react-icons/hi";
import { AiOutlineShoppingCart, AiOutlineDelete } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { backend_url } from "../../server";
import { addTocart, removeFromCart } from "../../redux/actions/cart";

const Cart = ({ setOpenCart }) => {
  const { cart } = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  const removeFromCartHandler = (data) => {
    dispatch(removeFromCart(data));
    toast.info("Item removed from cart");
  };

  const totalPrice = cart.reduce(
    (acc, item) => acc + item.qty * item.discountPrice,
    0
  );

  const quantityChangeHandler = (data) => {
    dispatch(addTocart(data));
  };

  // Calculate savings
  const originalTotal = cart.reduce(
    (acc, item) => acc + item.qty * (item.originalPrice || item.discountPrice),
    0
  );
  const savings = originalTotal - totalPrice;

  return (
    <div className="fixed top-0 left-0 w-full bg-black/50 h-screen z-50 animate-fadeIn">
      <div className="fixed top-0 right-0 h-full w-[90%] 800px:w-[400px] bg-card flex flex-col overflow-y-scroll shadow-2xl animate-slideInLeft">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border-gray p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IoBagHandleOutline size={22} className="text-brand-orange" />
            <h5 className="text-lg font-semibold text-text-primary">
              Shopping Cart ({cart?.length || 0})
            </h5>
          </div>
          <button
            onClick={() => setOpenCart(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <RxCross1 size={18} className="text-text-secondary" />
          </button>
        </div>

        {cart && cart.length === 0 ? (
          // Empty Cart State
          <div className="flex flex-col items-center justify-center h-full py-20">
            <AiOutlineShoppingCart size={80} className="text-gray-300 mb-4" />
            <h5 className="text-text-primary text-lg font-medium mb-2">
              Your cart is empty
            </h5>
            <p className="text-text-secondary text-sm mb-6">
              Looks like you haven't added anything yet
            </p>
            <button
              onClick={() => setOpenCart(false)}
              className="bg-brand-orange hover:bg-orange-hover text-white px-6 py-2 rounded-lg transition-all duration-300"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto">
              {cart.map((item, index) => (
                <CartSingle
                  data={item}
                  key={index}
                  quantityChangeHandler={quantityChangeHandler}
                  removeFromCartHandler={removeFromCartHandler}
                />
              ))}
            </div>

            {/* Footer / Checkout Section */}
            <div className="sticky bottom-0 bg-card border-t border-border-gray p-4">
              {/* Savings Banner */}
              {savings > 0 && (
                <div className="bg-success/10 rounded-lg p-3 mb-4">
                  <p className="text-success text-sm font-medium">
                    You're saving ${savings.toFixed(2)} on this order!
                  </p>
                </div>
              )}

              {/* Price Summary */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Subtotal</span>
                  <span className="text-text-primary">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Shipping</span>
                  <span className="text-success">Free</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border-gray">
                  <span className="font-semibold text-text-primary">Total</span>
                  <span className="font-bold text-brand-orange text-lg">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <Link to="/checkout" onClick={() => setOpenCart(false)}>
                <button className="w-full bg-brand-orange hover:bg-orange-hover text-white py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105">
                  Proceed to Checkout
                </button>
              </Link>

              {/* Continue Shopping */}
              <button
                onClick={() => setOpenCart(false)}
                className="w-full text-center text-text-secondary hover:text-brand-orange text-sm mt-3 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const CartSingle = ({ data, quantityChangeHandler, removeFromCartHandler }) => {
  const [value, setValue] = useState(data.qty);
  const totalPrice = data.discountPrice * value;

  const increment = () => {
    if (data.stock < value + 1) {
      toast.error("Product stock limited!");
    } else {
      setValue(value + 1);
      const updateCartData = { ...data, qty: value + 1 };
      quantityChangeHandler(updateCartData);
    }
  };

  const decrement = () => {
    if (value === 1) {
      toast.info("Minimum quantity is 1");
      return;
    }
    setValue(value - 1);
    const updateCartData = { ...data, qty: value - 1 };
    quantityChangeHandler(updateCartData);
  };

  return (
    <div className="border-b border-border-gray p-4 hover:bg-gray-50 transition-colors">
      <div className="flex gap-3">
        {/* Product Image */}
        <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden shrink-0">
          <img
            src={`${backend_url}${data?.images[0]}`}
            className="w-full h-full object-contain p-2"
            alt={data.name}
          />
        </div>

        {/* Product Details */}
        <div className="flex-1">
          <h3 className="font-medium text-text-primary text-sm mb-1 line-clamp-2">
            {data.name}
          </h3>
          <p className="text-brand-orange font-semibold text-base mb-2">
            ${data.discountPrice}
          </p>

          {/* Quantity Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-border-gray rounded-lg">
              <button
                onClick={decrement}
                className="px-2 py-1 hover:bg-gray-100 transition-colors"
              >
                <HiOutlineMinus size={14} className="text-text-secondary" />
              </button>
              <span className="w-8 text-center text-sm text-text-primary">
                {value}
              </span>
              <button
                onClick={increment}
                className="px-2 py-1 hover:bg-gray-100 transition-colors"
              >
                <HiPlus size={14} className="text-text-secondary" />
              </button>
            </div>

            {/* Total Price */}
            <span className="text-sm font-medium text-text-primary">
              ${totalPrice.toFixed(2)}
            </span>

            {/* Remove Button */}
            <button
              onClick={() => removeFromCartHandler(data)}
              className="ml-auto text-text-secondary hover:text-red-500 transition-colors"
              title="Remove item"
            >
              <AiOutlineDelete size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;