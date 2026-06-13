# Multi-stage build for production-ready IPTV player
# Stage 1: Build the client assets and the server bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency catalogs
COPY package*.json ./

# Install absolute developer and runtime dependencies
RUN npm ci

# Copy full application codebase
COPY . .

# Build Vite frontend and esbuild backend bundle
RUN npm run build

# Stage 2: Runtime image containing final compiled files for lightness and speed
FROM node:20-alpine AS runner

WORKDIR /app

# Set Node environment variables to production
ENV NODE_ENV=production
ENV PORT=3000

# Copy package catalogs and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy final bundled files from builder stage
COPY --from=builder /app/dist ./dist
# Copy the IPTV database playlists directory so server can read channels
COPY --from=builder /app/iptv-master ./iptv-master

# Expose network ingress port
EXPOSE 3000

# Start compiled CommonJS Express bundle
CMD ["node", "dist/server.cjs"]
