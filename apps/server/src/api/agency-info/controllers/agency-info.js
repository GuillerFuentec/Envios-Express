const { createCoreController } = require("@strapi/strapi").factories;

const DEFAULT_CONFIG = {
  address: "425 NE 22nd St, Miami, FL 33137, USA",
  place_id: "",
  Price_lb: 3.5,
  ciudades_de_destino_cuba: [
    "Artemisa",
    "La Habana",
    "Mayabeque",
    "Matanzas",
    "Cienfuegos",
    "Villa Clara",
    "Sancti Spiritus",
    "Ciego de Avila",
    "Camaguey",
    "Las Tunas",
    "Holguin",
    "Granma",
    "Santiago de Cuba",
    "Guantanamo",
  ],
  contenido_principal: [
    "Documentos",
    "Ropa",
    "Medicinas",
    "Articulos de higiene personal",
    "Alimentos",
    "Electrodomesticos pequeños",
    "Dispositivos electronicos",
    "Dinero en efectivo",
  ],
  stripe_processing_percent: 0.029,
  stripe_processing_fixed: 0.3,
};

// Cache in-memory durante el ciclo de vida del proceso
let cachedEnvPlaceId = undefined; // se chequea solo una vez
let resolvingPlaceIdPromise = null; // lock/memo para evitar avalanchas

const DEFAULT_ADDRESS = process.env.AGENCY_ADDRESS || DEFAULT_CONFIG.address;

const readEnvPlaceIdOnce = () => {
  if (cachedEnvPlaceId !== undefined) {
    return cachedEnvPlaceId;
  }
  cachedEnvPlaceId = process.env.AGENCY_PLACE_ID || null;
  return cachedEnvPlaceId;
};

const getOrCreateAgencyInfo = async () => {
  const existing = await strapi.entityService.findMany(
    "api::agency-info.agency-info",
    { limit: 1 }
  );
  if (existing?.length) return existing[0];
  return strapi.entityService.create("api::agency-info.agency-info", {
    data: { address: DEFAULT_ADDRESS },
  });
};

const savePlaceIdIfMissing = async (id, placeId, address) => {
  if (id && placeId) {
    await strapi.entityService.update("api::agency-info.agency-info", id, {
      data: { place_id: placeId, address },
    });
  }
};

const getLegacyPlaceId = async (address) => {
  const placeAddress = address || DEFAULT_CONFIG.address;
  const url = "https://places.googleapis.com/v1/places:searchText";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
        // FieldMask: le dices qué campos quieres en la respuesta
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress",
      },
      body: JSON.stringify({
        textQuery: placeAddress,
      }),
    });

    if (!response.ok) {
      throw new Error();
    }

    const data = await response.json();
    const place = data.places?.[0];

    if (!place) {
      strapi.log.warn(
        `No se encontró ningún place con la dirección: "${placeAddress}". Corrige la dirección.`
      );
      return null;
    }

    return place.id;
  } catch (error) {
    strapi.log.error("Error consultando Google Places", error);
    return null;
  }
};

const resolveAndCachePlaceId = async (agencyAddress, agencyRecordId) => {
  if (resolvingPlaceIdPromise) return resolvingPlaceIdPromise;
  resolvingPlaceIdPromise = (async () => {
    const legacyPlaceId = await getLegacyPlaceId(agencyAddress);
    if (legacyPlaceId && agencyRecordId) {
      await savePlaceIdIfMissing(agencyRecordId, legacyPlaceId, agencyAddress);
      strapi.log.info(
        `[agency-info] place_id obtenido y persistido desde Google Places: ${legacyPlaceId}`
      );
    }
    return legacyPlaceId || null;
  })();
  try {
    return await resolvingPlaceIdPromise;
  } finally {
    resolvingPlaceIdPromise = null;
  }
};

const getFinalPlaceId = async (agencyAddress) => {
  const agencyRecord = await getOrCreateAgencyInfo();

  if (agencyRecord.place_id) {
    strapi.log.info("[agency-info] place_id obtenido desde DB.");
    return agencyRecord.place_id;
  }

  const envPlaceId = readEnvPlaceIdOnce();
  if (envPlaceId) {
    strapi.log.info("[agency-info] place_id obtenido desde env (cacheada una sola vez).");
    await savePlaceIdIfMissing(agencyRecord.id, envPlaceId, agencyAddress);
    return envPlaceId;
  }

  strapi.log.info(
    "[agency-info] place_id no encontrado en DB ni env. Consultando Google Places..."
  );
  const placeIdFromGoogle = await resolveAndCachePlaceId(
    agencyAddress,
    agencyRecord.id
  );
  if (placeIdFromGoogle) {
    return placeIdFromGoogle;
  }

  strapi.log.warn(
    "[agency-info] No se pudo resolver place_id. Usando DEFAULT_CONFIG.place_id o null."
  );
  return DEFAULT_CONFIG.place_id || null;
};

const parseList = (value, fallback) => {
  if (!value) {
    return fallback;
  }
  try {
    if (value.trim().startsWith("[")) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    // ignore JSON parse issues, fallback to CSV parsing
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildResumePayload = async () => {
  const percentFromEnv = process.env.STRIPE_PROCESSING_PERCENT;
  const fixedFromEnv = process.env.STRIPE_PROCESSING_FIXED;
  const agencyAddress = process.env.AGENCY_ADDRESS || DEFAULT_CONFIG.address;

  strapi.log.info(`[agency-info] Usando direccion de agencia: "${agencyAddress}"`);

  const finalPlaceId = await getFinalPlaceId(agencyAddress);

  if (!finalPlaceId) {
    strapi.log.warn(
      "[agency-info] El campo final place_id es null/vacio. Revisa configuracion o direccion si esperas un valor."
    );
  } else {
    strapi.log.info(
      `[agency-info] place_id final que se devolvera en /resume: ${finalPlaceId}`
    );
  }

  return {
    address: agencyAddress,
    place_id: finalPlaceId,
    Price_lb: Number(
      process.env.PRICE_LB ||
        process.env.PRICE_LB_FALLBACK ||
        DEFAULT_CONFIG.Price_lb
    ),
    ciudades_de_destino_cuba: parseList(
      process.env.CUBA_DESTINATIONS,
      DEFAULT_CONFIG.ciudades_de_destino_cuba
    ),
    contenido_principal: parseList(
      process.env.CUBA_CONTENT_TYPES,
      DEFAULT_CONFIG.contenido_principal
    ),
    stripe_processing_percent:
      percentFromEnv !== undefined
        ? Number(percentFromEnv)
        : DEFAULT_CONFIG.stripe_processing_percent,
    stripe_processing_fixed:
      fixedFromEnv !== undefined
        ? Number(fixedFromEnv)
        : DEFAULT_CONFIG.stripe_processing_fixed,
  };
};

module.exports = createCoreController("api::agency-info.agency-info", () => ({
  async resume(ctx) {
    strapi.log.info("[agency-info] Generando payload para /resume...");
    const payload = await buildResumePayload();
    ctx.body = payload;
  },
}));

// Exportamos helpers para reutilizar en bootstrap/precalentado
module.exports.getFinalPlaceId = getFinalPlaceId;
module.exports.DEFAULT_AGENCY_ADDRESS = DEFAULT_ADDRESS;
