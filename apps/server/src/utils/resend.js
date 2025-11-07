'use strict';

const { Resend } = require('resend');

let resendClient;

const RECENT_TTL = 60 * 1000;
const recentMessages = new Map();

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
};

const getLogger = () => {
  if (global.strapi && global.strapi.log) {
    return global.strapi.log;
  }

  return console;
};

const shouldSendSignature = (key) => {
  const now = Date.now();
  for (const [signature, timestamp] of recentMessages.entries()) {
    if (now - timestamp > RECENT_TTL) {
      recentMessages.delete(signature);
    }
  }
  if (recentMessages.has(key)) {
    return false;
  }
  recentMessages.set(key, now);
  return true;
};

const sendNotificationEmail = async ({ subject, html, text }) => {
  const logger = getLogger();
  const client = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.NOTIFY_EMAIL;

  if (!client || !from || !to) {
    logger.warn(
      '[notifications] Resend client not configured. Please set RESEND_API_KEY, RESEND_FROM_EMAIL and NOTIFY_EMAIL environment variables.'
    );
    return;
  }

  const recipients = to
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (!recipients.length) {
    logger.warn('[notifications] NOTIFY_EMAIL is empty. Skipping email send.');
    return;
  }

  const signature = `${subject}|${text}`;
  if (!shouldSendSignature(signature)) {
    logger.warn('[notifications] Duplicate email detected. Skipping send.');
    return;
  }

  try {
    await client.emails.send({
      from,
      to: recipients,
      subject,
      html,
      text,
    });
    logger.info('[notifications] Resend email dispatched successfully.');
  } catch (error) {
    logger.error('[notifications] Failed to send email via Resend:', error);
  }
};

module.exports = {
  sendNotificationEmail,
};
