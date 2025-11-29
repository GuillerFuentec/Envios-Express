"use strict";

export default function Location() {
  return (
    <section id="ubicacion" className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-slate mb-8 text-center">Ubicacion</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center location__grid">
          <div>
            <div className="h-64 md:h-96 bg-gray-200 rounded-lg overflow-hidden">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.215573291234!2d-73.9878449241647!3d40.74844097138946!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259a9b3117469%3A0xd134e199a405a163!2sEmpire%20State%20Building!5e0!3m2!1sen!2sus!4v1710000000000!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
          <div>
            <div className="surface-card surface-card--subtle">
              <h3 className="text-xl font-bold text-slate mb-4">Nuestra direccion</h3>
              <p className="text-gray-700 mb-4 flex items-center gap-2">
                <span>123 Calle Principal, Suite 101, Miami, FL 33101</span>
              </p>
              <p className="text-gray-700 mb-4 flex items-center gap-2">
                <span>Lunes a Viernes: 9:00 AM - 6:00 PM</span>
              </p>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-accent hover:bg-teal-800 text-white font-bold py-2 px-4 rounded transition"
              >
                Como llegar
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
