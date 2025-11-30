'use strict';

const { createTransfer, verificarEstadoTransaccion, getStripeClient } = require('../../../utils/stripe');
const { getTransferConfig, shouldProcessTransferNow, formatScheduleInfo, getNextScheduledDate, TRANSFER_MODES } = require('../../../utils/transfer-config');
const { enqueueJob, queueSize } = require('../../../utils/job-queue');

const computeStripeFeeCents = (amountCents) => {
  const percent = Number(process.env.STRIPE_PROC_PERCENT || 2.9) / 100;
  const fixed = Math.round(Number(process.env.STRIPE_PROC_FIXED || 0.3) * 100);
  return Math.max(0, Math.round(amountCents * percent + fixed));
};

const computePlatformFeeCents = (amountCents, stripeFeeCents) => {
  const rate = Number(process.env.PLATFORM_FEE_PERCENT || process.env.PLATFORM_FEE_RATE || 2.3) / 100;
  const base = amountCents - (stripeFeeCents || 0);
  return Math.max(110, Math.round(base * rate)); // mínimo $1.10
};

const buildHttpError = (status, message, details) => {
  const error = new Error(message);
  error.status = status;
  if (details) error.details = details;
  return error;
};

const findClientRecord = async ({ sessionId, clientId }) => {
  if (clientId) {
    return strapi.entityService.findOne('api::client.client', clientId);
  }
  const clients = await strapi.entityService.findMany('api::client.client', {
    filters: {
      client_info: {
        sessionId: { $eq: sessionId },
      },
    },
    limit: 1,
  });
  return clients?.[0] || null;
};

const processTransferJob = async ({ sessionId, clientId }) => {
  if (!sessionId) {
    throw buildHttpError(400, 'sessionId es requerido');
  }

  // 1. Verificar estado de pago
  const stripeSession = await verificarEstadoTransaccion(sessionId);
  if (!stripeSession || stripeSession.estadoPago !== 'paid') {
    throw buildHttpError(
      400,
      `Pago no completado. Estado: ${stripeSession?.estadoPago || 'desconocido'}`
    );
  }

  // 2. Obtener cliente
  const clientRecord = await findClientRecord({ sessionId, clientId });
  if (!clientRecord) {
    throw buildHttpError(404, `No se encontró cliente para sessionId: ${sessionId}`);
  }
  const billing = clientRecord.client_info?.billing || {};

  // 3. Obtener datos frescos de Stripe
  const stripe = getStripeClient();
  if (!stripe) {
    throw buildHttpError(503, 'Stripe no configurado');
  }
  let liveSession = null;
  try {
    liveSession = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  } catch (err) {
    strapi.log.warn('[payments] No se pudo recuperar la checkout session para transferencia', {
      sessionId,
      error: err.message,
    });
  }
  const pi = liveSession?.payment_intent;

  const destinationAccount =
    pi?.transfer_data?.destination ||
    process.env.STRIPE_CONNECT_ACCOUNT_ID ||
    billing.destinationAccount;

  const amountReceived = typeof pi?.amount_received === 'number' ? pi.amount_received : null;
  const billingStripeFee = billing.stripeFeeCents || computeStripeFeeCents(amountReceived || 0);
  const billingPlatformFee = billing.platformFeeCents || computePlatformFeeCents(amountReceived || 0, billingStripeFee);
  const destinationAmountCents =
    (amountReceived !== null
      ? amountReceived - billingStripeFee - billingPlatformFee
      : undefined) ||
    billing.destinationAmountCents;

  try {
    strapi.log.debug('[payments] Billing/destino calculado', {
      sessionId,
      clientId: clientRecord.id,
      billingJson: JSON.stringify(billing),
      clientInfoKeys: Object.keys(clientRecord.client_info || {}),
      destinationAccount,
      destinationAmountCents,
      piHasDestination: !!pi?.transfer_data?.destination,
      piAmountReceived: pi?.amount_received,
      piApplicationFee: pi?.application_fee_amount,
    });
  } catch (e) {
    strapi.log.debug('[payments] No se pudo loggear billing', { error: e.message });
  }

  if (!destinationAccount || !destinationAmountCents || destinationAmountCents <= 0) {
    const ctxLog = {
      sessionId,
      clientId: clientRecord.id,
      destinationAccount,
      destinationAmountCents,
      hasDestination: !!destinationAccount,
      hasAmount: !!destinationAmountCents,
      fullBilling: billing,
      clientInfoKeys: Object.keys(clientRecord.client_info || {}),
      piHasDestination: !!pi?.transfer_data?.destination,
      piAmountReceived: pi?.amount_received,
      piApplicationFee: pi?.application_fee_amount,
    };
    strapi.log.error('[payments] Datos de transferencia faltantes/invalidos ' + JSON.stringify(ctxLog));
    throw buildHttpError(400, 'Datos de transferencia incompletos en el registro del cliente', {
      hasDestination: !!destinationAccount,
      hasAmount: !!destinationAmountCents,
      amount: destinationAmountCents,
    });
  }

  if (billing.transferId) {
    throw buildHttpError(409, 'Transferencia ya procesada', {
      transferId: billing.transferId,
      transferredAt: billing.transferredAt,
    });
  }

  const sourceTransaction = stripeSession.detallesCargo?.id || pi?.latest_charge;
  if (!sourceTransaction) {
    throw buildHttpError(400, 'No se pudo obtener ID del cargo para vincular la transferencia');
  }

  // 4. Crear transferencia
  const transfer = await createTransfer({
    destinationAccount,
    amountCents: destinationAmountCents,
    currency: stripeSession.moneda,
    sourceTransaction,
    description: `Pago agencia - Cliente ${clientRecord.id} - Session ${sessionId}`,
    idempotencyKey: `transfer_client_${clientRecord.id}_${sessionId}`,
  });

  // 5. Actualizar registro cliente
  const updatedClient = await strapi.entityService.update('api::client.client', clientRecord.id, {
    data: {
      client_info: {
        ...clientRecord.client_info,
        billing: {
          ...billing,
          transferId: transfer.id,
          transferredAt: new Date().toISOString(),
          transferStatus: 'completed',
          destinationAccount,
          destinationAmountCents,
        },
      },
    },
  });

  strapi.log.info('[payments] Transferencia procesada exitosamente', {
    clientId: clientRecord.id,
    sessionId,
    transferId: transfer.id,
    destinationAccount,
    amountCents: destinationAmountCents,
  });

  return {
    transfer,
    client: updatedClient || clientRecord,
    currency: stripeSession.moneda,
    destinationAccount,
    destinationAmountCents,
  };
};

const respondWithError = (ctx, error) => {
  strapi.log.error('[payments] Error procesando transferencia', {
    sessionId: ctx.request.body?.sessionId,
    clientId: ctx.request.body?.clientId,
    error: error.message,
    code: error.code,
    type: error.type,
  });

  if (error.status) {
    ctx.status = error.status;
    ctx.body = { error: error.message, details: error.details || null };
    return;
  }

  if (error.type === 'StripeError') {
    ctx.status = 400;
    ctx.body = { error: `Error de Stripe: ${error.message}`, code: error.code, param: error.param };
    return;
  }

  ctx.internalServerError('Error interno procesando transferencia');
};

module.exports = {
  /**
   * Procesa transferencia a cuenta conectada tras pago exitoso
   * POST /api/payments/process-transfer
   * Body: { sessionId: 'cs_test_...', clientId?: 123 }
   */
  async processTransfer(ctx) {
    try {
      const result = await processTransferJob({ sessionId, clientId });
      ctx.body = {
        success: true,
        transfer: {
          id: result.transfer.id,
          amount: result.destinationAmountCents,
          currency: result.currency,
          destination: result.destinationAccount,
          processedAt: new Date().toISOString(),
        },
        client: {
          id: result.client?.id || clientId,
          sessionId,
        },
      };
    } catch (error) {
      respondWithError(ctx, error);
    }
  },

  /**
   * Consultar estado de transferencia
   * GET /api/payments/transfer-status/:clientId
   */
  async getTransferStatus(ctx) {
    const { clientId } = ctx.params;

    if (!clientId) {
      return ctx.badRequest('clientId es requerido');
    }

    try {
      const clientRecord = await strapi.entityService.findOne('api::client.client', clientId);
      
      if (!clientRecord) {
        return ctx.notFound(`Cliente ${clientId} no encontrado`);
      }

      const billing = clientRecord.client_info?.billing || {};
      const hasTransfer = !!billing.transferId;

      ctx.body = {
        clientId: parseInt(clientId),
        sessionId: clientRecord.client_info?.sessionId,
        transfer: hasTransfer ? {
          id: billing.transferId,
          processedAt: billing.transferredAt,
          status: billing.transferStatus || 'completed',
          destinationAccount: billing.destinationAccount,
          amountCents: billing.destinationAmountCents,
        } : null,
        hasTransfer,
      };

    } catch (error) {
      strapi.log.error('[payments] Error consultando estado transferencia', {
        clientId,
        error: error.message,
      });
      
      return ctx.internalServerError('Error consultando estado de transferencia');
    }
  },

  /**
   * Obtener configuración actual de transferencias
   * GET /api/payments/transfer-config
   */
  async getTransferConfig(ctx) {
    try {
      const config = getTransferConfig();
      const nextScheduled = getNextScheduledDate(config);
      
      ctx.body = {
        current: {
          mode: config.mode,
          scheduleDay: config.scheduleDay,
          minimumAmount: config.minimumAmount,
          connectAccountId: config.connectAccountId,
          description: formatScheduleInfo(config),
        },
        nextScheduledTransfer: nextScheduled ? nextScheduled.toISOString() : null,
        availableModes: Object.values(TRANSFER_MODES),
      };
    } catch (error) {
      strapi.log.error('[transfers] Error obteniendo configuración', { error: error.message });
      return ctx.internalServerError('Error obteniendo configuración de transferencias');
    }
  },

  /**
   * Actualizar configuración de transferencias (requiere autenticación admin)
   * PUT /api/payments/transfer-config
   */
  async updateTransferConfig(ctx) {
    const { mode, scheduleDay, minimumAmount } = ctx.request.body || {};
    
    // Validaciones
    if (mode && !Object.values(TRANSFER_MODES).includes(mode)) {
      return ctx.badRequest(`Modo inválido. Opciones: ${Object.values(TRANSFER_MODES).join(', ')}`);
    }
    
    if (minimumAmount !== undefined && (isNaN(minimumAmount) || minimumAmount < 0)) {
      return ctx.badRequest('minimumAmount debe ser un número >= 0');
    }

    try {
      // En producción, esto debería actualizarse en base de datos o archivo de config
      // Por ahora, solo devolvemos la nueva configuración simulada
      const currentConfig = getTransferConfig();
      const newConfig = {
        ...currentConfig,
        ...(mode && { mode }),
        ...(scheduleDay && { scheduleDay }),
        ...(minimumAmount !== undefined && { minimumAmount }),
      };
      
      strapi.log.info('[transfers] Configuración actualizada', {
        previous: currentConfig,
        new: newConfig,
        updatedBy: ctx.state.user?.id || 'system'
      });
      
      ctx.body = {
        success: true,
        config: {
          ...newConfig,
          description: formatScheduleInfo(newConfig),
        },
        message: 'Configuración actualizada. Reinicia el servidor para aplicar cambios en variables de entorno.',
      };
    } catch (error) {
      strapi.log.error('[transfers] Error actualizando configuración', { error: error.message });
      return ctx.internalServerError('Error actualizando configuración');
    }
  },

  /**
   * Procesar transferencias pendientes (para cron jobs o ejecución manual)
   * POST /api/payments/process-pending-transfers
   */
  async processPendingTransfers(ctx) {
    const { force = false, dryRun = false } = ctx.request.body || {};
    
    try {
      const config = getTransferConfig();
      
      // Buscar clientes con billing pendiente
      const clientsWithPending = await strapi.entityService.findMany('api::client.client', {
        filters: {
          client_info: {
            billing: {
              destinationAmountCents: { $gt: 0 },
              transferId: { $null: true }, // Sin transferencia procesada
            },
          },
        },
        limit: 100,
      });
      
      const results = [];
      let totalQueued = 0;
      let totalAmount = 0;
      
      for (const client of clientsWithPending) {
        const billing = client.client_info?.billing || {};
        const amountUSD = (billing.destinationAmountCents || 0) / 100;
        
        const shouldProcess = force || shouldProcessTransferNow(config, amountUSD);
        
        if (!shouldProcess) {
          results.push({
            clientId: client.id,
            amount: amountUSD,
            status: 'skipped',
            reason: `Below minimum ${config.minimumAmount} or wrong schedule`,
          });
          continue;
        }

        const sessionId = client.client_info?.sessionId;
        if (!sessionId) {
          results.push({
            clientId: client.id,
            amount: amountUSD,
            status: 'failed',
            error: 'El cliente no tiene sessionId para procesar transferencia',
          });
          continue;
        }

        if (dryRun) {
          results.push({
            clientId: client.id,
            amount: amountUSD,
            status: 'would_process',
          });
          continue;
        }

        const jobId = enqueueJob('transfer', () =>
          processTransferJob({ sessionId, clientId: client.id })
        );

        totalQueued++;
        totalAmount += amountUSD;
        results.push({
          clientId: client.id,
          amount: amountUSD,
          status: 'queued',
          jobId,
          sessionId,
        });
      }
      
      strapi.log.info('[transfers] Procesamiento por lotes completado', {
        totalClients: clientsWithPending.length,
        totalQueued,
        totalAmount,
        dryRun,
        config: config.mode,
      });
      
      ctx.body = {
        success: true,
        summary: {
          totalFound: clientsWithPending.length,
          totalQueued,
          totalAmount: `$${totalAmount.toFixed(2)}`,
          dryRun,
          config: formatScheduleInfo(config),
          queueDepth: queueSize(),
        },
        results,
      };
    } catch (error) {
      strapi.log.error('[transfers] Error procesando transferencias pendientes', { error: error.message });
      return ctx.internalServerError('Error procesando transferencias pendientes');
    }
  },
};
