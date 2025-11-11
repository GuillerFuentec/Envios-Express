"use client";

import { useCallback, useMemo } from "react";
import { AddressCaptureInput } from "../../address-capture";
import { createEmptyAddress } from "../../../utils/addressState";

const PreferencesStep = ({
  data,
  errors,
  onFieldChange,
  shouldDisableAgency,
}) => {
  const addressValue = useMemo(
    () => data?.addressCapture || createEmptyAddress(),
    [data?.addressCapture]
  );

  const resetPickupFields = useCallback(() => {
    onFieldChange("preferences", "pickupAddress", "");
    onFieldChange("preferences", "pickupAddressPlaceId", "");
    onFieldChange("preferences", "pickupLocation", null);
    onFieldChange("preferences", "addressCapture", createEmptyAddress());
  }, [onFieldChange]);

  const handlePickupToggle = useCallback(
    (event) => {
      const enabled = event.target.checked;
      onFieldChange("preferences", "pickup", enabled);
      if (!enabled) {
        resetPickupFields();
      }
    },
    [onFieldChange, resetPickupFields]
  );

  const handleAddressChange = useCallback(
    (nextAddress) => {
      console.debug("[funnel/preferences] handleAddressChange invoked", {
        hasNext: Boolean(nextAddress),
        placeId: nextAddress?.placeId || nextAddress?.normalized?.placeId || null,
        line1Sample: (nextAddress?.line1 || '').slice(0, 60),
      });
      onFieldChange("preferences", "addressCapture", nextAddress);
      const normalized = nextAddress?.normalized || {};
      const fallbackLine1 = nextAddress?.line1 || normalized.full || "";
      onFieldChange("preferences", "pickupAddress", fallbackLine1);
      onFieldChange(
        "preferences",
        "pickupAddressPlaceId",
        normalized.placeId || nextAddress?.placeId || ""
      );
      const hasCoords =
        typeof normalized.lat === "number" && typeof normalized.lng === "number";
      onFieldChange(
        "preferences",
        "pickupLocation",
        hasCoords ? { lat: normalized.lat, lng: normalized.lng } : null
      );
      console.debug("[funnel/preferences] updated pickup fields", {
        pickupAddress: fallbackLine1.slice(0, 80),
        pickupAddressPlaceId: normalized.placeId || nextAddress?.placeId || "",
        hasCoords,
      });
    },
    [onFieldChange]
  );

  const fetchSuggestions = useCallback(async (query) => {
    console.debug("[funnel/preferences] fetchSuggestions start", { query });
    const response = await fetch(
      `/api/address/suggest?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      console.warn("[funnel/preferences] fetchSuggestions non-ok", {
        status: response.status,
        payload,
      });
      throw new Error(payload?.error || "No se pudieron obtener sugerencias.");
    }
    const payload = await response.json();
    console.debug("[funnel/preferences] fetchSuggestions success", {
      count: (payload?.suggestions || []).length,
    });
    return payload?.suggestions || [];
  }, []);

  const fetchDetails = useCallback(async (suggestion) => {
    console.debug("[funnel/preferences] fetchDetails start", {
      placeId: suggestion.placeId || suggestion.id,
    });
    const response = await fetch("/api/address/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: suggestion.placeId || suggestion.id }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      console.warn("[funnel/preferences] fetchDetails non-ok", {
        status: response.status,
        payload,
      });
      throw new Error(payload?.error || "No se pudo obtener la dirección.");
    }
    console.debug("[funnel/preferences] fetchDetails success", {
      status: response.status,
    });
    return response.json();
  }, []);

  const handlePaymentChange = useCallback(
    (event) => {
      onFieldChange("preferences", "paymentMethod", event.target.value);
    },
    [onFieldChange]
  );

  return (
    <div className="fields-grid">
      <label className="toggle-row" htmlFor="pickupToggle">
        <span>¿Necesitas recogida a domicilio?</span>
        <input
          id="pickupToggle"
          type="checkbox"
          checked={Boolean(data?.pickup)}
          onChange={handlePickupToggle}
        />
      </label>

      {data?.pickup && (
        <div className="field">
          <AddressCaptureInput
            value={addressValue}
            onChange={handleAddressChange}
            disabled={!data?.pickup}
            fetchSuggestions={fetchSuggestions}
            fetchDetails={fetchDetails}
            errors={{
              line1: errors?.pickupAddress || null,
            }}
            showPreview={false}
            labels={{
              previewLabel: "Dirección de recogida",
              previewEmpty:
                "Selecciona una sugerencia o completa los campos manualmente.",
            }}
          />
        </div>
      )}

      <div className="field">
        <label>¿Cómo pagarás?</label>
        <div className="radio-row">
          {["online", "agency"].map((method) => (
            <label
              key={method}
              className={`radio-pill ${
                data?.paymentMethod === method ? "active" : ""
              }`}
              style={{
                opacity:
                  method === "agency" && shouldDisableAgency ? 0.5 : 1,
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method}
                disabled={method === "agency" && shouldDisableAgency}
                checked={data?.paymentMethod === method}
                onChange={handlePaymentChange}
              />
              <span>
                {method === "online" ? "Pago online" : "Pagar en agencia"}
              </span>
            </label>
          ))}
        </div>
        {shouldDisableAgency && (
          <p className="field-error">
            Si envías dinero en efectivo y solicitas recogida, debes pagar
            online.
          </p>
        )}
        {errors?.paymentMethod && (
          <span className="field-error">{errors.paymentMethod}</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="additionalComments">Comentarios adicionales</label>
        <textarea
          id="additionalComments"
          value={data?.additionalComments || ""}
          onChange={(event) =>
            onFieldChange(
              "preferences",
              "additionalComments",
              event.target.value
            )
          }
          placeholder="Agrega instrucciones, referencias o detalles relevantes."
        />
      </div>

      <div className="status-message">
        Verificaremos reCAPTCHA v3 (acción “funnel”) antes de continuar.
      </div>
    </div>
  );
};

export default PreferencesStep;
