# Stage 1: Install production dependencies only
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force


# Stage 2: Build application
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files for dev deps
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build Next.js in standalone mode (minimal output)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_SETTINGS_PATH=/app/data/settings.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001 \
  && mkdir -p /app/data \
  && chown -R nextjs:nodejs /app/data

# Copy standalone server and dependencies
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create empty public folder
RUN mkdir -p ./public && chown nextjs:nodejs ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
