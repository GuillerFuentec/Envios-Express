'use strict';

/**
 * client controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { normalizePhoneNumber } = require('../../../utils/phone');

module.exports = createCoreController('api::client.client', () => ({
  async create(ctx) {
    ctx.request.body = ctx.request.body || {};
    ctx.request.body.data = ctx.request.body.data || {};

    const clientInfo = ctx.request.body?.data?.client_info;
    if (!clientInfo) {
      return ctx.badRequest('Faltan los datos del cliente.');
    }

    if (!clientInfo?.contact?.smsConsent) {
      return ctx.badRequest('Necesitamos tu permiso para enviarte SMS.');
    }

    const normalizedPhone = normalizePhoneNumber(clientInfo.contact?.phone);
    if (!normalizedPhone) {
      return ctx.badRequest('Ingresa un telefono valido.');
    }
    clientInfo.contact.phone = normalizedPhone;

    strapi.log.debug('[client-controller] Payload listo para crear cliente.', {
      pid: process.pid,
      preview: {
        contactName: clientInfo.contact?.name,
        contactEmail: clientInfo.contact?.email,
        phone: normalizedPhone,
        smsConsent: clientInfo.contact?.smsConsent,
      },
    });

    return await super.create(ctx);
  },
}));
