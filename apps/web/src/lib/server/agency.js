"use strict";

const { getCache, setCache } = require("./cache");

const CACHE_TTL = 5 * 60 * 1000;
const AGENCY_CACHE_KEY = "agency:profile";
const AGENCY_CACHE_TTL_MS = Number(process.env.AGENCY_CACHE_TTL_MS || CACHE_TTL);

let cachedProfile = null;
let cachedAt = 0;

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
};

const resolvePricePerLb = (payload) => {
  if (!payload) {
    return null;
  }
  if (payload.Price_lb) {
    return toNumber(payload.Price_lb, null);
  }
  if (payload.price_lb) {
    return toNumber(payload.price_lb, null);
  }
  if (payload.pricelb) {
    return toNumber(payload.pricelb, null);
  }
  return null;
};

const normalizeAgencyPayload = (raw) => {
  const fallbackPrice = toNumber(process.env.DEFAULT_PRICE_PER_LB || 0);
  const priceFromEnv =
    toNumber(process.env.PRICE_LB_FALLBACK, null) ?? fallbackPrice;
  const agencySection = raw?.agency || raw?.data?.agency || {};
  const stripeSection = raw?.stripe || raw?.data?.stripe || {};
  const config = raw?.config || raw?.data?.config || {};

  const normalized = {
    name: agencySection.name || raw?.name || '',
    address: agencySection.address || raw?.address || '',
    place_id:
      agencySection.place_id ||
      raw?.place_id ||
      config?.agency?.place_id ||
      process.env.AGENCY_PLACE_ID ||
      '',
    Price_lb:
      resolvePricePerLb(raw) ||
      resolvePricePerLb(agencySection) ||
      resolvePricePerLb(config) ||
      priceFromEnv,
    ciudades_de_destino_cuba:
      raw?.ciudades_de_destino_cuba ||
      config?.ciudades_de_destino_cuba ||
      raw?.cities ||
      [],
    contenido_principal:
      raw?.contenido_principal ||
      config?.contenido_principal ||
      raw?.main_contents ||
      [],
    stripe_processing_percent:
      raw?.stripe_processing_percent ??
      raw?.stripe_fee_percent ??
      stripeSection.stripe_fee_percent ??
      config?.stripe?.stripe_fee_percent ??
      toNumber(process.env.STRIPE_PROCESSING_PERCENT || 0.029),
    stripe_processing_fixed:
      raw?.stripe_processing_fixed ??
      stripeSection.stripe_fixed_fee ??
      config?.stripe?.stripe_fixed_fee ??
      toNumber(process.env.STRIPE_PROCESSING_FIXED || 0.3),
  };

  return normalized;
};

const buildEnvFallback = () =>
  normalizeAgencyPayload({
    name: process.env.AGENCY_NAME || '',
    address: process.env.AGENCY_ADDRESS || '',
    place_id: process.env.AGENCY_PLACE_ID || '',
    Price_lb:
      process.env.PRICE_LB_FALLBACK ||
      process.env.DEFAULT_PRICE_PER_LB ||
      null,
    stripe_processing_percent: process.env.STRIPE_PROCESSING_PERCENT,
    stripe_processing_fixed: process.env.STRIPE_PROCESSING_FIXED,
    ciudades_de_destino_cuba: [],
    contenido_principal: [],
  });

const fetchAgencyProfile = async () => {
  const endpoint = process.env.AGENCY_INFO_URL;
  if (!endpoint) {
    return buildEnvFallback();
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (process.env.AGENCY_TOKEN) {
    headers.Authorization = `Bearer ${process.env.AGENCY_TOKEN}`;
  }

  const response = await fetch(endpoint, {
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `[agency] No se pudo obtener config (${response.status}). ${text}`
    );
    return buildEnvFallback();
  }

  const payload = await response.json();
  return normalizeAgencyPayload(payload);
};

const getAgencyProfile = async () => {
  const now = Date.now();
  const shared = await getCache(AGENCY_CACHE_KEY);
  if (shared) return shared;
  if (cachedProfile && now - cachedAt < CACHE_TTL) return cachedProfile;

  const profile = await fetchAgencyProfile();
  cachedProfile = profile;
  cachedAt = now;
  await setCache(AGENCY_CACHE_KEY, profile, AGENCY_CACHE_TTL_MS);
  return profile;
};

module.exports = {
  getAgencyProfile,
};
