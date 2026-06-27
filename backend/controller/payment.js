const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const getStripeClient = require("../utils/stripe");

const parseAmount = (amount) => {
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }
  return parsedAmount;
};

// Process Stripe card payment. Amount is in dollars from the frontend.
router.post(
  "/process",
  catchAsyncErrors(async (req, res, next) => {
    const stripe = getStripeClient();
    if (!stripe) {
      return next(
        new ErrorHandler(
          "Stripe is currently unavailable. Please choose another payment method.",
          503
        )
      );
    }

    const amountInDollars = parseAmount(req.body.amount);
    if (!amountInDollars) {
      return next(new ErrorHandler("Invalid payment amount.", 400));
    }

    let myPayment;
    try {
      myPayment = await stripe.paymentIntents.create({
        amount: Math.round(amountInDollars * 100),
        currency: "usd",
        metadata: {
          company: "Cartify",
        },
      });
    } catch (error) {
      if (error?.type === "StripeAuthenticationError") {
        return next(
          new ErrorHandler(
            "Stripe is not configured correctly. Replace the expired test API keys and restart the backend.",
            503
          )
        );
      }

      throw error;
    }

    res.status(200).json({
      success: true,
      client_secret: myPayment.client_secret,
    });
  })
);

router.get(
  "/stripeapikey",
  catchAsyncErrors(async (req, res) => {
    const publicKey = process.env.STRIPE_PUBLIC_KEY;
    res.status(200).json({
      stripeApikey: publicKey && publicKey.startsWith("pk_") ? publicKey : null,
    });
  })
);

module.exports = router;
