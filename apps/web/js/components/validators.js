import { normalizePhoneNumber } from './phone.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+1\d{10}$/;

export const validateContactFields = ({ name = '', email = '', phone = '' }) => {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const normalizedPhone = normalizePhoneNumber(phone);

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

  if (!phoneRegex.test(normalizedPhone)) {
    return {
      valid: false,
      message: 'Ingresa un telefono valido (incluye codigo de pais).',
      field: 'contact.phone',
    };
  }

  return { valid: true };
};
