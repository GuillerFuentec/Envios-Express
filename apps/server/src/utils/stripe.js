"use strict";

const Stripe = require("stripe");

let stripeClient;

const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    strapi.log.warn("No hay stripe secret key configurada");
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2024-06-20",
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

async function verificarEstadoTransaccion(sessionId) {
  const stripe = getStripeClient();

  try {
    strapi.log.info('[stripe] Verificando estado de transaccion', { sessionId });
    if (!stripe) throw new Error("Stripe no configurado (faltan env vars).");
    // Recupera la sesión de Checkout con detalles del PaymentIntent
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: [
        "payment_intent",
        "payment_intent.payment_method",
        "payment_intent.latest_charge",
      ],
    });

    // Recupera los line items (y expande price para monto/moneda)
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      expand: ["data.price"],
    });

    const detallesCargo = session.payment_intent?.latest_charge
      ? {
          id: session.payment_intent.latest_charge.id,
          monto: session.payment_intent.latest_charge.amount,
          estado: session.payment_intent.latest_charge.status,
          metodoPago:
            session.payment_intent.latest_charge.payment_method_details?.type,
          fechaCreacion: new Date(
            session.payment_intent.latest_charge.created * 1000
          ).toISOString(),
        }
      : null;

    const productosComprados = lineItems.data.map((item) => ({
      nombre: item.description,
      cantidad: item.quantity,
      precioUnitario: (item.price?.unit_amount ?? 0) / 100,
      moneda: item.price?.currency ?? session.currency,
    }));

    return {
      idPay: session.id,
      estadoPago: session.payment_status, // 'paid' | 'unpaid' | 'no_payment_required'
      estadoSesion: session.status, // 'complete' | 'expired' | 'open'
      estadoPaymentIntent: session.payment_intent?.status ?? null,
      detallesCliente: {
        email: session.customer_details?.email,
        nombre: session.customer_details?.name,
        telefono: session.customer_details?.phone,
      },
      productosComprados,
      detallesCargo,
      montoTotal: (session.amount_total ?? 0) / 100,
      moneda: session.currency,
      fechaCreacion: new Date(session.created * 1000).toISOString(),
    };
  } catch (error) {
    strapi.log.error('[stripe] Error verificando transaccion', {
      sessionId,
      message: error.message,
      stack: error.stack,
      type: error.type,
      code: error.code,
    });
  }
}

// Crear transferencia con idempotencia para modelo "Separate Charges and Transfers"
async function createTransfer({ destinationAccount, amountCents, currency, sourceTransaction, description, idempotencyKey }) {
  const stripe = getStripeClient();
  if (!stripe) throw new Error('Stripe no configurado (faltan env vars).');

  // 1. Validar formato de cuenta destino
  if (!destinationAccount || !destinationAccount.startsWith('acct_')) {
    throw new Error(`Cuenta destino inválida: ${destinationAccount}. Debe empezar con 'acct_'`);
  }

  // 2. Validar monto mínimo (50 cents USD equivalente)
  const normalizedCurrency = (currency || 'usd').toLowerCase();
  const minimumCents = normalizedCurrency === 'usd' ? 50 : 50; // Ajustar según moneda
  const roundedAmount = Math.round(amountCents);
  
  if (roundedAmount < minimumCents) {
    throw new Error(`Monto demasiado pequeño: ${roundedAmount} cents. Mínimo: ${minimumCents} cents`);
  }

  try {
    // 3. Verificar balance disponible
    const balance = await stripe.balance.retrieve();
    const availableBalance = balance.available.find(b => b.currency === normalizedCurrency)?.amount || 0;
    
    strapi.log.debug('[stripe] Balance disponible:', {
      currency: normalizedCurrency,
      availableAmount: availableBalance,
      requestedAmount: roundedAmount,
      sufficientFunds: availableBalance >= roundedAmount,
    });

    if (availableBalance < roundedAmount) {
      throw new Error(`Fondos insuficientes: disponible ${availableBalance}, solicitado ${roundedAmount}`);
    }

    // 4. Crear transferencia con parámetros correctos
    const transfer = await stripe.transfers.create({
      amount: roundedAmount,
      currency: normalizedCurrency,
      destination: destinationAccount,
      source_transaction: sourceTransaction || undefined,
      description: description || 'Transferencia de plataforma',
    }, {
      idempotencyKey: idempotencyKey || undefined, // Parámetro correcto
    });
    
    strapi.log.info('[stripe] Transferencia creada exitosamente', {
      transferId: transfer.id,
      destination: destinationAccount,
      amount: roundedAmount,
      currency: normalizedCurrency,
      sourceTransaction,
    });
    
    return transfer;
  } catch (error) {
    // 5. Log detallado de errores Stripe
    strapi.log.error('[stripe] Error detallado creando transferencia', {
      // Detalles del error Stripe
      code: error.code,
      type: error.type,
      message: error.message,
      param: error.param,
      statusCode: error.statusCode,
      requestId: error.requestId,
      // Detalles de la solicitud
      destination: destinationAccount,
      amount: roundedAmount,
      currency: normalizedCurrency,
      sourceTransaction,
      idempotencyKey,
    });
    
    throw error;
  }
}

module.exports = {
  getStripeClient,
  toMinorUnit,
  verificarEstadoTransaccion,
  createTransfer,
};
