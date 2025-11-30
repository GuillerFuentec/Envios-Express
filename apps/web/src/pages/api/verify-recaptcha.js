"use strict";

const { requireRecaptcha } = require("../../lib/server/recaptcha");
const { enforceRateLimit } = require("../../lib/server/rate-limit");

export default async function handler(req, res) {
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

    return res.status(200).json({
      success: true,
      score: result.score,
      action: result.action,
      hostname: result.hostname,
      challengeTs: result.challengeTs,
    });
  } catch (error) {
    console.error("[api/verify-recaptcha]", error);
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || "No pudimos verificar el token.",
      details: error.details || null,
    });
  }
}
