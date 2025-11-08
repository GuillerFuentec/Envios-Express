"use strict";

const notificationapi = require("notificationapi-node-server-sdk");

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
  return true;
};

const sendDirectSms = async ({ type, phone, message }) => {
  const logger = getLogger();

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

  try {
    await notificationapi.send({
      type: type || "new_client",
      to: {
        id: phone,
        number: phone,
      },
      sms: {
        message,
      },
    });
    logger.info(`[notificationapi] SMS notification (${type || "new_client"}) dispatched.`);
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
    type: process.env.NOTIFICATION_API_CLIENT_SMS_TYPE || "client_thank_you",
    phone,
    message: buildClientMessage(name),
  });

const sendContactThankYouSms = async ({ phone, name }) =>
  sendDirectSms({
    type: process.env.NOTIFICATION_API_CONTACT_SMS_TYPE || "contact_thank_you",
    phone,
    message: buildContactMessage(name),
  });

module.exports = {
  sendClientThankYouSms,
  sendContactThankYouSms,
};
