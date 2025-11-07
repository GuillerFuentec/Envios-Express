import { postJson } from './http.js';
import { getRecaptchaToken } from './recaptcha.js';
import { validateContactFields } from './components/validators.js';

const CLIENTS_ENDPOINT = '/api/clients';

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const toggleMenuFactory = (toggle, mobileMenu) => (forceClose = false) => {
  if (!toggle || !mobileMenu) {
    return;
  }

  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  const shouldOpen = forceClose ? false : !expanded;

  toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');

  if (shouldOpen) {
    mobileMenu.hidden = false;
    mobileMenu.removeAttribute('hidden');
  } else {
    mobileMenu.hidden = true;
    mobileMenu.setAttribute('hidden', '');
  }
};

const animateScroll = (startY, targetY, duration = 300) => {
  const distance = targetY - startY;
  let startTime = null;

  const step = (currentTime) => {
    if (startTime === null) {
      startTime = currentTime;
    }

    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    window.scrollTo(0, startY + distance * eased);

    if (timeElapsed < duration) {
      window.requestAnimationFrame(step);
    }
  };

  window.requestAnimationFrame(step);
};

const initNavigation = () => {
  const navbar = document.querySelector('.site-navbar');
  const toggle = navbar ? navbar.querySelector('.site-navbar__toggle') : null;
  const mobileMenu = navbar ? navbar.querySelector('#mobile-menu') : null;
  const scrollLinks = document.querySelectorAll('[data-scroll="true"]');

  const toggleMenu = toggleMenuFactory(toggle, mobileMenu);

  if (toggle) {
    toggle.addEventListener('click', () => toggleMenu(false));
  }

  const handleSmoothScroll = function (event) {
    const href = this.getAttribute('href');
    if (!href || !href.startsWith('#')) {
      return;
    }

    const target = document.querySelector(href);
    if (!target) {
      return;
    }

    event.preventDefault();

    const navHeight = navbar ? navbar.offsetHeight || 0 : 0;
    const targetY =
      target.getBoundingClientRect().top +
      window.pageYOffset -
      (navHeight + 12);

    animateScroll(window.pageYOffset, targetY);
    toggleMenu(true);
  };

  scrollLinks.forEach((link) => {
    link.addEventListener('click', handleSmoothScroll);
  });

  const trackedSections = Array.from(scrollLinks)
    .map((link) => {
      const href = link.getAttribute('href');
      return href && href.startsWith('#') ? document.querySelector(href) : null;
    })
    .filter(Boolean);

  const setActiveLink = () => {
    if (!trackedSections.length) {
      return;
    }

    const navHeight = navbar ? navbar.offsetHeight || 0 : 0;
    const scrollPosition = window.pageYOffset + navHeight + 24;
    let currentSection = trackedSections[0];

    trackedSections.forEach((section) => {
      if (section.offsetTop <= scrollPosition) {
        currentSection = section;
      }
    });

    const currentId = currentSection.id;

    scrollLinks.forEach((link) => {
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        setActiveLink();
        ticking = false;
      });

      ticking = true;
    }
  });

  setActiveLink();
};

const initFunnel = () => {
  const funnelForm = document.getElementById('funnelForm');
  if (!funnelForm) {
    return;
  }

  const stepElements = Array.from(
    funnelForm.querySelectorAll('[data-funnel-step]')
  );
  const stepLabel = document.querySelector('[data-funnel-step-label]');
  const progressBar = document.querySelector('[data-funnel-progress]');
  const summaryContainer = funnelForm.querySelector('[data-funnel-summary]');
  const summaryBody = summaryContainer
    ? summaryContainer.querySelector('.funnel__summary-body')
    : null;
  const prevBtn = funnelForm.querySelector('[data-funnel-prev]');
  const nextBtn = funnelForm.querySelector('[data-funnel-next]');
  const statusEl = document.getElementById('funnelStatus');
  const paymentPreferenceField = funnelForm.querySelector(
    '[data-field="preferences.paymentPreference"]'
  );
  const paymentChoiceButtons = funnelForm.querySelectorAll('[data-payment-choice]');
  const paymentActionButtons = funnelForm.querySelectorAll('[data-payment-action]');
  const checkoutButton = funnelForm.querySelector('[data-payment-action="online"]');
  let currentStep = 0;
  const totalSteps = stepElements.length || 1;
  let pendingAction = null;
  let checkoutWindow = null;
  let isSubmitting = false;

  const funnelData = {
    contact: { name: '', email: '', phone: '', smsConsent: false },
    shipment: { weight: '', city: '', mode: '', content: '' },
    preferences: {
      targetDate: '',
      pickupAddress: '',
      notes: '',
      paymentPreference: 'sin_definir',
    },
  };

  const paymentLabels = {
    online: 'Pago en linea (Stripe)',
    cod: 'Pago al entregar',
    sin_definir: 'Pendiente de confirmacion',
  };

  const setStatus = (message, type = 'info') => {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message || '';
    statusEl.classList.remove('is-success', 'is-error');
    if (type === 'error') {
      statusEl.classList.add('is-error');
    }
    if (type === 'success') {
      statusEl.classList.add('is-success');
    }
  };

  const setNestedValue = (obj, path, value) => {
    if (!path) {
      return;
    }
    const parts = path.split('.');
    let ref = obj;
    parts.forEach((key, index) => {
      if (index === parts.length - 1) {
        ref[key] = value;
        return;
      }
      if (!ref[key] || typeof ref[key] !== 'object') {
        ref[key] = {};
      }
      ref = ref[key];
    });
  };

  const setPaymentPreference = (value) => {
    if (paymentPreferenceField) {
      paymentPreferenceField.value = value;
    }
    setNestedValue(funnelData, 'preferences.paymentPreference', value);
    paymentChoiceButtons.forEach((button) => {
      const choice = button.getAttribute('data-payment-choice');
      button.classList.toggle('is-selected', choice === value);
    });
  };

  const collectStepData = (index) => {
    const step = stepElements[index];
    if (!step) {
      return;
    }
    const fields = step.querySelectorAll('[data-field]');
    fields.forEach((field) => {
      const key = field.getAttribute('data-field');
      if (!key) {
        return;
      }
      const value =
        field.type === 'checkbox' ? field.checked : field.value.trim();
      setNestedValue(funnelData, key, value);
    });
  };

  const updateSummary = () => {
    if (!summaryBody) {
      return;
    }
    const template = [
      { label: 'Nombre', value: funnelData.contact.name || 'No indicado' },
      { label: 'Correo', value: funnelData.contact.email || 'No indicado' },
      { label: 'Telefono', value: funnelData.contact.phone || 'No indicado' },
      {
        label: 'Recibir SMS',
        value: funnelData.contact.smsConsent ? 'Si, autorizado' : 'Sin autorizacion',
      },
      {
        label: 'Peso estimado',
        value: funnelData.shipment.weight
          ? `${funnelData.shipment.weight} lb`
          : 'No indicado',
      },
      { label: 'Destino', value: funnelData.shipment.city || 'No indicado' },
      { label: 'Tipo de envio', value: funnelData.shipment.mode || 'No indicado' },
      { label: 'Contenido', value: funnelData.shipment.content || 'No indicado' },
      { label: 'Fecha ideal', value: funnelData.preferences.targetDate || 'No indicado' },
      {
        label: 'Direccion de recogida',
        value: funnelData.preferences.pickupAddress || 'No indicado',
      },
      { label: 'Notas', value: funnelData.preferences.notes || 'Sin notas' },
      {
        label: 'Metodo de pago',
        value:
          paymentLabels[funnelData.preferences.paymentPreference] ||
          paymentLabels.sin_definir,
      },
    ];
    const summaryMarkup = template
      .map(
        (item) => `
          <dt>${item.label}</dt>
          <dd>${item.value}</dd>
        `
      )
      .join('');
    summaryBody.innerHTML = `<dl class="funnel__summary-list">${summaryMarkup}</dl>`;
  };

  const togglePaymentButtons = (disabled) => {
    paymentActionButtons.forEach((button) => {
      button.disabled = disabled;
      button.classList.toggle('is-disabled', disabled);
    });
  };

  const updateControls = () => {
    stepElements.forEach((step, index) => {
      step.classList.toggle('is-active', index === currentStep);
    });
    if (stepLabel) {
      stepLabel.textContent = String(currentStep + 1);
    }
    if (progressBar) {
      const progress = ((currentStep + 1) / totalSteps) * 100;
      progressBar.style.width = `${progress}%`;
    }
    if (prevBtn) {
      const isDisabled = currentStep === 0;
      prevBtn.disabled = isDisabled;
      prevBtn.classList.toggle('is-disabled', isDisabled);
    }
    if (nextBtn) {
      nextBtn.hidden = currentStep >= totalSteps - 1;
    }
  };

  const goToStep = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= totalSteps) {
      return;
    }
    currentStep = nextIndex;
    updateControls();
    if (currentStep === totalSteps - 1) {
      collectStepData(currentStep);
      updateSummary();
    }
    setStatus('');
  };

  const validateStep = (index) => {
    const step = stepElements[index];
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

    if (index === 0) {
      const name = step.querySelector('[data-field="contact.name"]')?.value || '';
      const email = step.querySelector('[data-field="contact.email"]')?.value || '';
      const phone = step.querySelector('[data-field="contact.phone"]')?.value || '';
      const validation = validateContactFields({ name, email, phone });
      if (!validation.valid) {
        setStatus(validation.message, 'error');
        const field = step.querySelector(`[data-field="${validation.field}"]`);
        field?.focus();
        return false;
      }
    }

    return true;
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
    nextBtn.addEventListener('click', () => {
      if (!validateStep(currentStep)) {
        return;
      }
      collectStepData(currentStep);
      goToStep(currentStep + 1);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      goToStep(currentStep - 1);
    });
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

    let captchaToken = '';
    try {
      captchaToken = await getRecaptchaToken('funnel_form');
    } catch (error) {
      console.error('[funnel] No se pudo obtener reCAPTCHA', error);
      setStatus('No pudimos verificar que eres humano. Intenta nuevamente.', 'error');
      if (checkoutWindow && !checkoutWindow.closed) {
        checkoutWindow.close();
        checkoutWindow = null;
      }
      pendingAction = null;
      return;
    }

    setStatus('Registrando tu informacion...');
    togglePaymentButtons(true);
    isSubmitting = true;
    const actionUsed = pendingAction;
    let submissionSuccessful = false;

    try {
      localStorage.setItem('funnelDraft', JSON.stringify(payload));
    } catch (storageError) {
      console.warn('No se pudo guardar el funnel en localStorage', storageError);
    }

    try {
      const response = await postJson(
        CLIENTS_ENDPOINT,
        { client_info: payload },
        { captchaToken }
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
      setStatus('No se pudo enviar la informacion. Intentalo de nuevo mas tarde.', 'error');
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
  initNavigation();
  initFunnel();
});
