# Build de production de la SPA. Les variables VITE_* sont figées DANS le
# bundle JS au moment du build (Vite ne les lit jamais au runtime) — elles
# doivent donc être fournies comme build args, pas comme variables d'env du
# conteneur final. Voir docker-compose.yml (service frontend-build → args)
# et deploy/README.md.
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_APP_NAME
ARG VITE_GOOGLE_REDIRECT_URL
ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST
ARG VITE_REVERB_PORT
ARG VITE_REVERB_SCHEME
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_GOOGLE_REDIRECT_URL=$VITE_GOOGLE_REDIRECT_URL \
    VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

RUN npm run build

# ---- Étape d'export : copie le build vers un dossier hôte (bind mount) ----
# Named volume écarté délibérément : Docker ne le repeuple qu'à sa toute
# première création, donc un redeploy laisserait Caddy servir l'ancien build
# indéfiniment. Un bind mount + copie explicite à chaque run est prévisible.
FROM busybox:stable AS export
COPY --from=build /app/dist /dist
CMD ["sh", "-c", "rm -rf /out/* && cp -r /dist/. /out/ && echo 'Build frontend exporté dans /out'"]
