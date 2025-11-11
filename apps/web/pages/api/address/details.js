"use strict";

const GOOGLE_DETAILS_URL =
  "https://maps.googleapis.com/maps/api/place/details/json";

const extractComponent = (components = [], type) =>
  components.find((component) => component.types?.includes(type)) || null;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método no permitido." });
  }

  const body = req.body || {};
  const placeId = body.placeId || body.place_id;
  console.debug("[api/address/details] incoming", { placeId });
  if (!placeId) {
    console.debug("[api/address/details] rejected - missing placeId");
    return res.status(400).json({ error: "Falta placeId." });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Falta GOOGLE_MAPS_API_KEY en el servidor." });
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    fields: [
      "address_components",
      "formatted_address",
      "geometry/location",
      "name",
      "place_id",
    ].join(","),
  });

  try {
    const started = Date.now();
    console.debug("[api/address/details] requesting Google Places", { placeId });
    const response = await fetch(`${GOOGLE_DETAILS_URL}?${params.toString()}`);
    const payload = await response.json();

    if (response.status !== 200 || payload.status !== "OK") {
      console.warn("[api/address/details] upstream non-OK", {
        httpStatus: response.status,
        placesStatus: payload.status,
        errorMessage: payload.error_message,
      });
      return res.status(502).json({
        error: payload.error_message || "No pudimos obtener la dirección.",
        status: payload.status,
      });
    }

    const result = payload.result || {};
    const components = result.address_components || [];

    const streetNumber = extractComponent(components, "street_number")?.long_name || "";
    const route = extractComponent(components, "route")?.long_name || "";
    const locality =
      extractComponent(components, "locality")?.long_name ||
      extractComponent(components, "sublocality")?.long_name ||
      extractComponent(components, "administrative_area_level_3")?.long_name ||
      "";
    const adminArea =
      extractComponent(components, "administrative_area_level_1")?.short_name || "";
    const postalCode = extractComponent(components, "postal_code")?.long_name || "";
    const country = extractComponent(components, "country")?.short_name || "US";

    const line1 = [streetNumber, route].filter(Boolean).join(" ").trim();
    const location = result.geometry?.location;

    const normalized = {
      line1: line1 || result.name || "",
      line2: "",
      locality,
      adminArea,
      postalCode,
      countryCode: country,
      normalized: {
        full: result.formatted_address || "",
        placeId: result.place_id,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      },
    };
    console.debug("[api/address/details] success", {
      placeId: result.place_id,
      hasCoords: typeof location?.lat === 'number' && typeof location?.lng === 'number',
      latencyMs: Date.now() - started,
    });
    return res.status(200).json({
      ...normalized,
      placeId: result.place_id,
    });
  } catch (error) {
    console.error("[api/address/details]", error);
    return res.status(500).json({ error: "Error consultando Google Places." });
  }
}
