'use strict';

const setupGracefulShutdown = (strapi) => {
  let shuttingDown = false;
  const logger = strapi.log;

  const closeServer = () =>
    new Promise((resolve) => {
      const httpServer = strapi.server?.httpServer;
      if (httpServer?.close) {
        httpServer.close(() => resolve());
        return;
      }
      resolve();
    });

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[graceful] ${signal} recibido. Cerrando servidor...`);
    try {
      await closeServer();
      if (strapi.db?.connection?.destroy) {
        await strapi.db.connection.destroy();
      }
      logger.info('[graceful] Recursos liberados; saliendo.');
      process.exit(0);
    } catch (error) {
      logger.error('[graceful] Error al cerrar', error);
      process.exit(1);
    }
  };

  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on(signal, () => shutdown(signal));
  });
};

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    try {
      const { getFinalPlaceId, DEFAULT_AGENCY_ADDRESS } = require("./api/agency-info/controllers/agency-info");
      const address = process.env.AGENCY_ADDRESS || DEFAULT_AGENCY_ADDRESS;

      strapi.log.info(`[bootstrap] Precalentando place_id para dirección de agencia: "${address}"`);
      const placeId = await getFinalPlaceId(address);

      if (placeId) {
        strapi.log.info(`[bootstrap] place_id precalentado y listo: ${placeId}`);
      } else {
        strapi.log.warn("[bootstrap] No se pudo precalentar place_id; se usará fallback en runtime.");
      }
    } catch (error) {
      strapi.log.error("[bootstrap] Error precalentando place_id", error);
    }

    setupGracefulShutdown(strapi);
  },
};
