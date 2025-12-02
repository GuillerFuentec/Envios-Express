"use strict";

const { calculateQuote } = require("../../lib/server/quote");
const { requireRecaptcha } = require("../../lib/server/recaptcha");
const { enforceRateLimit } = require("../../lib/server/rate-limit");
const { makeLogger } = require("../../lib/server/logger");

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req, res) {
  const startedAt = Date.now();
  const logger = makeLogger("api/quote");
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
    } else {
      logger.info("recaptcha omitido para quote", { reason: "token faltante" });
    }

    logger.info("request", {
      weight: payload.weightLbs,
      pickup: payload.pickup,
      paymentMethod: payload.paymentMethod,
      deliveryDate: payload.deliveryDate,
    });

    const quote = await calculateQuote(payload);

    logger.info("quote calculado", {
      total: quote.total,
      weight: quote.breakdown?.weight?.amount,
      pickup: quote.breakdown?.pickup?.amount,
      policy: quote.policy,
    });

    const durationMs = Date.now() - startedAt;
    logger.end("completado", { payloadPreview: { weight: payload.weightLbs, pickup: payload.pickup } });
    return res.status(200).json(quote);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logger.error("error", {
      message: error.message,
      status: error.status,
      stack: error.stack,
      durationMs,
    });
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No se pudo calcular el envA-o." });
  }
}
