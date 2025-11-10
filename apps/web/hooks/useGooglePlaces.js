import { useEffect, useRef, useState } from 'react';

const loadGoogleMapsScript = (apiKey) =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Maps solo funciona en el navegador.'));
      return;
    }

    if (!apiKey) {
      reject(new Error('Falta NEXT_PUBLIC_GOOGLE_MAPS_KEY.'));
      return;
    }

    if (window.google?.maps?.places) {
      resolve(window.google);
      return;
    }

    const existing = document.querySelector(
      `script[src^="https://maps.googleapis.com/maps/api/js"]`
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () =>
        reject(new Error('No se pudo cargar Google Maps.'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps.'));
    document.body.appendChild(script);
  });

export const useGooglePlacesAutocomplete = ({
  enabled,
  onPlaceSelected,
  apiKey,
}) => {
  const [ready, setReady] = useState(false);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    if (!enabled) {
      return undefined;
    }

    loadGoogleMapsScript(apiKey)
      .then((google) => {
        if (!mounted) {
          return;
        }
        if (!google?.maps?.places) {
          throw new Error('Google Places no esta disponible.');
        }
        setReady(true);
      })
      .catch((error) => {
        console.error('[google-maps] Error al cargar', error);
        if (mounted) {
          setReady(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [apiKey, enabled]);

  useEffect(() => {
    if (!enabled || !ready || !inputRef.current) {
      return undefined;
    }
    const google = window.google;
    if (!google?.maps?.places) {
      return undefined;
    }

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'place_id'],
      componentRestrictions: { country: ['us'] },
    });
    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place) {
        return;
      }
      onPlaceSelected?.({
        address: place.formatted_address || '',
        placeId: place.place_id || '',
      });
    });

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [enabled, onPlaceSelected, ready]);

  return { ready, inputRef };
};
