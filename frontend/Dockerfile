# Stage 1: Build the Expo Web static export
FROM node:20-alpine AS builder

WORKDIR /app

# Accept production API URL during build if passed
ARG EXPO_PUBLIC_API_URL_WEB
ENV EXPO_PUBLIC_API_URL_WEB=${EXPO_PUBLIC_API_URL_WEB}

# Copy manifests & install dependencies
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Export production web static assets (outputs to /app/dist)
RUN npm run build

# Stage 2: Serve static files with lightweight Nginx
FROM nginx:alpine AS runner

# Copy static website assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose web server port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
