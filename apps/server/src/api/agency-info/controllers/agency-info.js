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

const getLegacyPlaceId = async (address) => {
  const placeAddress = DEFAULT_CONFIG.address || address;
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

    strapi.log.info("Place ID: ", place.id);
    strapi.log.info("Nombre: ", place.displayName?.text || "");
    strapi.log.info("Direccion: ", place.formattedAddress);

    return place.id;
  } catch (error) {
    strapi.log.error("Error consultando Google Places", error);
    return null;
  }
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
  const placeIdFromEnv = process.env.AGENCY_PLACE_ID;

  let legacyPlaceId = null;

  // Loggeamos qué dirección estamos usando para el cálculo
  strapi.log.info(
    `[agency-info] Usando dirección de agencia: "${agencyAddress}"`
  );

  // Solo llamamos a Google si no hay AGENCY_PLACE_ID
  if (!placeIdFromEnv) {
    strapi.log.info(
      "[agency-info] No se encontró AGENCY_PLACE_ID en env. Intentando obtener place_id desde Google Places..."
    );
    legacyPlaceId = await getLegacyPlaceId(agencyAddress);
  } else {
    strapi.log.info(
      `[agency-info] Usando AGENCY_PLACE_ID desde env: ${placeIdFromEnv}`
    );
  }

  const finalPlaceId =
    placeIdFromEnv || legacyPlaceId || DEFAULT_CONFIG.place_id || null;

  if (!placeIdFromEnv && !legacyPlaceId) {
    strapi.log.warn(
      `[agency-info] No se pudo obtener place_id desde Google Places para la dirección "${agencyAddress}".` +
        " Usando DEFAULT_CONFIG.place_id o null."
    );
  } else if (legacyPlaceId && !placeIdFromEnv) {
    strapi.log.info(
      `[agency-info] place_id obtenido desde Google Places: ${legacyPlaceId}`
    );
  }

  if (!finalPlaceId) {
    strapi.log.warn(
      "[agency-info] El campo final place_id es null/ vacío. Revisa configuración o dirección si esperas un valor."
    );
  } else {
    strapi.log.info(
      `[agency-info] place_id final que se devolverá en /resume: ${finalPlaceId}`
    );
  }

  return {
    address: process.env.AGENCY_ADDRESS || DEFAULT_CONFIG.address,
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
