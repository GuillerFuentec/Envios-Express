"use strict";

import { formatCurrency } from "../../../utils/currency";

const SummarySkeleton = () => (
  <div className="summary-card summary-card--primary">
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

const SummaryStep = ({ quoteState, paymentMethod, contactInfo, onRetry, orderResult }) => {
  if (quoteState.loading) {
    return <SummarySkeleton />;
  }

  if (quoteState.error) {
    return (
      <div className="status-message error">
        {quoteState.error}{" "}
        <button type="button" className="btn-secondary" onClick={onRetry} style={{ marginLeft: 8 }}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!quoteState.data) {
    return null;
  }

  const { breakdown, total, policy, pricePerLb, inputs, pricingInfo } = quoteState.data;
  const contactEmail = (contactInfo?.email || "").trim();
  const weightLabel =
    breakdown?.weight?.label || `${inputs?.weightLbs || ""} lb * ${formatCurrency(pricePerLb || 0)}`;
  const pickupLabel =
    breakdown?.pickup?.label || `Pick-up = $10 + $0.99/mi * ${breakdown?.pickup?.distanceMiles || 0}mi`;
  const cashLabel = breakdown?.cashFee?.label || "Fee (Dinero en efectivo)";
  const processingLabel =
    breakdown?.processingFee?.label || "Tarifa de procesamiento (plataforma + Stripe)";

  const selectionDetails = [
    inputs?.weightLbs ? { label: "Peso declarado", value: `${inputs.weightLbs} lb` } : null,
    inputs?.cityCuba ? { label: "Ciudad destino", value: inputs.cityCuba } : null,
    inputs?.contentType ? { label: "Tipo de contenido", value: inputs.contentType } : null,
    inputs?.cashAmount
      ? {
          label: "Monto en efectivo",
          value: formatCurrency(inputs.cashAmount),
        }
      : null,
    inputs?.paymentMethod
      ? {
          label: "MActodo de pago",
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
          value: inputs.pickup ? "SA-" : "No",
        }
      : null,
    inputs?.pickupAddress ? { label: "DirecciA3n de recogida", value: inputs.pickupAddress } : null,
    inputs?.deliveryDate ? { label: "Fecha de entrega", value: inputs.deliveryDate } : null,
  ].filter(Boolean);

  return (
    <section className="summary-shell">
      <div className="summary-header">
        <div>
          <p className="summary-chip">Revisa y confirma</p>
          <h3 className="summary-title">Resumen de tu envA-o</h3>
          <p className="summary-subtitle">
            Verifica el correo donde Stripe enviarA� el recibo y el detalle de cargos antes de pagar.
          </p>
        </div>
        <div className={`summary-pill ${contactEmail ? "" : "summary-pill--muted"}`}>
          <span>Recibo</span>
          <strong>{contactEmail || "Falta correo valido"}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card summary-card--primary">
          <div className="summary-breakdown">
            {breakdown?.weight?.amount > 0 && <SummaryRow label={weightLabel} amount={breakdown.weight.amount} />}
            {breakdown?.pickup?.amount > 0 && <SummaryRow label={pickupLabel} amount={breakdown.pickup.amount} />}
            {breakdown?.cashFee?.amount > 0 && <SummaryRow label={cashLabel} amount={breakdown.cashFee.amount} />}
            {breakdown?.processingFee?.amount > 0 && (
              <SummaryRow label={processingLabel} amount={breakdown.processingFee.amount} />
            )}
          </div>

          <div className="summary-total-bar">
            <div className="summary-total__meta">
              <p className="summary-total__label">Total estimado</p>
              <p className="summary-total__note">Se cobrarA� al confirmar en Stripe.</p>
            </div>
            <div className="summary-total__value">{formatCurrency(total)}</div>
          </div>

          {policy?.mustPayOnlineForCash && paymentMethod !== "online" && (
            <p className="summary-alert">Este envA-o requiere pago online por la polA-tica de efectivo.</p>
          )}
          <p className="summary-footnote">Stripe enviarA� automA-ticamente el recibo al correo indicado.</p>
        </div>

        <div className="summary-card summary-card--soft">
          <div className="summary-block">
            <p className="summary-block__title">Datos de contacto</p>
            <dl className="summary-list summary-list--grid">
              <div className="summary-list__item">
                <dt>Nombre</dt>
                <dd>{contactInfo?.name || "-"}</dd>
              </div>
              <div className="summary-list__item">
                <dt>Correo</dt>
                <dd>{contactEmail || "-"}</dd>
              </div>
              <div className="summary-list__item">
                <dt>TelAcfono</dt>
                <dd>{contactInfo?.phone || "-"}</dd>
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
            <p className="summary-block__title">A�QuAc incluye cada cargo?</p>
            <ul>
              <li>
                <strong>Peso:</strong> {formatCurrency(pricingInfo?.pricePerLb || pricePerLb || 0)} por lb.
              </li>
              <li>
                <strong>Pick-up:</strong> base ${pricingInfo?.pickupBase || 10} + ${pricingInfo?.pickupPerMile || 0.99}
                /mi.
              </li>
              <li>
                <strong>Procesamiento:</strong>{" "}
                {(pricingInfo?.platformFeePercent || 2.3).toFixed(2)}% plataforma{" "}
                {pricingInfo?.platformFeeMin ? `(min $${pricingInfo.platformFeeMin.toFixed(2)}) ` : ""}
                + Stripe {(pricingInfo?.processingPercent || 2.9).toFixed(2)}% + $
                {(pricingInfo?.processingFixed || 0.3).toFixed(2)}.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SummaryStep;
