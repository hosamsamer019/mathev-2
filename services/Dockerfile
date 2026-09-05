# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
ARG SERVICE_NAME

# Install dependencies needed for node-gyp (often required by bcrypt/prisma)
RUN apk add --no-cache python3 make g++

# Copy root configurations (including package-lock.json for deterministic installs)
COPY package*.json ./

# Copy packages and specific service
COPY packages/ ./packages/
COPY services/${SERVICE_NAME}/ ./services/${SERVICE_NAME}/

# Install all dependencies.
# --workspaces=false: prevents npm from erroring on missing sibling workspace
# members (other services are not copied into this Docker stage).
RUN npm install --workspaces=false --include=dev

# Install dependencies for the packages used by this service
RUN npm install --prefix packages/shared --workspaces=false && \
    npm install --prefix packages/database --workspaces=false && \
    npm install --prefix services/${SERVICE_NAME} --workspaces=false

# Build shared packages and the specific service
RUN npm run build --prefix packages/shared && \
    npm run build --prefix services/${SERVICE_NAME}

# Generate Prisma Client
RUN npm run generate --prefix packages/database

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app
ARG SERVICE_NAME

# Set production environment
ENV NODE_ENV=production

# Copy manifests for root and the specific service/packages
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY services/${SERVICE_NAME}/package*.json ./services/${SERVICE_NAME}/

# Install production-only dependencies without workspace linking
RUN npm install --workspaces=false --omit=dev && \
    npm install --prefix packages/shared --workspaces=false --omit=dev && \
    npm install --prefix packages/database --workspaces=false --omit=dev && \
    npm install --prefix services/${SERVICE_NAME} --workspaces=false --omit=dev

# Copy built assets from builder
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/database/node_modules/.prisma ./packages/database/node_modules/.prisma
COPY --from=builder /app/services/${SERVICE_NAME}/dist ./services/${SERVICE_NAME}/dist

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose standard port (will be overridden by docker-compose)
EXPOSE 4000

WORKDIR /app/services/${SERVICE_NAME}

# Use a healthcheck (assuming standard /health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-4000}/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]
