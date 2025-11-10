const jsonHeaders = {
  'Content-Type': 'application/json',
};

const handleResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || 'Ocurrió un error inesperado.';
    throw new Error(message);
  }
  return payload;
};

export const verifyRecaptchaToken = async (token) => {
  const response = await fetch('/api/security/recaptcha-verify', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ token }),
  });
  return handleResponse(response);
};

export const requestQuote = async (payload) => {
  const response = await fetch('/api/quote', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const requestCheckout = async (payload) => {
  const response = await fetch('/api/payments/checkout', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const createAgencyOrder = async (payload) => {
  const response = await fetch('/api/orders/create', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};
