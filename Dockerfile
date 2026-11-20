# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
# Placed after npm ci so the dependency-install layer still caches across
# commits - only this build step re-runs when the commit (and source) changes.
ARG GIT_COMMIT_HASH=""
ENV VITE_GIT_COMMIT_HASH=$GIT_COMMIT_HASH
COPY client/ ./
RUN npm run build

FROM node:22-bookworm-slim AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runtime
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/prisma ./prisma
RUN npx prisma generate
COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist /app/client/dist

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
