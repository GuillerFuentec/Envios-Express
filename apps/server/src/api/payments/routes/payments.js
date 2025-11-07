'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/payments/create-intent',
      handler: 'payments.createIntent',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
