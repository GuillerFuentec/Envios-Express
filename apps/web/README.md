# Despliegue en Cloudflare Pages

Guia rapida para publicar la aplicacion web en Cloudflare Pages sin errores con pnpm.

## Variables de entorno

Define en Cloudflare Pages (Settings > Environment variables) los valores siguientes:

- `NODE_VERSION`: `20`
- `PNPM_VERSION`: `10.14.0`
- `VITE_API_BASE_URL`: URL publica del backend en Railway, por ejemplo `https://tu-api.up.railway.app`
- `VITE_STRIPE_PUBLISHABLE_KEY`: clave publica de Stripe que se usa en el Payment Element
- `VITE_RECAPTCHA_SITE_KEY`: llave publica de Google reCAPTCHA v3/v2 para proteger los formularios

Opcionalmente puedes agregar:

- `VITE_ENVIRONMENT`: etiqueta para mostrar en los registros del frontend. No es obligatoria.

## Comandos de compilacion

- Directorio del proyecto: `apps/web`
- Comando de instalacion: `pnpm install --filter web...`
- Comando de build: `pnpm build`
- Directorio de salida: `apps/web/dist`

Cloudflare detecta el archivo `pnpm-workspace.yaml` y ejecutara los comandos en el monorepo. Con el archivo `.npmrc` que agregamos, pnpm evitara el modo `frozen-lockfile` en los entornos de CI y la instalacion no se bloqueara si actualizas el lockfile.

## Desarrollo local

```bash
pnpm --filter web dev
```

El servidor local queda expuesto en `http://localhost:5173` y usa por defecto la API en `http://localhost:1337`. Para probar contra Railway puedes exportar `VITE_API_BASE_URL` antes de ejecutar `pnpm dev`.

## Pagina de checkout

- Las rutas `src/pages/checkout.html`, `checkout-success.html` y `checkout-failed.html` se construyen automaticamente gracias a la configuracion multipagina de `vite.config.js`.
- El Payment Element consulta `POST /api/payments/create-intent`, por lo que el backend debe exponer ese endpoint y devolver `clientSecret`.
- El checkout se ejecuta en modo prueba: usa `4242 4242 4242 4242`, cualquier fecha futura y CVC `424`. Apple Pay / Google Pay y reCAPTCHA se habilitan automaticamente cuando Stripe/Google detectan compatibilidad.
- La pagina de exito/fracaso reutiliza `css/checkout.css`; recuerda publicar todos los archivos generados desde `dist/src/pages/*`.
