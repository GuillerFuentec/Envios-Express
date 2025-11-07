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

  const meta = document.querySelector('meta[name="backend-url"]');
  if (meta && typeof meta.getAttribute === 'function') {
    const value = meta.getAttribute('content');
    if (value) {
      return { apiBaseUrl: value };
    }
  }

  return {};
};

const getBuildTimeConfig = () => {
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL
  ) {
    return { apiBaseUrl: import.meta.env.VITE_API_BASE_URL };
  }

  return {};
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
