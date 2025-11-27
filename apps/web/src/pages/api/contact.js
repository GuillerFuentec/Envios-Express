"use strict";

const normalizeBaseUrl = (value = "") => {
  const trimmed = value.replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const body = req.body || {};
    const baseUrl = normalizeBaseUrl(
      process.env.STRAPI_WEB_API_URL || process.env.STRAPI_API_URL
    );
    if (!baseUrl) {
      throw new Error("Falta STRAPI_WEB_API_URL para enviar el contacto.");
    }

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
        "No pudimos enviar tu mensaje. Intenta nuevamente.";
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[api/contact]", error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No pudimos enviar tu mensaje." });
  }
}
