"use strict";

const Stripe = require("stripe");

let stripeClient;

const getStripeClient = () => {
  if (stripeClient) {
    return stripeClient;
  }
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY para crear la sesión de pago.");
  }
  stripeClient = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
  });
  return stripeClient;
};

module.exports = {
  getStripeClient,
};
