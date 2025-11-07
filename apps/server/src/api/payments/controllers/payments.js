'use strict';

const { getStripeClient, toMinorUnit } = require('../../../utils/stripe');

const sanitizeMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  return Object.entries(metadata).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }

    const stringValue =
      typeof value === 'string' || typeof value === 'number'
        ? String(value).slice(0, 500)
        : JSON.stringify(value).slice(0, 500);

    acc[key] = stringValue;
    return acc;
  }, {});
};

module.exports = {
  async createIntent(ctx) {
    const stripe = getStripeClient();
    if (!stripe) {
      ctx.throw(503, 'Stripe no esta configurado.');
    }

    const {
      amount = 9.99,
      currency = process.env.STRIPE_DEFAULT_CURRENCY || 'usd',
      email,
      metadata = {},
      description,
    } = ctx.request.body || {};

    const amountInMinorUnit = toMinorUnit(amount);
    if (!amountInMinorUnit) {
      return ctx.badRequest('Monto invalido.');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInMinorUnit,
        currency: String(currency || 'usd').toLowerCase(),
        receipt_email: email || undefined,
        description:
          description || process.env.STRIPE_PAYMENT_DESCRIPTION || 'Pago Paqueteria',
        metadata: {
          origin: 'web-funnel',
          ...sanitizeMetadata(metadata),
        },
        automatic_payment_methods: { enabled: true },
      });

      ctx.body = { clientSecret: paymentIntent.client_secret };
    } catch (error) {
      strapi.log.error('[stripe] Error al crear PaymentIntent', error);
      ctx.throw(500, 'No pudimos iniciar el pago.');
    }
  },
};
