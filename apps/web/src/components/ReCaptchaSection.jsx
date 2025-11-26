"use client";
import { useCallback, useMemo, useState } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

const STATUS_COPY = {
  idle: { text: "Protegido por reCAPTCHA v3", tone: "muted" },
  loading: { text: "Validando actividad...", tone: "info" },
  success: { text: "Actividad verificada.", tone: "success" },
  error: { text: "No fue posible verificar la actividad.", tone: "error" },
};

export const ReCaptchaSection = ({ action = "manualCheck", className = "" }) => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState(STATUS_COPY.idle.text);

  const copy = useMemo(() => STATUS_COPY[status] || STATUS_COPY.idle, [status]);

  const handleVerify = useCallback(async () => {
    if (!executeRecaptcha) {
      setStatus("error");
      setMessage("reCAPTCHA aún no está listo. Inténtalo nuevamente.");
      return;
    }
    setStatus("loading");
    setMessage(STATUS_COPY.loading.text);
    try {
      const token = await executeRecaptcha(action);
      const response = await fetch("/api/verify-recaptcha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, action }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.debug("reCaptcha verification success:\n", data);
        setStatus("success");
        setMessage(`Actividad verificada (score ${(data.score ?? 0).toFixed(2)}).`);
        return;
      }

      throw new Error(data?.error || "reCAPTCHA rechazó la actividad.");
    } catch (error) {
      console.debug("reCaptcha verification failed:\n", error);
      setStatus("error");
      setMessage(error.message || STATUS_COPY.error.text);
    }
  }, [executeRecaptcha, action]);

  return (
    <section className={`recaptcha-section ${className}`}>
      <div className="recaptcha-section__content">
        <p className={`recaptcha-section__message recaptcha-section__message--${copy.tone}`}>
          {message}
        </p>
        <button
          type="button"
          className="cta"
          onClick={handleVerify}
          disabled={!executeRecaptcha || status === "loading"}
        >
          Validar actividad
        </button>
      </div>
    </section>
  );
};
