import './polyfills/public-key.js';
import { sendForm } from '@/src/lib/sendForm.js';
import { loadRecaptcha } from '@/src/lib/recaptcha.js';
import { validateContactFields } from './components/validators.js';
import { normalizePhoneNumber } from './components/phone.js';

const CLIENTS_ENDPOINT = '/api/clients';

const initFunnel = () => {
  const funnelForm = document.getElementById('funnelForm');
  if (!funnelForm) {
    return;
  }

  const steps = funnelForm.querySelectorAll('[data-funnel-step]');
  const progressBar = funnelForm.querySelector('[data-funnel-progress]');
  const stepLabel = funnelForm.querySelector('[data-funnel-step-label]');
  const nextBtn = funnelForm.querySelector('[data-funnel-next]');
  const prevBtn = funnelForm.querySelector('[data-funnel-prev]');
  const statusEl = document.getElementById('funnelStatus');
  const summaryEl = funnelForm.querySelector('[data-funnel-summary]');
  const summaryBody = summaryEl
    ? summaryEl.querySelector('.funnel__summary-body')
    : null;
  const checkoutButton = funnelForm.querySelector('[data-checkout-url]');
  const paymentPreferenceField = document.getElementById(
    'paymentPreferenceField'
  );
  const progressIndicator = funnelForm.querySelector('.funnel__progress-bar');
  const paymentButtons = funnelForm.querySelectorAll('.funnel__payment-btn');
  const paymentActionButtons = funnelForm.querySelectorAll(
    '[data-payment-action]'
  );

  let currentStep = 0;
  let funnelData = {
    contact: {},
    shipment: {},
    preferences: {},
  };
  let pendingAction = null;
  let checkoutWindow = null;
  let isSubmitting = false;

  const updateProgress = () => {
    if (!progressBar) {
      return;
    }
    const progress = ((currentStep + 1) / steps.length) * 100;
    progressBar.style.width = `${progress}%`;
    if (stepLabel) {
      stepLabel.textContent = String(currentStep + 1);
    }
  };

  const goToStep = (stepIndex) => {
    if (stepIndex < 0 || stepIndex >= steps.length) {
      return;
    }
    steps.forEach((step) => step.classList.remove('is-active'));
    steps[stepIndex].classList.add('is-active');
    currentStep = stepIndex;
    updateProgress();
    updateControls();
  };

  const collectStepData = (stepIndex) => {
    const step = steps[stepIndex];
    if (!step) {
      return;
    }
    const inputs = step.querySelectorAll('[data-field]');
    inputs.forEach((input) => {
      const field = input.getAttribute('data-field');
      if (!field) {
        return;
      }
      const [namespace, key] = field.split('.');
      if (!namespace || !key || !funnelData[namespace]) {
        return;
      }
      if (input.type === 'checkbox') {
        funnelData[namespace][key] = Boolean(input.checked);
      } else {
        funnelData[namespace][key] = input.value.trim();
      }
    });
  };

  const getFieldValue = (path, fallback = '—') => {
    const [namespace, key] = path.split('.');
    if (!namespace || !key || !funnelData[namespace]) {
      return fallback;
    }
    const value = funnelData[namespace][key];
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    return value || fallback;
  };

  const updateSummary = () => {
    if (!summaryBody) {
      return;
    }
    const summaryItems = [
      { label: 'Nombre', value: getFieldValue('contact.name') },
      { label: 'Email', value: getFieldValue('contact.email') },
      { label: 'Telefono', value: getFieldValue('contact.phone') },
      { label: 'Peso estimado', value: `${getFieldValue('shipment.weight')} lb` },
      { label: 'Ciudad destino', value: getFieldValue('shipment.city') },
      { label: 'Tipo de envio', value: getFieldValue('shipment.mode') },
      { label: 'Contenido', value: getFieldValue('shipment.content') },
      {
        label: 'Fecha ideal',
        value: getFieldValue('preferences.targetDate', 'Sin definir'),
      },
      {
        label: 'Direccion de recogida',
        value: getFieldValue('preferences.pickupAddress', 'Sin definir'),
      },
      {
        label: 'Comentarios',
        value: getFieldValue('preferences.notes', 'Sin comentarios'),
      },
    ];

    summaryBody.innerHTML = summaryItems
      .map(
        (item) => `
        <div class="funnel__summary-row">
          <dt>${item.label}</dt>
          <dd>${item.value}</dd>
        </div>
      `
      )
      .join('');
  };

  const setStatus = (message, variant = '') => {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message || '';
    statusEl.classList.remove('is-success', 'is-error');
    if (variant === 'success') {
      statusEl.classList.add('is-success');
    } else if (variant === 'error') {
      statusEl.classList.add('is-error');
    }
  };

  const setPaymentPreference = (value) => {
    if (!paymentPreferenceField) {
      return;
    }
    paymentPreferenceField.value = value;
  };

  const togglePaymentButtons = (disabled) => {
    paymentButtons.forEach((button) => {
      button.disabled = disabled;
      button.classList.toggle('is-disabled', disabled);
    });
  };

  const validateStep = (stepIndex) => {
    const step = steps[stepIndex];
    if (!step) {
      return true;
    }

    const inputs = step.querySelectorAll('input, select, textarea');
    for (const input of inputs) {
      if (!input.checkValidity()) {
        input.reportValidity();
        return false;
      }
    }

    if (stepIndex === 0) {
      const nameInput = step.querySelector('[data-field="contact.name"]');
      const emailInput = step.querySelector('[data-field="contact.email"]');
      const phoneInput = step.querySelector('[data-field="contact.phone"]');
      const normalizedPhone = normalizePhoneNumber(phoneInput?.value || '');
      const validation = validateContactFields({
        name: nameInput?.value || '',
        email: emailInput?.value || '',
        phone: normalizedPhone,
      });
      if (!validation.valid) {
        setStatus(validation.message, 'error');
        const invalidField = step.querySelector(
          `[data-field="${validation.field}"]`
        );
        invalidField?.focus();
        return false;
      }
      if (normalizedPhone && phoneInput) {
        phoneInput.value = normalizedPhone;
      }
    }

    return true;
  };

  const updateControls = () => {
    if (!nextBtn || !prevBtn) {
      return;
    }
    prevBtn.disabled = currentStep === 0;
    prevBtn.classList.toggle('is-disabled', currentStep === 0);
    nextBtn.hidden = currentStep === steps.length - 1;
    if (progressIndicator) {
      const progress = ((currentStep + 1) / steps.length) * 100;
      progressIndicator.style.width = `${progress}%`;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    collectStepData(currentStep);
    goToStep(currentStep + 1);
  };

  const handlePrev = () => {
    goToStep(currentStep - 1);
  };

  const triggerSubmission = (action) => {
    pendingAction = action;
    setPaymentPreference(action === 'cod' ? 'cod' : 'online');
    if (action === 'online') {
      checkoutWindow = window.open('', '_blank', 'noopener');
      if (checkoutWindow) {
        checkoutWindow.document.write(
          '<p style="font-family:monospace;padding:16px;">Preparando checkout seguro...</p>'
        );
      }
    }
    if (typeof funnelForm.requestSubmit === 'function') {
      funnelForm.requestSubmit();
    } else {
      funnelForm.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  };

  if (nextBtn) {
    nextBtn.addEventListener('click', handleNext);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', handlePrev);
  }

  if (paymentActionButtons.length) {
    paymentActionButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-payment-action');
        if (!action) {
          return;
        }
        triggerSubmission(action);
      });
    });
  }

  setPaymentPreference(paymentPreferenceField?.value || 'sin_definir');

  funnelForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    if (!pendingAction) {
      setStatus('Selecciona como deseas continuar.', 'error');
      return;
    }
    if (!validateStep(currentStep)) {
      if (checkoutWindow && !checkoutWindow.closed) {
        checkoutWindow.close();
      }
      checkoutWindow = null;
      pendingAction = null;
      return;
    }
    collectStepData(currentStep);
    updateSummary();
    const payload = JSON.parse(JSON.stringify(funnelData));

    setStatus('Registrando tu informacion...');
    togglePaymentButtons(true);
    isSubmitting = true;
    const actionUsed = pendingAction;
    let submissionSuccessful = false;

    try {
      localStorage.setItem('funnelDraft', JSON.stringify(payload));
    } catch (error) {
      console.warn('No se pudo guardar el funnel en localStorage', error);
    }

    try {
      const response = await sendForm(
        CLIENTS_ENDPOINT,
        { data: { client_info: payload } },
        { action: 'funnel_form' }
      );

      if (!response.ok) {
        throw new Error(`Respuesta inesperada (${response.status})`);
      }

      submissionSuccessful = true;

      if (actionUsed === 'online') {
        setStatus('Informacion guardada. Abriendo el checkout seguro...', 'success');
        const url =
          checkoutButton?.getAttribute('data-checkout-url') ||
          './src/pages/checkout.html';
        window.setTimeout(() => {
          if (checkoutWindow && !checkoutWindow.closed) {
            checkoutWindow.location.href = url;
          } else {
            window.open(url, '_blank', 'noopener');
          }
        }, 400);
      } else {
        setStatus(
          'Listo. Te enviaremos un SMS para confirmar el pago contra entrega.',
          'success'
        );
      }
    } catch (error) {
      console.error('Error al enviar el funnel', error);
      const message =
        typeof error?.message === 'string' &&
        error.message.toLowerCase().includes('recaptcha')
          ? 'No pudimos verificar que eres humano. Intenta nuevamente.'
          : 'No se pudo enviar la informacion. Intentalo de nuevo mas tarde.';
      setStatus(message, 'error');
    } finally {
      if (checkoutWindow && (!submissionSuccessful || actionUsed !== 'online')) {
        checkoutWindow.close();
        checkoutWindow = null;
      }
      if (submissionSuccessful && actionUsed === 'online') {
        checkoutWindow = null;
      }
      pendingAction = null;
      isSubmitting = false;
      togglePaymentButtons(false);
    }
  });

  updateControls();

  if (window.feather && typeof window.feather.replace === 'function') {
    window.feather.replace();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadRecaptcha().catch((error) => {
    console.warn('[recaptcha] No se pudo precargar el script', error);
  });
  initFunnel();
});

export { initFunnel };
