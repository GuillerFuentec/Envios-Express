'use strict';

import { API_BASE_URL } from '../../js/env.js';

export const sendForm = async (endpoint, payload = {}, options = {}) => {
  const { request = {} } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...(request.headers || {}),
  };

  const body = JSON.stringify(payload);

  return fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    ...request,
    headers,
    body,
  });
};
