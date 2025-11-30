# Paqueteria Monorepo

Repositorio con dos aplicaciones:
- `apps/web`: frontend Next.js para el funnel de compra y pagos.
- `apps/server`: backend Strapi que expone configuracion de agencia, crea clientes y procesa pagos.

## Indice
- [Arquitectura](#arquitectura)
- [Tecnologias](#tecnologias)
- [Flujos clave](#flujos-clave)
- [Variables de entorno](#variables-de-entorno)
- [Desarrollo local](#desarrollo-local)
- [Despliegue](#despliegue)
- [Seguridad y buenas practicas](#seguridad-y-buenas-practicas)
- [Estructura del repo](#estructura-del-repo)

## Arquitectura
- Frontend Next.js con rutas de API para cotizacion, checkout Stripe y validacion reCAPTCHA.
- Backend Strapi que almacena configuraciones de agencia, registra clientes y expone webhooks Stripe.
- La web consume:
  - `AGENCY_INFO_URL` (endpoint Strapi de resume) para obtener precios y configuracion.
  - `STRAPI_WEB_API_URL` (o `STRAPI_API_URL`) para crear clientes y procesar transferencias.
  - Stripe para crear sesiones de checkout y recibir webhooks.
  - Google Maps (Distance Matrix) para calcular costos de recogida.

## Tecnologias
| Tecnologia | Rol | Logo de referencia |
| --- | --- | --- |
| Next.js / React | Frontend SSR/SSG | https://nextjs.org/static/favicon/favicon.ico |
| Tailwind CSS | Estilos utilitarios | https://tailwindcss.com/favicons/favicon-32x32.png |
| Stripe | Pagos y webhooks | https://stripe.com/img/v3/favicon.ico |
| Google Maps Platform | Distance Matrix para pickup | https://developers.google.com/static/maps/documentation/images/maps-icon.svg |
| Strapi | CMS/API headless | https://strapi.io/favicon.ico |
| pnpm | Gestor de paquetes | https://pnpm.io/logo.png |
| Docker | Contenedores de backend | https://www.docker.com/favicon.ico |
| Vercel | Hosting frontend | https://vercel.com/favicon.ico |
| Railway (opcional) | Hosting backend | https://railway.app/favicon.ico |

## Flujos clave
- **Funnel y cotizacion**: el cliente ingresa datos, la web llama `calculateQuote` (usa `AGENCY_INFO_URL` y Distance Matrix si hay pickup) para mostrar precios y validaciones de negocio.
- **Checkout online**: `/api/payments/checkout` valida reCAPTCHA, construye line items y crea `checkout.session` en Stripe con `STRIPE_SECRET_KEY`. La respuesta entrega `sessionId` y `url` para redirigir al checkout.
- **Confirmacion y registro**:
  - Webhook Stripe (`/api/payments/webhook`) valida firma con `STRIPE_WEBHOOK_SECRET`, arma `client_info` y lo envía a Strapi (`/api/clients`). Opcionalmente usa metadata para calcular comisiones y monto destino.
  - Endpoint `/api/orders/confirm` (web) recupera la session de Stripe y registra de nuevo en Strapi; se puede reforzar con token interno.
  - Endpoint `api/payments/process-transfer` (Strapi) puede ejecutar transferencias al conectado tras un pago confirmado.
- **Cuenta conectada**: endpoint `/api/connected-accounts` acepta `x-admin-token=AGENCY_TOKEN` para mapear `serviceId -> accountId` en Stripe.
- **reCAPTCHA**: checkbox V2 renderizado con `ReCaptchaProvider`/`ReCaptchaCheckbox`; las API routes exigen `recaptchaToken` validado con `SECRET_RECAPTCHA_KEY` o `RECAPTCHA_SECRET_KEY`.
- **Formularios unificados**: inputs y labels reutilizan componentes base (`FormLabel`, `FormControl`, `FormWrapper`) para mantener estilos consistentes y permitir overrides; el teléfono se muestra formateado `(123) 456-7890` en UI y se envía normalizado al backend.

## Variables de entorno

### Web (`apps/web`)
- Google: `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`, `GOOGLE_MAPS_API_KEY`
- reCAPTCHA: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` (o `SECRET_RECAPTCHA_KEY`)
- Stripe: `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_DESTINATION`, `STRIPE_CONNECT_ACCOUNT_ID`, `STRIPE_PROC_PERCENT`, `STRIPE_PROC_FIXED`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `PUBLIC_SITE_URL`
- Plataforma/fees: `PLATFORM_FEE_PERCENT`, `PLATFORM_FEE_RATE`, `PLATFORM_FEE_MIN`, `PLATFORM_FEE_MIN_USD`, `DEFAULT_PRICE_PER_LB`, `PRICE_LB_FALLBACK`
- Agencia/config: `AGENCY_INFO_URL`, `AGENCY_TOKEN`, `AGENCY_PLACE_ID`, `AGENCY_NAME`, `AGENCY_ADDRESS`
- Strapi API: `STRAPI_WEB_API_URL` o `STRAPI_API_URL` (o `AGENCY_API_URL`), usa `AGENCY_TOKEN` como bearer para `/api/clients`, `/api/contacts` y `/api/payments/process-transfer`
- Seguridad/otros: `PAYMENT_FAIL_ALERT_THRESHOLD`, `AGENCY_TOKEN` (bearer hacia Strapi y header admin en `/api/connected-accounts`), `PUBLIC_URL`
- Rate limit checkout (opcional): `CHECKOUT_RATE_LIMIT_MAX` (default 10), `CHECKOUT_RATE_LIMIT_WINDOW_MS` (default 60000)

### Backend (`apps/server`)
Variables criticas de Strapi:
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`
- `PUBLIC_URL`, `CORS_ORIGIN`
- Base de datos: `DATABASE_CLIENT`, `DATABASE_URL` (postgres), `DATABASE_*` detalles, `DATABASE_SSL`, `DATABASE_SSL_REJECT_UNAUTHORIZED`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_DEFAULT_CURRENCY`, `STRIPE_PAYMENT_DESCRIPTION`, `STRIPE_CONNECT_ACCOUNT_ID`, `STRIPE_PROC_PERCENT`, `STRIPE_PROC_FIXED`
- Agencia: `AGENCY_NAME`, `AGENCY_ADDRESS`, `AGENCY_PLACE_ID`, `PRICE_LB`, `PRICE_LB_FALLBACK`, `CUBA_DESTINATIONS`, `CUBA_CONTENT_TYPES`, `GOOGLE_MAPS_API_KEY`, `STRIPE_PROCESSING_PERCENT`, `STRIPE_PROCESSING_FIXED`
- Transferencias y cron: `TRANSFER_MODE`, `TRANSFER_SCHEDULE_DAY`, `TRANSFER_MINIMUM_AMOUNT`
- Notificaciones: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NOTIFY_EMAIL`, `NOTIFICATION_API_CLIENT_ID`, `NOTIFICATION_API_CLIENT_SECRET`, `NOTIFICATION_API_BASE_URL`, `NOTIFICATION_API_CLIENT_TEMPLATE_ID`, `NOTIFICATION_API_CLIENT_SMS_TYPE`, `NOTIFICATION_API_CONTACT_SMS_TYPE`, `NOTIFICATION_DEDUPE_TTL_MS`

## Desarrollo local
```bash
# Instalar dependencias del monorepo
pnpm install

# Frontend
pnpm --filter web dev      # http://localhost:3000

# Backend (Strapi, usa sqlite por defecto)
cd apps/server
cp .env.example .env       # ajusta llaves y DB si quieres postgres
pnpm --filter server dev   # http://localhost:1337
```

## Despliegue

### Web en Vercel
- Root directory: `apps/web`
- Framework: Next.js
- Install command: `pnpm install --filter web... --frozen-lockfile`
- Build command: `pnpm --filter web build`
- Node 20
- Variables de entorno: todas las listadas en la seccion Web (usa production keys, no las de prueba).
- Webhook Stripe: configura en el dashboard la URL `https://<tu-app>.vercel.app/api/payments/webhook` con `STRIPE_WEBHOOK_SECRET`.
- CORS en Strapi: define `CORS_ORIGIN=https://<tu-app>.vercel.app` (puedes pasar multiples separados por coma).

### Web en Railway (opcional)
- Servicio Node con Root `apps/web` (Nixpacks) o usando el `Dockerfile.web` en la raiz.
- Nixpacks/Node: Install `pnpm install --filter web... --frozen-lockfile`, Build `pnpm --filter web build`, Start `pnpm --filter web start`, Node 20.
- Docker: selecciona `Dockerfile.web` (contexto raiz del repo); expone puerto `3000`.
- Variables: mismas que en Vercel (Stripe, reCAPTCHA, Strapi, agencia, INTERNAL_API_TOKEN/ADMIN_API_TOKEN, etc.).
- Webhook Stripe: `https://<tu-servicio>.up.railway.app/api/payments/webhook`.

### Backend en Railway (o similar)
- Usa el `Dockerfile` de la raiz; Railway lo detecta automaticamente.
- Variables minimas: `NODE_ENV=production`, `DATABASE_CLIENT=postgres`, `DATABASE_URL`, `DATABASE_SSL=true`, `PUBLIC_URL=https://<tu-backend>`, `CORS_ORIGIN=https://<tu-frontend>`, llaves de Strapi y Stripe.
- Puerto expuesto por la imagen: `1337`.
- Si quieres probar Stripe webhooks localmente: `stripe listen --forward-to http://localhost:1337/stripe/webhook`.

### Conexion Web <-> Server
- `AGENCY_INFO_URL` debe apuntar a `https://<tu-backend>/api/agency-info/resume` (opcional `AGENCY_TOKEN` si lo proteges en Strapi).
- `STRAPI_WEB_API_URL` (o `AGENCY_API_URL`) debe apuntar a `https://<tu-backend>/api` y requerir `AGENCY_TOKEN` como bearer para `/api/clients`, `/api/contacts` y `/api/payments/process-transfer`.
- Ajusta CORS en Strapi (`CORS_ORIGIN`) para permitir el dominio de Vercel.

## Configurar permisos en Strapi
Para evitar errores 403 al crear clientes/contactos desde el frontend:
- En Strapi Admin ve a **Settings → API Tokens** y crea un token (ej. “agency-token”) de tipo **Custom** con permisos `create`/`find` sobre **Client** y `create` sobre **Contact**; añade `create` a **Payments → process-transfer** si usas transferencias automáticas.
- Copia ese token en la variable `AGENCY_TOKEN` del frontend (`apps/web`) y del backend si lo necesitas en otros servicios.
- Asegúrate de que la colección `Client` y `Contact` no estén publicas en el rol *Public*; el acceso debe ser vía token.
- Verifica que `STRAPI_WEB_API_URL` (o `AGENCY_API_URL`) apunte al `/api` del backend y que el token no expire si usas token temporal.
- Rol *Public*: deja sólo lectura de la configuración pública (ej. `GET /api/agency-info/resume`). No habilites `create`/`update` en `Client`, `Contact` ni `Payments`.
- Llamadas protegidas desde Next a Strapi: `/api/clients`, `/api/contacts`, `/api/payments/process-transfer` se llaman siempre con `Authorization: Bearer ${AGENCY_TOKEN}` (ver rutas en `apps/web/src/pages/api/` y `apps/web/src/lib/server/agency.js`).
- Endpoint interno `api/connected-accounts` (Next) exige header `x-admin-token: AGENCY_TOKEN`; no lo publiques sin ese header.

## Seguridad y buenas practicas
- No uses las llaves de prueba del repo en produccion; rota todas las credenciales y webhook secrets.
- Protege `/api/connected-accounts` con el header `x-admin-token: AGENCY_TOKEN`; si quieres reforzar `/api/orders/confirm` añade un header interno/CSRF (hoy confía en Stripe + reCAPTCHA).
- Habilita rate limiting a los endpoints de pagos si usas un edge/middleware.
- Asegura que `STRIPE_WEBHOOK_SECRET` este definido en Vercel para validar firmas.
- No expongas `STRIPE_SECRET_KEY`, `AGENCY_TOKEN` o tokens de Strapi en el frontend.

## Estructura del repo
```
apps/
  web/        # Next.js 14: pages router, API routes para pagos y quote
    src/
      pages/  # UI principal (funnel) y endpoints API (Stripe, recaptcha, etc.)
      lib/server/ # logica de negocio (quote, agency config, distance, stripe)
      components/ # UI del funnel, ReCaptchaProvider
  server/     # Strapi: APIs para clients, pagos, agency-info, transfers
docs/         # Documentacion adicional
img/          # Assets (ignorados en git)
pnpm-workspace.yaml
vercel.json
railway.toml
Dockerfile    # Construye y arranca solo apps/server en contenedor
```
