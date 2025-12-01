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

const pickReceiptEmail = (payload = {}) => {
  const candidates = [
    payload.receipt_email,
    payload.receiptEmail,
    payload.email,
    payload.contact?.email,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed.toLowerCase();
      }
    }
  }
  return '';
};

module.exports = {
  async createIntent(ctx) {
    if (process.env.PAYMENTS_MOCK_MODE === 'true') {
      // perf: mock mode to bypass Stripe during load tests
      ctx.body = { clientSecret: `pi_mock_${Date.now()}_secret_mock` };
      return;
    }

    const stripe = getStripeClient();
    if (!stripe) {
      ctx.throw(503, 'Stripe no esta configurado.');
    }

    const body = ctx.request.body || {};
    const {
      amount = 9.99,
      currency = process.env.STRIPE_DEFAULT_CURRENCY || 'usd',
      metadata = {},
      description,
    } = body;

    const receiptEmail = pickReceiptEmail(body);
    if (!receiptEmail) {
      return ctx.badRequest('Necesitamos un correo valido para enviar el recibo.');
    }

    const amountInMinorUnit = toMinorUnit(amount);
    if (!amountInMinorUnit) {
      return ctx.badRequest('Monto invalido.');
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInMinorUnit,
        currency: String(currency || 'usd').toLowerCase(),
        receipt_email: receiptEmail,
        description:
          description || process.env.STRIPE_PAYMENT_DESCRIPTION || 'Pago Paqueteria',
        metadata: {
          origin: 'web-funnel',
          contact_email: receiptEmail,
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
