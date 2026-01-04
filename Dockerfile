# Multi-stage build for MCD HRMS Backend API
FROM node:20-slim AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

FROM node:20-slim AS final
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy everything from builder
COPY --from=builder /app .

# Create data and logs directories
RUN mkdir -p server/data logs

# Expose port
EXPOSE 8010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8010/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the server using npx tsx
CMD ["npx", "tsx", "server/index.ts"]
