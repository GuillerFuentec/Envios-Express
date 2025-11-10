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
    <span>{label}</span>
    <strong>{formatCurrency(amount)}</strong>
  </div>
);

const SummaryStep = ({ quoteState, paymentMethod, onRetry, orderResult }) => {
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

  const { breakdown, total, policy, pricePerLb, inputs } = quoteState.data;
  const weightLabel =
    breakdown?.weight?.label ||
    `${inputs?.weightLbs || ""} lb * ${formatCurrency(pricePerLb || 0)}`;

  return (
    <div className="summary-card">
      {breakdown?.weight?.amount > 0 && (
        <SummaryRow label={weightLabel} amount={breakdown.weight.amount} />
      )}
      {breakdown?.pickup?.amount > 0 && (
        <SummaryRow
          label={`Pick-up = $10 + $0.99/mi * ${breakdown.pickup.distanceMiles || 0}mi`}
          amount={breakdown.pickup.amount}
        />
      )}
      {breakdown?.cashFee?.amount > 0 && (
        <SummaryRow label="Fee Dinero en efectivo" amount={breakdown.cashFee.amount} />
      )}
      {breakdown?.platformFee?.amount > 0 && (
        <SummaryRow label="Tarifa de plataforma (2.3%)" amount={breakdown.platformFee.amount} />
      )}
      {breakdown?.processingFee?.amount > 0 && (
        <SummaryRow label="Tarifa de procesamiento" amount={breakdown.processingFee.amount} />
      )}
      <div className="summary-total">Total = {formatCurrency(total)}</div>
      {policy?.mustPayOnlineForCash && paymentMethod !== "online" && (
        <p className="field-error">Este envío requiere pago online por la política de efectivo.</p>
      )}
      {orderResult?.ok && (
        <div className="status-message success">
          Orden #{orderResult.orderId} confirmada. Te esperamos en la agencia.
        </div>
      )}
    </div>
  );
};

export default SummaryStep;
