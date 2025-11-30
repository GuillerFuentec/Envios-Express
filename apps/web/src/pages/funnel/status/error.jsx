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
          <p>
            Hubo un problema procesando el pago o registrando la orden. Intenta
            de nuevo.
          </p>
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
              Intentar otra vez
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
        </div>
      </main>
    </>
  );
};

export default ErrorPage;
