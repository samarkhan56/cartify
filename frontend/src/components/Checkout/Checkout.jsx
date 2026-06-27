import React, { useState } from "react";
import { Country, State } from "country-state-city";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect } from "react";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import {
  AiOutlineUser,
  AiOutlineMail,
  AiOutlinePhone,
  AiOutlineGlobal,
  AiOutlineEnvironment,
  AiOutlineTag,
  AiOutlineShoppingCart,
} from "react-icons/ai";
import { BiMapPin } from "react-icons/bi";

const Checkout = () => {
  const { user } = useSelector((state) => state.user);
  const { cart, selectedCartItemIds } = useSelector((state) => state.cart);
  const selectedItemIds =
    selectedCartItemIds || cart.map((item) => item._id);
  const selectedCartItems = cart.filter((item) =>
    selectedItemIds.includes(item._id)
  );
  
  // State variables for form fields
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [userInfo, setUserInfo] = useState(false);
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponCodeData, setCouponCodeData] = useState(null);
  const [discountPrice, setDiscountPrice] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const subTotalPrice = selectedCartItems.reduce(
    (acc, item) => acc + item.qty * item.discountPrice,
    0
  );

  const shipping = subTotalPrice * 0.1;
  const discountPercentage = couponCodeData ? discountPrice : "";
  const totalPrice = couponCodeData
    ? (subTotalPrice + shipping - discountPercentage).toFixed(2)
    : (subTotalPrice + shipping).toFixed(2);

  const paymentSubmit = () => {
    if (selectedCartItems.length === 0) {
      toast.error("Select at least one product from your cart.");
      return;
    }

    if (
      fullName === "" ||
      email === "" ||
      phoneNumber === "" ||
      address1 === "" ||
      zipCode === "" ||
      country === "" ||
      city === ""
    ) {
      toast.error("Please fill in all required fields!");
      return;
    }
    
    const shippingAddress = {
      fullName,
      email,
      phoneNumber,
      address1,
      address2,
      zipCode,
      country,
      city,
    };

    const orderData = {
      cart: selectedCartItems,
      totalPrice,
      subTotalPrice,
      shipping,
      discountPrice,
      couponCode: couponCodeData?.name || "",
      shippingAddress,
      user,
    };

    localStorage.setItem("latestOrder", JSON.stringify(orderData));
    navigate("/payment");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = couponCode;

    await axios
      .get(`${server}/coupon/get-coupon-value/${name}`)
      .then((res) => {
        const shopId = res.data.couponCode?.shopId;
        const couponCodeValue = res.data.couponCode?.value;

        if (res.data.couponCode !== null) {
          const isCouponValid =
            selectedCartItems.filter((item) => item.shopId === shopId);

          if (isCouponValid.length === 0) {
            toast.error("Coupon code is not valid for this shop");
            setCouponCode("");
          } else {
            const eligiblePrice = isCouponValid.reduce(
              (acc, item) => acc + item.qty * item.discountPrice,
              0
            );
            const discountPrice = (eligiblePrice * couponCodeValue) / 100;
            setDiscountPrice(discountPrice);
            setCouponCodeData(res.data.couponCode);
            setCouponCode("");
            toast.success("Coupon applied successfully!");
          }
        }
        if (res.data.couponCode === null) {
          toast.error("Coupon code doesn't exist!");
          setCouponCode("");
        }
      })
      .catch(() => {
        toast.error("Invalid coupon code!");
      });
  };

  return (
    <div className="bg-background min-h-screen py-8 pb-28 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Shipping Form */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-card rounded-xl shadow-md overflow-hidden">
              <div className="border-b border-border-gray p-6">
                <h2 className="text-xl font-semibold text-text-primary">
                  Shipping Information
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  Enter your delivery address details
                </p>
              </div>
              <ShippingInfo
                user={user}
                country={country}
                setCountry={setCountry}
                city={city}
                setCity={setCity}
                userInfo={userInfo}
                setUserInfo={setUserInfo}
                address1={address1}
                setAddress1={setAddress1}
                address2={address2}
                setAddress2={setAddress2}
                zipCode={zipCode}
                setZipCode={setZipCode}
                fullName={fullName}
                setFullName={setFullName}
                email={email}
                setEmail={setEmail}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
              />
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <CartData
                handleSubmit={handleSubmit}
                totalPrice={totalPrice}
                shipping={shipping}
                subTotalPrice={subTotalPrice}
                couponCode={couponCode}
                setCouponCode={setCouponCode}
                discountPercentage={discountPercentage}
                cart={selectedCartItems}
              />

              {/* Place Order Button */}
              <button
                onClick={paymentSubmit}
                disabled={selectedCartItems.length === 0}
                className="hidden lg:block w-full mt-4 bg-brand-orange hover:bg-orange-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed left-0 right-0 bottom-0 z-40 border-t border-border-gray bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] lg:hidden">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-text-secondary">
              {selectedCartItems.length} selected
            </p>
            <p className="text-lg font-bold text-brand-orange">${totalPrice}</p>
          </div>
          <button
            onClick={paymentSubmit}
            disabled={selectedCartItems.length === 0}
            className="shrink-0 bg-brand-orange hover:bg-orange-hover disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-3 rounded-lg font-semibold transition-colors"
          >
            Payment
          </button>
        </div>
      </div>
    </div>
  );
};

const ShippingInfo = ({
  user,
  country,
  setCountry,
  city,
  setCity,
  userInfo,
  setUserInfo,
  address1,
  setAddress1,
  address2,
  setAddress2,
  zipCode,
  setZipCode,
  fullName,
  setFullName,
  email,
  setEmail,
  phoneNumber,
  setPhoneNumber,
}) => {
  return (
    <div className="p-6">
      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <AiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <AiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <AiOutlinePhone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                required
                className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Zip Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <BiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter zip code"
                required
                className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <AiOutlineGlobal className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none appearance-none"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Select Country</option>
                {Country &&
                  Country.getAllCountries().map((item) => (
                    <option key={item.isoCode} value={item.isoCode}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <AiOutlineEnvironment className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none appearance-none"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!country}
              >
                <option value="">Select City</option>
                {State &&
                  State.getStatesOfCountry(country).map((item) => (
                    <option key={item.isoCode} value={item.isoCode}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              placeholder="Street address"
              required
              className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              value={address2}
              onChange={(e) => setAddress2(e.target.value)}
              placeholder="Apartment, suite, etc."
              className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
            />
          </div>
        </div>

        {user && user.addresses && user.addresses.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setUserInfo(!userInfo)}
              className="text-brand-orange hover:text-orange-hover text-sm font-medium transition-colors"
            >
              {userInfo ? "Hide saved addresses" : "Choose from saved addresses"}
            </button>

            {userInfo && (
              <div className="mt-3 space-y-2 border border-border-gray rounded-lg p-3">
                {user.addresses.map((item, index) => (
                  <label key={index} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                    <input
                      type="radio"
                      name="savedAddress"
                      className="w-4 h-4 text-brand-orange"
                      onClick={() => {
                        setAddress1(item.address1);
                        setAddress2(item.address2);
                        setZipCode(item.zipCode);
                        setCountry(item.country);
                        setCity(item.city);
                      }}
                    />
                    <div>
                      <p className="font-medium text-text-primary">{item.addressType}</p>
                      <p className="text-sm text-text-secondary">{item.address1}, {item.address2}</p>
                      <p className="text-sm text-text-secondary">{item.city}, {item.country} - {item.zipCode}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

const CartData = ({
  handleSubmit,
  totalPrice,
  shipping,
  subTotalPrice,
  couponCode,
  setCouponCode,
  discountPercentage,
  cart,
}) => {
  return (
    <div className="bg-card rounded-xl shadow-md overflow-hidden">
      <div className="border-b border-border-gray p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Order Summary
            </h2>
            <p className="text-text-secondary text-sm mt-1">
              {cart?.length || 0} selected item{cart?.length === 1 ? "" : "s"}
            </p>
          </div>
          <span className="w-10 h-10 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center">
            <AiOutlineShoppingCart size={20} />
          </span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Cart Items Preview */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {cart &&
            cart.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-text-secondary">
                  {item.name.length > 25 ? item.name.slice(0, 25) + "..." : item.name}{" "}
                  <span className="text-text-primary">x{item.qty}</span>
                </span>
                <span className="text-text-primary font-medium">
                  ${(item.qty * item.discountPrice).toFixed(2)}
                </span>
              </div>
            ))}
          {cart && cart.length > 3 && (
            <p className="text-text-secondary text-xs text-center">
              +{cart.length - 3} more items
            </p>
          )}
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 pt-3 border-t border-border-gray">
          <div className="flex justify-between">
            <span className="text-text-secondary">Subtotal</span>
            <span className="text-text-primary">${subTotalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Shipping</span>
            <span className="text-success">${shipping.toFixed(2)}</span>
          </div>
          {discountPercentage > 0 && (
            <div className="flex justify-between">
              <span className="text-text-secondary">Discount</span>
              <span className="text-red-500">-${discountPercentage.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border-gray">
            <span className="font-semibold text-text-primary">Total</span>
            <span className="font-bold text-brand-orange text-xl">
              ${totalPrice}
            </span>
          </div>
        </div>

        {/* Coupon Code */}
        <form onSubmit={handleSubmit} className="pt-2">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Apply Coupon Code
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <AiOutlineTag className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 hover:bg-brand-orange hover:text-white text-text-secondary rounded-lg transition-all duration-300"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
