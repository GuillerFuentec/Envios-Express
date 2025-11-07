'use strict';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9\s-]{7,}$/;

export const validateContactFields = ({ name = '', email = '', phone = '' }) => {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();

  if (trimmedName.length < 3) {
    return {
      valid: false,
      message: 'Ingresa un nombre valido (al menos 3 caracteres).',
      field: 'contact.name',
    };
  }

  if (!emailRegex.test(trimmedEmail)) {
    return {
      valid: false,
      message: 'Ingresa un correo valido.',
      field: 'contact.email',
    };
  }

  if (!phoneRegex.test(trimmedPhone)) {
    return {
      valid: false,
      message: 'Ingresa un telefono valido (incluye codigo de pais).',
      field: 'contact.phone',
    };
  }

  return { valid: true };
};
