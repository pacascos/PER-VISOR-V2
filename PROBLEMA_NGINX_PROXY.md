# 🚨 PROBLEMA: Proxy Nginx no funciona correctamente para todas las rutas de API

## Contexto
- **Aplicación**: Sistema de exámenes PER (Patrón de Embarcaciones de Recreo)
- **Arquitectura**: Docker Compose con nginx (frontend) + Flask API (backend) + PostgreSQL
- **Objetivo**: Implementar URLs relativas para que el frontend use `/api` en lugar de URLs absolutas

## Configuración actual de nginx
```nginx
# API proxy - health endpoint
location /api/health {
    proxy_pass http://per_api/health;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# API proxy - other endpoints
location /api/ {
    proxy_pass http://per_api/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Problema específico
- ✅ `/api/health` funciona → devuelve `{"database":"connected","status":"healthy"}`
- ✅ `/api/auth/login` funciona → devuelve token de autenticación
- ❌ `/api/user-stats` devuelve 404

## Endpoints del API (verificados directamente en puerto 5001)
- `/health` → funciona
- `/auth/login` → funciona  
- `/api/user-stats` → funciona
- `/api/admin/users` → funciona

## Comportamiento observado
- Cuando nginx recibe `/api/user-stats`, lo envía a `http://per_api/api/user-stats`
- El endpoint `/api/user-stats` existe y funciona directamente en el API
- Pero a través del proxy nginx devuelve 404

## Pregunta específica
¿Por qué el proxy nginx funciona para algunos endpoints (`/api/health`, `/api/auth/login`) pero no para otros (`/api/user-stats`) cuando todos los endpoints existen y funcionan directamente en el API?

¿Hay algún problema con la configuración del proxy o con el orden de las reglas de nginx?

## Logs de nginx
```
172.66.0.243 - - [29/Sep/2025:11:19:31 +0000] "POST /api/auth/login HTTP/1.1" 404 207 "-" "curl/8.7.1" "-" rt=0.002 uct="0.000" uht="0.002" urt="0.002"
172.66.0.243 - - [29/Sep/2025:11:19:55 +0000] "GET /api/health HTTP/1.1" 404 207 "-" "curl/8.7.1" "-" rt=0.001 uct="0.000" uht="0.001" urt="0.001"
```

## Docker Compose configuración
```yaml
services:
  api:
    container_name: per_api
    ports:
      - "5001:5001"
  
  web:
    container_name: per_web
    ports:
      - "8095:80"
```

## Upstream nginx
```nginx
upstream per_api {
    server per_api:5001 max_fails=3 fail_timeout=30s;
    keepalive 16;
}
```
