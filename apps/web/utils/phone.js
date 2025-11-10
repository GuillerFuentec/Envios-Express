export const normalizePhoneNumber = (value = '') => {
  const digits = String(value).replace(/\D+/g, '');
  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('01')) {
    return `+${digits.slice(1)}`;
  }

  return '';
};
