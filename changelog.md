# Changelog
Todas las notas de cambios de este proyecto. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]
### Added
- Documentacion de arquitectura, despliegue y seguridad para web/Strapi (`README.md:1`).
- Rate limiting configurable para el checkout (`apps/web/pages/api/payments/checkout.js:1`).
- Integrado Google reCAPTCHA v3 en el frontend mediante el nuevo proveedor global y la seccion de verificacion manual (`apps/web/components/ReCaptchaProvider.jsx:1`, `apps/web/components/ReCaptchaSection.jsx:1`), habilitando la obtencion de tokens en toda la app.
- Incorporado el modulo de verificacion server-side y la ruta auxiliar `/api/verify-recaptcha` para confirmar tokens desde el funnel (`apps/web/lib/server/recaptcha.js:1`, `apps/web/pages/api/verify-recaptcha.js:1`).
- Actualizado el ejemplo de entorno con las claves requeridas por la integracion (`apps/web/.env.local.example:1`).
- Dockerfile dedicado para desplegar `apps/web` en Railway/containers (`Dockerfile.web:1`).
- Migracion a reCAPTCHA v2 (checkbox) con nuevo widget y cliente `react-google-recaptcha` (`apps/web/src/components/ReCaptchaCheckbox.jsx:1`, `apps/web/src/components/ReCaptchaProvider.jsx:1`).

### Changed
- El controlador del funnel ahora ejecuta reCAPTCHA antes de cotizar, crear ordenes o iniciar el checkout, y deshabilita la accion principal hasta contar con un desglose valido (`apps/web/hooks/useFunnelController.js:1`, `apps/web/components/Funnel/ActionsBar.jsx:1`).
- Las rutas de cotizacion, ordenes y checkout exigen un token valido previo a contactar la agencia o Stripe (`apps/web/pages/api/quote.js:3`, `apps/web/pages/api/orders/create.js:1`, `apps/web/pages/api/payments/checkout.js:1`).
- CORS de Strapi ahora admite origenes definidos en `CORS_ORIGIN` ademas de los locales (`apps/server/config/middlewares.js:1`).
- Recaptcha en servidores ajustado para validar tokens v2 sin score (`apps/web/src/lib/server/recaptcha.js:1`).
- Funnel muestra y consume el checkbox de reCAPTCHA antes de cotizar/pagar (`apps/web/src/pages/funnel/index.jsx:1`, `apps/web/src/hooks/useFunnelController.js:1`).

### Fixed
- _Sin cambios_

### Deprecated
- _Sin cambios_

### Removed
- Eliminado el bypass de reCAPTCHA y los controladores heredados en el backend para forzar la validacion real (`apps/server/src/middlewares/recaptchaBypass.js:1`, `apps/server/src/utils/recaptcha.js:1`, `apps/server/src/api/client/controllers/client.js:1`).
- Retirados los bundles estaticos legacy y el hook `useRecaptcha` ahora redundante al adoptar el proveedor oficial (`apps/web/dist/index.html:1`, `apps/web/hooks/useRecaptcha.js:1`).

### Security
- Las operaciones sensibles (cotizar, crear ordenes y pagos) quedan protegidas por `requireRecaptcha`, bloqueando automatizaciones sin un token valido (`apps/web/lib/server/recaptcha.js:1`, `apps/web/pages/api/quote.js:3`).
- `/api/orders/confirm` y `/api/connected-accounts` requieren token interno (`INTERNAL_API_TOKEN` o `ADMIN_API_TOKEN`) (`apps/web/pages/api/orders/confirm.js:1`, `apps/web/pages/api/connected-accounts/index.js:1`).
- Rate limit en checkout para mitigar abuso de creacion de sesiones de pago (`apps/web/pages/api/payments/checkout.js:1`).

---

## [1.3.0] - 2025-11-13
### Added
- Soporte para exportar reportes en CSV. (#245, @usuario)

### Changed
- Actualizado el flujo de login para reducir latencia. (#239)

### Fixed
- Arreglado bug en paginacion cuando `page=1`. (PR #252)

### Security
- Actualizado `jsonwebtoken` a 9.0.2 para corregir CVE-XXXX-YYYY.

## [1.2.1] - 2025-10-30
### Fixed
- Error 500 al crear usuarios sin avatar. (#233)

## [1.2.0] - 2025-10-15
### Added
- Endpoint `GET /health` con metricas basicas.

### Deprecated
- `POST /v1/login` quedara obsoleto en 1.4.0. Usar `POST /auth/login`.

### Removed
- Eliminado soporte para Node 16 (fin de vida).

## [1.1.0] - 2025-09-01
### Added
- Tema oscuro en el panel administrativo.

## [1.0.0] - 2025-08-10
### Added
- Primera version estable.
