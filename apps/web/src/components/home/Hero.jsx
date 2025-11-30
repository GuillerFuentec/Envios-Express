"use strict";

import Link from "next/link";

export default function Hero() {
  return (
    <section id="inicio" className="bg-primary py-20 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center hero__layout">
        <div className="text-center md:text-left flex flex-col items-center md:items-start">
          <div className="eyebrow">Envios a Cuba sin complicaciones</div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate mt-4">
            Paga solo por libras y entrega en 48-72 horas
          </h1>
          <p className="text-xl text-slate mt-6">
            Te ayudamos a enviar paquetes a Cuba con tarifas claras, soporte
            cercano y opciones flexibles de recogida o entrega en agencia.
          </p>
          <div className="flex flex-wrap gap-4 mt-8 hero__actions justify-center md:justify-start">
            <Link
              href="/funnel"
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 px-6 rounded-lg transition cta-blink"
            >
              Planificar envio
            </Link>
            <Link
              href="#contacto"
              className="bg-white hover:bg-gray-100 text-accent font-bold py-3 px-6 rounded-lg transition"
            >
              Hablar con un asesor
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 mt-8 hero__badges justify-center md:justify-start">
            <span className="badge">Precio transparente</span>
            <span className="badge">Entrega 48-72h</span>
            <span className="badge">Equipo humano</span>
          </div>
        </div>
        <div className="hero__media hidden md:block">
          <img
            src="/hero.webp"
            alt="Equipo preparando envios para Cuba"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
