# Changelog
Todas las notas de cambios de este proyecto. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]
### Added
- Integrado Google reCAPTCHA v3 en el frontend mediante el nuevo proveedor global y la sección de verificación manual (`apps/web/components/ReCaptchaProvider.jsx:1`, `apps/web/components/ReCaptchaSection.jsx:1`), habilitando la obtención de tokens en toda la app.
- Incorporado el módulo de verificación server-side y la ruta auxiliar `/api/verify-recaptcha` para confirmar tokens desde el funnel (`apps/web/lib/server/recaptcha.js:1`, `apps/web/pages/api/verify-recaptcha.js:1`).
- Actualizado el ejemplo de entorno con las claves requeridas por la integración (`apps/web/.env.local.example:1`).

### Changed
- El controlador del funnel ahora ejecuta reCAPTCHA antes de cotizar, crear órdenes o iniciar el checkout, y deshabilita la acción principal hasta contar con un desglose válido (`apps/web/hooks/useFunnelController.js:1`, `apps/web/components/Funnel/ActionsBar.jsx:1`).
- Las rutas de cotización, órdenes y checkout exigen un token válido previo a contactar la agencia o Stripe (`apps/web/pages/api/quote.js:3`, `apps/web/pages/api/orders/create.js:1`, `apps/web/pages/api/payments/checkout.js:1`).

### Fixed
- _Sin cambios_

### Deprecated
- _Sin cambios_

### Removed
- Eliminado el bypass de reCAPTCHA y los controladores heredados en el backend para forzar la validación real (`apps/server/src/middlewares/recaptchaBypass.js:1`, `apps/server/src/utils/recaptcha.js:1`, `apps/server/src/api/client/controllers/client.js:1`).
- Retirados los bundles estáticos legacy y el hook `useRecaptcha` ahora redundante al adoptar el proveedor oficial (`apps/web/dist/index.html:1`, `apps/web/hooks/useRecaptcha.js:1`).

### Security
- Las operaciones sensibles (cotizar, crear órdenes y pagos) quedan protegidas por `requireRecaptcha`, bloqueando automatizaciones sin un token válido (`apps/web/lib/server/recaptcha.js:1`, `apps/web/pages/api/quote.js:3`).

---

## [1.3.0] - 2025-11-13
### Added
- Soporte para exportar reportes en CSV. (#245, @usuario)

### Changed
- Actualizado el flujo de login para reducir latencia. (#239)

### Fixed
- Arreglado bug en paginación cuando `page=1`. (PR #252)

### Security
- Actualizado `jsonwebtoken` a 9.0.2 para corregir CVE-XXXX-YYYY.

## [1.2.1] - 2025-10-30
### Fixed
- Error 500 al crear usuarios sin avatar. (#233)

## [1.2.0] - 2025-10-15
### Added
- Endpoint `GET /health` con métricas básicas.

### Deprecated
- `POST /v1/login` quedará obsoleto en 1.4.0. Usar `POST /auth/login`.

### Removed
- Eliminado soporte para Node 16 (fin de vida).

## [1.1.0] - 2025-09-01
### Added
- Tema oscuro en el panel administrativo.

## [1.0.0] - 2025-08-10
### Added
- Primera versión estable.

