# Estágio 1: Compilar a aplicação Vue
FROM node:22-alpine AS build-stage
WORKDIR /app

COPY . .
RUN npm install
RUN npm run build

# Estágio 2: Servir os ficheiros com Nginx
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]