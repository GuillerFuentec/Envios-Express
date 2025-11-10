"use strict";

const { calculateQuote } = require("../../lib/server/quote");

const buildQuotePayload = (body = {}) => {
  const shipment = body.shipment || {};
  const preferences = body.preferences || {};
  const fallback = body.quoteRequest || {};

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
    paymentMethod: "agency",
    deliveryDate: fallback.deliveryDate ?? shipment.deliveryDate,
    cityCuba: fallback.cityCuba ?? shipment.cityCuba,
  };
};

const postToStrapi = async (payload) => {
  const baseUrl = process.env.STRAPI_API_URL;
  if (!baseUrl) {
    throw new Error("Falta STRAPI_API_URL para crear la orden.");
  }

  const response = await fetch(`${baseUrl}/api/clients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.STRAPI_API_TOKEN
        ? { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error ||
      "No se pudo registrar la orden.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const recaptchaToken = req.body?.recaptchaToken;
    if (!recaptchaToken) {
      return res.status(400).json({ error: "Falta el token de reCAPTCHA." });
    }

    const quote = await calculateQuote({
      ...buildQuotePayload(req.body || {}),
      paymentMethod: "agency",
    });

    const payload = {
      data: {
        client_info: {
          contact: req.body?.contact || {},
          shipment: req.body?.shipment || {},
          preferences: req.body?.preferences || {},
          quote,
          submittedAt: new Date().toISOString(),
        },
      },
      recaptchaToken,
    };

    const response = await postToStrapi(payload);
    const orderId = response?.data?.id || response?.id || null;

    return res.status(200).json({ ok: true, orderId });
  } catch (error) {
    console.error("[api/orders/create]", error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No se pudo crear la orden." });
  }
}
