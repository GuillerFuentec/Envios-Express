'use strict';

const getLogger = () => {
  if (global.strapi && global.strapi.log) {
    return global.strapi.log;
  }
  return console;
};

const buildAuthHeader = () => {
  const clientId = process.env.NOTIFICATION_API_CLIENT_ID;
  const clientSecret = process.env.NOTIFICATION_API_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${token}`;
};

const getBaseUrl = () => {
  const base = process.env.NOTIFICATION_API_BASE_URL || 'https://api.notificationapi.com';
  try {
    return new URL(base).origin;
  } catch (error) {
    return 'https://api.notificationapi.com';
  }
};

const sendClientNotification = async ({ phone, email, name, payload }) => {
  const logger = getLogger();
  if (!phone) {
    logger.warn('[notificationapi] No phone provided; skipping SMS notification.');
    return;
  }

  const authHeader = buildAuthHeader();
  if (!authHeader) {
    logger.warn(
      '[notificationapi] Missing NOTIFICATION_API_CLIENT_ID or NOTIFICATION_API_CLIENT_SECRET.'
    );
    return;
  }

  const notificationId =
    process.env.NOTIFICATION_API_CLIENT_TEMPLATE_ID || 'new_client';

  const body = {
    notificationId,
    recipients: [
      {
        name: name || 'Cliente',
        email: email || undefined,
        phone,
        sms: true,
      },
    ],
    mergeTags: {
      customer_name: name || 'Cliente',
      customer_email: email || '',
      customer_phone: phone,
      shipment_city: payload?.shipment?.city || '',
      shipment_weight: payload?.shipment?.weight || '',
    },
  };

  try {
    const response = await fetch(`${getBaseUrl()}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(
        `[notificationapi] Failed to send SMS (${response.status}): ${text}`
      );
    } else {
      logger.info('[notificationapi] SMS notification dispatched.');
    }
  } catch (error) {
    logger.error('[notificationapi] Error sending SMS notification', error);
  }
};

module.exports = {
  sendClientNotification,
};
