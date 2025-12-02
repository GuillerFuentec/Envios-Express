"use strict";

const { calculateQuote } = require("../../../lib/server/quote");
const { getStripeClient } = require("../../../lib/server/stripe");
const { enforceRateLimit } = require("../../../lib/server/rate-limit");
const { makeLogger } = require("../../../lib/server/logger");

const normalizeBaseUrl = (value = "") => {
  const trimmed = value.replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
};

const getProcessingConfig = () => {
  const percent = Number(process.env.STRIPE_PROCESSING_PERCENT || 0.029);
  const fixed = Number(process.env.STRIPE_PROCESSING_FIXED || 0.3);
  return { percent, fixed };
};

const computeStripeFeeCents = (amountCents) => {
  if (typeof amountCents !== "number" || Number.isNaN(amountCents)) {
    return 0;
  }
  const { percent, fixed } = getProcessingConfig();
  return Math.max(0, Math.round(amountCents * percent + fixed * 100));
};

const computePlatformFeeCents = (amountCents, stripeFeeCents) => {
  if (typeof amountCents !== "number" || Number.isNaN(amountCents)) {
    return 0;
  }
  const rate =
    Number(process.env.PLATFORM_FEE_PERCENT || process.env.PLATFORM_FEE_RATE) /
      100 || 0.023; // 2.3% por defecto
  const base = amountCents - (stripeFeeCents || 0);
  return Math.max(110, Math.round(base * rate)); // mínimo $1.10
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

const postToStrapi = async (payload) => {
  const baseUrl = normalizeBaseUrl(
    process.env.STRAPI_WEB_API_URL || process.env.STRAPI_API_URL || process.env.AGENCY_API_URL
  );
  if (!baseUrl) {
    throw new Error("Falta STRAPI_WEB_API_URL/AGENCY_API_URL para confirmar la orden.");
  }

  const tokenPresent = Boolean(process.env.AGENCY_TOKEN);
  console.info("[api/orders/confirm] Enviando cliente a Strapi", {
    baseUrl,
    hasToken: tokenPresent,
    contactEmail: payload?.data?.client_info?.contact?.email || "",
  });

  const response = await fetch(`${baseUrl}/api/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.AGENCY_TOKEN ? { Authorization: `Bearer ${process.env.AGENCY_TOKEN}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("[api/orders/confirm] Error creando cliente en Strapi", {
      status: response.status,
      statusText: response.statusText,
      data,
    });
    const message =
      data?.error?.message ||
      data?.error ||
      "No se pudo registrar la orden.";
    const error = new Error(message);
    error.status = response.status;
    error.response = data;
    throw error;
  }

  console.info("[api/orders/confirm] Cliente creado en Strapi", {
    id: data?.data?.id || data?.id || null,
  });

  return data;
};

export default async function handler(req, res) {
  const startedAt = Date.now();
  const logger = makeLogger("api/orders/confirm");
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const stripe = getStripeClient();
    const { sessionId, payload } = req.body || {};
    await enforceRateLimit({
      req,
      key: "order-confirm",
      windowMs: Number(process.env.ORDER_CONFIRM_RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.ORDER_CONFIRM_RATE_LIMIT_MAX || 30),
      identifier: sessionId || payload?.contact?.email,
    });
    if (!sessionId) {
      return res.status(400).json({ error: "Falta sessionId." });
    }
    const contact = payload?.contact || {};
    const shipment = payload?.shipment || {};
    const preferences = payload?.preferences || {};
    const quoteInput = payload?.quote;
    const quoteRequest = payload?.quoteRequest;

    const quote =
      quoteInput ||
      (quoteRequest
        ? await calculateQuote({
            ...quoteRequest,
            paymentMethod: "online",
          })
        : null);

    // Recuperar la Checkout Session para derivar billing y datos de transferencia
    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent"],
      });
    } catch (err) {
      console.error("[api/orders/confirm] No se pudo recuperar la session de Stripe", err);
      const status = err?.statusCode || 502;
      return res
        .status(status)
        .json({ error: "No se pudo validar el pago en Stripe." });
    }

    const md = stripeSession?.metadata || {};
    const paymentIntent = stripeSession?.payment_intent;
    const amountTotalCents =
      typeof stripeSession?.amount_total === "number"
        ? stripeSession.amount_total
        : undefined;
    const stripeFeeCents = computeStripeFeeCents(amountTotalCents || 0);
    const platformFeeCents = md.platform_fee_amount
      ? Number(md.platform_fee_amount)
      : computePlatformFeeCents(amountTotalCents, stripeFeeCents);
    const destinationAccount =
      md.destination_account ||
      paymentIntent?.transfer_data?.destination ||
      process.env.STRIPE_CONNECT_ACCOUNT_ID ||
      "";
    const destinationAmountCents =
      typeof amountTotalCents === "number"
        ? amountTotalCents - (platformFeeCents || 0) - stripeFeeCents
        : undefined;

    const clientPayload = {
      data: {
        name: contact.name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        client_info: {
          contact,
          shipment,
          preferences,
          quote,
          sessionId,
          billing: {
            amountTotalCents,
            currency: stripeSession?.currency
              ? stripeSession.currency.toUpperCase()
              : undefined,
            platformFeeCents,
            stripeFeeCents,
            destinationAccount,
            destinationAmountCents,
          },
          stripe: {
            sessionId: stripeSession?.id || sessionId,
            paymentIntentId:
              stripeSession?.payment_intent?.id ||
              stripeSession?.payment_intent ||
              "",
          },
          submittedAt: new Date().toISOString(),
          status: "paid_online",
        },
      },
    };

    // Log resumido del payload que se envía a Strapi para facilitar depuración
    console.log("[api/orders/confirm] clientPayload resumen", {
      sessionId,
      destinationAccount,
      destinationAmountCents,
      amountTotalCents,
      platformFeeCents,
      stripeFeeCents,
      hasQuote: Boolean(quote),
    });

    const response = await postToStrapi(clientPayload);
    const orderId = response?.data?.id || response?.id || null;

    // Procesar transferencia automática si está configurado
    try {
      console.log("[api/orders/confirm] Iniciando transferencia automatica", {
        sessionId,
        orderId,
        destinationAccount,
        destinationAmountCents,
      });
      const transferResponse = await fetch(`${normalizeBaseUrl(process.env.STRAPI_WEB_API_URL || process.env.STRAPI_API_URL || process.env.AGENCY_API_URL)}/api/payments/process-transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.AGENCY_TOKEN
            ? { Authorization: `Bearer ${process.env.AGENCY_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({ sessionId, clientId: orderId }),
      });

      if (transferResponse.ok) {
        const transferBody = await transferResponse.text().catch(() => "");
        console.log(`[api/orders/confirm] Transferencia procesada para orden ${orderId}`, {
          status: transferResponse.status,
          body: transferBody,
        });
      } else {
        // No es crítico si falla - se puede reintentar manualmente
        const transferErrorText = await transferResponse.text().catch(() => "unknown error");
        console.warn(`[api/orders/confirm] Falló transferencia automática para orden ${orderId}:`, {
          status: transferResponse.status,
          statusText: transferResponse.statusText,
          body: transferErrorText,
          sessionId,
        });
      }
    } catch (transferError) {
      // Log pero no fallar la confirmación de orden
      console.warn(`[api/orders/confirm] Error procesando transferencia automática:`, transferError.message);
    }

    const durationMs = Date.now() - startedAt;
    logger.end("completado", { orderId, durationMs });
    return res.status(200).json({ ok: true, orderId });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logger.error("error", { error: error.message, durationMs, stack: error.stack });
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No se pudo confirmar la orden." });
  }
}
