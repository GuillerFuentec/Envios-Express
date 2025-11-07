# Backend (Strapi)

Aplicacion Strapi preparada para desarrollo local y despliegue en Railway.

## Requisitos

- Node.js 20.x
- pnpm 10.14.x
- Una base de datos PostgreSQL (Railway puede proveerla como add-on)

## Configuracion local

1. Duplica `.env.example` en `.env` y completa las llaves (`APP_KEYS`, `ADMIN_JWT_SECRET`, etc.).
2. Mantener `DATABASE_CLIENT=sqlite` y `DATABASE_FILENAME=.tmp/data.db` permite usar SQLite localmente.
3. Instala dependencias y levanta Strapi:

```bash
pnpm install --filter server...
pnpm --filter server dev
```

La API queda disponible en `http://localhost:1337`.

## Variables de entorno clave

| Variable | Uso |
| --- | --- |
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | Credenciales obligatorias de Strapi |
| `PUBLIC_URL` | URL publica del backend (usada por Strapi y webhooks) |
| `CORS_ORIGIN` | Lista separada por comas con los origenes permitidos |
| `DATABASE_URL` | Cadena de conexion PostgreSQL; Railway la expone al crear la base |
| `DATABASE_CLIENT` | `postgres` en Railway, `sqlite` para local |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NOTIFY_EMAIL` | Credenciales para notificaciones por correo |

Revisa `.env.example` para ver todas las variables soportadas.

## Despliegue en Railway

1. Crea un servicio **Docker** (o deja que Railway detecte automáticamente) y apunta al repositorio completo.
2. No configures un *Root Directory*. Railway detectará el `railway.toml` en la raíz y usará el `Dockerfile` incluido. 
3. Agrega las variables de entorno mínimas:
   - `NODE_ENV=production`
   - `DATABASE_CLIENT=postgres`
   - `DATABASE_URL` (selecciona *Add from Railway Database*)
   - `DATABASE_SSL=true`
   - `PUBLIC_URL=https://<tu-servicio>.up.railway.app`
   - `CORS_ORIGIN=https://<tu-front>.pages.dev`
   - Llaves de Strapi (`APP_KEYS`, `ADMIN_JWT_SECRET`, etc.)
   - Variables de Resend si quieres notificaciones por correo

4. Conecta una base de datos PostgreSQL (add-on) y redeploy.

El `Dockerfile` construye solamente el paquete `apps/server`, ejecuta `pnpm --filter server build` para generar el panel de Strapi y expone el puerto `1337`. Railway solo tiene que ejecutar `docker run` sobre esa imagen; no hacen falta start scripts adicionales.

### Build y prueba local con Docker

```bash
# En la raiz del repo
docker build -t paqueteria-server .
docker run --rm -p 1337:1337 \
  -e NODE_ENV=production \
  -e APP_KEYS=... \
  -e ADMIN_JWT_SECRET=... \
  -e DATABASE_CLIENT=sqlite \
  -e DATABASE_FILENAME=.tmp/data.db \
  paqueteria-server
```

Pasa las mismas variables que usarás en Railway (puedes usar `--env-file` si duplicas `.env.example`). El backend quedará accesible en `http://localhost:1337`.

La configuracion en `config/env/production` activa PostgreSQL con SSL y marca `proxy=true` para que Strapi detecte correctamente el dominio publico de Railway.

## Nota sobre pnpm

El archivo `.npmrc` en la raiz del monorepo desactiva `prefer-frozen-lockfile`, evitando errores como *ERR_PNPMFROZENLOCKFILE* en Railway y Cloudflare. Si necesitas un despliegue limpio, usa la opcion **Clear cache and deploy** en Railway.
