"use strict";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const getSecretKey = () =>
  process.env.RECAPTCHA_SECRET_KEY ||
  process.env.SECRET_RECAPTCHA_KEY ||
  "";


const verifyRecaptchaToken = async (token) => {

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
    const parseError = new Error("Respuesta invalida de reCAPTCHA.");
    parseError.status = 502;
    parseError.cause = error;
    throw parseError;
  }

  const success = Boolean(payload.success);

  console.info("[recaptcha] respuesta verificada", {
    success,
    action: payload?.action || null,
    score: payload?.score ?? null,
    errorCodes: payload["error-codes"] || [],
  });

  return {
    success,
    score: payload?.score ?? null,
    action: payload?.action || null,
    challengeTs: payload.challenge_ts,
    hostname: payload.hostname,
    errorCodes: payload["error-codes"] || [],
    raw: payload,
  };
};

const requireRecaptcha = async ({ token } = {}) => {
  const result = await verifyRecaptchaToken(token);
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
