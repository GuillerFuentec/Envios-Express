"use client";

import ReCAPTCHA from "react-google-recaptcha";
import { useRecaptcha } from "./ReCaptchaProvider";

export default function ReCaptchaCheckbox({ className = "", onTokenChange }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
  const { setToken, reset, refreshKey } = useRecaptcha();

  if (!siteKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[recaptcha] Falta NEXT_PUBLIC_RECAPTCHA_SITE_KEY");
    }
    return null;
  }

  const handleToken = (value) => {
    const next = value || "";
    setToken(next);
    if (typeof onTokenChange === "function") {
      onTokenChange(next);
    }
  };

  const handleReset = () => {
    handleToken("");
    reset();
  };

  return (
    <div className={className}>
      <ReCAPTCHA
        key={refreshKey}
        sitekey={siteKey}
        onChange={handleToken}
        onExpired={handleReset}
        onErrored={handleReset}
      />
    </div>
  );
}
