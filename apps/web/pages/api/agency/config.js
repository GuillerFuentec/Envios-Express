"use strict";

const { getAgencyProfile } = require("../../../lib/server/agency");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  try {
    const profile = await getAgencyProfile();
    const response = {
      name: profile.name || "",
      address: profile.address || "",
      place_id: profile.place_id || "",
      Price_lb: profile.Price_lb || 0,
      ciudades_de_destino_cuba: profile.ciudades_de_destino_cuba || [],
      contenido_principal: profile.contenido_principal || [],
      stripe_processing_percent: profile.stripe_processing_percent ?? null,
      stripe_processing_fixed: profile.stripe_processing_fixed ?? null,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error("[api/agency/config]", error);
    return res
      .status(error.status || 500)
      .json({ error: error.message || "No se pudo obtener la configuración." });
  }
}
