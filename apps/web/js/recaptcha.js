'use strict';

import { getRecaptchaSiteKey } from './env.js';

let recaptchaScriptPromise = null;

const loadRecaptchaScript = (siteKey) =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('reCAPTCHA solo funciona en el navegador.'));
      return;
    }
    if (window.grecaptcha) {
      resolve(window.grecaptcha);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.grecaptcha) {
        resolve(window.grecaptcha);
      } else {
        reject(new Error('No se pudo inicializar reCAPTCHA.'));
      }
    };
    script.onerror = () =>
      reject(new Error('No se pudo cargar reCAPTCHA. Verifica tu conexion.'));
    document.head.appendChild(script);
  });

export const getRecaptchaToken = async (action = 'submit') => {
  const siteKey = getRecaptchaSiteKey();
  if (!siteKey) {
    throw new Error('Falta la llave publica de reCAPTCHA.');
  }
  if (!recaptchaScriptPromise) {
    recaptchaScriptPromise = loadRecaptchaScript(siteKey);
  }
  await recaptchaScriptPromise;
  await new Promise((resolve) => window.grecaptcha.ready(resolve));
  return window.grecaptcha.execute(siteKey, { action });
};
