# syntax=docker/dockerfile:1.6

FROM node:20-bullseye AS base
ENV PNPM_HOME=/usr/local/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# --- (Opcional mientras depuras) Bloque de diagnóstico del context ---
# RUN --mount=type=bind,source=.,target=/src \
#   sh -lc 'set -eux; ls -la /src; ls -la /src/apps || true; ls -la /src/apps/server || true; test -f /src/apps/server/package.json'

# 1) Manifiestos del workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# 2) Solo el manifest del server (para resolver deps primero con cache)
COPY apps/server/package.json apps/server/package.json

# 3) Instala dependencias necesarias para compilar el server
RUN pnpm -w install --frozen-lockfile --filter "{./apps/server}"

# 4) Copia el resto del código del server
COPY apps/server apps/server

# 5) Build del admin de Strapi (ejecuta desde la raíz, pero entrando con -C)
RUN pnpm -C apps/server build


FROM node:20-bullseye AS runner
ENV PNPM_HOME=/usr/local/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

# 6) Copia manifiestos (por si pnpm los requiere en runtime)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# 7) Copia el paquete ya construido
COPY --from=base /app/apps/server ./apps/server

# 8) Podar a prod dentro del paquete (reduce tamaño)
WORKDIR /app/apps/server
RUN pnpm prune --prod

EXPOSE 1337

# 9) Arranque robusto (sin filtros raros)
#    Si Railway ejecuta "pnpm start" en /app, el script de la raíz debe redirigir con -C apps/server
CMD ["pnpm", "start"]
# Alternativa si quieres evitar depender del script de la raíz:
# CMD ["pnpm", "-C", "apps/server", "start"]
