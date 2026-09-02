# Production Dockerfile for Trakio Backend API
FROM node:20-alpine AS base

# Install curl for health check
RUN apk add --no-cache curl

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Ensure upload & attachment directories exist
RUN mkdir -p upload Attachment

# Expose backend service port
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

# Start the application
CMD ["npm", "start"]
