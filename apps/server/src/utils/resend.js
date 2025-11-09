'use strict';

const crypto = require('crypto');
const { Resend } = require('resend');

let resendClient;

const MEMORY_TTL_MS = 60 * 1000;
const PERSISTED_TTL_MS =
  Number.parseInt(process.env.NOTIFICATION_DEDUPE_TTL_MS, 10) || MEMORY_TTL_MS;
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

const getStore = () => {
  if (global.strapi && typeof global.strapi.store === 'function') {
    return global.strapi.store({ type: 'plugin', name: 'notifications' });
  }
  return null;
};

const buildSignatureHash = (signature) =>
  crypto.createHash('sha256').update(signature).digest('hex');

const cleanupMemoryKeys = (now) => {
  for (const [signature, timestamp] of recentMessages.entries()) {
    if (now - timestamp > MEMORY_TTL_MS) {
      recentMessages.delete(signature);
    }
  }
};

const markInMemory = (key, now) => {
  cleanupMemoryKeys(now);
  if (recentMessages.has(key)) {
    return false;
  }
  recentMessages.set(key, now);
  return true;
};

const markPersisted = async (key, now, logger) => {
  const store = getStore();
  if (!store) {
    return markInMemory(key, now);
  }

  try {
    const existing = await store.get({ key });
    if (existing && existing.timestamp && now - existing.timestamp < PERSISTED_TTL_MS) {
      return false;
    }

    if (existing && existing.timestamp && now - existing.timestamp >= PERSISTED_TTL_MS) {
      await store.delete({ key });
    }

    await store.set({ key, value: { timestamp: now } });
    return true;
  } catch (error) {
    logger.warn('[notifications] Failed to access dedupe store; falling back to memory.', error);
    return markInMemory(key, now);
  }
};

const shouldSendSignature = async (signature, logger) => {
  const now = Date.now();
  return markPersisted(buildSignatureHash(signature), now, logger);
};

const sendNotificationEmail = async ({ subject, html, text }) => {
  const logger = getLogger();
  const client = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.NOTIFY_EMAIL;
  const pid = process.pid;

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
  const signatureHash = buildSignatureHash(signature);

  if (!(await shouldSendSignature(signature, logger))) {
    logger.warn('[notifications] Duplicate email detected. Skipping send.', {
      pid,
      signature: signatureHash,
    });
    return;
  }

  logger.debug('[notifications] Dispatching email via Resend.', {
    pid,
    recipients,
    signature: signatureHash,
  });

  try {
    await client.emails.send({
      from,
      to: recipients,
      subject,
      html,
      text,
    });
    logger.info('[notifications] Resend email dispatched successfully.', {
      pid,
      signature: signatureHash,
    });
  } catch (error) {
    logger.error('[notifications] Failed to send email via Resend:', error);
  }
};

module.exports = {
  sendNotificationEmail,
};
