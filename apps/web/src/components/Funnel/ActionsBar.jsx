"use strict";

const ActionsBar = ({
  currentStep,
  onPrev,
  onNext,
  onPrimary,
  actionLoading,
  quoteReady,
  disablePrimary,
  primaryLabel,
}) => (
  <div className="actions-row">
    {currentStep > 0 && (
      <button type="button" className="btn-secondary" onClick={onPrev}>
        Regresar
      </button>
    )}
    {currentStep < 3 && (
      <button type="button" className="btn-primary" onClick={onNext}>
        Continuar
      </button>
    )}
    {currentStep === 3 && (
      <button
        type="button"
        className="btn-primary"
        onClick={onPrimary}
        disabled={actionLoading || !quoteReady || disablePrimary}
      >
        {actionLoading ? "Procesando..." : primaryLabel || "Confirmar"}
      </button>
    )}
  </div>
);

export default ActionsBar;
