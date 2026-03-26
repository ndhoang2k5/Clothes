FROM node:20-slim AS build
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Build-time API origin (must be set for production to avoid :8888 fallback)
ARG VITE_API_ORIGIN
ENV VITE_API_ORIGIN=${VITE_API_ORIGIN}

# Build shop + admin
RUN npm run build
RUN npm run build:admin


FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx/nginx.conf /etc/nginx/nginx.conf

# Shop build -> /usr/share/nginx/html
COPY --from=build /app/dist /usr/share/nginx/html

# Admin build -> /usr/share/nginx/html/admin
COPY --from=build /app/frontend_admin/dist /usr/share/nginx/html/admin

