"use strict";

const { calculateQuote } = require("../../../lib/server/quote");
const { getStripeClient } = require("../../../lib/server/stripe");
const { requireRecaptcha } = require("../../../lib/server/recaptcha");

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

const buildSuccessUrl = (base) => {
  if (!base) {
    return "http://localhost:3000/funnel?status=success&session_id={CHECKOUT_SESSION_ID}";
  }
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}session_id={CHECKOUT_SESSION_ID}`;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const stripe = getStripeClient();
    const body = req.body || {};
    const { recaptchaToken, ...payload } = body;

    await requireRecaptcha({
      token: recaptchaToken,
      action: "checkout",
    });

    const contact = payload?.contact || {};
    const quotePayload = buildQuotePayload(payload);
    const quote = await calculateQuote(quotePayload);

    const lineItems = buildLineItems(quote);
    if (!lineItems.length) {
      throw new Error("No se pudieron generar las líneas del checkout.");
    }

    const origin =
      req.headers.origin ||
      process.env.PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const successUrl =
      process.env.STRIPE_SUCCESS_URL ||
      `${origin}/funnel?status=success`;
    const cancelUrl =
      process.env.STRIPE_CANCEL_URL || `${origin}/funnel?status=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: contact.email || undefined,
      success_url: buildSuccessUrl(successUrl),
      cancel_url: cancelUrl,
      metadata: {
        payment_origin: "web-funnel",
        contact_name: contact.name || "",
        contact_phone: contact.phone || "",
        city_cuba: quotePayload.cityCuba || "",
        content_type: quotePayload.contentType || "",
        cash_amount: quotePayload.cashAmount || "",
        pickup: quotePayload.pickup ? "true" : "false",
        delivery_date: quotePayload.deliveryDate || "",
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("[api/payments/checkout]", error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No se pudo iniciar el checkout." });
  }
}
