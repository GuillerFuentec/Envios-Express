'use strict';

const crypto = require('crypto');
const { sendNotificationEmail } = require('../../../../utils/resend');
const { sendContactThankYouSms } = require('../../../../utils/notification-api');
const { normalizePhoneNumber } = require('../../../../utils/phone');

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const htmlList = (title, rows = []) => {
  if (!rows.length) {
    return '';
  }
  const items = rows
    .filter(Boolean)
    .map(
      ({ label, value }) =>
        `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value ?? '-')}</li>`
    )
    .join('');
  return `<h2 style="margin:16px 0 8px;">${escapeHtml(title)}</h2><ul style="padding-left:18px;">${items}</ul>`;
};

const textList = (title, rows = []) => {
  if (!rows.length) {
    return '';
  }
  const items = rows
    .filter(Boolean)
    .map(({ label, value }) => `- ${label}: ${value ?? '-'}`)
    .join('\n');
  return `${title}\n${items}`;
};

const buildSignatureHash = (subject, text) =>
  crypto.createHash('sha1').update(`${subject}|${text}`).digest('hex');

module.exports = {
  async afterCreate(event) {
    const { result } = event;

    const isDraftCreation =
      result?.publishedAt === null ||
      result?.publishedAt === undefined ||
      event.params?.data?.publishedAt === null ||
      event.params?.data?.publishedAt === undefined;

    if (!isDraftCreation) {
      strapi.log.debug('[contact-lifecycle] Skip notification (publish action).', {
        pid: process.pid,
        id: result?.id ?? 'desconocido',
        publishedAt: result?.publishedAt,
      });
      return;
    }

    const payload = result?.contact_info ?? {};
    const id = result?.id ?? 'desconocido';

    const subject = `Nuevo mensaje de contacto (#${id})`;
    const html = `
      <h1 style="margin:0 0 12px;">Nuevo mensaje de contacto</h1>
      <p>Se registró un nuevo mensaje desde el formulario del sitio.</p>
      <p><strong>ID:</strong> ${escapeHtml(String(id))}</p>
      ${htmlList('Datos de contacto', [
        { label: 'Nombre', value: payload.name },
        { label: 'Correo', value: payload.email },
        { label: 'Teléfono', value: payload.phone },
        { label: 'SMS consentido', value: payload.smsConsent ? 'Sí' : 'No' },
      ])}
      ${htmlList('Mensaje', [
        { label: 'Contenido', value: payload.message },
      ])}
    `;

    const textSections = [
      textList('Datos de contacto', [
        { label: 'Nombre', value: payload.name },
        { label: 'Correo', value: payload.email },
        { label: 'Teléfono', value: payload.phone },
        { label: 'SMS consentido', value: payload.smsConsent ? 'Sí' : 'No' },
      ]),
      textList('Mensaje', [{ label: 'Contenido', value: payload.message }]),
    ]
      .filter(Boolean)
      .join('\n\n');
    const text = `Se recibió un nuevo mensaje de contacto (ID: ${id}).\n\n${textSections}`;

    const signature = buildSignatureHash(subject, text);
    strapi.log.debug('[contact-lifecycle] Enviando correo de contacto.', {
      pid: process.pid,
      id,
      signature,
    });

    await sendNotificationEmail({ subject, html, text });

    const contactInfo = payload || {};
    const smsConsent = Boolean(contactInfo.smsConsent);

    strapi.log.debug('[contact-lifecycle] Evaluando SMS.', {
      pid: process.pid,
      id,
      smsConsent,
      rawPhone: contactInfo.phone,
    });

    if (!smsConsent) {
      return;
    }

    try {
      const normalizedPhone = normalizePhoneNumber(contactInfo.phone);
      if (normalizedPhone) {
        await sendContactThankYouSms({
          phone: normalizedPhone,
          name: contactInfo.name,
        });
        strapi.log.debug('[contact-lifecycle] SMS enviado al contacto.', {
          pid: process.pid,
          id,
          phone: normalizedPhone,
        });
      } else {
        strapi.log.warn('No se pudo enviar SMS: telefono invalido en contacto', {
          id: result.id,
        });
      }
    } catch (error) {
      strapi.log.warn('No se pudo enviar el SMS del contacto', error);
    }
  },
};
