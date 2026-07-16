# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (for layer caching)
COPY package*.json ./
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Set Nitro preset to node-server and build the application
ENV NITRO_PRESET=node-server
RUN npm run build

# Stage 2: Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create data directory for persistent migration mappings
RUN mkdir -p /app/data

# Copy compiled production build from the builder stage
COPY --from=builder /app/.output ./.output

# Expose port and configure environment variables
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# Run the standard Node.js server entry point
CMD ["node", ".output/server/index.mjs"]
