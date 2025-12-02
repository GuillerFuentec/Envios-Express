"use strict";

const { calculateQuote } = require("../../../lib/server/quote");
const { getStripeClient } = require("../../../lib/server/stripe");
const { requireRecaptcha } = require("../../../lib/server/recaptcha");
const { enforceRateLimit } = require("../../../lib/server/rate-limit");

const quietLogs = process.env.QUIET_LOGS === "true" || process.env.LOAD_TEST_MODE === "true";
const logInfo = (...args) => {
  if (!quietLogs) console.info(...args);
};
const logWarn = (...args) => {
  if (!quietLogs) console.warn(...args);
};
const logError = (...args) => console.error(...args);

const toMinorUnit = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.round(amount * 100);
};

const buildQuotePayload = (body = {}) => {
  const fallback = body?.quoteRequest || {};
  const shipment = body?.shipment || {};
  const preferences = body?.preferences || {};

  const pickupFlag =
    fallback.pickup ??
    preferences.pickup ??
    shipment.pickup ??
    false;

  return {
    weightLbs: fallback.weightLbs ?? shipment.weightLbs,
    cashAmount: fallback.cashAmount ?? shipment.cashAmount,
    pickup: pickupFlag,
    pickupAddressPlaceId:
      fallback.pickupAddressPlaceId ??
      preferences.pickupAddressPlaceId,
    contentType: fallback.contentType ?? shipment.contentType,
    paymentMethod: "online",
    deliveryDate: fallback.deliveryDate ?? shipment.deliveryDate,
    cityCuba: fallback.cityCuba ?? shipment.cityCuba,
  };
};

const buildLineItems = (quote) => {
  const items = [];

  const pushItem = (name, amount, description) => {
    const unitAmount = toMinorUnit(amount);
    if (!unitAmount) {
      return;
    }
    items.push({
      quantity: 1,
      price_data: {
        currency: (quote.currency || "USD").toLowerCase(),
        unit_amount: unitAmount,
        product_data: {
          name,
          description,
        },
      },
    });
  };

  pushItem(
    quote.breakdown?.weight?.label || "Peso",
    quote.breakdown?.weight?.amount,
    quote.breakdown?.weight?.label
  );

  if (quote.breakdown?.pickup?.amount) {
    pushItem(
      "Pick-up",
      quote.breakdown.pickup.amount,
      `Distancia aproximada: ${quote.breakdown.pickup.distanceMiles || 0} mi`
    );
  }

  if (quote.breakdown?.cashFee?.amount) {
    pushItem("Fee (Dinero en efectivo)", quote.breakdown.cashFee.amount);
  }

  if (quote.breakdown?.processingFee?.amount) {
    pushItem(
      "Tarifa de procesamiento",
      quote.breakdown.processingFee.amount
    );
  }

  return items;
};

const buildSuccessUrl = (origin) => {
  const base =
    process.env.STRIPE_SUCCESS_URL || `${origin}/funnel/status/success`;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}session_id={CHECKOUT_SESSION_ID}`;
};

const buildCancelUrl = (origin) =>
  process.env.STRIPE_CANCEL_URL || `${origin}/funnel/status/cancel`;

const pickReceiptEmail = (contact = {}, payload = {}) => {
  const candidates = [
    contact.email,
    payload.receipt_email,
    payload.receiptEmail,
    payload.email,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed.toLowerCase();
      }
    }
  }
  return "";
};

const isStripeMock = () => false;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

const handler = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  console.info("[api/payments/checkout] request", {
    url: req.url,
    origin: req.headers.origin,
    referer: req.headers.referer,
  });

  try {
    await enforceRateLimit({
      req,
      key: "checkout",
      windowMs: Number(process.env.CHECKOUT_RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.CHECKOUT_RATE_LIMIT_MAX || 10),
      identifier: req.body?.contact?.email,
    });
    const stripe = getStripeClient();
    const body = req.body || {};
    const { recaptchaToken, ...payload } = body;

    await requireRecaptcha({
      token: recaptchaToken,
      action: "checkout",
    });

    const contact = payload?.contact || {};
    const receiptEmail = pickReceiptEmail(contact, payload);
    if (!receiptEmail) {
      const error = new Error("Necesitamos un correo valido para enviar el recibo.");
      error.status = 400;
      throw error;
    }
    const normalizedContact = { ...contact, email: receiptEmail };
    const quotePayload = buildQuotePayload(payload);
    const quote = await calculateQuote(quotePayload);

    const lineItems = buildLineItems(quote);
    if (!lineItems.length) {
      throw new Error("No se pudieron generar las líneas del checkout.");
    }

    const destinationAccount =
      process.env.STRIPE_CONNECT_DESTINATION ||
      process.env.STRIPE_CONNECT_ACCOUNT_ID ||
      "";

    const origin =
      req.headers.origin ||
      process.env.PUBLIC_SITE_URL ||
      "http://localhost:3000";

    // Fee calculations
    const amountTotalCents = Math.round((quote?.total || 0) * 100);
    const stripeFeePercent = Number(process.env.STRIPE_PROC_PERCENT || 2.9) / 100;
    const stripeFeeFixed = Math.round(
      Number(process.env.STRIPE_PROC_FIXED || 0.3) * 100
    );
    const stripeFeeCents = Math.max(
      0,
      Math.round(amountTotalCents * stripeFeePercent + stripeFeeFixed)
    );
    const platformRate =
      Number(process.env.PLATFORM_FEE_PERCENT || process.env.PLATFORM_FEE_RATE || 2.3) /
      100;
    const platformFeeCents = Math.max(
      110, // mínimo $1.10
      Math.round((amountTotalCents - stripeFeeCents) * platformRate)
    );
    const destinationAmountCents = Math.max(
      0,
      amountTotalCents - stripeFeeCents - platformFeeCents
    );

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        customer_email: receiptEmail,
        payment_intent_data: {
            receipt_email: receiptEmail,
            // No usamos transfer_data para que el cobro quede en la cuenta de plataforma
            // y luego se transfiera manualmente al conectado.
            application_fee_amount: undefined,
            transfer_data: undefined,
            metadata: {
              platform_fee_amount: platformFeeCents,
              destination_account: destinationAccount,
              contact_name: normalizedContact.name || "",
              contact_phone: normalizedContact.phone || "",
              contact_email: receiptEmail,
              sms_consent: contact.smsConsent ? "true" : "false",
              city_cuba: quotePayload.cityCuba || "",
              content_type: quotePayload.contentType || "",
              cash_amount: quotePayload.cashAmount || "",
              pickup: quotePayload.pickup ? "true" : "false",
              delivery_date: quotePayload.deliveryDate || "",
              weight_lbs: quotePayload.weightLbs || "",
              // el ID de sesión se inyecta en el webhook desde el evento de checkout.session.completed
            },
          },
          success_url: buildSuccessUrl(origin),
          cancel_url: buildCancelUrl(origin),
          metadata: {
            payment_origin: "web-funnel",
            contact_name: normalizedContact.name || "",
            contact_phone: normalizedContact.phone || "",
            contact_email: receiptEmail,
            sms_consent: contact.smsConsent ? "true" : "false",
            city_cuba: quotePayload.cityCuba || "",
            content_type: quotePayload.contentType || "",
            cash_amount: quotePayload.cashAmount || "",
            pickup: quotePayload.pickup ? "true" : "false",
            delivery_date: quotePayload.deliveryDate || "",
            weight_lbs: quotePayload.weightLbs || "",
            platform_fee_amount: platformFeeCents,
            destination_account: destinationAccount,
          },
        });

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      endpoint: "payments/checkout",
      debugFees: {
        amountTotalCents,
        stripeFeeCents,
        platformFeeCents,
        destinationAmountCents,
      },
    });
  } catch (error) {
    logError("[api/payments/checkout]", error);
    if (error?.raw) {
      logError("[api/payments/checkout] raw", error.raw);
    }
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No se pudo iniciar el checkout." });
  }
};

export default handler;
