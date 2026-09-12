# ============================================================
# Multi-stage Dockerfile: targets `api` (producer) & `worker`.
# ============================================================

# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci || npm install

# ---------- Stage 2: build ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Stage 3: runtime shared ----------
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000

# ---------- API Producer target ----------
FROM base AS api
CMD ["node", "dist/index.js"]

# ---------- Worker Consumer target ----------
FROM base AS worker
CMD ["node", "dist/worker.js"]
