'use strict';

/**
 * client controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { verifyRecaptchaEnterprise } = require('../../../utils/recaptcha');
const { normalizePhoneNumber } = require('../../../utils/phone');

module.exports = createCoreController('api::client.client', () => ({
  async create(ctx) {
    ctx.request.body = ctx.request.body || {};
    ctx.request.body.data = ctx.request.body.data || {};

    const bypassEnabled =
      process.env.RECAPTCHA_BYPASS === 'true' && process.env.NODE_ENV !== 'production';
    const recaptchaToken = ctx.request.body?.recaptchaToken;

    if (!bypassEnabled) {
      if (!recaptchaToken) {
        return ctx.badRequest('Completa el captcha para poder enviar el formulario.');
      }

      try {
        const { ok, score } = await verifyRecaptchaEnterprise(
          recaptchaToken,
          'funnel_form',
          ctx.ip || ctx.request.ip
        );

        if (!ok) {
          return ctx.badRequest('Captcha no verificado', { score });
        }
      } catch (error) {
        strapi.log.error('reCAPTCHA verification failed (client)', error);
        return ctx.internalServerError(
          'No pudimos validar el captcha en este momento. Intenta mas tarde.'
        );
      }
    }

    if (ctx.request.body && 'recaptchaToken' in ctx.request.body) {
      delete ctx.request.body.recaptchaToken;
    }

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

    return await super.create(ctx);
  },
}));
