"use strict";

const ActionsBar = ({
  currentStep,
  onPrev,
  onNext,
  onPrimary,
  onPrimaryBlocked,
  actionLoading,
  quoteReady,
  disablePrimary,
  primaryLabel,
}) => {
  const primaryDisabled = actionLoading || !quoteReady;

  const handlePrimaryClick = () => {
    if (primaryDisabled) {
      return;
    }
    if (disablePrimary) {
      if (typeof onPrimaryBlocked === "function") {
        onPrimaryBlocked();
      }
      return;
    }
    onPrimary();
  };

  return (
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
          onClick={handlePrimaryClick}
          disabled={primaryDisabled}
          aria-disabled={primaryDisabled || disablePrimary}
          style={
            disablePrimary && !primaryDisabled
              ? { opacity: 0.6, cursor: "not-allowed" }
              : undefined
          }
          title={
            disablePrimary
              ? "Debes completar el captcha para continuar."
              : undefined
          }
        >
          {actionLoading ? "Procesando..." : primaryLabel || "Confirmar"}
        </button>
      )}
    </div>
  );
};

export default ActionsBar;
