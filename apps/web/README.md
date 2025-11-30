# Despliegue en Railway

Guía rápida para publicar la aplicación Next.js (`apps/web`) en Railway dentro de este monorepo.

## Configuración del servicio en Railway
- Root directory: `apps/web`
- Framework: Next.js (Nixpacks lo detecta automáticamente)
- Install command: `pnpm install --filter web... --frozen-lockfile`
- Build command: `pnpm --filter web build`
- Start command: `pnpm --filter web start`
- Node: `20` (LTS)
- Opcional: `NEXT_TELEMETRY_DISABLED=1`

> También puedes usar el `Dockerfile.web` en la raíz como alternativa de despliegue (puerto 3000).

## Variables de entorno
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRAPI_WEB_API_URL` (o `AGENCY_API_URL` apuntando a `/api` de Strapi)
- `AGENCY_TOKEN` (token de API en Strapi con permisos `create` en Client/Contact)
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SECRET_KEY`
- `PLATFORM_FEE_PERCENT` (opcional, fallback 2.3)
- `STRIPE_PROCESSING_PERCENT`, `STRIPE_PROCESSING_FIXED` (opcionales)

### Permisos/seguridad
- En Strapi, deja público solo `GET /api/agency-info/resume` (si necesitas exponer precios); todo `Client`, `Contact` y `Payments` debe ir con token.
- `AGENCY_TOKEN` se usa como bearer en las llamadas desde Next a `/api/clients`, `/api/contacts` y `/api/payments/process-transfer`.
- El endpoint interno `/api/connected-accounts` exige `x-admin-token: AGENCY_TOKEN`; no es público.

## Desarrollo local
```bash
pnpm --filter web dev
```
El servidor local corre en `http://localhost:3000` y usa las variables de `.env.local` dentro de `apps/web`.
