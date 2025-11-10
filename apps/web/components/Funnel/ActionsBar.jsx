"use strict";

const ActionsBar = ({
  currentStep,
  onPrev,
  onNext,
  onPrimary,
  verifyingCaptcha,
  actionLoading,
  quoteReady,
  primaryLabel,
}) => (
  <div className="actions-row">
    {currentStep > 0 && (
      <button type="button" className="btn-secondary" onClick={onPrev}>
        Regresar
      </button>
    )}
    {currentStep < 3 && (
      <button
        type="button"
        className="btn-primary"
        onClick={onNext}
        disabled={currentStep === 2 && verifyingCaptcha}
      >
        {currentStep === 2 && verifyingCaptcha ? "Verificando..." : "Continuar"}
      </button>
    )}
    {currentStep === 3 && (
      <button
        type="button"
        className="btn-primary"
        onClick={onPrimary}
        disabled={actionLoading || !quoteReady}
      >
        {actionLoading ? "Procesando..." : primaryLabel || "Confirmar"}
      </button>
    )}
  </div>
);

export default ActionsBar;
