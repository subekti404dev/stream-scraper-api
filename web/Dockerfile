FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies based on lockfile for repeatable builds
COPY package.json package-lock.json ./
RUN npm ci


FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_SETTINGS_PATH=/app/data/settings.json

RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001 \
  && mkdir -p /app/data \
  && chown -R nextjs:nodejs /app/data

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
RUN mkdir -p ./public
COPY --from=build /app/.next ./.next

USER nextjs

EXPOSE 3000
CMD ["npm","run","start","--","-H","0.0.0.0","-p","3000"]
