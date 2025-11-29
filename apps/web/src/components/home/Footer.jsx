"use strict";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__container">
        <div className="site-footer__social">
          <a href="#" className="site-footer__social-link" aria-label="Facebook">
            <img src="/social-media/facebook.png" alt="icono de facebook" loading="lazy" />
          </a>
          <a href="#" className="site-footer__social-link" aria-label="Instagram">
            <img src="/social-media/instagram.png" alt="icono de instagram" loading="lazy" />
          </a>
          <a href="#" className="site-footer__social-link" aria-label="X">
            <img
              src="/social-media/twitter.png"
              alt="icono de twiter o actualmente x"
              loading="lazy"
              className="w-8 h-8"
            />
          </a>
          <a href="#" className="site-footer__social-link" aria-label="YouTube">
            <img src="/social-media/youtube.png" alt="icono de Youtube" loading="lazy" />
          </a>
        </div>
        <p className="site-footer__copy">
          &copy; 2024 Paqueteria Caribena Express. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
