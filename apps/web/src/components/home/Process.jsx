"use strict";

export default function Process() {
  return (
    <section id="proceso" className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-slate mb-12 text-center">
          Como funciona
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 process__grid">
          {["Compra libras", "Prepara tu paquete", "Entrega o recogida"].map(
            (title, idx) => (
              <div key={title} className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-accent text-2xl font-bold">{idx + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-slate mb-2">{title}</h3>
                <p className="text-gray-600">
                  {idx === 0
                    ? "Reserva las libras necesarias y recibe tu guia de empaque."
                    : idx === 1
                    ? "Empaca con seguridad y etiqueta cada bulto para agilizar."
                    : "Trae el paquete o agenda una visita. El resto queda en nuestras manos."}
                </p>
              </div>
            )
          )}
        </div>
        <div className="surface-card surface-card--subtle max-w-2xl mx-auto text-center mt-12">
          <p className="text-slate">
            Recuerda: cada libra cuesta 3.50 USD y la recogida tiene un costo base de 10 USD mas
            0.99 USD por milla.
          </p>
        </div>
      </div>
    </section>
  );
}
