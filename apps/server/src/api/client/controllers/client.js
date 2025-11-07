'use strict';

/**
 * client controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { verifyRecaptchaToken } = require('../../../utils/recaptcha');

module.exports = createCoreController('api::client.client', () => ({
  async create(ctx) {
    ctx.request.body = ctx.request.body || {};
    ctx.request.body.data = ctx.request.body.data || {};

    const captchaToken = ctx.request.body?.captchaToken;
    const isHuman = await verifyRecaptchaToken(captchaToken);
    if (!isHuman) {
      return ctx.badRequest('No pudimos validar el captcha. Intentalo nuevamente.');
    }

    if (ctx.request.body && 'captchaToken' in ctx.request.body) {
      delete ctx.request.body.captchaToken;
    }

    const clientInfo = ctx.request.body?.data?.client_info;
    if (!clientInfo) {
      return ctx.badRequest('Faltan los datos del cliente.');
    }

    if (!clientInfo?.contact?.smsConsent) {
      return ctx.badRequest('Necesitamos tu permiso para enviarte SMS.');
    }

    return await super.create(ctx);
  },
}));
