'use strict';

const { createTransfer, verificarEstadoTransaccion, getStripeClient } = require('../../../utils/stripe');
const { getTransferConfig, shouldProcessTransferNow, formatScheduleInfo, getNextScheduledDate, TRANSFER_MODES } = require('../../../utils/transfer-config');

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

module.exports = {
  /**
   * Procesa transferencia a cuenta conectada tras pago exitoso
   * POST /api/payments/process-transfer
   * Body: { sessionId: 'cs_test_...', clientId?: 123 }
   */
  async processTransfer(ctx) {
    const { sessionId, clientId } = ctx.request.body || {};

    if (!sessionId) {
      return ctx.badRequest('sessionId es requerido');
    }

    try {
      // 1. Verificar estado del pago en Stripe
      const stripeSession = await verificarEstadoTransaccion(sessionId);
      
      if (!stripeSession || stripeSession.estadoPago !== 'paid') {
        return ctx.badRequest(`Pago no completado. Estado: ${stripeSession?.estadoPago || 'desconocido'}`);
      }

      // 2. Buscar registro del cliente para logging y actualización posterior
      let clientRecord = null;
      
      if (clientId) {
        // Buscar por ID si se proporciona
        clientRecord = await strapi.entityService.findOne('api::client.client', clientId);
      } else {
        // Buscar por sessionId si no se proporciona clientId
        const clients = await strapi.entityService.findMany('api::client.client', {
          filters: {
            client_info: {
              sessionId: { $eq: sessionId },
            },
          },
          limit: 1,
        });
        clientRecord = clients?.[0] || null;
      }

      if (!clientRecord) {
        return ctx.notFound(`No se encontró cliente para sessionId: ${sessionId}`);
      }

      const billing = clientRecord.client_info?.billing || {};

      // 2.1 Obtener datos frescos desde Stripe (Checkout Session + PI) para saber destino y monto
      const stripe = getStripeClient();
      if (!stripe) {
        ctx.throw(503, 'Stripe no configurado');
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

      // Log estado del registro de cliente y cálculo de destino/monto
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

      // 3. Validar datos de transferencia
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
        return ctx.badRequest('Datos de transferencia incompletos en el registro del cliente', {
          hasDestination: !!destinationAccount,
          hasAmount: !!destinationAmountCents,
          amount: destinationAmountCents,
        });
      }

      // 4. Verificar si ya se procesó la transferencia
      if (billing.transferId) {
        return ctx.conflict('Transferencia ya procesada', {
          transferId: billing.transferId,
          transferredAt: billing.transferredAt,
        });
      }

      // 5. Obtener sourceTransaction del PaymentIntent
      const sourceTransaction = stripeSession.detallesCargo?.id || pi?.latest_charge;
      if (!sourceTransaction) {
        return ctx.badRequest('No se pudo obtener ID del cargo para vincular la transferencia');
      }

      // 6. Crear transferencia en Stripe
      const transfer = await createTransfer({
        destinationAccount,
        amountCents: destinationAmountCents,
        currency: stripeSession.moneda,
        sourceTransaction,
        description: `Pago agencia - Cliente ${clientRecord.id} - Session ${sessionId}`,
        idempotencyKey: `transfer_client_${clientRecord.id}_${sessionId}`,
      });

      // 7. Actualizar registro del cliente con datos de transferencia
      const updatedClient = await strapi.entityService.update('api::client.client', clientRecord.id, {
        data: {
          client_info: {
            ...clientRecord.client_info,
            billing: {
              ...billing,
              transferId: transfer.id,
              transferredAt: new Date().toISOString(),
              transferStatus: 'completed',
            },
          },
        },
      });

      // 8. Log de éxito
      strapi.log.info('[payments] Transferencia procesada exitosamente', {
        clientId: clientRecord.id,
        sessionId,
        transferId: transfer.id,
        destinationAccount,
        amountCents: destinationAmountCents,
      });

      // 9. Respuesta al cliente
      ctx.body = {
        success: true,
        transfer: {
          id: transfer.id,
          amount: destinationAmountCents,
          currency: stripeSession.moneda,
          destination: destinationAccount,
          processedAt: new Date().toISOString(),
        },
        client: {
          id: clientRecord.id,
          sessionId,
        },
      };

    } catch (error) {
      strapi.log.error('[payments] Error procesando transferencia', {
        sessionId,
        clientId,
        error: error.message,
        code: error.code,
        type: error.type,
      });

      // Manejar errores específicos de Stripe
      if (error.type === 'StripeError') {
        return ctx.badRequest(`Error de Stripe: ${error.message}`, {
          code: error.code,
          param: error.param,
        });
      }

      return ctx.internalServerError('Error interno procesando transferencia');
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
      let totalProcessed = 0;
      let totalAmount = 0;
      
      for (const client of clientsWithPending) {
        const billing = client.client_info?.billing || {};
        const amountUSD = (billing.destinationAmountCents || 0) / 100;
        
        const shouldProcess = force || shouldProcessTransferNow(config, amountUSD);
        
        if (shouldProcess) {
          if (!dryRun) {
            try {
              // Usar el endpoint existente internamente
              const sessionId = client.client_info?.sessionId;
              if (sessionId) {
                // Simular llamada interna al processTransfer
                await this.processTransfer({
                  request: { body: { sessionId, clientId: client.id } },
                  badRequest: (msg) => { throw new Error(msg); },
                  notFound: (msg) => { throw new Error(msg); },
                  conflict: (msg) => { throw new Error(msg); },
                  internalServerError: (msg) => { throw new Error(msg); },
                });
                
                totalProcessed++;
                totalAmount += amountUSD;
              }
            } catch (transferError) {
              results.push({
                clientId: client.id,
                amount: amountUSD,
                status: 'failed',
                error: transferError.message,
              });
              continue;
            }
          }
          
          results.push({
            clientId: client.id,
            amount: amountUSD,
            status: dryRun ? 'would_process' : 'processed',
          });
        } else {
          results.push({
            clientId: client.id,
            amount: amountUSD,
            status: 'skipped',
            reason: `Below minimum ${config.minimumAmount} or wrong schedule`,
          });
        }
      }
      
      strapi.log.info('[transfers] Procesamiento por lotes completado', {
        totalClients: clientsWithPending.length,
        totalProcessed,
        totalAmount,
        dryRun,
        config: config.mode,
      });
      
      ctx.body = {
        success: true,
        summary: {
          totalFound: clientsWithPending.length,
          totalProcessed,
          totalAmount: `$${totalAmount.toFixed(2)}`,
          dryRun,
          config: formatScheduleInfo(config),
        },
        results,
      };
    } catch (error) {
      strapi.log.error('[transfers] Error procesando transferencias pendientes', { error: error.message });
      return ctx.internalServerError('Error procesando transferencias pendientes');
    }
  },
};
