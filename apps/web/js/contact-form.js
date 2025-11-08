import './polyfills/public-key.js';
import { sendForm } from '@/src/lib/sendForm.js';
import { loadRecaptcha } from '@/src/lib/recaptcha.js';
import { validateContactFields } from './components/validators.js';
import { normalizePhoneNumber } from './components/phone.js';

const CONTACTS_ENDPOINT = '/api/contacts';

const initContactForm = () => {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) {
    return;
  }

  const contactName = document.getElementById('contactName');
  const contactEmail = document.getElementById('contactEmail');
  const contactPhone = document.getElementById('contactPhone');
  const contactMessage = document.getElementById('contactMessage');
  const contactSmsConsent = document.getElementById('contactSmsConsent');
  const contactStatus = document.getElementById('contactStatus');
  const contactSubmit = contactForm.querySelector('button[type="submit"]');

  loadRecaptcha().catch((error) => {
    console.warn('[recaptcha] No se pudo precargar el script', error);
  });

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const normalizedPhone = normalizePhoneNumber(contactPhone?.value || '');
    const validation = validateContactFields({
      name: contactName?.value || '',
      email: contactEmail?.value || '',
      phone: normalizedPhone,
    });
    if (!validation.valid) {
      if (contactStatus) {
        contactStatus.textContent = validation.message;
        contactStatus.classList.remove('is-success');
        contactStatus.classList.add('is-error');
      }
      let focusField = null;
      if (validation.field === 'contact.name') {
        focusField = contactName;
      } else if (validation.field === 'contact.email') {
        focusField = contactEmail;
      } else if (validation.field === 'contact.phone') {
        focusField = contactPhone;
      }
      focusField?.focus();
      return;
    }

    if (contactSmsConsent && !contactSmsConsent.checked) {
      if (contactStatus) {
        contactStatus.textContent =
          'Necesitamos tu autorizacion para enviarte mensajes de texto.';
        contactStatus.classList.remove('is-success');
        contactStatus.classList.add('is-error');
      }
      contactSmsConsent.focus();
      return;
    }

    if (contactStatus) {
      contactStatus.textContent = 'Enviando mensaje...';
      contactStatus.classList.remove('is-success', 'is-error');
    }

    if (contactSubmit) {
      contactSubmit.disabled = true;
      contactSubmit.textContent = 'Enviando...';
    }

    const payload = {
      name: contactName?.value.trim() || '',
      email: contactEmail?.value.trim() || '',
      phone: normalizedPhone,
      message: contactMessage?.value.trim() || '',
      smsConsent: Boolean(contactSmsConsent?.checked),
      sentAt: new Date().toISOString(),
    };

    try {
      const response = await sendForm(
        CONTACTS_ENDPOINT,
        { data: { contact_info: payload } },
        { action: 'contact_form' }
      );

      if (!response.ok) {
        throw new Error(`Respuesta inesperada (${response.status})`);
      }

      if (contactStatus) {
        contactStatus.textContent =
          'Gracias por escribirnos. Te responderemos muy pronto.';
        contactStatus.classList.add('is-success');
      }
      contactForm.reset();
    } catch (error) {
      console.error('Error al enviar el contacto', error);
      const isRecaptchaError =
        typeof error?.message === 'string' &&
        error.message.toLowerCase().includes('recaptcha');
      if (contactStatus) {
        contactStatus.textContent = isRecaptchaError
          ? 'No pudimos verificar que eres humano. Intenta nuevamente.'
          : 'No pudimos enviar tu mensaje. Intentalo nuevamente.';
        contactStatus.classList.add('is-error');
      }
    } finally {
      if (contactSubmit) {
        contactSubmit.disabled = false;
        contactSubmit.textContent = 'Enviar mensaje';
      }
    }
  });
};

document.addEventListener('DOMContentLoaded', initContactForm);
    if (normalizedPhone) {
      contactPhone.value = normalizedPhone;
    }
