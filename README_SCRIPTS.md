# Scripts de Control Manual - PER VISOR 2.0

Alternativos a Docker Compose para desarrollo y despliegue manual.

## 🚀 Scripts Disponibles

### `scripts/start.sh` - Arranque Manual
Inicia todos los servicios sin Docker:
```bash
./scripts/start.sh
```

**Variables de configuración:**
```bash
WEB_PORT=8080 API_PORT=3000 ./scripts/start.sh
DB_HOST=localhost DB_PORT=5432 ./scripts/start.sh
```

### `scripts/stop.sh` - Parada Manual
Detiene todos los servicios:
```bash
./scripts/stop.sh
```

### `scripts/status.sh` - Monitor de Estado
Muestra el estado completo del sistema:
```bash
./scripts/status.sh
```

## 📋 Características

### Script de Arranque (`start.sh`)
- ✅ Verificación de dependencias (Python3, PostgreSQL, Redis)
- ✅ Comprobación de puertos disponibles
- ✅ Instalación automática de dependencias Python
- ✅ Configuración de variables de entorno
- ✅ Arranque de API (puerto 5001) y Web (puerto 8095)
- ✅ Health checks automáticos
- ✅ Logging detallado
- ✅ Guardado de PIDs para control posterior

### Script de Parada (`stop.sh`)
- ✅ Parada suave con fallback a kill -9
- ✅ Limpieza automática de archivos PID
- ✅ Búsqueda por puerto si PID falla
- ✅ Detección inteligente de procesos relacionados
- ✅ Verificación final de puertos libres

### Script de Estado (`status.sh`)
- ✅ Estado detallado de servicios (API, Web)
- ✅ Verificación de endpoints HTTP
- ✅ Conectividad TCP a dependencias (PostgreSQL, Redis)
- ✅ Información de procesos (PID, CPU, memoria)
- ✅ Logs recientes de cada servicio
- ✅ Resumen visual con colores
- ✅ Enlaces y comandos útiles

## 🔧 Configuración

### Variables de Entorno Soportadas

| Variable | Por Defecto | Descripción |
|----------|-------------|-------------|
| `WEB_PORT` | 8095 | Puerto del servidor web |
| `API_PORT` | 5001 | Puerto de la API |
| `DB_HOST` | localhost | Host de PostgreSQL |
| `DB_PORT` | 5432 | Puerto de PostgreSQL |
| `DB_NAME` | per_exams | Nombre de la base de datos |
| `DB_USER` | per_user | Usuario de la base de datos |
| `DB_PASSWORD` | per_password_change_me | Contraseña de la base de datos |
| `REDIS_HOST` | localhost | Host de Redis |
| `REDIS_PORT` | 6379 | Puerto de Redis |

### Archivos Generados

```
.pids/          # PIDs de procesos corriendo
├── api.pid     # PID de la API
└── web.pid     # PID del servidor web

logs/           # Logs de servicios
├── api.log     # Logs de la API
└── web.log     # Logs del servidor web
```

## 🔍 Uso Típico

### Arranque del sistema:
```bash
# Arranque básico
./scripts/start.sh

# Con puertos personalizados
WEB_PORT=8080 API_PORT=3000 ./scripts/start.sh

# Con base de datos remota
DB_HOST=192.168.1.100 ./scripts/start.sh
```

### Monitoreo:
```bash
# Estado completo
./scripts/status.sh

# Ver logs en tiempo real
tail -f logs/api.log
tail -f logs/web.log
```

### Parada:
```bash
# Parada normal
./scripts/stop.sh
```

## 🛠 Requisitos

### Dependencias del Sistema
- **Python 3.8+**
- **PostgreSQL** (local o remoto)
- **Redis** (opcional, recomendado)

### Dependencias Python
Instaladas automáticamente desde `requirements.txt`:
- Flask y dependencias web
- Drivers de base de datos (asyncpg, psycopg2)
- Librerías de procesamiento (OpenAI, PDF, etc.)

## ⚠️ Notas Importantes

1. **Base de Datos**: PostgreSQL debe estar corriendo antes del arranque
2. **Redis**: Opcional pero recomendado para cache
3. **Puertos**: Verificación automática de disponibilidad
4. **Permisos**: Scripts requieren permisos de ejecución
5. **Logs**: Se crean automáticamente en `logs/`
6. **PIDs**: Se guardan en `.pids/` para control

## 🔄 Comparación con Docker

| Aspecto | Scripts Manuales | Docker Compose |
|---------|------------------|----------------|
| **Arranque** | `./scripts/start.sh` | `docker compose up -d` |
| **Parada** | `./scripts/stop.sh` | `docker compose down` |
| **Estado** | `./scripts/status.sh` | `docker compose ps` |
| **Logs** | `tail -f logs/*.log` | `docker compose logs -f` |
| **Dependencias** | Manuales/Sistema | Automáticas/Contenedores |
| **Desarrollo** | Más flexible | Más aislado |
| **Producción** | Menos recomendado | Recomendado |

## 🚨 Solución de Problemas

### API no arranca:
```bash
# Ver logs específicos
tail -f logs/api.log

# Verificar dependencias
python3 -c "import flask, psycopg2; print('OK')"

# Verificar base de datos
curl http://localhost:5432  # Debe dar error de conexión, no timeout
```

### Web no accesible:
```bash
# Verificar puerto
lsof -i :8095

# Logs del servidor web
tail -f logs/web.log
```

### Problemas de permisos:
```bash
# Hacer scripts ejecutables
chmod +x scripts/*.sh

# Verificar directorios
ls -la logs/ .pids/
```

¡Los scripts están listos para usar como alternativa a Docker! 🎉