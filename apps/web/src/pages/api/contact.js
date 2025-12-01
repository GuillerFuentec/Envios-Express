"use strict";

const { requireRecaptcha } = require("../../lib/server/recaptcha");
const { enforceRateLimit } = require("../../lib/server/rate-limit");
const { makeLogger } = require("../../lib/server/logger");

const normalizeBaseUrl = (value = "") => {
  const trimmed = value.replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req, res) {
  const logger = makeLogger("api/contact");
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    await enforceRateLimit({
      req,
      key: "contact",
      windowMs: Number(process.env.CONTACT_RATE_LIMIT_WINDOW_MS || 60_000),
      max: Number(process.env.CONTACT_RATE_LIMIT_MAX || 20),
      identifier: req.body?.email,
    });

    const body = req.body || {};
    await requireRecaptcha({ token: body.recaptchaToken });

    if (body.message && String(body.message).length > 2000) {
      return res.status(400).json({ error: "El mensaje es demasiado largo." });
    }
    if (!body.email || typeof body.email !== "string") {
      return res.status(400).json({ error: "Email requerido." });
    }

    const baseUrl = normalizeBaseUrl(
      process.env.STRAPI_WEB_API_URL || process.env.STRAPI_API_URL || process.env.AGENCY_API_URL
    );
    if (!baseUrl) {
      throw new Error("Falta STRAPI_WEB_API_URL/AGENCY_API_URL para enviar el contacto.");
    }
    logger.info("enviando contacto a Strapi", {
      baseUrl,
      hasToken: Boolean(process.env.AGENCY_TOKEN),
      email: body.email || "",
      phone: body.phone || "",
    });

    const payload = {
      data: {
        name: body.name || "",
        email: body.email || "",
        phone: body.phone || "",
        contact_info: {
          name: body.name || "",
          email: body.email || "",
          phone: body.phone || "",
          message: body.message || "",
          smsConsent: Boolean(body.smsConsent),
        },
      },
    };

    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.AGENCY_TOKEN
          ? { Authorization: `Bearer ${process.env.AGENCY_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.error ||
        "No pudimos enviar tu mensaje. Intenta nuevamente.";
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    logger.end("contacto creado");
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error("error", { error: error.message, stack: error.stack });
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No pudimos enviar tu mensaje." });
  }
}
