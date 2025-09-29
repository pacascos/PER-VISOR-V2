FROM nginx:alpine

# Copiar archivos del frontend
COPY src/web/ /usr/share/nginx/html/

# Configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto
EXPOSE 80

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]
