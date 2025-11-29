"use strict";

import Head from "next/head";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import ReCaptchaCheckbox from "../components/ReCaptchaCheckbox";

const Nav = () => {
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPinned, setDropdownPinned] = useState(false);
  const dropdownRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownPinned(false);
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleDropdown = () => {
    setDropdownPinned((prev) => {
      const nextPinned = !prev;
      setDropdownOpen(nextPinned ? true : false);
      return nextPinned;
    });
  };

  const handleMouseLeaveDropdown = () => {
    if (!dropdownPinned) {
      setDropdownOpen(false);
    }
  };

  return (
    <nav className="site-navbar">
      <div className="site-navbar__container">
        <div className="site-navbar__brand-group">
          <img
            src="/logo.png"
            alt="Logo Paqueteria Caribeña Express"
            className="site-navbar__brand-logo"
            loading="lazy"
          />
          <Link
            href="#inicio"
            className="site-navbar__brand"
            aria-label="Inicio Paqueteria Caribeña"
          />
          <button
            type="button"
            className="site-navbar__toggle"
            aria-controls="mobile-menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Abrir menu principal</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="site-navbar__icon site-navbar__icon--menu"
              aria-hidden="true"
            >
              <path
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="site-navbar__icon site-navbar__icon--close"
              aria-hidden="true"
            >
              <path
                d="M6 18 18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="site-navbar__links">
          <Link href="#inicio" className="site-navbar__link">
            Inicio
          </Link>
          <div
            className="site-navbar__dropdown"
            ref={dropdownRef}
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={handleMouseLeaveDropdown}
          >
            <button
              type="button"
              className="site-navbar__dropdown-button"
              ref={btnRef}
              onClick={handleToggleDropdown}
              aria-expanded={dropdownOpen}
            >
              Atajos
            </button>
            <div
              className="site-navbar__dropdown-menu"
              style={{
                display: dropdownOpen ? "flex" : "none",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <Link href="#beneficios" className="site-navbar__dropdown-link">
                Beneficios
              </Link>
              <Link href="#proceso" className="site-navbar__dropdown-link">
                Proceso
              </Link>
              <Link href="#funnel" className="site-navbar__dropdown-link">
                Planifica
              </Link>
              <Link href="#quienes" className="site-navbar__dropdown-link">
                Quienes somos
              </Link>
              <Link href="#ubicacion" className="site-navbar__dropdown-link">
                Ubicacion
              </Link>
              <Link href="#faq" className="site-navbar__dropdown-link">
                Preguntas frecuentes
              </Link>
            </div>
          </div>
          <Link href="#contacto" className="site-navbar__link">
            Contacto
          </Link>
        </div>
        <div className="site-navbar__actions">
          <Link href="/funnel" className="site-navbar__cta !text-white">
            Iniciar envio
          </Link>
        </div>
      </div>
      <div className="site-navbar__mobile" id="mobile-menu" hidden={!open}>
        <Link href="#inicio" className="site-navbar__mobile-link">
          Inicio
        </Link>
        <Link href="/funnel" className="site-navbar__mobile-link">
          Funnel
        </Link>
        <Link href="#contacto" className="site-navbar__mobile-link">
          Contacto
        </Link>
        <div className="site-navbar__mobile-group">
          <p className="site-navbar__mobile-heading">Atajos</p>
          <div className="site-navbar__mobile-submenu">
            <Link href="#beneficios" className="site-navbar__mobile-link">
              Beneficios
            </Link>
            <Link href="#proceso" className="site-navbar__mobile-link">
              Proceso
            </Link>
            <Link href="#funnel" className="site-navbar__mobile-link">
              Planifica
            </Link>
            <Link href="#quienes" className="site-navbar__mobile-link">
              Quienes somos
            </Link>
            <Link href="#ubicacion" className="site-navbar__mobile-link">
              Ubicacion
            </Link>
            <Link href="#faq" className="site-navbar__mobile-link">
              Preguntas frecuentes
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => (
  <section id="inicio" className="bg-primary py-20 px-4">
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center hero__layout">
      <div>
        <div className="eyebrow">Envios a Cuba sin complicaciones</div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate mt-4">
          Paga solo por libras y entrega en 48-72 horas
        </h1>
        <p className="text-xl text-slate mt-6">
          Te ayudamos a enviar paquetes a Cuba con tarifas claras, soporte
          cercano y opciones flexibles de recogida o entrega en agencia.
        </p>
        <div className="flex flex-wrap gap-4 mt-8 hero__actions">
          <Link
            href="/funnel"
            className="bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 px-6 rounded-lg transition !text-white"
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
        <div className="flex flex-wrap gap-4 mt-8 hero__badges">
          <span className="badge">Precio transparente</span>
          <span className="badge">Entrega 48-72h</span>
          <span className="badge">Equipo humano</span>
        </div>
      </div>
      <div className="hero__media">
        <img
          src="/hero.webp"
          alt="Equipo preparando envios para Cuba"
          loading="lazy"
        />
      </div>
    </div>
  </section>
);

const Highlights = () => (
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
          <h3 className="text-xl font-bold text-slate mb-2">Entrega rápida</h3>
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

const Process = () => (
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
                <span className="text-accent text-2xl font-bold">
                  {idx + 1}
                </span>
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
          Recuerda: cada libra cuesta 3.50 USD y la recogida tiene un costo base
          de 10 USD mas 0.99 USD por milla.
        </p>
      </div>
    </div>
  </section>
);

const About = () => (
  <section id="quienes" className="py-16 px-4">
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-slate mb-8 text-center">
        Quienes somos
      </h2>
      <div className="surface-card surface-card--subtle max-w-3xl mx-auto">
        <p className="text-gray-700 text-lg leading-relaxed">
          En Paqueteria Caribena Express nos dedicamos a crear una experiencia
          de envios simple y confiable. Somos un equipo de especialistas que
          vive entre Miami y Cuba, con rutas optimizadas y procesos
          transparentes para que tus paquetes lleguen a tiempo.
        </p>
      </div>
    </div>
  </section>
);

const Location = () => (
  <section id="ubicacion" className="py-16 px-4 bg-white">
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-slate mb-8 text-center">
        Ubicacion
      </h2>
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
            <h3 className="text-xl font-bold text-slate mb-4">
              Nuestra direccion
            </h3>
            <p className="text-gray-700 mb-4 flex items-center gap-2">
              <span>123 Calle Principal, Suite 101, Miami, FL 33101</span>
            </p>
            <p className="text-gray-700 mb-4 flex items-center gap-2">
              <span>Lunes a Viernes: 9:00 AM - 6:00 PM</span>
            </p>
            <p className="text-gray-700 mb-6 flex items-center gap-2">
              <span>+1 432 232 1612</span>
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

const FAQ = () => (
  <section id="faq" className="py-16 px-4">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-slate mb-8 text-center">
        Preguntas frecuentes
      </h2>
      <div className="space-y-4">
        <div className="surface-card surface-card--subtle">
          <h3 className="text-xl font-bold text-slate mb-2">
            Cuanto tarda en llegar el paquete?
          </h3>
          <p className="text-gray-600">
            El tiempo promedio es de 48 a 72 horas desde que recibimos el
            paquete en Miami.
          </p>
        </div>
        <div className="surface-card surface-card--subtle">
          <h3 className="text-xl font-bold text-slate mb-2">
            Puedo solicitar reembolso?
          </h3>
          <p className="text-gray-600">
            Solo procesamos reembolsos en caso de perdida total. Nuestro equipo
            te mantiene informado.
          </p>
        </div>
        <div className="surface-card surface-card--subtle">
          <h3 className="text-xl font-bold text-slate mb-2">
            Que pasa si mi paquete llega danado?
          </h3>
          <p className="text-gray-600">
            Abrimos un reporte y evaluamos compensaciones segun el caso.
            Documenta el contenido y aseguralo.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const Contact = () => (
  <section id="contacto" className="py-16 px-4 bg-white">
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-slate mb-8 text-center">Contacto</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 contact__grid">
        <ContactInfo />
        <ContactForm />
      </div>
    </div>
  </section>
);

const ContactInfo = () => (
  <div>
    <p className="text-gray-700 text-lg mb-6">Tienes preguntas? Nuestro equipo esta listo para ayudarte.</p>
    <div className="space-y-4">
      <div className="flex items-center gap-4 contact__info-item">
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
          <span className="text-accent w-5 h-5">@</span>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Email</p>
          <a href="mailto:contact@raccoonstudiosllc.com" className="text-slate hover:text-accent">
            contact@raccoonstudiosllc.com
          </a>
        </div>
      </div>
      <div className="flex items-center gap-4 contact__info-item">
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
          <span className="text-accent w-5 h-5">?</span>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Telefono</p>
          <a href="tel:+14322321612" className="text-slate hover:text-accent">
            +1 432 232 1612
          </a>
        </div>
      </div>
      <div className="flex items-center gap-4 contact__info-item">
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
          <span className="text-accent w-5 h-5">??</span>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Direccion</p>
          <p className="text-slate">123 Calle Principal, Suite 101, Miami, FL 33101</p>
        </div>
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
    const value = field === "smsConsent" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ text: "", variant: "" });
    if (!recaptchaToken) {
      setStatus({ text: "Confirma el reCAPTCHA antes de enviar.", variant: "error" });
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
      setStatus({ text: "Mensaje enviado. Te contactaremos pronto.", variant: "success" });
      setForm({ name: "", email: "", phone: "", message: "", smsConsent: false });
      setRecaptchaToken("");
    } catch (error) {
      setStatus({ text: error.message || "No pudimos enviar tu mensaje.", variant: "error" });
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
        <label htmlFor="contactSmsConsent" className="text-gray-700 text-sm leading-relaxed">
          Acepto recibir mensajes de texto para confirmar mi solicitud y coordinar detalles del envio.
        </label>
      </div>
      <div className="my-4 flex justify-end">
        <ReCaptchaCheckbox onTokenChange={setRecaptchaToken} />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-70"
      >
        {sending ? "Enviando..." : "Enviar mensaje"}
      </button>
      {status.text ? (
        <p className={`mt-3 ${status.variant === "error" ? "text-red-600" : "text-green-700"}`}>
          {status.text}
        </p>
      ) : null}
    </form>
  );
};

const Footer = () => (
  <footer className="site-footer">
    <div className="site-footer__container">
      <div className="site-footer__social">
        <a href="#" className="site-footer__social-link" aria-label="Facebook">
          Fb
        </a>
        <a href="#" className="site-footer__social-link" aria-label="Instagram">
          Ig
        </a>
        <a href="#" className="site-footer__social-link" aria-label="X">
          X
        </a>
        <a href="#" className="site-footer__social-link" aria-label="YouTube">
          Yt
        </a>
      </div>
      <p className="site-footer__copy">
        &copy; 2024 Paqueteria Caribena Express. Todos los derechos reservados.
      </p>
    </div>
  </footer>
);

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Paqueteria Caribena Express - Envios a Cuba</title>
        <meta
          name="description"
          content="Envios a Cuba fácil: paga por libra, recogida opcional, entrega en 48-72h."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Nav />
      <Hero />
      <Highlights />
      <Process />
      <About />
      <Location />
      <FAQ />
      <Contact />
      <Footer />
    </>
  );
}

