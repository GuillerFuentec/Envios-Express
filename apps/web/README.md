# Despliegue en Cloudflare Pages

Guia rapida para publicar la aplicacion web en Cloudflare Pages sin errores con pnpm.

## Variables de entorno

Define en Cloudflare Pages (Settings > Environment variables) los valores siguientes:

- `NODE_VERSION`: `20`
- `PNPM_VERSION`: `10.14.0`
- `VITE_API_BASE_URL`: URL publica del backend en Railway, por ejemplo `https://tu-api.up.railway.app`

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
