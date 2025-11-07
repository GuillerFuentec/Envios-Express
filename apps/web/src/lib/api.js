import { API_BASE_URL } from '../../js/env.js';

const buildPayload = ({ amount, currency, email, name }) => ({
  amount,
  currency,
  email,
  metadata: {
    customer_name: name || '',
  },
});

export const createPaymentIntent = async ({ amount, currency, email, name }) => {
  const response = await fetch(`${API_BASE_URL}/api/payments/create-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildPayload({ amount, currency, email, name })),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `No pudimos iniciar el pago (${response.status}). ${text || ''}`.trim()
    );
  }

  const data = await response.json();
  if (!data?.clientSecret) {
    throw new Error('Respuesta incompleta del servidor de pagos.');
  }
  return data.clientSecret;
};
