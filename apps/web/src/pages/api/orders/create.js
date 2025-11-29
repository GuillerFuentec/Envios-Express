"use strict";

const { calculateQuote } = require("../../../lib/server/quote");
const { requireRecaptcha } = require("../../../lib/server/recaptcha");

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

const normalizeBaseUrl = (value = "") => {
  const trimmed = value.replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
};

const postToStrapi = async (payload) => {
  const baseUrl = normalizeBaseUrl(
    process.env.STRAPI_WEB_API_URL || process.env.STRAPI_API_URL || process.env.AGENCY_API_URL
  );
  if (!baseUrl) {
    throw new Error("Falta STRAPI_WEB_API_URL/AGENCY_API_URL para crear la orden.");
  }

  const tokenPresent = Boolean(process.env.AGENCY_TOKEN);
  console.info("[api/orders/create] Enviando orden a Strapi", {
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
    console.error("[api/orders/create] Error creando cliente en Strapi", {
      status: response.status,
      statusText: response.statusText,
      data,
    });
    const message = data?.error?.message || data?.error || "No se pudo registrar la orden.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  console.info("[api/orders/create] Cliente creado en Strapi", {
    id: data?.data?.id || data?.id || null,
  });
  return data;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const body = req.body || {};
    const { recaptchaToken, ...payload } = body;

    await requireRecaptcha({
      token: recaptchaToken,
      action: "order",
    });

    const quote = await calculateQuote({
      ...buildQuotePayload(payload),
      paymentMethod: "agency",
    });

    const contact = body?.contact || {};
    const clientPayload = {
      data: {
        name: contact.name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        client_info: {
          contact,
          shipment: body?.shipment || {},
          preferences: body?.preferences || {},
          quote,
          submittedAt: new Date().toISOString(),
        },
      },
    };

    const response = await postToStrapi(clientPayload);
    const orderId = response?.data?.id || response?.id || null;

    return res.status(200).json({ ok: true, orderId });
  } catch (error) {
    console.error("[api/orders/create]", error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No se pudo crear la orden." });
  }
}
