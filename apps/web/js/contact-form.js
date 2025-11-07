import { postJson } from './http.js';
import { getRecaptchaToken } from './recaptcha.js';
import { validateContactFields } from './components/validators.js';

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

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const validation = validateContactFields({
      name: contactName?.value || '',
      email: contactEmail?.value || '',
      phone: contactPhone?.value || '',
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

    let captchaToken = '';
    try {
      captchaToken = await getRecaptchaToken('contact_form');
    } catch (error) {
      console.error('[contact] No se pudo obtener reCAPTCHA', error);
      if (contactStatus) {
        contactStatus.textContent =
          'No pudimos verificar que eres humano. Intenta nuevamente.';
        contactStatus.classList.remove('is-success');
        contactStatus.classList.add('is-error');
      }
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
      phone: contactPhone?.value.trim() || '',
      message: contactMessage?.value.trim() || '',
      smsConsent: Boolean(contactSmsConsent?.checked),
      sentAt: new Date().toISOString(),
    };

    try {
      const response = await postJson(
        CONTACTS_ENDPOINT,
        { contact_info: payload },
        { captchaToken }
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
      if (contactStatus) {
        contactStatus.textContent =
          'No pudimos enviar tu mensaje. Intentalo nuevamente.';
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
