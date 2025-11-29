"use strict";

import Link from "next/link";

export default function MobileNavbar({ open, onNavigate }) {
  return (
    <div className="site-navbar__mobile" id="mobile-menu" hidden={!open}>
      <Link href="#inicio" className="site-navbar__mobile-link" onClick={onNavigate}>
        Inicio
      </Link>
      <Link href="/funnel" className="site-navbar__mobile-link" onClick={onNavigate}>
        <strong>Hacer una Orden</strong>
      </Link>
      <Link href="#contacto" className="site-navbar__mobile-link" onClick={onNavigate}>
        Contacto
      </Link>
      <div className="site-navbar__mobile-group">
        <p className="site-navbar__mobile-heading">Atajos</p>
        <div className="site-navbar__mobile-submenu">
          <Link href="#beneficios" className="site-navbar__mobile-link" onClick={onNavigate}>
            Beneficios
          </Link>
          <Link href="#proceso" className="site-navbar__mobile-link" onClick={onNavigate}>
            Proceso
          </Link>
          <Link href="#quienes" className="site-navbar__mobile-link" onClick={onNavigate}>
            Quienes somos
          </Link>
          <Link href="#ubicacion" className="site-navbar__mobile-link" onClick={onNavigate}>
            Ubicacion
          </Link>
          <Link href="#faq" className="site-navbar__mobile-link" onClick={onNavigate}>
            Preguntas frecuentes
          </Link>
        </div>
      </div>
    </div>
  );
}
