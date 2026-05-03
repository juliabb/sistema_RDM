FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/RDMSaude-Front/browser /usr/share/nginx/html
COPY certificado /etc/nginx/certificado
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]

