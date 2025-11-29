"use strict";

export default function Highlights() {
  return (
    <section id="beneficios" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-slate mb-12 text-center">
          Por que elegirnos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 highlights__grid">
          <div className="grid-card transition">
            <h3 className="text-xl font-bold text-slate mb-2">Precio claro</h3>
            <p className="text-gray-600">
              Paga 3.50 USD por libra sin costos ocultos ni sorpresas.
            </p>
          </div>
          <div className="grid-card transition">
            <h3 className="text-xl font-bold text-slate mb-2">Entrega rapida</h3>
            <p className="text-gray-600">
              Rutas optimizadas que garantizan entrega en 48 a 72 horas.
            </p>
          </div>
          <div className="grid-card transition">
            <h3 className="text-xl font-bold text-slate mb-2">
              Recogida opcional
            </h3>
            <p className="text-gray-600">
              Vamos a tu puerta o recibimos el paquete en nuestra agencia.
            </p>
          </div>
          <div className="grid-card transition">
            <h3 className="text-xl font-bold text-slate mb-2">Soporte cercano</h3>
            <p className="text-gray-600">
              Asesores reales que responden tus dudas en cada etapa.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
