import { useCallback, useEffect, useRef, useState } from 'react';

const RECAPTCHA_SRC = 'https://www.google.com/recaptcha/api.js';

const loadScript = (siteKey) =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('reCAPTCHA solo está disponible en el navegador.'));
      return;
    }

    if (!siteKey) {
      reject(new Error('Falta NEXT_PUBLIC_RECAPTCHA_SITE_KEY.'));
      return;
    }

    if (window.grecaptcha) {
      resolve(window.grecaptcha);
      return;
    }

    const existing = document.querySelector(`script[src^="${RECAPTCHA_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.grecaptcha));
      existing.addEventListener('error', () =>
        reject(new Error('No se pudo cargar reCAPTCHA.'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = `${RECAPTCHA_SRC}?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.grecaptcha);
    script.onerror = () => reject(new Error('No se pudo cargar reCAPTCHA.'));
    document.body.appendChild(script);
  });

export const useRecaptcha = (siteKey) => {
  const [ready, setReady] = useState(false);
  const apiRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (typeof window === 'undefined') {
      return undefined;
    }

    loadScript(siteKey)
      .then((api) => {
        if (!active) {
          return;
        }
        if (!api) {
          throw new Error('API de reCAPTCHA no disponible.');
        }
        api.ready(() => {
          if (!active) {
            return;
          }
          apiRef.current = api;
          setReady(true);
        });
      })
      .catch((error) => {
        console.error('[recaptcha] No se pudo inicializar', error);
        if (active) {
          setReady(false);
        }
      });

    return () => {
      active = false;
    };
  }, [siteKey]);

  const execute = useCallback(
    async (action = 'funnel') => {
      if (!ready || !apiRef.current) {
        throw new Error('reCAPTCHA todavía no está listo.');
      }
      return apiRef.current.execute(siteKey, { action });
    },
    [ready, siteKey]
  );

  return { ready, execute };
};
