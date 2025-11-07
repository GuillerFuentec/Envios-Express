import { createPaymentIntent } from '../lib/api.js';
import { getStripe } from '../lib/stripe.js';

const selectors = {
  form: document.getElementById('checkoutForm'),
  email: document.getElementById('checkoutEmail'),
  name: document.getElementById('checkoutName'),
  amount: document.getElementById('checkoutAmount'),
  status: document.getElementById('checkoutStatus'),
  submit: document.getElementById('checkoutSubmit'),
  paymentElement: document.getElementById('payment-element'),
  paymentRequest: document.getElementById('payment-request-button'),
};

const pageConfig = (() => {
  const { dataset } = document.body || {};
  return {
    successUrl: dataset?.successUrl || '/src/pages/checkout-success.html',
    failedUrl: dataset?.failedUrl || '/src/pages/checkout-failed.html',
  };
})();

const state = {
  elements: null,
  paymentElement: null,
  paymentRequestButton: null,
  paymentRequest: null,
  clientSecret: null,
  amount: 9.99,
  currency: 'usd',
};

const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat('es-US', {
      style: 'currency',
      currency: state.currency.toUpperCase(),
    }).format(value);
  } catch (error) {
    return `$${value} ${state.currency.toUpperCase()}`;
  }
};

const buildAbsoluteUrl = (path) => {
  if (!path || typeof window === 'undefined') {
    return path;
  }
  if (path.startsWith('http')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${window.location.origin}${path}`;
  }
  return `${window.location.origin}/${path}`;
};

const setStatus = (message, type = 'info') => {
  if (!selectors.status) {
    return;
  }
  const demoNote = message ? ' · Modo demostracion' : '';
  selectors.status.textContent = (message || '') + demoNote;
  selectors.status.classList.remove('is-error', 'is-success');
  if (type === 'error') {
    selectors.status.classList.add('is-error');
  } else if (type === 'success') {
    selectors.status.classList.add('is-success');
  }
};

const toggleLoading = (isLoading) => {
  if (!selectors.submit) {
    return;
  }
  selectors.submit.disabled = isLoading;
  selectors.submit.textContent = isLoading ? 'Procesando...' : 'Pagar ahora';
};

const parseAmount = () => {
  if (!selectors.amount) {
    return state.amount;
  }
  const value = parseFloat(selectors.amount.value);
  if (!Number.isFinite(value) || value <= 0) {
    return state.amount;
  }
  state.amount = value;
  return state.amount;
};

const toMinorUnit = (value) => Math.round(value * 100);

const destroyPaymentRequestButton = () => {
  if (state.paymentRequestButton) {
    state.paymentRequestButton.destroy();
    state.paymentRequestButton = null;
  }
  state.paymentRequest = null;
  if (selectors.paymentRequest) {
    selectors.paymentRequest.hidden = true;
    selectors.paymentRequest.innerHTML = '';
  }
};

const setupPaymentRequest = async (stripe, clientSecret) => {
  if (!selectors.paymentRequest || !state.elements) {
    return;
  }
  destroyPaymentRequestButton();

  const paymentRequest = stripe.paymentRequest({
    country: 'US',
    currency: state.currency,
    total: {
      label: 'Paqueteria Caribeña Express',
      amount: toMinorUnit(state.amount),
    },
    requestPayerName: true,
    requestPayerEmail: true,
  });

  const result = await paymentRequest.canMakePayment();
  if (!result) {
    return;
  }

  const paymentRequestButton = state.elements.create('paymentRequestButton', {
    paymentRequest,
    style: {
      paymentRequestButton: {
        theme: 'dark',
        height: '44px',
        type: 'buy',
      },
    },
  });

  paymentRequest.on('cancel', () => {
    setStatus('Pago cancelado por el usuario.', 'error');
  });

  paymentRequest.on('paymentmethod', async (event) => {
    try {
      const { error: confirmError } = await stripe.confirmPayment(
        {
          clientSecret,
          payment_method: event.paymentMethod.id,
        },
        { handleActions: false }
      );

      if (confirmError) {
        event.complete('fail');
        setStatus(confirmError.message || 'No pudimos procesar el pago.', 'error');
        return;
      }

      event.complete('success');

      const { error: actionError, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
      });

      if (actionError) {
        setStatus(actionError.message || 'Pago pendiente de accion adicional.', 'error');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        setStatus('Pago completado. Redirigiendo...', 'success');
        window.setTimeout(() => {
          window.location.assign(
            `${buildAbsoluteUrl(pageConfig.successUrl)}?payment_intent=${paymentIntent.id}`
          );
        }, 500);
      }
    } catch (error) {
      event.complete('fail');
      console.error('[checkout] Error con Payment Request', error);
      setStatus('No pudimos completar el pago con Apple/Google Pay.', 'error');
    }
  });

  paymentRequestButton.mount(selectors.paymentRequest);
  selectors.paymentRequest.hidden = false;
  state.paymentRequest = paymentRequest;
  state.paymentRequestButton = paymentRequestButton;
};

const mountPaymentElement = async () => {
  if (!selectors.paymentElement) {
    return;
  }
  setStatus('Preparando pago seguro...');
  destroyPaymentRequestButton();
  try {
    const clientSecret = await createPaymentIntent({
      amount: parseAmount(),
      currency: state.currency,
      email: selectors.email?.value.trim(),
      name: selectors.name?.value.trim(),
    });
    const stripe = await getStripe();
    state.clientSecret = clientSecret;
    if (state.paymentElement) {
      state.paymentElement.destroy();
    }
    state.elements = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'flat',
        variables: {
          colorPrimary: '#0f766e',
          colorText: '#1f2933',
          borderRadius: '12px',
        },
      },
    });
    state.paymentElement = state.elements.create('payment');
    state.paymentElement.mount(selectors.paymentElement);
    await setupPaymentRequest(stripe, clientSecret);
    setStatus('Metodo de pago listo. Completa los datos y confirma tu pago.');
  } catch (error) {
    console.error('[checkout] No se pudo montar el Payment Element', error);
    setStatus(
      'No pudimos inicial el pago. Revisa tu conexion o intenta mas tarde.',
      'error'
    );
  }
};

const handleSubmit = async (event) => {
  event.preventDefault();
  if (!state.elements) {
    setStatus('El metodo de pago no esta listo todavia.', 'error');
    return;
  }
  toggleLoading(true);
  setStatus('Confirmando pago...');
  try {
    const stripe = await getStripe();
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements: state.elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: buildAbsoluteUrl(pageConfig.successUrl),
        payment_method_data: {
          billing_details: {
            email: selectors.email?.value.trim() || undefined,
            name: selectors.name?.value.trim() || undefined,
          },
        },
      },
    });

    if (error) {
      console.error('[checkout] Error confirmando pago', error);
      setStatus(error.message || 'No pudimos procesar el pago.', 'error');
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      setStatus('Pago completado. Redirigiendo...', 'success');
      setTimeout(() => {
        window.location.assign(
          `${buildAbsoluteUrl(pageConfig.successUrl)}?payment_intent=${
            paymentIntent.id
          }`
        );
      }, 900);
      return;
    }

    setStatus(
      'Pago pendiente de confirmacion. Revisa tu bandeja o sigue las instrucciones adicionales.'
    );
  } catch (error) {
    console.error('[checkout] Fallo inesperado', error);
    setStatus('No pudimos confirmar el pago. Intenta nuevamente.', 'error');
  } finally {
    toggleLoading(false);
  }
};

const initCheckout = () => {
  if (!selectors.form) {
    return;
  }
  parseAmount();
  mountPaymentElement();
  selectors.amount?.addEventListener('change', () => {
    parseAmount();
    setStatus(
      `Actualizamos el monto a ${formatCurrency(state.amount)}. Preparando pago...`
    );
    mountPaymentElement();
  });
  selectors.form.addEventListener('submit', handleSubmit);
};

document.addEventListener('DOMContentLoaded', initCheckout);
