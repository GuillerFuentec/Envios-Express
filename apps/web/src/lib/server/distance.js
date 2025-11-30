"use strict";

const { getCache, setCache } = require("./cache");

const DISTANCE_CACHE_TTL_MS = Number(process.env.DISTANCE_CACHE_TTL_MS || 120_000);

const metersToMiles = (meters) => {
  if (!Number.isFinite(meters)) {
    return 0;
  }
  return Number((meters / 1609.34).toFixed(2));
};

const secondsToMinutes = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return 0;
  }
  return Math.round(seconds / 60);
};

const buildLocationParam = (placeId, address) => {
  if (placeId) {
    return `place_id:${placeId}`;
  }
  if (address && address.trim()) {
    return address.trim();
  }
  return null;
};

const getDistanceMatrix = async ({ originPlaceId, destinationPlaceId, destinationAddress }) => {
  if (!originPlaceId) {
    throw new Error('Falta el place_id de la agencia.');
  }
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Falta GOOGLE_MAPS_API_KEY para Distance Matrix.');
  }

  const originParam = buildLocationParam(originPlaceId);
  const destinationParam = buildLocationParam(destinationPlaceId, destinationAddress);
  if (!destinationParam) {
    throw new Error('Falta el destino para calcular la recogida.');
  }

  console.log('[distance-matrix] Request', {
    origin: originParam,
    destination: destinationParam,
    hasPlaceId: Boolean(destinationPlaceId),
  });

  const params = new URLSearchParams({
    origins: originParam,
    destinations: destinationParam,
    key: apiKey,
    units: 'imperial',
  });

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
  const cacheKey = `distance:${originParam}:${destinationParam}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok || payload.status !== 'OK') {
    console.error('[distance-matrix] API error', {
      status: response.status,
      payload,
    });
    throw new Error('No se pudo calcular la distancia para la recogida.');
  }

  const element = payload?.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    throw new Error('No se encontró una ruta válida para la recogida.');
  }

  const distanceMeters = element.distance?.value ?? 0;
  const durationSeconds = element.duration?.value ?? 0;

  const result = {
    distanceMiles: metersToMiles(distanceMeters),
    durationMinutes: secondsToMinutes(durationSeconds),
  };
  console.log('[distance-matrix] Response', result);
  await setCache(cacheKey, result, DISTANCE_CACHE_TTL_MS); // concurrency: avoid repeated upstream calls
  return result;
};

module.exports = {
  getDistanceMatrix,
};
