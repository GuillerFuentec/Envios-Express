"use client";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

const scriptProps = {
  async: true,
  defer: true,
  appendTo: "head",
};

export function ReCaptchaProvider({ children }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
  const useRecaptchaNet =
    (process.env.NEXT_PUBLIC_RECAPTCHA_USE_NET || "").toLowerCase() === "true";

  if (!siteKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[ReCaptchaProvider] Falta NEXT_PUBLIC_RECAPTCHA_SITE_KEY. Renderizando sin reCAPTCHA."
      );
    }
    return children;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={siteKey}
      scriptProps={scriptProps}
      useRecaptchaNet={useRecaptchaNet}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
