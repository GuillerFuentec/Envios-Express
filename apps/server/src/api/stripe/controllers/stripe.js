'use strict';

const { getStripeClient } = require('../../../utils/stripe');

const getRawBody = (ctx) => {
  const raw = ctx.request.body && ctx.request.body[Symbol.for('unparsedBody')];
  if (!raw) {
    ctx.throw(400, 'Cuerpo del webhook no disponible.');
  }
  return raw;
};

module.exports = {
  async webhook(ctx) {
    const stripe = getStripeClient();
    if (!stripe) {
      ctx.throw(503, 'Stripe no esta configurado.');
    }

    const signature = ctx.request.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
      if (!signature || !webhookSecret) {
        ctx.throw(400, 'No se proporciono firma o secreto de webhook.');
      }
      const rawBody = getRawBody(ctx);
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      strapi.log.error('[stripe] Webhook invalido', error);
      ctx.throw(400, 'Firma de webhook invalida.');
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          strapi.log.info(`[stripe] Pago confirmado ${paymentIntent.id}`);
          // TODO: persistir en una coleccion o actualizar orden
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          strapi.log.warn(
            `[stripe] Pago fallido ${paymentIntent.id}: ${
              paymentIntent.last_payment_error?.message || 'error desconocido'
            }`
          );
          break;
        }
        default:
          strapi.log.debug(`[stripe] Evento ${event.type} recibido.`);
      }
    } catch (error) {
      strapi.log.error('[stripe] Error al procesar webhook', error);
      ctx.throw(500, 'Error interno al manejar el webhook.');
    }

    ctx.body = { received: true };
  },
};
