'use strict';

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
  },
};
