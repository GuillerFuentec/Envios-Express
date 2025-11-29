"use strict";

import { formatCurrency } from "../../../utils/currency";

const ShipmentStep = ({
  data,
  errors,
  agencyConfig,
  loading,
  error,
  onChange,
  showPolicyBanner,
  minDate,
}) => {
  if (loading) {
    return <p>Cargando configuracion de la agencia...</p>;
  }
  if (error) {
    return <p className="status-message error">{error}</p>;
  }
  if (!agencyConfig) {
    return null;
  }

  const isCash = data.contentType === "Dinero en efectivo";

  return (
    <div className="fields-grid">
      <p style={{ margin: 0, color: "var(--color-muted)" }}>
        Precio por libra: {formatCurrency(agencyConfig.Price_lb || 0)}
      </p>

      <div className="field">
        <label htmlFor="weightLbs">Peso estimado (lb)</label>
        <input
          id="weightLbs"
          type="number"
          min="0"
          step="0.1"
          value={data.weightLbs}
          disabled={isCash}
          onChange={(event) =>
            onChange("shipment", "weightLbs", event.target.value)
          }
        />
        {errors.weightLbs && (
          <span className="field-error">{errors.weightLbs}</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="cityCuba">Ciudad de destino en Cuba</label>
        <select
          id="cityCuba"
          value={data.cityCuba}
          onChange={(event) =>
            onChange("shipment", "cityCuba", event.target.value)
          }
        >
          {agencyConfig.ciudades_de_destino_cuba?.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        {errors.cityCuba && (
          <span className="field-error">{errors.cityCuba}</span>
        )}
      </div>

      <div className="field">
        <label htmlFor="contentType">Contenido principal</label>
        <select
          id="contentType"
          value={data.contentType}
          onChange={(event) =>
            onChange("shipment", "contentType", event.target.value)
          }
        >
          {agencyConfig.contenido_principal?.map((content) => (
            <option key={content} value={content}>
              {content}
            </option>
          ))}
        </select>
        {errors.contentType && (
          <span className="field-error">{errors.contentType}</span>
        )}
      </div>

      {isCash && (
        <div className="field">
          <label htmlFor="cashAmount">Cantidad de dinero en efectivo (USD)</label>
          <input
            id="cashAmount"
            type="number"
            min="20"
            step="1"
            value={data.cashAmount}
            onChange={(event) =>
              onChange("shipment", "cashAmount", event.target.value)
            }
            placeholder="Ej. 100"
          />
          {errors.cashAmount && (
            <span className="field-error">{errors.cashAmount}</span>
          )}
        </div>
      )}

      {showPolicyBanner && (
        <div className="policy-banner">
          Si envias dinero en efectivo se aplican tarifas:
          <ul>
            <li>Pago online: fee de $0.89 por cada $10 USD (8.9%).</li>
            <li>Pago en agencia: fee de $1.00 por cada $10 USD (10%).</li>
          </ul>
        </div>
      )}

      <div className="field">
        <label htmlFor="deliveryDate">Fecha estimada de entrega</label>
        <input
          id="deliveryDate"
          type="date"
          min={minDate}
          value={data.deliveryDate || minDate}
          onChange={(event) =>
            onChange("shipment", "deliveryDate", event.target.value)
          }
        />
        {errors.deliveryDate && (
          <span className="field-error">{errors.deliveryDate}</span>
        )}
      </div>
    </div>
  );
};

export default ShipmentStep;
