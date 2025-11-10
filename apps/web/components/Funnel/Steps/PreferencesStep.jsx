"use strict";

import { useMemo } from "react";
import { useGooglePlacesAutocomplete } from "../../../hooks/useGooglePlaces";
import { logging } from "../../../next.config";

const mapsKey =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
  "";

const PreferencesStep = ({
  data,
  errors,
  shouldDisableAgency,
  onFieldChange,
  onPickupAddressSelected,
}) => {
  const { inputRef } = useGooglePlacesAutocomplete({
    apiKey: mapsKey,
    enabled: data.pickup,
    onPlaceSelected: onPickupAddressSelected,
  });

  const paymentOptions = useMemo(
    () => [
      { value: "online", label: "Pago online" },
      { value: "agency", label: "Pagar en agencia", disabled: shouldDisableAgency },
    ],
    [shouldDisableAgency]
  );

  return (
    <div className="fields-grid">
      <label className="toggle-row" htmlFor="pickupToggle">
        <span>¿Necesitas recogida a domicilio?</span>
        <input
          id="pickupToggle"
          type="checkbox"
          checked={data.pickup}
          onChange={(event) => onFieldChange("preferences", "pickup", event.target.checked)}
        />
      </label>
      {data.pickup && (
        <div className="field">
          <label htmlFor="pickupAddress">Dirección de recogida</label>
          <input
            id="pickupAddress"
            type="text"
            ref={inputRef}
            value={data.pickupAddress && console.log(data.pickupAddress)}
            onChange={(event) => onFieldChange("preferences", "pickupAddress", event.target.value)}
            placeholder="Escribe y selecciona tu dirección"
          />
          {errors.pickupAddress && <span className="field-error">{errors.pickupAddress}</span>}
        </div>
      )}
      <div className="field">
        <label>¿Cómo pagarás?</label>
        <div className="radio-row">
          {paymentOptions.map((option) => (
            <label
              key={option.value}
              className={`radio-pill ${data.paymentMethod === option.value ? "active" : ""}`}
              style={{ opacity: option.disabled ? 0.5 : 1 }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={option.value}
                disabled={option.disabled}
                checked={data.paymentMethod === option.value}
                onChange={(event) =>
                  onFieldChange("preferences", "paymentMethod", event.target.value)
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {shouldDisableAgency && (
          <p className="field-error">
            Si envías dinero en efectivo y solicitas recogida, debes pagar online.
          </p>
        )}
        {errors.paymentMethod && <span className="field-error">{errors.paymentMethod}</span>}
      </div>
      <div className="field">
        <label htmlFor="additionalComments">Comentarios adicionales</label>
        <textarea
          id="additionalComments"
          value={data.additionalComments}
          onChange={(event) =>
            onFieldChange("preferences", "additionalComments", event.target.value)
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
