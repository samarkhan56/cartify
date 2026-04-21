import React, { useEffect } from "react";
import { backend_url } from "../../server";
import styles from "../../styles/styles";
import CountDown from "./CountDown";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addTocart } from "../../redux/actions/cart";
import { toast } from "react-toastify";
import { AiFillFire } from "react-icons/ai";

const EventCard = ({ data }) => {
  const { cart } = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  const addToCartHandler = (data) => {
    const isItemExists = cart && cart.find((i) => i._id === data._id);
    if (isItemExists) {
      toast.error("Item already in cart!");
    } else {
      if (data.stock < 1) {
        toast.error("Product stock limited!");
      } else {
        const cartData = { ...data, qty: 1 };
        dispatch(addTocart(cartData));
        toast.success("Item added to cart successfully!");
      }
    }
  };

  // Calculate discount percentage
  const discountPercentage = data.originalPrice > data.discountPrice 
    ? Math.round(((data.originalPrice - data.discountPrice) / data.originalPrice) * 100)
    : 0;

  return (
    <div className="group bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border-gray/50 h-full flex flex-col">
      {/* Image Container */}
      <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <img
          src={`${backend_url}${data.images[0]}`}
          alt={data.name}
          className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
        />
        {/* Discount Badge */}
        {discountPercentage > 0 && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-brand-orange to-orange-hover text-white text-xs font-bold px-2 py-1 rounded-full z-10">
            -{discountPercentage}%
          </div>
        )}
        {/* Event Badge - Using icon instead of emoji */}
        <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10 flex items-center gap-1">
          <AiFillFire size={12} />
          <span>Event</span>
        </div>
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Product Name */}
        <Link to={`/product/${data._id}?isEvent=true`}>
          <h3 className="font-semibold text-text-primary text-base mb-2 line-clamp-2 min-h-[48px] group-hover:text-brand-orange transition-colors">
            {data.name}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-text-secondary text-sm mb-3 line-clamp-2">
          {data.description?.substring(0, 80)}...
        </p>

        {/* Price Section */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-brand-orange">
              ${data.discountPrice}
            </span>
            {data.originalPrice > data.discountPrice && (
              <span className="text-sm text-text-secondary line-through">
                ${data.originalPrice}
              </span>
            )}
          </div>
          <span className="text-xs text-success font-medium">
            {data.sold_out || 0} sold
          </span>
        </div>

        {/* Countdown Timer */}
        <div className="mb-4">
          <CountDown data={data} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-auto">
          <Link
            to={`/product/${data._id}?isEvent=true`}
            className="flex-1 text-center border border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300"
          >
            View Details
          </Link>
          <button
            onClick={() => addToCartHandler(data)}
            className="flex-1 bg-brand-orange hover:bg-orange-hover text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;