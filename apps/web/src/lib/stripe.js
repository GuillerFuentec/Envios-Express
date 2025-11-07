import { loadStripe } from '@stripe/stripe-js';
import { getStripePublicKey } from '../../js/env.js';

let stripePromise;

export const getStripe = () => {
  if (!stripePromise) {
    const key = getStripePublicKey();
    if (!key) {
      throw new Error('Falta la clave publica de Stripe (VITE_STRIPE_PUBLISHABLE_KEY).');
    }
    stripePromise = loadStripe(key, { apiVersion: '2024-06-20' });
  }
  return stripePromise;
};
