'use strict';

/**
 * contact controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { verifyRecaptchaToken } = require('../../../utils/recaptcha');

module.exports = createCoreController('api::contact.contact', () => ({
  async create(ctx) {
    ctx.request.body = ctx.request.body || {};
    ctx.request.body.data = ctx.request.body.data || {};

    const captchaToken = ctx.request.body?.captchaToken;
    const isHuman = await verifyRecaptchaToken(captchaToken);
    if (!isHuman) {
      return ctx.badRequest('No pudimos validar el captcha. Intentalo de nuevo.');
    }

    if (ctx.request.body && 'captchaToken' in ctx.request.body) {
      delete ctx.request.body.captchaToken;
    }

    const contactInfo = ctx.request.body?.data?.contact_info;
    if (!contactInfo) {
      return ctx.badRequest('Faltan los datos del contacto.');
    }

    if (!contactInfo.smsConsent) {
      return ctx.badRequest('Debes autorizar los SMS para continuar.');
    }

    return await super.create(ctx);
  },
}));
