FROM node:20-slim AS build
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm install

# Copy only frontend sources (backend/uploads không cần cho build web)
COPY index.html index.tsx App.tsx types.ts constants.tsx styles.css vite.config.ts tsconfig.json tailwind.config.js postcss.config.js package.json package-lock.json* ./
COPY user ./user
COPY components ./components
COPY services ./services
COPY admin ./admin
COPY frontend_admin ./frontend_admin

# Build-time API origin (must be set for production to avoid :8888 fallback)
ARG VITE_API_ORIGIN
ENV VITE_API_ORIGIN=${VITE_API_ORIGIN}

# Build shop + admin
RUN npm run build && npm run build:admin


FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx/nginx.conf /etc/nginx/nginx.conf

# Shop build -> /usr/share/nginx/html
COPY --from=build /app/dist /usr/share/nginx/html

# Admin build -> /usr/share/nginx/html/admin
COPY --from=build /app/frontend_admin/dist /usr/share/nginx/html/admin

