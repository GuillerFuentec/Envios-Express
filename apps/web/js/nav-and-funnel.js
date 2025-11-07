import { postJson } from './http.js';

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
  const submitBtn = funnelForm.querySelector('[data-funnel-submit]');
  const statusEl = document.getElementById('funnelStatus');
  let currentStep = 0;
  const totalSteps = stepElements.length || 1;

  const funnelData = {
    contact: { name: '', email: '', phone: '' },
    shipment: { weight: '', city: '', mode: '', content: '' },
    preferences: { targetDate: '', pickupAddress: '', notes: '' },
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
    ];
    summaryBody.innerHTML = template
      .map((item) => `<p><span>${item.label}:</span> ${item.value}</p>`)
      .join('');
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
    if (submitBtn) {
      submitBtn.hidden = currentStep < totalSteps - 1;
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
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.classList.remove('is-success', 'is-error');
    }
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
    return true;
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

  funnelForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateStep(currentStep)) {
      return;
    }
    collectStepData(currentStep);
    updateSummary();
    const payload = JSON.parse(JSON.stringify(funnelData));

    if (statusEl) {
      statusEl.textContent = 'Enviando informacion...';
      statusEl.classList.remove('is-success', 'is-error');
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
    }

    try {
      localStorage.setItem('funnelDraft', JSON.stringify(payload));
    } catch (storageError) {
      console.warn('No se pudo guardar el funnel en localStorage', storageError);
    }

    try {
      const response = await postJson(CLIENTS_ENDPOINT, { client_info: payload });

      if (!response.ok) {
        throw new Error(`Respuesta inesperada (${response.status})`);
      }

      if (statusEl) {
        statusEl.textContent = 'Listo. Revisaremos la informacion y te contactaremos en breve.';
        statusEl.classList.add('is-success');
      }
    } catch (error) {
      console.error('Error al enviar el funnel', error);
      if (statusEl) {
        statusEl.textContent = 'No se pudo enviar la informacion. Intentalo de nuevo mas tarde.';
        statusEl.classList.add('is-error');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar informacion';
      }
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
