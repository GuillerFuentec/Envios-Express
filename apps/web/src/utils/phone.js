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

export const formatPhoneDisplay = (value = '') => {
  const digits = String(value).replace(/\D+/g, '');
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const mid = digits.slice(3, 6);
    const last = digits.slice(6);
    return `(${area}) ${mid}-${last}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const mid = digits.slice(4, 7);
    const last = digits.slice(7);
    return `(${area}) ${mid}-${last}`;
  }
  return value;
};

export const formatPhoneForInput = (value = '') => formatPhoneDisplay(value);
