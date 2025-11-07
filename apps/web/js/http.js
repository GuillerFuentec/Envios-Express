import { API_BASE_URL } from './env.js';

export const postJson = (endpoint, data) =>
  fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  });
