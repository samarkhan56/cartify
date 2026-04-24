import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/styles";
import {
    CardNumberElement,
    CardCvcElement,
    CardExpiryElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useSelector } from "react-redux";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { RxCross1 } from "react-icons/rx";
import {
    AiFillCreditCard,
    AiFillPayCircle,
    AiOutlineSafety,
    AiOutlineCheckCircle,
} from "react-icons/ai";
import { FaMoneyBillWave } from "react-icons/fa";

const Payment = () => {
    const [orderData, setOrderData] = useState([]);
    const [open, setOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { user } = useSelector((state) => state.user);
    const navigate = useNavigate();
    const stripe = useStripe();
    const elements = useElements();

    useEffect(() => {
        const orderData = JSON.parse(localStorage.getItem("latestOrder"));
        console.log("Payment page loaded - orderData from localStorage:", orderData);
        setOrderData(orderData);
    }, []);

    const createOrder = (data, actions) => {
        return actions.order
            .create({
                purchase_units: [
                    {
                        description: "Cartify Order",
                        amount: {
                            currency_code: "USD",
                            value: orderData?.totalPrice,
                        },
                    },
                ],
                application_context: {
                    shipping_preference: "NO_SHIPPING",
                },
            })
            .then((orderID) => {
                return orderID;
            });
    };

    const order = {
        cart: orderData?.cart,
        shippingAddress: orderData?.shippingAddress,
        user: user && user,
        totalPrice: orderData?.totalPrice,
        subTotalPrice: orderData?.subTotalPrice,
        shipping: orderData?.shipping,
        discountPrice: orderData?.discountPrice,
    };

    const onApprove = async (data, actions) => {
        return actions.order.capture().then(function (details) {
            const { payer } = details;
            let paymentInfo = payer;
            if (paymentInfo !== undefined) {
                paypalPaymentHandler(paymentInfo);
            }
        });
    };

    // PayPal Payment Handler
    const paypalPaymentHandler = async (paymentInfo) => {
        if (isProcessing) return;
        setIsProcessing(true);
        
        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };
        order.paymentInfo = {
            id: paymentInfo.payer_id,
            status: "succeeded",
            type: "PayPal",
        };

        console.log("=== PAYPAL ORDER DATA ===");
        console.log("Order object:", order);
        console.log("Cart items:", order.cart);
        console.log("Total price:", order.totalPrice);
        localStorage.setItem("latestOrder", JSON.stringify(order));

        try {
            await axios.post(`${server}/order/create-order`, order, config);
            setOpen(false);
            localStorage.setItem("cartItems", JSON.stringify([]));
            toast.success("Order successful!");
            window.location.href = "/order/success";
        } catch (error) {
            console.error("PayPal payment failed:", error);
            toast.error("Payment failed. Please try again.");
            setIsProcessing(false);
        }
    }

    const paymentData = {
        amount: Math.round(orderData?.totalPrice * 100),
    }

    // Credit Card Payment Handler
    const paymentHandler = async (e) => {
        e.preventDefault();
        if (isProcessing) return;
        setIsProcessing(true);
        
        try {
            const config = {
                headers: {
                    "Content-Type": "application/json",
                },
            };

            const { data } = await axios.post(
                `${server}/payment/process`,
                paymentData,
                config
            );

            const client_secret = data.client_secret;

            if (!stripe || !elements) {
                setIsProcessing(false);
                return;
            }
            
            const result = await stripe.confirmCardPayment(client_secret, {
                payment_method: {
                    card: elements.getElement(CardNumberElement),
                },
            });

            if (result.error) {
                toast.error(result.error.message);
                setIsProcessing(false);
            } else {
                if (result.paymentIntent.status === "succeeded") {
                    order.paymentInfo = {
                        id: result.paymentIntent.id,
                        status: result.paymentIntent.status,
                        type: "Credit Card",
                    };

                    console.log("=== CREDIT CARD ORDER DATA ===");
                    console.log("Order object:", order);
                    console.log("Cart items:", order.cart);
                    console.log("Total price:", order.totalPrice);
                    localStorage.setItem("latestOrder", JSON.stringify(order));

                    await axios.post(`${server}/order/create-order`, order, config);
                    setOpen(false);
                    localStorage.setItem("cartItems", JSON.stringify([]));
                    toast.success("Order successful!");
                    window.location.href = "/order/success";
                }
            }
        } catch (error) {
            console.error("Credit Card payment failed:", error);
            toast.error("Payment failed. Please try again.");
            setIsProcessing(false);
        }
    };

    // Cash on Delivery Handler
    const cashOnDeliveryHandler = async (e) => {
        e.preventDefault();
        if (isProcessing) return;
        setIsProcessing(true);

        const config = {
            headers: {
                "Content-Type": "application/json",
            },
        };

        order.paymentInfo = {
            type: "Cash On Delivery",
        };

        console.log("=== CASH ON DELIVERY ORDER DATA ===");
        console.log("Order object:", order);
        console.log("Cart items:", order.cart);
        console.log("Total price:", order.totalPrice);
        console.log("Subtotal price:", order.subTotalPrice);
        localStorage.setItem("latestOrder", JSON.stringify(order));

        try {
            await axios.post(`${server}/order/create-order`, order, config);
            setOpen(false);
            localStorage.setItem("cartItems", JSON.stringify([]));
            toast.success("Order placed successfully!");
            window.location.href = "/order/success";
        } catch (error) {
            console.error("COD order failed:", error);
            toast.error("Failed to place order. Please try again.");
            setIsProcessing(false);
        }
    }

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
                                user={user}
                                open={open}
                                setOpen={setOpen}
                                onApprove={onApprove}
                                createOrder={createOrder}
                                paymentHandler={paymentHandler}
                                cashOnDeliveryHandler={cashOnDeliveryHandler}
                                isProcessing={isProcessing}
                            />
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <CartData orderData={orderData} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PaymentInfo = ({
    user,
    open,
    setOpen,
    onApprove,
    createOrder,
    paymentHandler,
    cashOnDeliveryHandler,
    isProcessing,
}) => {
    const [select, setSelect] = useState(1);

    const paymentMethods = [
        { id: 1, name: "Credit / Debit Card", icon: <AiFillCreditCard size={22} />, description: "Pay securely with your card" },
        { id: 2, name: "PayPal", icon: <AiFillPayCircle size={22} />, description: "Pay with your PayPal account" },
        { id: 3, name: "Cash on Delivery", icon: <FaMoneyBillWave size={22} />, description: "Pay when you receive your order" },
    ];

    return (
        <div className="p-6 space-y-6">
            {paymentMethods.map((method) => (
                <div key={method.id} className="border border-border-gray rounded-lg overflow-hidden">
                    <div
                        className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${select === method.id ? 'bg-brand-orange/5 border-l-4 border-brand-orange' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelect(method.id)}
                    >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${select === method.id ? 'border-brand-orange' : 'border-gray-300'
                            }`}>
                            {select === method.id && (
                                <div className="w-3 h-3 rounded-full bg-brand-orange"></div>
                            )}
                        </div>
                        <div className="text-brand-orange">{method.icon}</div>
                        <div>
                            <h4 className="font-semibold text-text-primary">{method.name}</h4>
                            <p className="text-sm text-text-secondary">{method.description}</p>
                        </div>
                    </div>

                    {select === method.id && (
                        <div className="p-4 border-t border-border-gray bg-gray-50">
                            {method.id === 1 && (
                                <form onSubmit={paymentHandler} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            Name on Card
                                        </label>
                                        <input
                                            required
                                            value={user && user.name}
                                            className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">
                                                Card Number
                                            </label>
                                            <CardNumberElement
                                                className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                                options={{
                                                    style: {
                                                        base: {
                                                            fontSize: "16px",
                                                            color: "#111827",
                                                            "::placeholder": {
                                                                color: "#6B7280",
                                                            },
                                                        },
                                                    },
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-text-primary mb-1">
                                                Expiry Date
                                            </label>
                                            <CardExpiryElement
                                                className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                                options={{
                                                    style: {
                                                        base: {
                                                            fontSize: "16px",
                                                            color: "#111827",
                                                            "::placeholder": {
                                                                color: "#6B7280",
                                                            },
                                                        },
                                                    },
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                            CVV
                                        </label>
                                        <CardCvcElement
                                            className="w-full px-4 py-2 border border-border-gray rounded-lg focus:border-brand-orange focus:outline-none transition-colors"
                                            options={{
                                                style: {
                                                    base: {
                                                        fontSize: "16px",
                                                        color: "#111827",
                                                        "::placeholder": {
                                                            color: "#6B7280",
                                                        },
                                                    },
                                                },
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isProcessing}
                                        className="w-full bg-brand-orange hover:bg-orange-hover text-white py-2 rounded-lg font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isProcessing ? "Processing..." : "Pay Now"}
                                    </button>
                                </form>
                            )}

                            {method.id === 2 && (
                                <div>
                                    <button
                                        onClick={() => setOpen(true)}
                                        disabled={isProcessing}
                                        className="w-full bg-[#0070ba] hover:bg-[#003087] text-white py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50"
                                    >
                                        Pay with PayPal
                                    </button>
                                </div>
                            )}

                            {method.id === 3 && (
                                <form onSubmit={cashOnDeliveryHandler}>
                                    <button
                                        type="submit"
                                        disabled={isProcessing}
                                        className="w-full bg-brand-orange hover:bg-orange-hover text-white py-2 rounded-lg font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isProcessing ? "Processing..." : "Confirm Order"}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-2 text-sm text-text-secondary pt-4 border-t border-border-gray">
                <AiOutlineSafety size={16} className="text-success" />
                <span>Your payment information is secure and encrypted</span>
            </div>

            {/* PayPal Modal */}
            {open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-card border-b border-border-gray p-4 flex justify-between items-center">
                            <h3 className="font-semibold text-text-primary">Pay with PayPal</h3>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <RxCross1 size={18} className="text-text-secondary" />
                            </button>
                        </div>
                        <div className="p-6">
                            <PayPalScriptProvider
                                options={{
                                    "client-id": "AXRhO4eNGo3L8MUFazEFnW9hNwBP2rTwUWNqMMRcFtjpbCrDVt6vS8HoWa7hyLlfO0fxG3OU_9zit7KN",
                                }}
                            >
                                <PayPalButtons
                                    style={{ layout: "vertical" }}
                                    onApprove={onApprove}
                                    createOrder={createOrder}
                                    disabled={isProcessing}
                                />
                            </PayPalScriptProvider>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CartData = ({ orderData }) => {
    const shipping = orderData?.shipping?.toFixed(2);
    const discount = orderData?.discountPrice;

    return (
        <div className="bg-card rounded-xl shadow-md overflow-hidden">
            <div className="border-b border-border-gray p-6">
                <h2 className="text-xl font-semibold text-text-primary">Order Summary</h2>
                <p className="text-text-secondary text-sm mt-1">
                    Review your order details
                </p>
            </div>

            <div className="p-6 space-y-4">
                {/* Cart Items Preview */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {orderData?.cart && orderData.cart.length > 0 ? (
                        orderData.cart.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-text-secondary">
                                    {item.name.length > 25 ? item.name.slice(0, 25) + "..." : item.name}
                                    <span className="text-text-primary"> x{item.qty}</span>
                                </span>
                                <span className="text-text-primary font-medium">
                                    ${(item.qty * item.discountPrice).toFixed(2)}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-text-secondary text-sm text-center">No items in cart</p>
                    )}
                    {orderData?.cart?.length > 3 && (
                        <p className="text-text-secondary text-xs text-center">
                            +{orderData.cart.length - 3} more items
                        </p>
                    )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 pt-3 border-t border-border-gray">
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Subtotal</span>
                        <span className="text-text-primary">${orderData?.subTotalPrice || 0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Shipping</span>
                        <span className="text-success">${shipping || 0}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-text-secondary">Discount</span>
                            <span className="text-red-500">-${discount}</span>
                        </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border-gray">
                        <span className="font-semibold text-text-primary">Total</span>
                        <span className="font-bold text-brand-orange text-xl">
                            ${orderData?.totalPrice || 0}
                        </span>
                    </div>
                </div>

                {/* Secure Badge */}
                <div className="flex items-center justify-center gap-1 text-xs text-text-secondary pt-3">
                    <AiOutlineCheckCircle size={14} className="text-success" />
                    <span>Secure payment guaranteed</span>
                </div>
            </div>
        </div>
    );
};

export default Payment;