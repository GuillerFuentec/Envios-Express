"use strict";

const { calculateQuote } = require("../../lib/server/quote");
const { requireRecaptcha } = require("../../lib/server/recaptcha");
const { enforceRateLimit } = require("../../lib/server/rate-limit");

const RECAPTCHA_REQUIRED = process.env.FORCE_QUOTE_RECAPTCHA === "true";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "MActodo no permitido." });
  }

  try {
    const body = req.body || {};
    const { recaptchaToken, ...payload } = body;

    await enforceRateLimit({
      req,
      key: "quote",
      windowMs: Number(process.env.QUOTE_RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.QUOTE_RATE_LIMIT_MAX || 40),
      identifier: payload?.pickupAddressPlaceId,
    });

    if (recaptchaToken) {
      await requireRecaptcha({ token: recaptchaToken, action: "quote" });
    } else if (RECAPTCHA_REQUIRED) {
      const err = new Error("Falta el token de reCAPTCHA.");
      err.status = 400;
      throw err;
    }

    console.log("[api/quote] Request received", {
      weight: payload.weightLbs,
      cashAmount: payload.cashAmount,
      pickup: payload.pickup,
      hasPlaceId: Boolean(payload.pickupAddressPlaceId),
      hasAddress: Boolean(payload.pickupAddress),
      paymentMethod: payload.paymentMethod,
      deliveryDate: payload.deliveryDate,
    });

    const quote = await calculateQuote(payload);

    console.debug("[api/quote] Quote calculated", {
      total: quote.total,
      breakdown: {
        weight: quote.breakdown?.weight?.amount,
        pickup: quote.breakdown?.pickup?.amount,
        cashFee: quote.breakdown?.cashFee?.amount,
      },
      policy: quote.policy,
    });

    return res.status(200).json(quote);
  } catch (error) {
    console.error("[api/quote] Error", {
      message: error.message,
      status: error.status,
      stack: error.stack,
    });
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No se pudo calcular el envA-o." });
  }
}
