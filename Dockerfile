# check=skip=SecretsUsedInArgOrEnv
# (La key de Maps de la web es pública: termina dentro del JavaScript que descarga el navegador
#  y se protege restringiéndola por dominio en Google Cloud, no ocultándola.)
# FaltaUno - imagen de la web (React + Vite).
#   Desarrollo:  docker compose up -d --build     y   docker compose watch   (recarga en caliente)
#   Producción:  docker compose -f docker-compose.yml -f docker-compose.produccion.yml up -d --build

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false
WORKDIR /app

FROM base AS dependencias
COPY package.json package-lock.json ./
RUN npm ci

# --- Desarrollo: servidor de Vite; docker compose watch sincroniza src/ y public/ ---
FROM base AS desarrollo
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
# --host: escucha fuera del contenedor; --strictPort: si el 5173 está ocupado, falla en lugar de cambiar de puerto
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

# --- Compilación: las variables VITE_* quedan dentro del JavaScript, por eso se pasan al compilar ---
FROM base AS compilacion
ARG VITE_URL_API=http://localhost:3000
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_GOOGLE_MAPS_API_KEY=
ARG VITE_GOOGLE_MAPS_MAP_ID=
ENV VITE_URL_API=$VITE_URL_API \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_GOOGLE_MAPS_MAP_ID=$VITE_GOOGLE_MAPS_MAP_ID
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Producción: archivos estáticos servidos con nginx ---
FROM nginx:1.27-alpine AS produccion
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/dist /usr/share/nginx/html
EXPOSE 80
