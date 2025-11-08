'use strict';

import { API_BASE_URL } from '../../js/env.js';
import { loadRecaptcha, getRecaptchaToken } from './recaptcha.js';

const ensureRecaptchaReady = async () => {
  try {
    await loadRecaptcha();
  } catch (error) {
    console.error('[recaptcha] No se pudo inicializar:', error);
    alert('No pudimos inicializar reCAPTCHA. Intenta mas tarde.');
    throw error;
  }
};

export const sendForm = async (endpoint, payload = {}, options = {}) => {
  const { action = 'form_submit', request = {} } = options;

  await ensureRecaptchaReady();

  let recaptchaToken = '';
  try {
    recaptchaToken = await getRecaptchaToken(action);
  } catch (error) {
    console.error('[recaptcha] No se pudo obtener el token:', error);
    alert('No se pudo generar el token de reCAPTCHA');
    throw error;
  }

  if (!recaptchaToken) {
    alert('No se pudo generar el token de reCAPTCHA');
    throw new Error('Missing reCAPTCHA token');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(request.headers || {}),
  };

  const body = JSON.stringify({
    ...payload,
    recaptchaToken,
  });

  return fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    ...request,
    headers,
    body,
  });
};
