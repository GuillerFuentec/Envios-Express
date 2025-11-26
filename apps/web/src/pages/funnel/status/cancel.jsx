"use strict";

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

const CancelPage = () => {
  const { query } = useRouter();
  const sessionId = query.session_id || query.sessionId || "";

  return (
    <>
      <Head>
        <title>Pago cancelado</title>
      </Head>
      <main className="page-shell">
        <div className="hero-card">
          <p className="eyebrow">Pago no completado</p>
          <h1>Pago cancelado</h1>
          <p>No se completó el pago. Puedes intentar nuevamente cuando desees.</p>
          {sessionId ? (
            <p className="muted-copy">
              ID de sesión: <code>{sessionId}</code>
            </p>
          ) : null}
          <div className="hero__actions" style={{ marginTop: 16, gap: 12 }}>
            <Link href="/funnel" className="btn-primary">
              Reintentar pago
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

export default CancelPage;
