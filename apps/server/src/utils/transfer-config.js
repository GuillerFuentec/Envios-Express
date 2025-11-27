'use strict';

/**
 * Gestor de configuración de transferencias
 */

const TRANSFER_MODES = {
  AUTO: 'auto',
  MANUAL: 'manual', 
  SCHEDULED_WEEKLY: 'scheduled_weekly',
  SCHEDULED_MONTHLY: 'scheduled_monthly',
  DISABLED: 'disabled'
};

const getTransferConfig = () => {
  return {
    mode: process.env.TRANSFER_MODE || TRANSFER_MODES.AUTO,
    scheduleDay: process.env.TRANSFER_SCHEDULE_DAY || 'monday',
    minimumAmount: parseFloat(process.env.TRANSFER_MINIMUM_AMOUNT || '50.00'),
    connectAccountId: process.env.STRIPE_CONNECT_ACCOUNT_ID,
  };
};

const shouldProcessTransferNow = (config, paymentAmount = 0) => {
  const { mode } = config;
  
  switch (mode) {
    case TRANSFER_MODES.AUTO:
      return true; // Siempre procesa inmediatamente
      
    case TRANSFER_MODES.MANUAL:
      return false; // Nunca automático
      
    case TRANSFER_MODES.SCHEDULED_WEEKLY:
    case TRANSFER_MODES.SCHEDULED_MONTHLY:
      // Solo si supera mínimo (para evitar micro-transferencias)
      return paymentAmount >= config.minimumAmount;
      
    case TRANSFER_MODES.DISABLED:
      return false;
      
    default:
      return false; // Modo seguro por defecto
  }
};

const getNextScheduledDate = (config) => {
  const { mode, scheduleDay } = config;
  const now = new Date();
  
  if (mode === TRANSFER_MODES.SCHEDULED_WEEKLY) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(scheduleDay.toLowerCase());
    const currentDay = now.getDay();
    
    let daysUntilNext = targetDay - currentDay;
    if (daysUntilNext <= 0) daysUntilNext += 7; // Next week
    
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + daysUntilNext);
    nextDate.setHours(9, 0, 0, 0); // 9 AM
    return nextDate;
  }
  
  if (mode === TRANSFER_MODES.SCHEDULED_MONTHLY) {
    const targetDay = parseInt(scheduleDay) || 1;
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, 9, 0, 0, 0);
    return nextDate;
  }
  
  return null;
};

const formatScheduleInfo = (config) => {
  const { mode, scheduleDay, minimumAmount } = config;
  
  switch (mode) {
    case TRANSFER_MODES.AUTO:
      return 'Automático: transferencias inmediatas tras cada pago';
      
    case TRANSFER_MODES.MANUAL:
      return 'Manual: transferencias solo por solicitud explícita';
      
    case TRANSFER_MODES.SCHEDULED_WEEKLY:
      return `Semanal: cada ${scheduleDay} (mínimo $${minimumAmount})`;
      
    case TRANSFER_MODES.SCHEDULED_MONTHLY:
      return `Mensual: día ${scheduleDay} de cada mes (mínimo $${minimumAmount})`;
      
    case TRANSFER_MODES.DISABLED:
      return 'Deshabilitado: no se procesarán transferencias';
      
    default:
      return `Desconocido: ${mode}`;
  }
};

module.exports = {
  TRANSFER_MODES,
  getTransferConfig,
  shouldProcessTransferNow,
  getNextScheduledDate,
  formatScheduleInfo,
};