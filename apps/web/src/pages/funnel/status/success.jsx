"use strict";

import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router";

const consumeCheckoutPayload = (sessionId) => {
  if (!sessionId) return null;
  try {
    const raw = localStorage.getItem(`checkout:${sessionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    localStorage.removeItem(`checkout:${sessionId}`);
    return parsed;
  } catch (error) {
    console.warn("[checkout] No se pudo leer payload persistido.", error);
    return null;
  }
};

const SuccessPage = () => {
  const { query } = useRouter();
  const sessionId = query.session_id || query.sessionId || "";
  const orderId = query.orderId || "";
  const mode = query.mode || "online";
  const isAgency = mode === "agency";

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const channel = new BroadcastChannel("checkout-status");
    channel.postMessage({ status: "success", sessionId });
    localStorage.setItem(
      "checkout-status",
      JSON.stringify({ status: "success", sessionId, ts: Date.now() })
    );
    setTimeout(() => channel.close(), 500);
    if (window.opener && typeof window.close === "function") {
      window.close();
    }
    // Intentar confirmar en backend con payload guardado
    const persisted = consumeCheckoutPayload(sessionId);
    if (persisted?.payload) {
      fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          payload: persisted.payload,
        }),
      }).catch((error) => {
        console.error("[success] confirm payload failed", error);
      });
    }
  }, [sessionId]);

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("No se pudo copiar:", error);
    }
  };

  return (
    <>
      <Head>
        <title>Pago completado</title>
      </Head>
      <main className="page-shell">
        <section className="status-shell status-shell--success">
          <div className="status-header">
            <span className="status-pill">
              {isAgency ? "Orden registrada" : "Pago completado"}
            </span>
            <h1>
              {isAgency
                ? "Listo, registramos tu orden"
                : "Pago recibido y confirmado"}
            </h1>
            <p>
              {isAgency
                ? "Tu orden quedo registrada. Te esperamos en la agencia para completar el pago."
                : "Gracias por tu pago. Se enviara un recibo al correo registrado y empezaremos a preparar tu envio."}
            </p>
          </div>

          <div className="status-grid">
            <div className="status-card status-card--highlight">
              <p className="status-card__title">Recibo y seguimiento</p>
              <p className="status-copy">
                Enviamos un comprobante de pago al correo del contacto y te
                avisaremos ante cualquier novedad del envio.
              </p>
              <ul className="status-list">
                <li>Busca tu recibo en tu bandeja de entrada o spam.</li>
                <li>
                  Guarda el ID de la sesion de orden por si necesitas soporte.
                </li>
                <li>Podras comenzar otro envio cuando quieras.</li>
              </ul>
            </div>
            <div className="status-card">
              <p className="status-card__title">Identificadores</p>
              <div className="status-meta">
                {orderId ? (
                  <div className="status-meta__item">
                    <span>Orden</span>
                    <code>{orderId}</code>
                  </div>
                ) : null}
                {sessionId ? (
                  <div className="status-meta__item">
                    <span>Sesion</span>
                    <div className="relative inline-flex max-w-full items-start">
                      <code
                        className="
          max-w-full 
          break-all whitespace-pre-wrap 
          rounded-md bg-slate-900 px-3 py-2 
          text-xs text-slate-100
        "
                      >
                        {sessionId}
                      </code>

                      <button
                        type="button"
                        onClick={handleCopy}
                        className="
          ml-2 shrink-0 
          rounded-md border border-slate-600 
          bg-slate-800 px-2 py-1 
          text-[10px] uppercase tracking-wide 
          text-slate-100 hover:bg-slate-700
        "
                      >
                        {copied ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <p className="status-note">
                Compartenos este ID si requieres asistencia.
              </p>
            </div>
          </div>

          <div className="status-actions">
            <Link
              href="/funnel"
              className="btn-primary status-action     inline-flex items-center justify-center
    rounded-lg px-4 py-2
    text-sm font-medium
    shadow-sm
    border
    transition
    duration-150
    ease-out
    hover:shadow-md
    active:scale-[0.97]
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-offset-2
    disabled:opacity-60
    disabled:cursor-not-allowed"
            >
              Realizar otro envio
            </Link>
            <Link
              href="/"
              className="btn-secondary status-action     inline-flex items-center justify-center
    rounded-lg px-4 py-2
    text-sm font-medium
    shadow-sm
    border
    transition
    duration-150
    ease-out
    hover:shadow-md
    active:scale-[0.97]
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-offset-2
    disabled:opacity-60
    disabled:cursor-not-allowed"
            >
              Ir al inicio
            </Link>
          </div>
        </section>
      </main>
    </>
  );
};

export default SuccessPage;
