import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>Paquetería Caribeña Express · Envíos a Cuba</title>
        <meta
          name="description"
          content="Calcula tu envío a Cuba con nuestro funnel guiado y paga online o en agencia."
        />
      </Head>
      <main className="page-shell">
        <section className="hero-card">
          <p className="funnel-eyebrow">Envios a Cuba</p>
          <h1>Planifica tu envío con un funnel guiado de 4 pasos</h1>
          <p>
            Consulta la tarifa oficial de la agencia, valida tu información en un
            flujo guiado, calcula el costo real (peso, recogida, tarifas y
            procesamiento) y define si pagarás online o en agencia.
          </p>
          <Link href="/funnel" className="cta">
            Ir al funnel
          </Link>
        </section>

        <section className="funnel-card">
          <h2 style={{ marginTop: 0 }}>¿Qué obtendrás?</h2>
          <ul>
            <li>
              Cotización validada directamente con el backend de la agencia.
            </li>
            <li>
              Soporte para recolección a domicilio con Google Places Autocomplete
              y Distance Matrix.
            </li>
            <li>
              Checkout con Stripe o confirmación inmediata para pago en agencia.
            </li>
          </ul>
          <p style={{ marginTop: 24, color: "var(--color-muted)" }}>
            Todo el funnel está disponible en <strong>/funnel</strong>. Puedes
            regresar a esta página cuando quieras.
          </p>
        </section>
      </main>
    </>
  );
}
