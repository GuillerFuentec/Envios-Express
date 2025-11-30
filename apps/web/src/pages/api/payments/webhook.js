"use strict";

import Stripe from "stripe";
import { writeJson, readJson } from "../../../lib/server/storage";
import { getCache, setCache } from "../../../lib/server/cache";
import { enforceRateLimit } from "../../../lib/server/rate-limit";
import { enqueueJob } from "../../../lib/server/job-queue";

export const config = {
  api: {
    bodyParser: false,
  },
};

const processedEvents = new Set();
const processedSessions = new Set();
const FAIL_THRESHOLD = Number(process.env.PAYMENT_FAIL_ALERT_THRESHOLD || 5);
const EVENT_LOG_TTL_MS = Number(process.env.PAYMENT_EVENT_TTL_MS || 24 * 60 * 60 * 1000);
const FAILCOUNT_TTL_MS = Number(process.env.PAYMENT_FAIL_TTL_MS || 6 * 60 * 60 * 1000);
const PROCESSED_TTL_MS = Number(process.env.WEBHOOK_DEDUPE_TTL_MS || 60 * 60 * 1000);

const boolFromMetadata = (value) => value === true || value === "true" || value === "1";

const getStrapiHeaders = () => {
  const token = process.env.AGENCY_TOKEN;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const normalizeBaseUrl = (value = "") => {
  const trimmed = value.replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed.slice(0, -4);
  }
  return trimmed;
};

const postClientToStrapi = async (clientInfo) => {
  const baseUrl = normalizeBaseUrl(
    process.env.STRAPI_WEB_API_URL || process.env.STRAPI_API_URL || process.env.AGENCY_API_URL
  );
  if (!baseUrl) {
    console.warn("[webhook] STRAPI_WEB_API_URL/AGENCY_API_URL not set; skipping Strapi client creation.");
    return;
  }

  const tokenPresent = Boolean(process.env.AGENCY_TOKEN);
  console.info("[webhook] Posting client to Strapi", {
    baseUrl,
    hasToken: tokenPresent,
    contactEmail: clientInfo?.contact?.email || "",
    contactPhone: clientInfo?.contact?.phone || "",
  });

  const response = await fetch(`${baseUrl}/api/clients`, {
    method: "POST",
    headers: getStrapiHeaders(),
    body: JSON.stringify({
      data: {
        name: clientInfo?.contact?.name || "",
        email: clientInfo?.contact?.email || "",
        phone: clientInfo?.contact?.phone || "",
        client_info: clientInfo,
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[webhook] Failed to create client in Strapi", {
      status: response.status,
      statusText: response.statusText,
      data,
    });
    throw new Error(data?.error?.message || data?.error || "Strapi client creation failed");
  }

  console.info("[webhook] Client created in Strapi", {
    baseUrl,
    id: data?.data?.id || data?.id || null,
  });
  return data;
};

const getProcessingConfig = () => {
  const percent = Number(process.env.STRIPE_PROCESSING_PERCENT || 0.029);
  const fixed = Number(process.env.STRIPE_PROCESSING_FIXED || 0.3);
  return { percent, fixed };
};

const computeStripeFeeCents = (amountCents) => {
  if (typeof amountCents !== "number" || Number.isNaN(amountCents)) {
    return 0;
  }
  const { percent, fixed } = getProcessingConfig();
  return Math.max(0, Math.round(amountCents * percent + fixed * 100));
};

const computePlatformFeeCents = (amountCents, stripeFeeCents) => {
  if (typeof amountCents !== "number" || Number.isNaN(amountCents)) {
    return 0;
  }
  const rate =
    Number(process.env.PLATFORM_FEE_PERCENT || process.env.PLATFORM_FEE_RATE) /
      100 || 0.023; // 2.3% default
  const base = amountCents - (stripeFeeCents || 0);
  return Math.max(110, Math.round(base * rate)); // mínimo $1.10
};

const buildClientInfoFromSession = (session) => {
  const md = session.metadata || {};
  const contact = session.customer_details || {};
  const phone = contact.phone || md.contact_phone || "";
  const email = contact.email || md.contact_email || session.customer_email || "";
  const platformFeeCents = md.platform_fee_amount ? Number(md.platform_fee_amount) : undefined;
  const amountTotalCents =
    typeof session.amount_total === "number" ? session.amount_total : undefined;
  const stripeFeeCents = computeStripeFeeCents(amountTotalCents || 0);
  const destinationAmountCents =
    typeof amountTotalCents === "number"
      ? amountTotalCents - (platformFeeCents || 0) - stripeFeeCents
      : undefined;

  return {
    contact: {
      name: contact.name || md.contact_name || "",
      email,
      phone,
      smsConsent: md.sms_consent ? boolFromMetadata(md.sms_consent) : true,
    },
    shipment: {
      contentType: md.content_type || "",
      cityCuba: md.city_cuba || "",
      deliveryDate: md.delivery_date || "",
      weightLbs: md.weight_lbs ? Number(md.weight_lbs) : undefined,
      cashAmount: md.cash_amount ? Number(md.cash_amount) : undefined,
    },
    preferences: {
      paymentMethod: "online",
      pickup: boolFromMetadata(md.pickup),
    },
    quote: {
      total: session.amount_total ? session.amount_total / 100 : undefined,
      currency: session.currency ? session.currency.toUpperCase() : undefined,
    },
    sessionId: session.id,
    billing: {
      amountTotalCents,
      currency: session.currency ? session.currency.toUpperCase() : undefined,
      platformFeeCents:
        platformFeeCents !== undefined
          ? platformFeeCents
          : computePlatformFeeCents(amountTotalCents, stripeFeeCents),
      destinationAccount: md.destination_account || "",
      stripeFeeCents,
      destinationAmountCents,
    },
    stripe: {
      sessionId: session.id,
      paymentIntentId: session.payment_intent || md.payment_intent_id || "",
    },
    submittedAt: new Date().toISOString(),
  };
};

const buildClientInfoFromIntent = (intent) => {
  const md = intent.metadata || {};
  const email = intent.receipt_email || md.contact_email || "";
  const sessionId = md.checkout_session_id || intent.id;
  const platformFeeCents = md.platform_fee_amount ? Number(md.platform_fee_amount) : undefined;
  const amountTotalCents =
    typeof intent.amount_received === "number" ? intent.amount_received : undefined;
  const stripeFeeCents = computeStripeFeeCents(amountTotalCents || 0);
  const destinationAmountCents =
    typeof amountTotalCents === "number"
      ? amountTotalCents - (platformFeeCents || 0) - stripeFeeCents
      : undefined;

  return {
    contact: {
      name: md.contact_name || "",
      email,
      phone: md.contact_phone || "",
      smsConsent: md.sms_consent ? boolFromMetadata(md.sms_consent) : true,
    },
    shipment: {
      contentType: md.content_type || "",
      cityCuba: md.city_cuba || "",
      deliveryDate: md.delivery_date || "",
      weightLbs: md.weight_lbs ? Number(md.weight_lbs) : undefined,
      cashAmount: md.cash_amount ? Number(md.cash_amount) : undefined,
    },
    preferences: {
      paymentMethod: "online",
      pickup: boolFromMetadata(md.pickup),
    },
    quote: {
      total: intent.amount_received ? intent.amount_received / 100 : undefined,
      currency: intent.currency ? intent.currency.toUpperCase() : undefined,
    },
    sessionId,
    billing: {
      amountTotalCents,
      currency: intent.currency ? intent.currency.toUpperCase() : undefined,
      platformFeeCents:
        platformFeeCents !== undefined
          ? platformFeeCents
          : computePlatformFeeCents(amountTotalCents, stripeFeeCents),
      destinationAccount: md.destination_account || "",
      stripeFeeCents,
      destinationAmountCents,
    },
    stripe: {
      sessionId: sessionId,
      paymentIntentId: intent.id,
    },
    submittedAt: new Date().toISOString(),
  };
};

const markProcessed = async (setRef, cacheKey, id) => {
  setRef.add(id);
  await setCache(cacheKey, true, PROCESSED_TTL_MS);
};

const hasProcessed = async (setRef, cacheKey, id) =>
  setRef.has(id) || Boolean(await getCache(cacheKey));

const logEvent = async (event) => {
  const events = await readJson("payment-events.json", []);
  events.push({
    id: event.id,
    type: event.type,
    created: event.created,
    data: event.data?.object?.id || null,
  });
  await writeJson("payment-events.json", events.slice(-500), EVENT_LOG_TTL_MS); // keep last 500
};

const countFailures = async (key) => {
  const failCounts = await readJson("payment-fail-counts.json", {});
  failCounts[key] = (failCounts[key] || 0) + 1;
  await writeJson("payment-fail-counts.json", failCounts, FAILCOUNT_TTL_MS);
  return failCounts[key];
};

const notifyOwner = async (subject, body) => {
  console.info("[notifyOwner]", subject, body);
};

const notifyClient = async (email, phone, message) => {
  console.info("[notifyClient]", { email, phone, message });
};

const readRawBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
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

  const eventKey = `stripe:webhook:event:${event.id}`;
  if (await hasProcessed(processedEvents, eventKey, event.id)) {
    return;
  }
  await logEvent(event);
  await markProcessed(processedEvents, eventKey, event.id);

  switch (type) {
    case "checkout.session.completed": {
      console.info("[webhook] checkout.session.completed", {
        id: data.id,
        payment_intent: data.payment_intent,
        customer_email: data.customer_details?.email,
      });

      const sessionKey = `stripe:webhook:session:${data.id}`;
      if (!(await hasProcessed(processedSessions, sessionKey, data.id))) {
        try {
          const clientInfo = buildClientInfoFromSession(data);
          await postClientToStrapi(clientInfo);
          await markProcessed(processedSessions, sessionKey, data.id);
          if (data.payment_intent) {
            await markProcessed(
              processedSessions,
              `stripe:webhook:session:${data.payment_intent}`,
              data.payment_intent
            );
          }
        } catch (error) {
          console.error("[webhook] Error creating client in Strapi (session)", error);
        }
      }

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
    }
    case "payment_intent.succeeded": {
      console.info("[webhook] payment_intent.succeeded", {
        id: data.id,
        amount_received: data.amount_received,
        currency: data.currency,
        receipt_email: data.receipt_email,
      });

      const sessionId = data.metadata?.checkout_session_id || data.id;
      const sessionKey = `stripe:webhook:session:${sessionId}`;
      if (!(await hasProcessed(processedSessions, sessionKey, sessionId))) {
        try {
          const clientInfo = buildClientInfoFromIntent(data);
          await postClientToStrapi(clientInfo);
          await markProcessed(processedSessions, sessionKey, sessionId);
          await markProcessed(
            processedSessions,
            `stripe:webhook:session:${data.id}`,
            data.id
          );
        } catch (error) {
          console.error("[webhook] Error creating client in Strapi (intent)", error);
        }
      }

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
    }
    case "payment_intent.payment_failed": {
      console.warn("[webhook] payment_intent.payment_failed", {
        id: data.id,
        customer_email: data.receipt_email,
        last_payment_error: data.last_payment_error?.message,
      });
      await notifyClient(
        data.receipt_email,
        data.metadata?.contact_phone,
        "Tu pago fallo, intenta nuevamente."
      );
      const count = await countFailures(data.receipt_email || data.id);
      if (count >= FAIL_THRESHOLD) {
        await notifyOwner(
          "Alerta: fallos repetidos de pago",
          `Se registraron ${count} fallos para ${data.receipt_email || data.id}`
        );
      }
      break;
    }
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
    const buf = await readRawBody(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await enforceRateLimit({
      req,
      key: "stripe-webhook",
      windowMs: Number(process.env.STRIPE_WEBHOOK_WINDOW_MS || 300_000),
      max: Number(process.env.STRIPE_WEBHOOK_MAX || 400),
      identifier: event?.type,
    });

    enqueueJob("stripe-webhook", () => handleEvent(event));

    return res.status(200).json({ received: true, queued: true });
  } catch (err) {
    console.error("[webhook] Handler error", err);
    return res.status(500).json({ error: "Webhook handler failure" });
  }
}
