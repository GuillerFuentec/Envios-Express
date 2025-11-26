'use strict';

const normalizeDigits = (value) => {
  if (!value) {
    return '';
  }
  return value.replace(/\D+/g, '');
};

export const normalizePhoneNumber = (value) => {
  const digits = normalizeDigits(value);
  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return '';
};
