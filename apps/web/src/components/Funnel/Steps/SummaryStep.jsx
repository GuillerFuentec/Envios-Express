"use strict";

import { formatCurrency } from "../../../utils/currency";

const SummarySkeleton = () => (
  <div className="summary-card summary-card--primary w-full">
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
      <div className="status-message error flex flex-wrap items-center justify-between gap-3">
        <span>{quoteState.error}</span>
        <button type="button" className="btn-secondary" onClick={onRetry}>
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

  const contactEmail = (contactInfo?.email || "").trim();

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
          label: "Metodo de pago",
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
          value: inputs.pickup ? "Si" : "No",
        }
      : null,
    inputs?.pickupAddress
      ? { label: "Direccion de recogida", value: inputs.pickupAddress }
      : null,
    inputs?.deliveryDate
      ? { label: "Fecha de entrega", value: inputs.deliveryDate }
      : null,
  ].filter(Boolean);

  return (
    <section
      className="
        summary-shell
        w-full max-w-5xl mx-auto
        px-4 sm:px-6 lg:px-0
      "
    >
      {/* Header */}
      <div
        className="
          summary-header
          mb-6
          flex flex-col gap-4
          sm:flex-row sm:items-center sm:justify-between
        "
      >
        <div>
          <p className="summary-chip">Revisa y confirma</p>
          <h3 className="summary-title">Resumen de tu envio</h3>
        </div>
        <div
          className={`summary-pill ${
            contactEmail ? "" : "summary-pill--muted"
          } max-w-full`}
        >
          <span>Se enviara un recibo de pago a</span>
          <strong className="summary-pill__email">
            {contactEmail || "Falta correo valido"}
          </strong>
        </div>
      </div>

      {/* Grid principal */}
      <div
        className="
          summary-grid
          grid gap-4 md:gap-6
          lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]
        "
      >
        {/* Tarjetas de montos */}
        <div className="summary-card summary-card--primary w-full">
          <div className="summary-breakdown">
            {breakdown?.weight?.amount > 0 && (
              <SummaryRow
                label={weightLabel}
                amount={breakdown.weight.amount}
              />
            )}
            {breakdown?.pickup?.amount > 0 && (
              <SummaryRow
                label={pickupLabel}
                amount={breakdown.pickup.amount}
              />
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
          </div>

          <div className="summary-total-bar">
            <div className="summary-total__meta">
              <p className="summary-total__label">Total estimado</p>
            </div>
            <div className="summary-total__value">{formatCurrency(total)}</div>
          </div>
        </div>

        {/* Datos de contacto + selección */}
        <div className="summary-card summary-card--soft w-full flex flex-col gap-4">
          <div className="summary-block">
            <p className="summary-block__title">Datos de contacto</p>
            <dl className="summary-list summary-list--grid">
              <div className="summary-list__item">
                <dt>Nombre</dt>
                <dd className="max-w-full break-words">
                  {contactInfo?.name || "-"}
                </dd>
              </div>
              <div className="summary-list__item">
                <dt>Correo</dt>
                <dd className="max-w-full break-words">
                  {contactEmail || "-"}
                </dd>
              </div>
              <div className="summary-list__item">
                <dt>Telefono</dt>
                <dd className="max-w-full break-words">
                  {contactInfo?.phone || "-"}
                </dd>
              </div>
            </dl>
          </div>

          {selectionDetails.length > 0 && (
            <div className="summary-block">
              <p className="summary-block__title">Datos seleccionados</p>
              <ul className="summary-list summary-list--bullets">
                {selectionDetails.map((item) => (
                  <li key={item.label}>
                    <strong>{item.label}:</strong> <span>{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="summary-info summary-info--inline">
            <p className="summary-block__title">Que incluye cada cargo?</p>
            <ul>
              <li>
                <strong>Peso:</strong>{" "}
                {formatCurrency(pricingInfo?.pricePerLb || pricePerLb || 0)} por
                lb.
              </li>
              <li>
                <strong>Recogida a domicilio:</strong> base $
                {pricingInfo?.pickupBase || 10} + $
                {pricingInfo?.pickupPerMile || 0.99}
                /mi.
              </li>
              <li>
                <strong>Procesamiento:</strong> Cobros por la gestion
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SummaryStep;
