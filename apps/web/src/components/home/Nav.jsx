"use strict";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import MobileNavbar from "./MobileNavbar";

export default function Nav() {
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
            alt="Logo Paqueteria CaribeA�a Express"
            className="site-navbar__brand-logo"
            loading="lazy"
          />
          <Link
            href="#inicio"
            className="site-navbar__brand"
            aria-label="Inicio Paqueteria CaribeA�a"
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
      <div className="flex justify-end">
        <MobileNavbar open={open} onNavigate={() => setOpen(false)} />
      </div>
    </nav>
  );
}
