# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# ---------- Stage 2: base ----------
FROM node:20-alpine AS base
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ---------- Stage 3: standalone builder ----------
FROM base AS builder
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
RUN npm run build

# ---------- Stage 4: runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nextjs -u 1001
ENV NODE_ENV=production

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
