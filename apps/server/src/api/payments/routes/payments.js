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
    {
      method: 'POST',
      path: '/payments/process-transfer',
      handler: 'transfers.processTransfer',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/payments/transfer-status/:clientId',
      handler: 'transfers.getTransferStatus',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/payments/transfer-config',
      handler: 'transfers.getTransferConfig',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/payments/transfer-config',
      handler: 'transfers.updateTransferConfig',
      config: {
        auth: false, // Cambiar a true en producción
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/payments/process-pending-transfers',
      handler: 'transfers.processPendingTransfers',
      config: {
        auth: false, // Cambiar a true en producción
        policies: [],
        middlewares: [],
      },
    },
  ],
};
