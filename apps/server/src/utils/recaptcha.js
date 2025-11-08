'use strict';

const ENTERPRISE_URL = 'https://recaptchaenterprise.googleapis.com/v1';

const requireEnv = (key, label) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${label}`);
  }
  return value;
};

const getSiteKey = () =>
  process.env.RECAPTCHA_SITE_KEY ||
  process.env.RECAPTCHA_ENTERPRISE_SITE_KEY ||
  '';

const verifyRecaptchaEnterprise = async (token, expectedAction, ip) => {
  if (!token) {
    throw new Error('Missing reCAPTCHA token');
  }

  const projectId = requireEnv('RECAPTCHA_PROJECT_ID', 'RECAPTCHA_PROJECT_ID');
  const apiKey = requireEnv('RECAPTCHA_API_KEY', 'RECAPTCHA_API_KEY');
  const siteKey = getSiteKey();
  if (!siteKey) {
    throw new Error('Missing RECAPTCHA_SITE_KEY');
  }

  const event = {
    token,
    siteKey,
  };

  if (expectedAction) {
    event.expectedAction = expectedAction;
  }

  if (ip) {
    event.userIpAddress = ip;
  }

  const endpoint = `${ENTERPRISE_URL}/projects/${projectId}/assessments?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event }),
  });

  const data = await res.json();
  const tokenProperties = data.tokenProperties || {};
  const riskAnalysis = data.riskAnalysis || {};
  const score = riskAnalysis.score ?? 0;
  const threshold = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5);

  const ok =
    res.ok &&
    tokenProperties.valid === true &&
    (!expectedAction || tokenProperties.action === expectedAction) &&
    score >= threshold;

  if (process.env.NODE_ENV !== 'production') {
    console.log('reCAPTCHA verify:', {
      ok,
      score,
      action: tokenProperties.action,
      reasons: riskAnalysis.reasons,
      invalidReason: tokenProperties.invalidReason,
      errors: data.error,
    });
  }

  return {
    ok,
    score,
    action: tokenProperties.action,
    reasons: riskAnalysis.reasons || [],
    invalidReason: tokenProperties.invalidReason,
    raw: data,
  };
};

module.exports = {
  verifyRecaptchaEnterprise,
};
