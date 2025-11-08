'use strict';

const { sendNotificationEmail } = require('../../../../utils/resend');
const { sendClientThankYouSms } = require('../../../../utils/notification-api');

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatPayload = (payload) => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch (error) {
    return String(payload);
  }
};

module.exports = {
  async afterCreate(event) {
    const { result } = event;
    const payload = result?.client_info ?? {};
    const formatted = formatPayload(payload);
    const id = result?.id ?? 'desconocido';

    const subject = `Nuevo encargo creado (#${id})`;
    const text = `Se registro un nuevo encargo (ID: ${id}).\n\nDatos:\n${formatted}`;
    const html = `
      <h1>Nuevo encargo</h1>
      <p>Se registro un nuevo encargo en la plataforma.</p>
      <p><strong>ID:</strong> ${escapeHtml(String(id))}</p>
      <pre style="padding:16px;background:#f6f8fa;border-radius:8px;white-space:pre-wrap;font-family:monospace;">${escapeHtml(formatted)}</pre>
    `;

    await sendNotificationEmail({ subject, html, text });

    if (payload?.contact?.smsConsent) {
      await sendClientThankYouSms({
        phone: payload.contact.phone,
        name: payload.contact.name,
      });
    }
  },
};
