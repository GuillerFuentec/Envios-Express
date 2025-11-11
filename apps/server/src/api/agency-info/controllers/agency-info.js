const { createCoreController } = require("@strapi/strapi").factories;

const DEFAULT_CONFIG = {
  address: "432 Northeast 22nd Street, Miami, FL 33137, USA",
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

const buildResumePayload = () => {
  const percentFromEnv = process.env.STRIPE_PROCESSING_PERCENT;
  const fixedFromEnv = process.env.STRIPE_PROCESSING_FIXED;
  return {
    address: process.env.AGENCY_ADDRESS || DEFAULT_CONFIG.address,
    place_id: process.env.AGENCY_PLACE_ID || DEFAULT_CONFIG.place_id,
    Price_lb: Number(
      process.env.PRICE_LB || process.env.PRICE_LB_FALLBACK || DEFAULT_CONFIG.Price_lb
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
    ctx.body = buildResumePayload();
  },
}));
