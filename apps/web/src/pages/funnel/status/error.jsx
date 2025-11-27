"use strict";

import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router";

const ErrorPage = () => {
  const { query } = useRouter();
  const sessionId = query.session_id || query.sessionId || "";
  const orderId = query.orderId || "";

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const channel = new BroadcastChannel("checkout-status");
    channel.postMessage({ status: "error", sessionId });
    localStorage.setItem(
      "checkout-status",
      JSON.stringify({ status: "error", sessionId, ts: Date.now() })
    );
    setTimeout(() => channel.close(), 500);
    if (window.opener && typeof window.close === "function") {
      window.close();
    }
    localStorage.removeItem(`checkout:${sessionId}`);
  }, [sessionId]);

  return (
    <>
      <Head>
        <title>Error en el pago</title>
      </Head>
      <main className="page-shell">
        <div className="hero-card">
          <p className="eyebrow">Pago no procesado</p>
          <h1>No pudimos completar tu orden</h1>
          <p>Hubo un problema procesando el pago o registrando la orden. Intenta de nuevo.</p>
          {orderId ? (
            <p className="muted-copy">
              ID de orden: <code>{orderId}</code>
            </p>
          ) : null}
          {sessionId ? (
            <p className="muted-copy">
              ID de sesión: <code>{sessionId}</code>
            </p>
          ) : null}
          <div className="hero__actions" style={{ marginTop: 16, gap: 12 }}>
            <Link href="/funnel" className="btn-primary">
              Reintentar
            </Link>
            <Link href="/" className="btn-secondary">
              Ir al inicio
            </Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default ErrorPage;
