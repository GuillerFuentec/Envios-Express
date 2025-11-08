'use strict';

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    if (process.env.RECAPTCHA_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
      return next();
    }
    await next();
  };
};
