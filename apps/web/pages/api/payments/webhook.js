"use strict";

import { buffer } from "micro";
import Stripe from "stripe";
import { writeJson, readJson } from "../../../lib/server/storage";

export const config = {
  api: {
    bodyParser: false,
  },
};

const processedEvents = new Set();
const FAIL_THRESHOLD = Number(process.env.PAYMENT_FAIL_ALERT_THRESHOLD || 5);

const logEvent = (event) => {
  const events = readJson("payment-events.json", []);
  events.push({
    id: event.id,
    type: event.type,
    created: event.created,
    data: event.data?.object?.id || null,
  });
  writeJson("payment-events.json", events.slice(-500)); // mantén los últimos 500
};

const countFailures = (key) => {
  const failCounts = readJson("payment-fail-counts.json", {});
  failCounts[key] = (failCounts[key] || 0) + 1;
  writeJson("payment-fail-counts.json", failCounts);
  return failCounts[key];
};

const notifyOwner = async (subject, body) => {
  console.info("[notifyOwner]", subject, body);
  // TODO: integrar proveedor de correo/SMS real (Resend/NotificationAPI).
};

const notifyClient = async (email, phone, message) => {
  console.info("[notifyClient]", { email, phone, message });
  // TODO: integrar envío real.
};

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY para procesar webhooks.");
  }
  return new Stripe(secretKey, { apiVersion: "2024-06-20" });
};

const handleEvent = async (event) => {
  const type = event.type;
  const data = event.data?.object || {};

  if (processedEvents.has(event.id)) {
    return;
  }
  processedEvents.add(event.id);

  logEvent(event);

  switch (type) {
    case "checkout.session.completed":
      console.info("[webhook] checkout.session.completed", {
        id: data.id,
        payment_intent: data.payment_intent,
        customer_email: data.customer_details?.email,
      });
      await notifyClient(
        data.customer_details?.email,
        data.customer_details?.phone,
        "Tu pago fue recibido. Pronto procesaremos tu orden."
      );
      await notifyOwner(
        "Pago completado",
        `Session ${data.id} customer ${data.customer_details?.email || ""}`
      );
      break;
    case "payment_intent.succeeded":
      console.info("[webhook] payment_intent.succeeded", {
        id: data.id,
        amount_received: data.amount_received,
        currency: data.currency,
        receipt_email: data.receipt_email,
      });
      await notifyClient(
        data.receipt_email,
        data.metadata?.contact_phone,
        "Tu pago fue confirmado."
      );
      await notifyOwner(
        "PaymentIntent confirmado",
        `PI ${data.id} amount ${data.amount_received}`
      );
      break;
    case "payment_intent.payment_failed":
      console.warn("[webhook] payment_intent.payment_failed", {
        id: data.id,
        customer_email: data.receipt_email,
        last_payment_error: data.last_payment_error?.message,
      });
      await notifyClient(
        data.receipt_email,
        data.metadata?.contact_phone,
        "Tu pago falló, intenta nuevamente."
      );
      const count = countFailures(data.receipt_email || data.id);
      if (count >= FAIL_THRESHOLD) {
        await notifyOwner(
          "Alerta: fallos repetidos de pago",
          `Se registraron ${count} fallos para ${data.receipt_email || data.id}`
        );
      }
      break;
    default:
      console.debug("[webhook] evento no manejado", { type });
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await handleEvent(event);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[webhook] Handler error", err);
    return res.status(500).json({ error: "Webhook handler failure" });
  }
}
