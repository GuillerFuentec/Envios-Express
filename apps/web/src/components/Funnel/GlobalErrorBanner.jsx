"use strict";

const GlobalErrorBanner = ({ show, message }) => {
  if (!show) {
    return null;
  }
  return <div className="global-error-banner">{message}</div>;
};

export default GlobalErrorBanner;
