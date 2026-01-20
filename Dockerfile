# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install --legacy-peer-deps || true
WORKDIR /app/backend
RUN npm install
WORKDIR /app/frontend
RUN npm install
WORKDIR /app

# Copy source code (BEFORE building!)
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY database-schema.sql ./
COPY better-auth-schema.sql ./

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Build backend
WORKDIR /app/backend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# Copy built files
WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/database-schema.sql ./
COPY --from=builder /app/backend/package.json ./backend/

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
WORKDIR /app/backend
CMD ["node", "dist/server.js"]
