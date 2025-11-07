'use strict';

const Stripe = require('stripe');

let stripeClient;

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    });
  }
  return stripeClient;
};

const toMinorUnit = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value * 100);
};

module.exports = {
  getStripeClient,
  toMinorUnit,
};
