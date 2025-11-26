"use strict";

const GOOGLE_AUTOCOMPLETE_URL =
  "https://maps.googleapis.com/maps/api/place/autocomplete/json";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  const query = (req.query?.q || req.query?.query || "").trim();
  console.debug("[api/address/suggest] incoming", { query, length: query.length });
  if (!query || query.length < 3) {
    console.debug("[api/address/suggest] rejected - too short", { query });
    return res.status(400).json({ error: "Escribe al menos 3 caracteres." });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  console.log("Esta es la api key: \n", apiKey);
  
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Falta GOOGLE_MAPS_API_KEY en el servidor." });
  }

  const params = new URLSearchParams({
    input: query,
    key: apiKey,
    types: "address",
    components: "country:us",
  });

  try {
    const started = Date.now();
    console.debug("[api/address/suggest] requesting Google Places", { query });
    const response = await fetch(`${GOOGLE_AUTOCOMPLETE_URL}?${params.toString()}`);
    const payload = await response.json();

    if (response.status !== 200 || payload.status !== "OK") {
      console.warn("[api/address/suggest] upstream non-OK", {
        httpStatus: response.status,
        placesStatus: payload.status,
        errorMessage: payload.error_message,
      });
      return res.status(502).json({
        error: payload.error_message || "No pudimos obtener sugerencias.",
        status: payload.status,
      });
    }

    const suggestions = (payload.predictions || []).map((prediction) => ({
      id: prediction.place_id,
      placeId: prediction.place_id,
      description: prediction.description,
      matchedSubstrings: prediction.matched_substrings,
      terms: prediction.terms,
      structured_formatting: prediction.structured_formatting,
    }));
    console.debug("[api/address/suggest] success", {
      query,
      count: suggestions.length,
      latencyMs: Date.now() - started,
    });
    return res.status(200).json({ suggestions });
  } catch (error) {
    console.error("[api/address/suggest]", error);
    return res.status(500).json({ error: "Error consultando Google Places." });
  }
}
