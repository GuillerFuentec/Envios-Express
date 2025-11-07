'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/stripe/webhook',
      handler: 'stripe.webhook',
      config: {
        auth: false,
        prefix: '',
        policies: [],
        middlewares: [],
      },
    },
  ],
};
