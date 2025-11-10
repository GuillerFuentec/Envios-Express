import { useEffect, useState } from 'react';

export const useAgencyConfig = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch('/api/agency/config')
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || 'No se pudo obtener la configuración.');
        }
        return response.json();
      })
      .then((json) => {
        if (active) {
          setData(json);
          setError('');
        }
      })
      .catch((err) => {
        console.error('[agency-config]', err);
        if (active) {
          setError(err.message || 'Error inesperado.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
};
