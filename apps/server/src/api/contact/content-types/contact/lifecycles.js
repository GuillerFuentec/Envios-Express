'use strict';

const { sendNotificationEmail } = require('../../../../utils/resend');

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
    const payload = result?.contact_info ?? {};
    const formatted = formatPayload(payload);
    const id = result?.id ?? 'desconocido';

    const subject = `Nuevo mensaje de contacto (#${id})`;
    const text = `Se recibió un nuevo mensaje de contacto (ID: ${id}).\n\nDatos:\n${formatted}`;
    const html = `
      <h1>Nuevo mensaje de contacto</h1>
      <p>Se registró un nuevo mensaje desde el formulario del sitio.</p>
      <p><strong>ID:</strong> ${escapeHtml(String(id))}</p>
      <pre style="padding:16px;background:#f6f8fa;border-radius:8px;white-space:pre-wrap;font-family:monospace;">${escapeHtml(formatted)}</pre>
    `;

    await sendNotificationEmail({ subject, html, text });
  },
};
