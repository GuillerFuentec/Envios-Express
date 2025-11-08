'use strict';

/**
 * contact controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { verifyRecaptchaEnterprise } = require('../../../utils/recaptcha');
const { normalizePhoneNumber } = require('../../../utils/phone');
const { sendContactThankYouSms } = require('../../../utils/notification-api');

module.exports = createCoreController('api::contact.contact', () => ({
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
          'contact_form',
          ctx.ip || ctx.request.ip
        );
        if (!ok) {
          return ctx.badRequest('Captcha no verificado', { score });
        }
      } catch (error) {
        strapi.log.error('reCAPTCHA verification failed (contact)', error);
        return ctx.internalServerError(
          'No pudimos validar el captcha en este momento. Intenta mas tarde.'
        );
      }
    }

    if (ctx.request.body && 'recaptchaToken' in ctx.request.body) {
      delete ctx.request.body.recaptchaToken;
    }

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

    const response = await super.create(ctx);

    sendContactThankYouSms({
      phone: normalizedPhone,
      name: contactInfo.name,
    }).catch((error) => {
      strapi.log.warn('No se pudo enviar el SMS de contacto', error);
    });

    return response;
  },
}));
