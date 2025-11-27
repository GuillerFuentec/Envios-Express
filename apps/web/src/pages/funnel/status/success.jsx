"use strict";

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

  return (
    <>
      <Head>
        <title>Pago completado</title>
      </Head>
      <main className="page-shell">
        <section className="status-shell status-shell--success">
          <div className="status-header">
            <span className="status-pill">{isAgency ? "Orden registrada" : "Pago completado"}</span>
            <h1>{isAgency ? "Listo, registramos tu orden" : "Pago recibido y confirmado"}</h1>
            <p>
              {isAgency
                ? "Tu orden quedA3 registrada. Te esperamos en la agencia para completar el pago."
                : "Gracias por tu pago. Stripe enviarA� el recibo al correo registrado y empezaremos a preparar tu envA-o."}
            </p>
          </div>

          <div className="status-grid">
            <div className="status-card status-card--highlight">
              <p className="status-card__title">Recibo y seguimiento</p>
              <p className="status-copy">
                Enviamos el comprobante al correo del contacto y te avisaremos ante cualquier novedad del envA-o.
              </p>
              <ul className="status-list">
                <li>Busca el recibo de Stripe en tu bandeja de entrada y spam.</li>
                <li>Guarda el ID de la sesiA3n u orden si necesitas soporte.</li>
                <li>PodrA�s comenzar otro envA-o cuando quieras.</li>
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
                    <span>SesiA3n</span>
                    <code>{sessionId}</code>
                  </div>
                ) : null}
              </div>
              <p className="status-note">Comparte estos ID si requieres asistencia.</p>
            </div>
          </div>

          <div className="status-actions">
            <Link href="/funnel" className="btn-primary status-action">
              Crear otro envA-o
            </Link>
            <Link href="/" className="btn-secondary status-action">
              Ir al inicio
            </Link>
          </div>
        </section>
      </main>
    </>
  );
};

export default SuccessPage;
