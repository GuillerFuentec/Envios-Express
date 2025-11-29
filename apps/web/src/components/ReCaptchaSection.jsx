"use client";

import { useCallback, useMemo, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useRecaptcha } from "./ReCaptchaProvider";

const STATUS_COPY = {
  idle: { text: "Protegido por reCAPTCHA", tone: "muted" },
  loading: { text: "Validando actividad...", tone: "info" },
  success: { text: "Actividad verificada.", tone: "success" },
  error: { text: "No fue posible verificar la actividad.", tone: "error" },
};

export const ReCaptchaSection = ({ action = "manualCheck", className = "" }) => {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
  const { setToken, reset, refreshKey } = useRecaptcha();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState(STATUS_COPY.idle.text);
  const [localToken, setLocalToken] = useState("");

  const copy = useMemo(() => STATUS_COPY[status] || STATUS_COPY.idle, [status]);

  const handleVerify = useCallback(async () => {
    if (!localToken) {
      setStatus("error");
      setMessage("Marca el recaptcha antes de validar.");
      return;
    }
    setStatus("loading");
    setMessage(STATUS_COPY.loading.text);
    try {
      const response = await fetch("/api/verify-recaptcha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: localToken, action }),
      });
      const data = await response.json();
      console.info("[recaptcha-client] respuesta del backend", {
        ok: response.ok,
        status: response.status,
        success: data?.success ?? null,
        score: data?.score ?? null,
      });
      if (response.ok && data.success) {
        setStatus("success");
        setMessage("Actividad verificada.");
        return;
      }
      throw new Error(data?.error || "reCAPTCHA rechazo la actividad.");
    } catch (error) {
      console.debug("reCaptcha verification failed:\n", error);
      setStatus("error");
      setMessage(error.message || STATUS_COPY.error.text);
    }
  }, [localToken, action]);

  if (!siteKey) {
    return null;
  }

  return (
    <section className={`recaptcha-section ${className}`}>
      <div className="recaptcha-section__content">
        <div className="mb-3">
          <ReCAPTCHA
            key={refreshKey}
            sitekey={siteKey}
            onChange={(value) => {
              setLocalToken(value || "");
              setToken(value || "");
            }}
            onExpired={() => {
              setLocalToken("");
              setToken("");
              reset();
            }}
            onErrored={() => {
              setLocalToken("");
              setToken("");
              reset();
            }}
          />
        </div>
        <p className={`recaptcha-section__message recaptcha-section__message--${copy.tone}`}>
          {message}
        </p>
        <button
          type="button"
          className="cta"
          onClick={handleVerify}
          disabled={status === "loading"}
        >
          Validar actividad
        </button>
      </div>
    </section>
  );
};
