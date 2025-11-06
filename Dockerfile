# Multi-stage build for mcp-devtools-server
# Stage 1: Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Stage 2: Production stage
FROM node:24-alpine AS production

# Install common development tools that users might need
RUN apk add --no-cache \
    make \
    git \
    curl \
    bash

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
# --ignore-scripts skips prepare/husky which is only needed for git hooks
RUN npm ci --omit=dev --ignore-scripts

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy configuration files
COPY .mcp-devtools.schema.json ./

# Health check to ensure the process is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose stdio for MCP protocol
# MCP uses stdio, so no ports to expose

# Set environment to production
ENV NODE_ENV=production

# Run the server
CMD ["node", "dist/index.js"]
