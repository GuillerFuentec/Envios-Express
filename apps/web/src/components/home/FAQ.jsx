"use strict";

export default function FAQ() {
  return (
    <section id="faq" className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-slate mb-8 text-center">Preguntas frecuentes</h2>
        <div className="space-y-4">
          <div className="surface-card surface-card--subtle">
            <h3 className="text-xl font-bold text-slate mb-2">Cuanto tarda en llegar el paquete?</h3>
            <p className="text-gray-600">
              El tiempo promedio es de 48 a 72 horas desde que recibimos el paquete en Miami.
            </p>
          </div>
          <div className="surface-card surface-card--subtle">
            <h3 className="text-xl font-bold text-slate mb-2">Puedo solicitar reembolso?</h3>
            <p className="text-gray-600">
              Solo procesamos reembolsos en caso de perdida total. Nuestro equipo te mantiene
              informado.
            </p>
          </div>
          <div className="surface-card surface-card--subtle">
            <h3 className="text-xl font-bold text-slate mb-2">
              Que pasa si mi paquete llega danado?
            </h3>
            <p className="text-gray-600">
              Abrimos un reporte y evaluamos compensaciones segun el caso. Documenta el contenido y
              aseguralo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
