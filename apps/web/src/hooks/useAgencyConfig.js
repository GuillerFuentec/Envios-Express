import { useEffect, useState } from "react";

let cachedConfig = null;
let cachedError = null;
let inflightPromise = null;

const fetchConfigOnce = () => {
  if (cachedConfig || cachedError) {
    return inflightPromise || Promise.resolve({ data: cachedConfig, error: cachedError });
  }
  if (!inflightPromise) {
    inflightPromise = fetch("/api/agency/config")
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || "No se pudo obtener la configuración.");
        }
        return response.json();
      })
      .then((json) => {
        cachedConfig = json;
        cachedError = null;
        return { data: json, error: null };
      })
      .catch((err) => {
        cachedError = err;
        throw err;
      })
      .finally(() => {
        inflightPromise = null;
      });
  }
  return inflightPromise;
};

export const useAgencyConfig = () => {
  const [data, setData] = useState(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig && !cachedError);
  const [error, setError] = useState(cachedError ? cachedError.message : "");

  useEffect(() => {
    let active = true;
    if (cachedConfig || cachedError) {
      setLoading(false);
      return undefined;
    }

    fetchConfigOnce()
      .then(({ data: fetchedData }) => {
        if (!active) {
          return;
        }
        setData(fetchedData);
        setError("");
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        console.error("[agency-config]", err);
        setError(err.message || "Error inesperado.");
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
