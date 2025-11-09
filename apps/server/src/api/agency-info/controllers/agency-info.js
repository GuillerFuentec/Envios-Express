const { createCoreController } = require("@strapi/strapi").factories;
const config = require("../../../config/manifest.json");

module.exports = createCoreController(
  "api::agency-info.agency-info",
  ({ strapi }) => ({
    async resume(ctx) {
      ctx.body = {
        ...config.agency,
        ...config.stripe,
        ciudades_de_destino_cuba: config.ciudades_de_destino_cuba,
        contenido_principal: config.contenido_principal,
      };
    },
  })
);
