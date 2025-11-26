"use strict";

import { formatCurrency } from "../../../utils/currency";

const SummarySkeleton = () => (
  <div className="summary-card">
    <div className="skeleton skeleton-line" />
    <div className="skeleton skeleton-line" />
    <div className="skeleton skeleton-line" />
    <div className="skeleton skeleton-lg" />
  </div>
);

const SummaryRow = ({ label, amount }) => (
  <div className="summary-row">
    <span className="summary-row__label">{label}</span>
    <span className="summary-row__dots" aria-hidden="true" />
    <strong className="summary-row__amount">{formatCurrency(amount)}</strong>
  </div>
);

const SummaryStep = ({
  quoteState,
  paymentMethod,
  contactInfo,
  onRetry,
  orderResult,
}) => {
  if (quoteState.loading) {
    return <SummarySkeleton />;
  }

  if (quoteState.error) {
    return (
      <div className="status-message error">
        {quoteState.error}{" "}
        <button
          type="button"
          className="btn-secondary"
          onClick={onRetry}
          style={{ marginLeft: 8 }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!quoteState.data) {
    return null;
  }

  const { breakdown, total, policy, pricePerLb, inputs, pricingInfo } =
    quoteState.data;
  const weightLabel =
    breakdown?.weight?.label ||
    `${inputs?.weightLbs || ""} lb * ${formatCurrency(pricePerLb || 0)}`;
  const pickupLabel =
    breakdown?.pickup?.label ||
    `Pick-up = $10 + $0.99/mi * ${breakdown?.pickup?.distanceMiles || 0}mi`;
  const cashLabel = breakdown?.cashFee?.label || "Fee (Dinero en efectivo)";
  const processingLabel =
    breakdown?.processingFee?.label || "Tarifa de procesamiento";

  const selectionDetails = [
    inputs?.weightLbs
      ? { label: "Peso declarado", value: `${inputs.weightLbs} lb` }
      : null,
    inputs?.cityCuba
      ? { label: "Ciudad destino", value: inputs.cityCuba }
      : null,
    inputs?.contentType
      ? { label: "Tipo de contenido", value: inputs.contentType }
      : null,
    inputs?.cashAmount
      ? {
          label: "Monto en efectivo",
          value: formatCurrency(inputs.cashAmount),
        }
      : null,
    inputs?.paymentMethod
      ? {
          label: "Método de pago",
          value:
            inputs.paymentMethod === "online"
              ? "Pago online"
              : inputs.paymentMethod === "agency"
              ? "Pago en agencia"
              : inputs.paymentMethod,
        }
      : null,
    typeof inputs?.pickup === "boolean"
      ? {
          label: "Recogida a domicilio",
          value: inputs.pickup ? "Sí" : "No",
        }
      : null,
    inputs?.pickupAddress
      ? { label: "Dirección de recogida", value: inputs.pickupAddress }
      : null,
    inputs?.deliveryDate
      ? { label: "Fecha de entrega", value: inputs.deliveryDate }
      : null,
  ].filter(Boolean);

  return (
    <div className="summary-card">
      {contactInfo && (
        <div className="summary-selections">
          <p className="summary-selections__title">Datos de contacto</p>
          <ul>
            <li>
              <strong>Nombre:</strong> {contactInfo.name || "-"}
            </li>
            <li>
              <strong>Correo:</strong> {contactInfo.email || "-"}
            </li>
            <li>
              <strong>Teléfono:</strong> {contactInfo.phone || "-"}
            </li>
          </ul>
        </div>
      )}

      {selectionDetails.length > 0 && (
        <div className="summary-selections">
          <p className="summary-selections__title">Datos seleccionados</p>
          <ul>
            {selectionDetails.map((item) => (
              <li key={item.label}>
                <strong>{item.label}:</strong> {item.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {breakdown?.weight?.amount > 0 && (
        <SummaryRow label={weightLabel} amount={breakdown.weight.amount} />
      )}
      {breakdown?.pickup?.amount > 0 && (
        <SummaryRow label={pickupLabel} amount={breakdown.pickup.amount} />
      )}
      {breakdown?.cashFee?.amount > 0 && (
        <SummaryRow label={cashLabel} amount={breakdown.cashFee.amount} />
      )}
      {breakdown?.processingFee?.amount > 0 && (
        <SummaryRow
          label={processingLabel}
          amount={breakdown.processingFee.amount}
        />
      )}
      <div className="summary-total">Total = {formatCurrency(total)}</div>

      {policy?.mustPayOnlineForCash && paymentMethod !== "online" && (
        <p className="field-error">
          Este envío requiere pago online por la política de efectivo.
        </p>
      )}
      <div className="summary-info">
        <p className="summary-selections__title">¿Qué incluye cada cargo?</p>
        <ul>
          <li>
            <strong>Peso:</strong>{" "}
            {formatCurrency(pricingInfo?.pricePerLb || pricePerLb || 0)} por lb.
          </li>
          <li>
            <strong>Pick-up:</strong> base ${pricingInfo?.pickupBase || 10} + $
            {pricingInfo?.pickupPerMile || 0.99}/mi.
          </li>
          <li>
            <strong>Procesamiento:</strong>{" "}
            {(pricingInfo?.processingPercent || 2.9).toFixed(2)}% + $
            {(pricingInfo?.processingFixed || 0.3).toFixed(2)}.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SummaryStep;
