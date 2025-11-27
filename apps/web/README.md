# Despliegue en Vercel

Guia rapida para publicar la aplicacion Next.js en Vercel dentro de este monorepo.

## Configuracion del proyecto en Vercel

- Root directory: `apps/web`
- Framework: Next.js (autodetectado)
- Install command: `pnpm install --filter web... --frozen-lockfile`
- Build command: `pnpm --filter web build`
- Node: `20` (usa la version LTS)
- Opcional: `NEXT_TELEMETRY_DISABLED=1`

> Nota: en la raiz del repo hay un `vercel.json` que ya apunta al builder de Next para `apps/web/next.config.js` y reutiliza los comandos anteriores.

## Variables de entorno

Define en Vercel (Project Settings > Environment Variables):

- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRAPI_WEB_API_URL` (o `STRAPI_API_URL`)
- `STRAPI_API_TOKEN` (si aplica)
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SECRET_KEY`
- `PLATFORM_FEE_PERCENT` (opcional, fallback 2.3)
- `STRIPE_PROCESSING_PERCENT`, `STRIPE_PROCESSING_FIXED` (opcionales)

## Desarrollo local

```bash
pnpm --filter web dev
```

El servidor local corre en `http://localhost:3000` y usa las variables de `.env.local` dentro de `apps/web`.
