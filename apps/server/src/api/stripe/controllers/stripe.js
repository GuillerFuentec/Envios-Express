'use strict';

const { getStripeClient, verificarEstadoTransaccion, createTransfer } = require('../../../utils/stripe');
const { sendReceiptEmail } = require('../../../utils/resend');
const { enqueueJob } = require('../../../utils/job-queue');

// Idempotencia simple: evitar enviar múltiples recibos por el mismo PaymentIntent
// Usa almacenamiento de Strapi si está disponible; fallback a memoria.
const memorySent = new Set();

const getStore = () => {
  if (global.strapi && typeof global.strapi.store === 'function') {
    return global.strapi.store({ type: 'plugin', name: 'payments' });
  }
  return null;
};

const hasSentReceipt = async (intentId) => {
  const store = getStore();
  if (!store) {
    return memorySent.has(intentId);
  }
  const existing = await store.get({ key: `receipt:${intentId}` });
  return Boolean(existing && existing.sent);
};

const markSentReceipt = async (intentId) => {
  const store = getStore();
  if (!store) {
    memorySent.add(intentId);
    return;
  }
  await store.set({ key: `receipt:${intentId}`, value: { sent: true, ts: Date.now() } });
};

// Busca el Checkout Session por PaymentIntent id
const findSessionIdByPaymentIntent = async (stripe, paymentIntentId) => {
  const list = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
  return list?.data?.[0]?.id || null;
};

// Busca el registro client con el sessionId para obtener datos de billing
const findClientBySessionId = async (sessionId) => {
  if (!sessionId) return null;
  
  try {
    const clients = await strapi.entityService.findMany('api::client.client', {
      filters: {
        client_info: {
          sessionId: { $eq: sessionId },
        },
      },
      limit: 1,
    });
    
    return clients?.[0] || null;
  } catch (error) {
    strapi.log.warn('[stripe] Error buscando cliente por sessionId', { sessionId, error: error.message });
    return null;
  }
};

// Envía recibo con reintentos exponenciales y idempotencia por PaymentIntent.
const sendReceiptForIntent = async ({ stripe = getStripeClient(), paymentIntent }) => {
  const intentId = paymentIntent.id;
  if (await hasSentReceipt(intentId)) {
    strapi.log.debug('[stripe] Recibo ya enviado; omitimos', { intentId });
    return;
  }

  // Obtener Checkout Session para armar recibo
  const sessionId = await findSessionIdByPaymentIntent(stripe, intentId);
  strapi.log.debug('[stripe] SessionId encontrado:', { intentId, sessionId });
  if (!sessionId) {
    strapi.log.warn('[stripe] No se encontró Checkout Session para intent', { intentId });
    return; // No enviamos sin contexto de sesión
  }

  const estado = await verificarEstadoTransaccion(sessionId);
  if (!estado || estado.estadoPago !== 'paid') {
    strapi.log.debug('[stripe] Intent aún no pagado; diferimos recibo', { intentId, estadoPago: estado?.estadoPago });
    return; // El webhook volverá a llamar en eventos subsiguientes
  }

  const {
    montoTotal,
    moneda,
    estadoPago,
    estadoSesion,
    productosComprados,
    detallesCargo,
    detallesCliente,
  } = estado;

  const clienteEmail = (detallesCliente?.email || '').trim();
  if (!clienteEmail) {
    strapi.log.warn('[stripe] No hay email del cliente para recibo', { intentId });
    return;
  }

  const formatCurrency = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);

  const productosHtml = productosComprados?.length
    ? `<h2 style="margin:16px 0 8px;">Productos</h2><ul style="padding-left:18px;">${productosComprados
        .map((p) => `<li><strong>${p.nombre} x${p.cantidad}:</strong> ${formatCurrency(p.precioUnitario * p.cantidad, (moneda || 'USD').toUpperCase())}</li>`)
        .join('')}</ul>`
    : '';

  const cargoHtml = detallesCargo
    ? `<h2 style="margin:16px 0 8px;">Cargo</h2><ul style="padding-left:18px;"><li><strong>ID Cargo:</strong> ${detallesCargo.id}</li><li><strong>Estado:</strong> ${detallesCargo.estado}</li><li><strong>Método:</strong> ${detallesCargo.metodoPago || '-'}</li><li><strong>Fecha:</strong> ${detallesCargo.fechaCreacion}</li></ul>`
    : '';

  const totalHtml = `<h2 style="margin:16px 0 8px;">Total</h2><ul style="padding-left:18px;"><li><strong>Monto total:</strong> ${formatCurrency(montoTotal, (moneda || 'USD').toUpperCase())}</li><li><strong>Estado pago:</strong> ${estadoPago}</li><li><strong>Estado sesión:</strong> ${estadoSesion}</li></ul>`;

  const subject = `Recibo de pago (Intent ${intentId})`;
  const html = `<h1 style="margin:0 0 12px;">Recibo de pago</h1>${totalHtml}${productosHtml}${cargoHtml}`;
  const productosText = (productosComprados || [])
    .map((p) => `  * ${p.nombre} x${p.cantidad} = ${formatCurrency(p.precioUnitario * p.cantidad, (moneda || 'USD').toUpperCase())}`)
    .join('\n');
  const cargoText = detallesCargo
    ? [`ID Cargo: ${detallesCargo.id}`, `Estado Cargo: ${detallesCargo.estado}`, `Método pago: ${detallesCargo.metodoPago}`, `Fecha: ${detallesCargo.fechaCreacion}`].join('\n')
    : '';
  const text = `Recibo de pago\nMonto total: ${formatCurrency(montoTotal, (moneda || 'USD').toUpperCase())}\nEstado pago: ${estadoPago}\nEstado sesión: ${estadoSesion}\nProductos:\n${productosText}${cargoText ? '\n' + cargoText : ''}`;

  // Reintentos basados en backoff si falla Resend
  const maxAttempts = 4;
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      await sendReceiptEmail({ to: clienteEmail, subject, html, text });
      await markSentReceipt(intentId);
      strapi.log.info('[stripe] Recibo enviado (webhook)', { intentId, clienteEmail });
      break; // Salir del loop de reintentos
    } catch (err) {
      attempt += 1;
      const delayMs = Math.min(30000, 1000 * 2 ** attempt);
      strapi.log.warn('[stripe] Falló envío de recibo; reintentando', { intentId, attempt, delayMs, error: err.message });
      if (attempt < maxAttempts) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  if (attempt >= maxAttempts) {
    strapi.log.error('[stripe] No se pudo enviar recibo tras reintentos', { intentId });
  }

  // Procesar transferencia a cuenta conectada (Separate Charges and Transfers)
  const clientRecord = await findClientBySessionId(sessionId);
  strapi.log.debug('[stripe] Cliente encontrado:', { sessionId, clientId: clientRecord?.id, hasClientInfo: !!clientRecord?.client_info });
  
  const billing = clientRecord?.client_info?.billing || {};
  const destinationAccount = process.env.STRIPE_CONNECT_ACCOUNT_ID;
  const destinationAmountCents = billing.destinationAmountCents;
  
  strapi.log.debug('[stripe] Datos de transferencia:', { 
    destinationAccount, 
    destinationAmountCents, 
    hasDestination: !!destinationAccount,
    hasAmount: !!destinationAmountCents,
    amountValid: destinationAmountCents > 0,
    accountFormatValid: destinationAccount && destinationAccount.startsWith('acct_')
  });
  
  if (destinationAccount && destinationAmountCents && destinationAmountCents > 0) {
    // Validación adicional antes de intentar transferencia
    if (!destinationAccount.startsWith('acct_')) {
      strapi.log.error('[stripe] Formato de cuenta destino inválido', {
        intentId,
        destinationAccount,
        expectedFormat: 'acct_xxxxxxxxxx'
      });
      return; // No intentar transferencia con formato inválido
    }
    try {
      const sourceTransaction = paymentIntent.latest_charge || paymentIntent.charges?.data?.[0]?.id;
      const transfer = await createTransfer({
        destinationAccount,
        amountCents: destinationAmountCents,
        currency: moneda,
        sourceTransaction,
        description: `Pago agencia - Intent ${intentId}`,
        idempotencyKey: `transfer_${intentId}`, // Idempotencia por PaymentIntent
      });
      
      // Opcional: guardar referencia del transfer en el client record
      if (clientRecord?.id) {
        await strapi.entityService.update('api::client.client', clientRecord.id, {
          data: {
            client_info: {
              ...clientRecord.client_info,
              billing: {
                ...billing,
                transferId: transfer.id,
                transferredAt: new Date().toISOString(),
              },
            },
          },
        });
      }
      
      strapi.log.info('[stripe] Transferencia completada', {
        intentId,
        transferId: transfer.id,
        destinationAccount,
        amountCents: destinationAmountCents,
      });
    } catch (transferError) {
      strapi.log.error('[stripe] Error creando transferencia', {
        intentId,
        destinationAccount,
        amountCents: destinationAmountCents,
        error: transferError.message,
      });
      // No lanzar error; el recibo ya se envió, la transferencia se puede reintentar manualmente
    }
  } else {
    strapi.log.debug('[stripe] Sin datos de transferencia; omitiendo', {
      intentId,
      hasDestination: Boolean(destinationAccount),
      hasAmount: Boolean(destinationAmountCents),
      amountCents: destinationAmountCents,
    });
  }
};

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
          strapi.log.debug(`[stripe] PaymentIntent completo:`, JSON.stringify(paymentIntent, null, 2));
          // concurrency: offload email + transfer processing away from webhook response
          enqueueJob('send-receipt', async () => {
            const client = getStripeClient();
            if (!client) {
              throw new Error('Stripe no esta configurado.');
            }
            await sendReceiptForIntent({ stripe: client, paymentIntent });
          });
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
