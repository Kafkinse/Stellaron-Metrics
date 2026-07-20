# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Serve at the domain root when self-hosting (GitHub Pages default is a sub-path).
ENV VITE_BASE=/
RUN npm run build

# --- serve stage ---
FROM nginx:1.27-alpine
COPY deploy-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
