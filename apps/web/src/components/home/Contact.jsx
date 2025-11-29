"use strict";

import { useState } from "react";
import ReCaptchaCheckbox from "../ReCaptchaCheckbox";

const ContactInfo = () => (
  <div className="space-y-4 mt-8">
    <div className="flex items-center gap-4 contact__info-item">
      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
        <span className="text-accent w-10 h-10">
          <img
            src="/web-icons/mail.png"
            alt="icono que representa correo electronico"
            loading="lazy"
          />
        </span>
      </div>
      <div>
        <p className="text-gray-500 text-sm">Email</p>
        <a
          href="mailto:contact@raccoonstudiosllc.com"
          className="text-slate hover:text-accent"
        >
          contact@raccoonstudiosllc.com
        </a>
      </div>
    </div>
    <div className="flex items-center gap-4 contact__info-item">
      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center" />
    </div>
    <div className="flex items-center gap-4 contact__info-item">
      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
        <span className="text-accent w-10 h-10">
          <img
            src="/web-icons/location.png"
            alt="icono que representa la direccion del negocio"
            loading="lazy"
          />
        </span>
      </div>
      <div>
        <p className="text-gray-500 text-sm">Direccion</p>
        <p className="text-slate">
          123 Calle Principal, Suite 101, Miami, FL 33101
        </p>
      </div>
    </div>
  </div>
);

const ContactForm = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    smsConsent: false,
  });
  const [status, setStatus] = useState({ text: "", variant: "" });
  const [sending, setSending] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");

  const handleChange = (field) => (event) => {
    const value =
      field === "smsConsent" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ text: "", variant: "" });
    if (!recaptchaToken) {
      setStatus({
        text: "Confirma el reCAPTCHA antes de enviar.",
        variant: "error",
      });
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, recaptchaToken }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "No pudimos enviar tu mensaje.");
      }
      setStatus({
        text: "Mensaje enviado. Te contactaremos pronto.",
        variant: "success",
      });
      setForm({
        name: "",
        email: "",
        phone: "",
        message: "",
        smsConsent: false,
      });
      setRecaptchaToken("");
    } catch (error) {
      setStatus({
        text: error.message || "No pudimos enviar tu mensaje.",
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="surface-card surface-card--subtle" onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="contactName" className="block text-gray-700 mb-2">
          Nombre completo
        </label>
        <input
          type="text"
          id="contactName"
          name="name"
          required
          value={form.name}
          onChange={handleChange("name")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="contactEmail" className="block text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          id="contactEmail"
          name="email"
          required
          value={form.email}
          onChange={handleChange("email")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="contactPhone" className="block text-gray-700 mb-2">
          Telefono
        </label>
        <input
          type="tel"
          id="contactPhone"
          name="phone"
          placeholder="+1 555 000 0000"
          required
          value={form.phone}
          onChange={handleChange("phone")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>
      <div className="my-4">
        <label htmlFor="contactMessage" className="block text-gray-700 mb-2">
          Mensaje
        </label>
        <textarea
          id="contactMessage"
          name="message"
          rows="4"
          required
          value={form.message}
          onChange={handleChange("message")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>
      <div className="my-4 flex items-start gap-3">
        <input
          type="checkbox"
          id="contactSmsConsent"
          required
          checked={form.smsConsent}
          onChange={handleChange("smsConsent")}
          className="mt-1 w-4 h-4 border-gray-300 text-accent focus:ring-accent"
        />
        <label
          htmlFor="contactSmsConsent"
          className="text-gray-700 text-sm leading-relaxed"
        >
          Acepto recibir mensajes de texto y correos electronicos por parte de
          Raccoon Studios LLC
        </label>
      </div>
      <div className="my-6 flex">
        <ReCaptchaCheckbox onTokenChange={setRecaptchaToken} />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="bg-teal-700  hover:bg-teal-800 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-70"
      >
        {sending ? "Enviando..." : "Enviar mensaje"}
      </button>
      {status.text ? (
        <p
          className={`mt-3 ${
            status.variant === "error" ? "text-red-600" : "text-green-700"
          }`}
        >
          {status.text}
        </p>
      ) : null}
      <div className="mt-8">
        <hr />
      </div>
    </form>
  );
};

export default function Contact() {
  return (
    <section id="contacto" className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-slate mb-8 text-center">
          Contacto
        </h2>
        <p className="text-gray-700 text-lg mb-6">
          Tienes preguntas? Nuestro equipo esta listo para ayudarte.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 contact__grid">
          <div className="order-2 md:order-1">
            <ContactInfo />
          </div>
          <div className="order-1 md:order-2">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
