import { postJson } from './http.js';

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
  const contactStatus = document.getElementById('contactStatus');
  const contactSubmit = contactForm.querySelector('button[type="submit"]');

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

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
      sentAt: new Date().toISOString(),
    };

    try {
      const response = await postJson(CONTACTS_ENDPOINT, {
        contact_info: payload,
      });

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
