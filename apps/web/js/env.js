const FALLBACK_API_BASE_URL = 'http://localhost:1337';

const parseInlineConfig = () => {
  if (typeof document === 'undefined') {
    return {};
  }

  const inlineScript = document.querySelector('script[data-app-config]');
  if (!inlineScript || !inlineScript.textContent) {
    return {};
  }

  try {
    const parsed = JSON.parse(inlineScript.textContent);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    console.warn('Config script JSON parse failed', error);
  }

  return {};
};

const getRuntimeConfig = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  const directConfig = window.__APP_CONFIG__;
  if (directConfig && typeof directConfig === 'object') {
    return directConfig;
  }

  return parseInlineConfig();
};

const getMetaConfig = () => {
  if (typeof document === 'undefined') {
    return {};
  }

  const config = {};

  const backendMeta = document.querySelector('meta[name="backend-url"]');
  if (backendMeta && typeof backendMeta.getAttribute === 'function') {
    const value = backendMeta.getAttribute('content');
    if (value) {
      config.apiBaseUrl = value;
    }
  }

  const stripeMeta = document.querySelector('meta[name="stripe-publishable-key"]');
  if (stripeMeta && typeof stripeMeta.getAttribute === 'function') {
    const stripeValue = stripeMeta.getAttribute('content');
    if (stripeValue) {
      config.stripePublicKey = stripeValue;
    }
  }

  const recaptchaMeta = document.querySelector('meta[name="recaptcha-site-key"]');
  if (recaptchaMeta && typeof recaptchaMeta.getAttribute === 'function') {
    const recaptchaValue = recaptchaMeta.getAttribute('content');
    if (recaptchaValue) {
      config.recaptchaSiteKey = recaptchaValue;
    }
  }

  return config;
};

const getBuildTimeConfig = () => {
  const config = {};
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL
  ) {
    config.apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  }

  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ) {
    config.stripePublicKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  }

  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
      import.meta.env.VITE_RECAPTCHA_SECRET_KEY)
  ) {
    config.recaptchaSiteKey =
      import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
      import.meta.env.VITE_RECAPTCHA_SECRET_KEY;
  }

  return config;
};

export const getApiBaseUrl = () => {
  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig.apiBaseUrl) {
    return runtimeConfig.apiBaseUrl;
  }

  const buildConfig = getBuildTimeConfig();
  if (buildConfig.apiBaseUrl) {
    return buildConfig.apiBaseUrl;
  }

  const metaConfig = getMetaConfig();
  if (metaConfig.apiBaseUrl) {
    return metaConfig.apiBaseUrl;
  }

  return FALLBACK_API_BASE_URL;
};

export const API_BASE_URL = getApiBaseUrl();

export const getStripePublicKey = () => {
  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig.stripePublicKey || runtimeConfig.stripePublishableKey) {
    return runtimeConfig.stripePublicKey || runtimeConfig.stripePublishableKey;
  }

  const buildConfig = getBuildTimeConfig();
  if (buildConfig.stripePublicKey) {
    return buildConfig.stripePublicKey;
  }

  const metaConfig = getMetaConfig();
  if (metaConfig.stripePublicKey) {
    return metaConfig.stripePublicKey;
  }

  return '';
};

export const getRecaptchaSiteKey = () => {
  const runtimeConfig = getRuntimeConfig();
  if (runtimeConfig.recaptchaSiteKey) {
    return runtimeConfig.recaptchaSiteKey;
  }

  const buildConfig = getBuildTimeConfig();
  if (buildConfig.recaptchaSiteKey) {
    return buildConfig.recaptchaSiteKey;
  }

  const metaConfig = getMetaConfig();
  if (metaConfig.recaptchaSiteKey) {
    return metaConfig.recaptchaSiteKey;
  }

  return '';
};
