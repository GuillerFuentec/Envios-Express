"use strict";

const raw = require("notificationapi-node-server-sdk");
const notificationapi = raw.default || raw;

const getLogger = () => {
  if (global.strapi && global.strapi.log) {
    return global.strapi.log;
  }
  return console;
};

let sdkInitialized = false;

const initNotificationApi = () => {
  if (sdkInitialized) {
    return true;
  }

  const clientId = process.env.NOTIFICATION_API_CLIENT_ID;
  const clientSecret = process.env.NOTIFICATION_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    getLogger().warn(
      "[notificationapi] Missing NOTIFICATION_API_CLIENT_ID or NOTIFICATION_API_CLIENT_SECRET."
    );
    return false;
  }

  const baseUrl = process.env.NOTIFICATION_API_BASE_URL;
  if (baseUrl) {
    notificationapi.init(clientId, clientSecret, baseUrl);
  } else {
    notificationapi.init(clientId, clientSecret);
  }

  sdkInitialized = true;
  getLogger().debug("[notificationapi] SDK initialized.", {
    pid: process.pid,
    baseUrl: baseUrl || "default",
  });
  return true;
};

const getNotificationType = (envKey) =>
  process.env[envKey] ||
  process.env.NOTIFICATION_API_CLIENT_TEMPLATE_ID ||
  "new_client";

const sendDirectSms = async ({ envKey, phone, message }) => {
  const logger = getLogger();
  const pid = process.pid;

  if (!phone) {
    logger.warn("[notificationapi] Missing phone; skipping SMS notification.");
    return;
  }

  if (!message) {
    logger.warn("[notificationapi] Missing message; skipping SMS notification.");
    return;
  }

  if (!initNotificationApi()) {
    return;
  }

  const type = getNotificationType(envKey);
  if (!type) {
    logger.warn("[notificationapi] Missing notification type; skipping SMS notification.", {
      envKey,
    });
    return;
  }

  logger.debug("[notificationapi] Dispatching SMS notification.", {
    pid,
    type,
    phone,
    envKey,
    preview: message.slice(0, 120),
  });

  try {
    await notificationapi.send({
      type,
      to: {
        id: phone,
        number: phone,
      },
      sms: {
        message,
      },
    });
    logger.info(`[notificationapi] SMS notification (${type}) dispatched.`, { pid });
  } catch (error) {
    logger.error("[notificationapi] Error sending SMS notification", error);
  }
};

const buildClientMessage = (name) => {
  const trimmed = (name || "").trim();
  if (trimmed) {
    return `Muchas gracias por ordenar con nosotros, ${trimmed}.`;
  }
  return "Muchas gracias por ordenar con nosotros.";
};

const buildContactMessage = (name) => {
  const trimmed = (name || "").trim();
  if (trimmed) {
    return `Muchas gracias por ponerse en contacto con nosotros, ${trimmed}. Pronto lo contactaremos.`;
  }
  return "Muchas gracias por ponerse en contacto con nosotros. Pronto lo contactaremos.";
};

const sendClientThankYouSms = async ({ phone, name }) =>
  sendDirectSms({
    envKey: "NOTIFICATION_API_CLIENT_SMS_TYPE",
    phone,
    message: buildClientMessage(name),
  });

const sendContactThankYouSms = async ({ phone, name }) =>
  sendDirectSms({
    envKey: "NOTIFICATION_API_CONTACT_SMS_TYPE",
    phone,
    message: buildContactMessage(name),
  });

module.exports = {
  sendClientThankYouSms,
  sendContactThankYouSms,
};
