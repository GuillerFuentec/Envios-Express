"use strict";

const { calculateQuote } = require("../../../lib/server/quote");

const normalizeBaseUrl = (value = "") => {
  const trimmed = value.replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
};

const postToStrapi = async (payload) => {
  const baseUrl = normalizeBaseUrl(
    process.env.STRAPI_WEB_API_URL || process.env.STRAPI_API_URL
  );
  if (!baseUrl) {
    throw new Error("Falta STRAPI_WEB_API_URL para confirmar la orden.");
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
    error.response = data;
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
    const { sessionId, payload } = req.body || {};
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
          submittedAt: new Date().toISOString(),
          status: "paid_online",
        },
      },
    };

    const response = await postToStrapi(clientPayload);
    const orderId = response?.data?.id || response?.id || null;

    return res.status(200).json({ ok: true, orderId });
  } catch (error) {
    console.error("[api/orders/confirm]", error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No se pudo confirmar la orden." });
  }
}
