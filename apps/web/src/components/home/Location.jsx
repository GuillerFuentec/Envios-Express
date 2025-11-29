"use strict";

import { useCallback, useEffect, useMemo, useState } from "react";

const ADDRESS = "123 Calle Principal, Suite 101, Miami, FL 33101";

const buildGoogleUrl = (address) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
const buildAppleUrl = (address) => `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;

const detectDefaultMap = () => {
  if (typeof navigator === "undefined") return "google";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|Macintosh/.test(ua)) return "apple";
  return "google";
};

export default function Location() {
  const [showChooser, setShowChooser] = useState(false);
  const [rememberChoice, setRememberChoice] = useState(false);

  const preferred = useMemo(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("mapPreference");
  }, []);

  const openMap = useCallback(
    (provider) => {
      const choice = provider === "auto" ? detectDefaultMap() : provider;
      const url = choice === "apple" ? buildAppleUrl(ADDRESS) : buildGoogleUrl(ADDRESS);
      if (rememberChoice && typeof window !== "undefined") {
        localStorage.setItem("mapPreference", choice);
      }
      window.open(url, "_blank", "noopener");
      setShowChooser(false);
    },
    [rememberChoice]
  );

  const handleClick = () => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("mapPreference") : null;
    if (stored) {
      openMap(stored);
      return;
    }
    setShowChooser(true);
  };

  useEffect(() => {
    if (preferred) {
      // no-op, just ensure effect reads localStorage once hydration occurs
    }
  }, [preferred]);

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
                <span>{ADDRESS}</span>
              </p>
              <p className="text-gray-700 mb-4 flex items-center gap-2">
                <span>Lunes a Viernes: 9:00 AM - 6:00 PM</span>
              </p>
              <button
                type="button"
                onClick={handleClick}
                className="inline-block bg-accent hover:bg-teal-800 text-white font-bold py-2 px-4 rounded transition"
              >
                Como llegar
              </button>
            </div>
          </div>
        </div>
      </div>

      {showChooser && (
        <div className="map-chooser">
          <div className="map-chooser__card">
            <p className="map-chooser__title">Elige con que app abrir el mapa</p>
            <div className="map-chooser__actions">
              <button
                type="button"
                className="btn-safe"
                onClick={() => openMap("google")}
              >
                Google Maps
              </button>
              <button
                type="button"
                className="btn-safe"
                onClick={() => openMap("apple")}
              >
                Apple Maps
              </button>
            </div>
            <label className="map-chooser__remember">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
              />
              Recordar mi eleccion
            </label>
            <button type="button" className="map-chooser__close" onClick={() => setShowChooser(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
