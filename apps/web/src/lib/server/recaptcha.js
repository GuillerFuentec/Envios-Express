"use strict";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const getSecretKey = () =>
  process.env.RECAPTCHA_SECRET_KEY ||
  process.env.SECRET_RECAPTCHA_KEY ||
  "";

const getMinScore = (override) => {
  if (typeof override === "number" && Number.isFinite(override)) {
    return override;
  }
  const envValue = Number(process.env.RECAPTCHA_MIN_SCORE);
  if (Number.isFinite(envValue)) {
    return envValue;
  }
  return 0.5;
};

const verifyRecaptchaToken = async (token, expectedAction, minScoreOverride) => {
  const secretKey = getSecretKey();
  if (!secretKey) {
    const error = new Error("Falta RECAPTCHA_SECRET_KEY en el servidor.");
    error.status = 500;
    throw error;
  }
  if (!token || typeof token !== "string") {
    const error = new Error("Falta el token de reCAPTCHA.");
    error.status = 400;
    throw error;
  }

  console.info("[recaptcha] inicio verificacion", {
    action: expectedAction || null,
    tokenLength: token.length || 0,
  });

  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  let payload;
  const response = await fetch(VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  }).catch((error) => {
    throw Object.assign(new Error("No se pudo contactar a reCAPTCHA."), {
      status: 502,
      cause: error,
    });
  });

  try {
    payload = await response.json();
  } catch (error) {
    const parseError = new Error("Respuesta inválida de reCAPTCHA.");
    parseError.status = 502;
    parseError.cause = error;
    throw parseError;
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  const normalizedAction = action.toLowerCase();
  const expected = typeof expectedAction === "string" ? expectedAction.toLowerCase() : "";
  const actionMatches = !expected || normalizedAction === expected;
  const score = Number(payload.score || 0);
  const minScore = getMinScore(minScoreOverride);

  const success =
    Boolean(payload.success) &&
    actionMatches &&
    score >= minScore;

  console.info("[recaptcha] respuesta verificada", {
    success,
    action,
    expectedAction: expectedAction || null,
    score,
    minScore,
    errorCodes: payload["error-codes"] || [],
  });

  return {
    success,
    score,
    action,
    challengeTs: payload.challenge_ts,
    hostname: payload.hostname,
    errorCodes: payload["error-codes"] || [],
    raw: payload,
    minScore,
    expectedAction: expectedAction || null,
  };
};

const requireRecaptcha = async ({ token, action, minScore } = {}) => {
  const result = await verifyRecaptchaToken(token, action, minScore);
  if (!result.success) {
    const error = new Error("No pudimos validar reCAPTCHA.");
    error.status = 400;
    error.details = result;
    throw error;
  }
  return result;
};

module.exports = {
  verifyRecaptchaToken,
  requireRecaptcha,
};
