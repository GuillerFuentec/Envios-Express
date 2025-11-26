"use strict";

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

const SuccessPage = () => {
  const { query } = useRouter();
  const sessionId = query.session_id || query.sessionId || "";
  const orderId = query.orderId || "";
  const mode = query.mode || "online";
  const isAgency = mode === "agency";

  return (
    <>
      <Head>
        <title>Pago completado</title>
      </Head>
      <main className="page-shell">
        <div className="hero-card">
          <p className="eyebrow">Confirmación</p>
          <h1>{isAgency ? "Orden registrada" : "Pago completado"}</h1>
          <p>
            {isAgency
              ? "Tu orden quedó registrada. Te esperamos en la agencia para completar el pago."
              : "Gracias por tu pago. Hemos recibido tu orden y te enviamos el recibo por correo."}
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
            <Link href="/funnel" className="btn-primary">
              Volver al funnel
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

export default SuccessPage;
