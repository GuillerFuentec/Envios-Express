export const formatCurrency = (value, currency = 'USD') => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
