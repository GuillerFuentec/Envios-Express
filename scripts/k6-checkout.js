"use strict";

// k6 load test para el endpoint de checkout.
// Usa claves de prueba de Stripe y el secret de reCAPTCHA de test.
// Ejecuta con: BASE_URL=http://localhost:3000 k6 run scripts/k6-checkout.js

import http from "k6/http";
import { check, sleep } from "k6";

const WARM_VUS = Number(__ENV.WARM_VUS || 5);
const PEAK_VUS = Number(__ENV.PEAK_VUS || 20);

export const options = {
  stages: [
    { duration: "30s", target: WARM_VUS }, // calentamiento
    { duration: "1m", target: PEAK_VUS }, // carga ligera
    { duration: "30s", target: 0 }, // enfriamiento
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"], // <1% errores
    http_req_duration: ["p(95)<1000"], // p95 < 1s
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const ORIGIN = __ENV.ORIGIN || BASE_URL;
const RECAPTCHA_TOKEN = __ENV.RECAPTCHA_TOKEN || "PASSED"; // con secret de test, este valor pasa
const DELIVERY_OFFSET_DAYS = Number(__ENV.DELIVERY_OFFSET_DAYS || 1); // suma extra para evitar issues de zona horaria

const tomorrowLocal = () => {
  // Construye YYYY-MM-DD en zona horaria local para evitar desfases con toISOString y UTC
  const d = new Date();
  d.setDate(d.getDate() + DELIVERY_OFFSET_DAYS);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildPayload = (vu, iter) => ({
  recaptchaToken: RECAPTCHA_TOKEN,
  contact: {
    email: `load+${vu}-${iter}@test.com`,
    name: "Load Test",
    phone: "3055550000",
    smsConsent: true,
  },
  shipment: {
    weightLbs: 5,
    pickup: false,
    contentType: "Documentos",
    deliveryDate: tomorrowLocal(),
    cityCuba: "La Habana",
  },
  preferences: { paymentMethod: "online" },
  quoteRequest: {
    weightLbs: 5,
    pickup: false,
    contentType: "Documentos",
    deliveryDate: tomorrowLocal(),
    cityCuba: "La Habana",
  },
});

export default function () {
  const payload = buildPayload(__VU, __ITER);

  const res = http.post(
    `${BASE_URL}/api/payments/checkout`,
    JSON.stringify(payload),
    {
      headers: {
        "Content-Type": "application/json",
        Origin: ORIGIN,
      },
    }
  );

  check(res, {
    "status 200": (r) => r.status === 200,
  });

  // breve pausa para no martillar el servidor desde un solo VU
  sleep(1);
}
