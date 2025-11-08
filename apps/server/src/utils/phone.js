'use strict';

const normalizePhoneNumber = (value) => {
  if (!value) {
    return '';
  }

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

  return '';
};

module.exports = {
  normalizePhoneNumber,
};
