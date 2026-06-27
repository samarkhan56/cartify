import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import Lottie from "react-lottie";
import animationData from "../Assests/animations/107043-success.json";
import { AiOutlineDownload, AiOutlineShopping, AiOutlinePrinter, AiOutlineHome } from "react-icons/ai";
import { useSelector } from "react-redux";
import { backend_url } from "../server";

const OrderSuccessPage = () => {
    const { user } = useSelector((state) => state.user);
    const [orderData, setOrderData] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const latestOrder = localStorage.getItem("latestOrder");
        
        if (latestOrder) {
            const parsedOrder = JSON.parse(latestOrder);
            setOrderData(parsedOrder);
        }
    }, []);

    const defaultOptions = {
        loop: false,
        autoplay: true,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: "xMidYMid slice",
        },
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadReceipt = () => {
        const receiptLines = [
            "Cartify Receipt",
            `Order: ${orderNumbers}`,
            `Date: ${new Date().toLocaleString()}`,
            `Customer: ${user?.name || orderData?.shippingAddress?.fullName || "Customer"}`,
            `Payment: ${orderData?.paymentInfo?.type || "Cash on Delivery"}`,
            "",
            "Items:",
            ...(orderData?.cart || []).map(
                (item) =>
                    `${item.name} x ${item.qty} - $${(toNumber(item.qty) * toNumber(item.discountPrice)).toFixed(2)}`
            ),
            "",
            `Subtotal: $${subtotal.toFixed(2)}`,
            `Shipping: $${shipping.toFixed(2)}`,
            `Discount: $${discount.toFixed(2)}`,
            `Total: $${total.toFixed(2)}`,
        ];

        const blob = new Blob([receiptLines.join("\n")], {
            type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `cartify-receipt-${orderNumbers.replace(/[^a-z0-9]/gi, "-")}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleGoToHome = () => {
        navigate("/");
    };

    const handleContinueShopping = () => {
        navigate("/products");
    };

    // Show loading state while fetching data
    if (!orderData) {
        return (
            <>
                <Header />
                <div className="flex flex-col items-center justify-center py-20 min-h-screen">
                    <Lottie options={defaultOptions} width={200} height={200} />
                    <p className="text-text-secondary mt-4">Loading order details...</p>
                </div>
                <Footer />
            </>
        );
    }

    // Helper function to convert to number safely
    const toNumber = (value) => {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    };

    // Calculate totals safely with number conversion
    const subtotal = toNumber(orderData?.subTotalPrice) || toNumber(orderData?.cart?.reduce((acc, item) => acc + toNumber(item.qty) * toNumber(item.discountPrice), 0));
    const shipping = toNumber(orderData?.shipping) || toNumber(subtotal * 0.1);
    const discount = toNumber(orderData?.discountPrice) || 0;
    const total = toNumber(orderData?.totalPrice) || toNumber(subtotal + shipping - discount);
    const itemCount = orderData?.cart?.length || 0;

    const orderNumbers =
        orderData?.orderIds?.length > 0
            ? orderData.orderIds.map((id) => `#${id.slice(-8).toUpperCase()}`).join(", ")
            : "#PENDING";

    return (
        <>
            <Header />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen">
                {/* Success Animation */}
                <div className="flex flex-col items-center text-center mb-8">
                    <Lottie options={defaultOptions} width={200} height={200} />
                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary mt-4">
                        Order Successful
                    </h1>
                    <p className="text-text-secondary mt-2">
                        Thank you for your purchase, <span className="font-semibold text-brand-orange">{user?.name || orderData?.shippingAddress?.fullName || "Customer"}</span>!
                    </p>
                    <p className="text-text-secondary text-sm">
                        Your order has been placed successfully. You will receive a confirmation email shortly.
                    </p>
                </div>

                {/* Order Details Card */}
                <div className="bg-card rounded-xl shadow-md overflow-hidden mb-6">
                    <div className="border-b border-border-gray p-5 bg-gray-50">
                        <h2 className="text-lg font-semibold text-text-primary">Order Details</h2>
                    </div>
                    <div className="p-5 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-text-secondary">Order Number:</span>
                            <span className="font-mono text-sm text-text-primary">
                                {orderNumbers}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-text-secondary">Order Date:</span>
                            <span className="text-text-primary">
                                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-text-secondary">Payment Method:</span>
                            <span className="text-text-primary capitalize">
                                {orderData?.paymentInfo?.type || "Cash on Delivery"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-text-secondary">Total Amount:</span>
                            <span className="font-bold text-brand-orange text-xl">
                                ${total.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Shipping Address Card */}
                <div className="bg-card rounded-xl shadow-md overflow-hidden mb-6">
                    <div className="border-b border-border-gray p-5 bg-gray-50">
                        <h2 className="text-lg font-semibold text-text-primary">Shipping Address</h2>
                    </div>
                    <div className="p-5">
                        <p className="font-medium text-text-primary">{orderData?.shippingAddress?.fullName || user?.name || "Customer"}</p>
                        <p className="text-text-secondary mt-1">{orderData?.shippingAddress?.address1 || "Address not provided"}</p>
                        {orderData?.shippingAddress?.address2 && (
                            <p className="text-text-secondary">{orderData?.shippingAddress?.address2}</p>
                        )}
                        <p className="text-text-secondary">
                            {orderData?.shippingAddress?.city || ""}, {orderData?.shippingAddress?.country || ""} {orderData?.shippingAddress?.zipCode || ""}
                        </p>
                        <p className="text-text-secondary mt-2">
                            <span className="font-medium">Phone:</span> {orderData?.shippingAddress?.phoneNumber || user?.phoneNumber || "Not provided"}
                        </p>
                        <p className="text-text-secondary">
                            <span className="font-medium">Email:</span> {orderData?.shippingAddress?.email || user?.email || "Not provided"}
                        </p>
                    </div>
                </div>

                {/* Order Items Card */}
                <div className="bg-card rounded-xl shadow-md overflow-hidden mb-8">
                    <div className="border-b border-border-gray p-5 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-text-primary">Order Items</h2>
                        <span className="text-sm text-text-secondary">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                    </div>
                    <div className="p-5 space-y-3">
                        {orderData?.cart && orderData.cart.length > 0 ? (
                            orderData.cart.map((item, index) => (
                                <div key={index} className="flex justify-between items-center py-2 border-b border-border-gray last:border-0">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={`${backend_url}${item?.images?.[0]}`}
                                            alt={item.name}
                                            className="w-12 h-12 rounded-md object-cover"
                                            onError={(e) => {
                                                e.target.src = "https://via.placeholder.com/50";
                                            }}
                                        />
                                        <div>
                                            <p className="font-medium text-text-primary text-sm">{item.name}</p>
                                            <p className="text-text-secondary text-xs">Quantity: {item.qty}</p>
                                        </div>
                                    </div>
                                    <span className="font-semibold text-text-primary">
                                        ${(toNumber(item.qty) * toNumber(item.discountPrice)).toFixed(2)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-text-secondary text-center py-4">No items found in order</p>
                        )}
                        
                        {/* Order Summary */}
                        <div className="pt-3 mt-3 border-t border-border-gray">
                            <div className="flex justify-between text-sm">
                                <span className="text-text-secondary">Subtotal:</span>
                                <span className="text-text-primary">${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-text-secondary">Shipping:</span>
                                <span className="text-success">${shipping.toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Discount:</span>
                                    <span className="text-red-500">-${discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 mt-2 border-t border-border-gray">
                                <span className="font-semibold text-text-primary">Total:</span>
                                <span className="font-bold text-brand-orange text-lg">${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={handleContinueShopping}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-orange hover:bg-orange-hover text-white rounded-lg font-medium transition-all duration-300 hover:scale-105"
                    >
                        <AiOutlineShopping size={18} />
                        Continue Shopping
                    </button>
                    <button
                        onClick={handlePrint}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white rounded-lg font-medium transition-all duration-300"
                    >
                        <AiOutlinePrinter size={18} />
                        Print Receipt
                    </button>
                    <button
                        onClick={handleDownloadReceipt}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 border-2 border-border-gray text-text-secondary hover:border-brand-orange hover:text-brand-orange rounded-lg font-medium transition-all duration-300"
                    >
                        <AiOutlineDownload size={18} />
                        Download Receipt
                    </button>
                </div>

                {/* Home Button */}
                <div className="flex justify-center mt-6">
                    <button
                        onClick={handleGoToHome}
                        className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-100 hover:bg-gray-200 text-text-primary rounded-lg font-medium transition-all duration-300"
                    >
                        <AiOutlineHome size={18} />
                        Back to Home
                    </button>
                </div>

                {/* Help Text */}
                <p className="text-center text-text-secondary text-sm mt-8">
                    Need help? <Link to="/contact" className="text-brand-orange hover:underline">Contact our support team</Link>
                </p>
            </div>
            <Footer />
        </>
    );
};

export default OrderSuccessPage;
