FROM nginx:alpine

# Copiar archivos del frontend
COPY src/web/ /usr/share/nginx/html/

# Configuración personalizada de Nginx
COPY config/nginx-cloud-run.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80 (Cloud Run mapeará automáticamente)
EXPOSE 80

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
