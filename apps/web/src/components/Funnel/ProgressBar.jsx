"use strict";

const ProgressBar = ({ currentStep }) => {
  const percentage = (currentStep / 3) * 100;
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      aria-label={`Paso ${currentStep + 1} de 4`}
    >
      <div className="progress-bar__value" style={{ width: `${percentage}%` }} />
    </div>
  );
};

export default ProgressBar;
