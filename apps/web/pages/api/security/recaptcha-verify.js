"use strict";

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const MIN_SCORE = 0.5;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  const secret = process.env.RECAPTCHA_V3_SECRET;
  if (!secret) {
    return res
      .status(500)
      .json({ error: "Falta RECAPTCHA_V3_SECRET en el servidor." });
  }

  const token = req.body?.token;
  if (!token) {
    return res.status(400).json({ error: "Falta el token de reCAPTCHA." });
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);

    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const payload = await response.json();
    const ok =
      payload.success === true &&
      Number(payload.score ?? 0) >= MIN_SCORE &&
      (!payload.action || payload.action === "funnel");
    return res.status(200).json({ ok });
  } catch (error) {
    console.error("[recaptcha-verify]", error);
    return res.status(500).json({ error: "No se pudo verificar el captcha.", ok: false });
  }
}
