'use strict';

/**
 * contact controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { normalizePhoneNumber } = require('../../../utils/phone');

module.exports = createCoreController('api::contact.contact', () => ({
  async create(ctx) {
    ctx.request.body = ctx.request.body || {};
    ctx.request.body.data = ctx.request.body.data || {};

    const contactInfo = ctx.request.body?.data?.contact_info;
    if (!contactInfo) {
      return ctx.badRequest('Faltan los datos del contacto.');
    }

    if (!contactInfo.smsConsent) {
      return ctx.badRequest('Debes autorizar los SMS para continuar.');
    }

    const normalizedPhone = normalizePhoneNumber(contactInfo.phone);
    if (!normalizedPhone) {
      return ctx.badRequest('Ingresa un telefono valido.');
    }
    contactInfo.phone = normalizedPhone;

    strapi.log.debug('[contact-controller] Payload listo para crear contacto.', {
      pid: process.pid,
      preview: {
        name: contactInfo.name,
        email: contactInfo.email,
        phone: normalizedPhone,
        smsConsent: contactInfo.smsConsent,
      },
    });

    return await super.create(ctx);
  },
}));
