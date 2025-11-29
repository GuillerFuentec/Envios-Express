FROM node:20-alpine AS base
WORKDIR /app

# Habilita pnpm via corepack
ENV COREPACK_ENABLE_STRICT=0
RUN corepack enable

# Archivos raiz del monorepo necesarios para resolver dependencias
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

# Manifiesto del paquete web
COPY apps/web/package.json apps/web/

# Instala solo las dependencias de web
RUN pnpm install --filter web... --frozen-lockfile

# Copia el codigo de la app
COPY apps/web ./apps/web

# Compila
RUN pnpm --filter web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Reutiliza node_modules generado en la etapa base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/package.json ./apps/web/package.json

EXPOSE 3000

# Inicia Next en modo produccion
CMD ["pnpm", "--filter", "web", "start"]
