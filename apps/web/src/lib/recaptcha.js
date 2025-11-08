'use strict';

let siteKeyCache = '';
let scriptPromise = null;
let readyPromise = null;

const getEnterpriseApi = () =>
  typeof window !== 'undefined' &&
  window.grecaptcha &&
  window.grecaptcha.enterprise
    ? window.grecaptcha.enterprise
    : null;

const ensurePublicKeyCredential = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const fallback = () => Promise.resolve(false);

  if (typeof window.PublicKeyCredential === 'undefined') {
    try {
      window.PublicKeyCredential = class PublicKeyCredentialPolyfill {
        static isUserVerifyingPlatformAuthenticatorAvailable() {
          return fallback();
        }
        static isConditionalMediationAvailable() {
          return fallback();
        }
      };
    } catch (error) {
      console.warn('[recaptcha] No se pudo definir PublicKeyCredential', error);
    }
    return;
  }

  if (
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
  ) {
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = fallback;
  }

  if (
    typeof window.PublicKeyCredential.isConditionalMediationAvailable !== 'function'
  ) {
    window.PublicKeyCredential.isConditionalMediationAvailable = fallback;
  }
};

const getSiteKey = (providedKey) => {
  const envKey =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      import.meta.env.VITE_RECAPTCHA_SITE_KEY) ||
    '';
  return providedKey || siteKeyCache || envKey || '';
};

const ensureBrowserContext = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('reCAPTCHA solo funciona en el navegador.');
  }
};

export const loadRecaptcha = (siteKey) => {
  ensureBrowserContext();
  ensurePublicKeyCredential();

  const resolvedKey = getSiteKey(siteKey);
  if (!resolvedKey) {
    throw new Error(
      'Falta la variable VITE_RECAPTCHA_SITE_KEY para inicializar reCAPTCHA.'
    );
  }

  if (readyPromise) {
    return readyPromise;
  }

  siteKeyCache = resolvedKey;

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existingApi = getEnterpriseApi();
      if (existingApi) {
        resolve(existingApi);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${resolvedKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const enterpriseApi = getEnterpriseApi();
        if (enterpriseApi) {
          resolve(enterpriseApi);
        } else {
          scriptPromise = null;
          reject(new Error('No se pudo inicializar reCAPTCHA Enterprise.'));
        }
      };
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('No se pudo cargar el script de reCAPTCHA Enterprise.'));
      };
      document.head.appendChild(script);
    });
  }

  readyPromise = scriptPromise
    .then(
      (enterpriseApi) =>
        new Promise((resolve, reject) => {
          if (!enterpriseApi || typeof enterpriseApi.ready !== 'function') {
            readyPromise = null;
            reject(new Error('reCAPTCHA Enterprise no quedo listo.'));
            return;
          }
          enterpriseApi.ready(() => resolve(enterpriseApi));
        })
    )
    .catch((error) => {
      readyPromise = null;
      throw error;
    });

  return readyPromise;
};

export const getRecaptchaToken = async (action = 'form_submit') => {
  ensureBrowserContext();

  const enterpriseApi = await (readyPromise || loadRecaptcha());
  if (!enterpriseApi || typeof enterpriseApi.execute !== 'function') {
    throw new Error('reCAPTCHA Enterprise no esta disponible en este navegador.');
  }

  const activeSiteKey = getSiteKey();
  if (!activeSiteKey) {
    throw new Error('No encontramos la llave publica para reCAPTCHA.');
  }

  return enterpriseApi.execute(activeSiteKey, { action });
};
