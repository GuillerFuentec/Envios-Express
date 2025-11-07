'use strict';

const SITE_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

const getLogger = () => {
  if (global.strapi && global.strapi.log) {
    return global.strapi.log;
  }
  return console;
};

const verifyRecaptchaToken = async (token) => {
  const logger = getLogger();
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    logger.warn('[recaptcha] RECAPTCHA_SECRET_KEY not set. Skipping verification.');
    return true;
  }

  if (!token) {
    logger.warn('[recaptcha] Missing token in request.');
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    const response = await fetch(SITE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!data.success) {
      logger.warn('[recaptcha] Invalid token', data['error-codes']);
      return false;
    }

    if (typeof data.score === 'number' && data.score < 0.5) {
      logger.warn('[recaptcha] Low score received', data.score);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('[recaptcha] Verification failed', error);
    return false;
  }
};

module.exports = {
  verifyRecaptchaToken,
};
