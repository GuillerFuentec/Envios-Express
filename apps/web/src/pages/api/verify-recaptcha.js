"use strict";

const { requireRecaptcha } = require("../../lib/server/recaptcha");
const { enforceRateLimit } = require("../../lib/server/rate-limit");
const { makeLogger } = require("../../lib/server/logger");

export default async function handler(req, res) {
  const logger = makeLogger("api/verify-recaptcha");
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, error: "Método no permitido." });
  }

  try {
    await enforceRateLimit({
      req,
      key: "verify-recaptcha",
      windowMs: Number(process.env.RECAPTCHA_RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.RECAPTCHA_RATE_LIMIT_MAX || 120),
    });

    const body = req.body || {};
    const { token, action } = body;

    const result = await requireRecaptcha({
      token,
      action,
    });

    logger.end("verificado", { hostname: result.hostname, action: result.action, score: result.score });
    return res.status(200).json({
      success: true,
      score: result.score,
      action: result.action,
      hostname: result.hostname,
      challengeTs: result.challengeTs,
    });
  } catch (error) {
    logger.error("error", { error: error.message, stack: error.stack });
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || "No pudimos verificar el token.",
      details: error.details || null,
    });
  }
}
