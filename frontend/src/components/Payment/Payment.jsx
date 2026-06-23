import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import {
  AiFillCreditCard,
  AiOutlineCheckCircle,
  AiOutlineSafety,
} from "react-icons/ai";
import { FaMoneyBillWave } from "react-icons/fa";
import { server } from "../../server";
import { removePurchasedCartItems } from "../../redux/actions/cart";

const METHOD_STRIPE = "stripe";
const METHOD_COD = "cod";

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const Payment = ({ isStripeAvailable = false }) => {
  const [orderData, setOrderData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const storedOrder = localStorage.getItem("latestOrder");

    if (!storedOrder) {
      toast.error("No order found. Please go back to checkout.");
      navigate("/checkout");
      return;
    }

    try {
      setOrderData(JSON.parse(storedOrder));
    } catch (error) {
      toast.error("Your saved order is invalid. Please checkout again.");
      navigate("/checkout");
    }
  }, [navigate]);

  const order = useMemo(() => {
    if (!orderData) return null;

    return {
      cart: orderData.cart || [],
      shippingAddress: orderData.shippingAddress,
      user,
      totalPrice: orderData.totalPrice,
      subTotalPrice: orderData.subTotalPrice,
      shipping: orderData.shipping,
      discountPrice: orderData.discountPrice,
    };
  }, [orderData, user]);

  const placeOrder = async (paymentInfo, successMessage) => {
    if (!order) return;

    const orderPayload = {
      ...order,
      paymentInfo,
    };

    const config = {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    };

    await axios.post(`${server}/order/create-order`, orderPayload, config);
    localStorage.setItem("latestOrder", JSON.stringify(orderPayload));
    dispatch(
      removePurchasedCartItems(order.cart.map((item) => item._id))
    );
    toast.success(successMessage);
    navigate("/order/success");
  };

  const cashOnDeliveryHandler = async (event) => {
    event.preventDefault();
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await placeOrder(
        { type: "Cash On Delivery", status: "Pending" },
        "Order placed successfully!"
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to place order.");
      setIsProcessing(false);
    }
  };

  if (!orderData || !order) return null;

  return (
    <div className="bg-background min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl shadow-md overflow-hidden">
              <div className="border-b border-border-gray p-6">
                <h2 className="text-xl font-semibold text-text-primary">
                  Payment Method
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  Choose how you would like to pay
                </p>
              </div>

              <PaymentInfo
                amount={orderData.totalPrice}
                cashOnDeliveryHandler={cashOnDeliveryHandler}
                isProcessing={isProcessing}
                isStripeAvailable={isStripeAvailable}
                placeOrder={placeOrder}
                setIsProcessing={setIsProcessing}
                user={user}
              />
            </div>
          </div>

          <div className="lg:col-span-1">
            <CartData orderData={orderData} />
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentInfo = ({
  amount,
  cashOnDeliveryHandler,
  isProcessing,
  isStripeAvailable,
  placeOrder,
  setIsProcessing,
  user,
}) => {
  const defaultMethod = isStripeAvailable ? METHOD_STRIPE : METHOD_COD;
  const [selectedMethod, setSelectedMethod] = useState(defaultMethod);

  useEffect(() => {
    setSelectedMethod(defaultMethod);
  }, [defaultMethod]);

  const paymentMethods = [
    {
      id: METHOD_STRIPE,
      name: "Stripe Card",
      icon: <AiFillCreditCard size={22} />,
      description: "Pay securely with a credit or debit card",
    },
    {
      id: METHOD_COD,
      name: "Cash on Delivery",
      icon: <FaMoneyBillWave size={22} />,
      description: "Pay when you receive your order",
    },
  ];

  const isMethodUnavailable = (methodId) =>
    methodId === METHOD_STRIPE && !isStripeAvailable;

  return (
    <div className="p-6 space-y-6">
      {paymentMethods.map((method) => {
        const unavailable = isMethodUnavailable(method.id);
        const isSelected = selectedMethod === method.id;

        return (
          <div
            key={method.id}
            className="border border-border-gray rounded-lg overflow-hidden"
          >
            <button
              type="button"
              className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                isSelected
                  ? "bg-brand-orange/5 border-l-4 border-brand-orange"
                  : "hover:bg-gray-50"
              } ${unavailable ? "opacity-60" : ""}`}
              onClick={() => setSelectedMethod(method.id)}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? "border-brand-orange" : "border-gray-300"
                }`}
              >
                {isSelected && (
                  <span className="w-3 h-3 rounded-full bg-brand-orange" />
                )}
              </span>
              <span className="text-brand-orange">{method.icon}</span>
              <span>
                <span className="block font-semibold text-text-primary">
                  {method.name}
                </span>
                <span className="block text-sm text-text-secondary">
                  {method.description}
                </span>
              </span>
            </button>

            {isSelected && (
              <div className="p-4 border-t border-border-gray bg-gray-50">
                {method.id === METHOD_STRIPE && (
                  <StripePaymentPanel
                    amount={amount}
                    isAvailable={isStripeAvailable}
                    isProcessing={isProcessing}
                    placeOrder={placeOrder}
                    setIsProcessing={setIsProcessing}
                    user={user}
                  />
                )}

                {method.id === METHOD_COD && (
                  <form onSubmit={cashOnDeliveryHandler}>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full bg-brand-orange text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                    >
                      {isProcessing ? "Processing..." : "Confirm Order"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-center gap-2 text-sm text-text-secondary pt-4 border-t border-border-gray">
        <AiOutlineSafety size={16} className="text-success" />
        <span>Your payment information is secure and encrypted</span>
      </div>
    </div>
  );
};

const StripePaymentPanel = ({
  amount,
  isAvailable,
  isProcessing,
  placeOrder,
  setIsProcessing,
  user,
}) => {
  if (!isAvailable) {
    return (
      <UnavailableGateway message="Stripe is not configured. Add valid Stripe keys to the backend environment to enable card payments." />
    );
  }

  return (
    <StripePaymentForm
      amount={amount}
      isProcessing={isProcessing}
      placeOrder={placeOrder}
      setIsProcessing={setIsProcessing}
      user={user}
    />
  );
};

const StripePaymentForm = ({
  amount,
  isProcessing,
  placeOrder,
  setIsProcessing,
  user,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const paymentHandler = async (event) => {
    event.preventDefault();
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      if (!stripe || !elements) {
        toast.error("Stripe is still loading. Please try again.");
        setIsProcessing(false);
        return;
      }

      const { data } = await axios.post(
        `${server}/payment/process`,
        { amount },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );

      const result = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardNumberElement),
          billing_details: {
            name: user?.name || "Customer",
            email: user?.email,
          },
        },
      });

      if (result.error) {
        toast.error(result.error.message);
        setIsProcessing(false);
        return;
      }

      if (result.paymentIntent?.status === "succeeded") {
        await placeOrder(
          {
            id: result.paymentIntent.id,
            status: result.paymentIntent.status,
            type: "Stripe",
          },
          "Stripe payment successful! Order placed."
        );
      } else {
        toast.error("Stripe payment was not completed.");
        setIsProcessing(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Stripe payment failed.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={paymentHandler} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Name on Card
        </label>
        <input
          required
          defaultValue={user?.name || ""}
          className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Card Number
          </label>
          <CardNumberElement className="w-full px-4 py-2 border border-border-gray rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Expiry Date
          </label>
          <CardExpiryElement className="w-full px-4 py-2 border border-border-gray rounded-lg" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          CVV
        </label>
        <CardCvcElement className="w-full px-4 py-2 border border-border-gray rounded-lg" />
      </div>

      <button
        type="submit"
        disabled={isProcessing}
        className="w-full bg-brand-orange text-white py-2 rounded-lg font-semibold disabled:opacity-50"
      >
        {isProcessing ? "Processing..." : `Pay ${formatCurrency(amount)}`}
      </button>
    </form>
  );
};

const UnavailableGateway = ({ message }) => (
  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
    {message}
  </div>
);

const CartData = ({ orderData }) => {
  const shipping = Number(orderData?.shipping || 0);
  const discount = Number(orderData?.discountPrice || 0);
  const cart = orderData?.cart || [];

  return (
    <div className="bg-card rounded-xl shadow-md overflow-hidden">
      <div className="border-b border-border-gray p-6">
        <h2 className="text-xl font-semibold text-text-primary">
          Order Summary
        </h2>
        <p className="text-text-secondary text-sm">Review your order details</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {cart.slice(0, 3).map((item, index) => (
            <div key={item._id || index} className="flex justify-between text-sm">
              <span>
                {(item.name || "Item").length > 25
                  ? `${item.name.slice(0, 25)}...`
                  : item.name || "Item"}{" "}
                x{item.qty}
              </span>
              <span>
                {formatCurrency(Number(item.qty || 0) * Number(item.discountPrice || 0))}
              </span>
            </div>
          ))}
          {cart.length > 3 && (
            <p className="text-xs text-center">
              +{cart.length - 3} more items
            </p>
          )}
        </div>
        <div className="space-y-2 pt-3 border-t border-border-gray">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(orderData?.subTotalPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{formatCurrency(shipping)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border-gray font-bold">
            <span>Total</span>
            <span className="text-brand-orange text-xl">
              {formatCurrency(orderData?.totalPrice)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 text-xs text-green-600">
          <AiOutlineCheckCircle size={14} />
          <span>Secure payment guaranteed</span>
        </div>
      </div>
    </div>
  );
};

export default Payment;
