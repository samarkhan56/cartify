const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey || !secretKey.startsWith("sk_")) {
    return null;
  }

  return require("stripe")(secretKey);
};

module.exports = getStripeClient;
