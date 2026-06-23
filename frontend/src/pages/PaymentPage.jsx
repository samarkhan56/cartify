import React, { useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";
import CheckoutSteps from "../components/Checkout/CheckoutSteps";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import Payment from "../components/Payment/Payment.jsx";
import { server } from "../server";

const PaymentPage = () => {
  const [stripeApiKey, setStripeApiKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStripeKey = async () => {
      try {
        const { data } = await axios.get(`${server}/payment/stripeapikey`, {
          withCredentials: true,
        });
        const key = data?.stripeApikey;
        setStripeApiKey(key && key.startsWith("pk_") ? key : null);
      } catch {
        setStripeApiKey(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadStripeKey();
  }, []);

  const stripePromise = useMemo(
    () => (stripeApiKey ? loadStripe(stripeApiKey) : null),
    [stripeApiKey]
  );

  const paymentContent = stripePromise ? (
    <Elements stripe={stripePromise}>
      <Payment isStripeAvailable />
    </Elements>
  ) : (
    <Payment isStripeAvailable={false} />
  );

  return (
    <div className="w-full min-h-screen bg-[#f6f9fc]">
      <Header />
      <br />
      <br />
      <CheckoutSteps active={2} />
      {isLoading ? (
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F97316] mx-auto mb-4" />
            <p className="text-[#6B7280]">Loading payment gateways...</p>
          </div>
        </div>
      ) : (
        paymentContent
      )}
      <br />
      <br />
      <Footer />
    </div>
  );
};

export default PaymentPage;
