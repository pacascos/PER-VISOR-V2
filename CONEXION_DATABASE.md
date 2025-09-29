# 📋 Guía de Conexión a la Base de Datos

Esta guía proporciona todos los detalles necesarios para conectarse a la base de datos PostgreSQL del sistema PER (Patrón de Embarcaciones de Recreo).

## 🐳 Configuración Docker

### Información del Contenedor
- **Nombre del contenedor**: `per_postgres`
- **Imagen**: `postgres:14-alpine`
- **Puerto expuesto**: `5432:5432`
- **Red**: `per_network`

### Comandos Docker Útiles
```bash
# Iniciar todos los servicios
docker compose up -d

# Iniciar solo PostgreSQL
docker compose up -d postgres

# Ver logs del contenedor
docker logs per_postgres

# Estado del contenedor
docker ps | grep per_postgres

# Ejecutar psql dentro del contenedor
docker exec -it per_postgres psql -U per_user -d per_exams
```

## 🔐 Credenciales de Conexión

### Configuración por Defecto
```bash
Host: localhost
Puerto: 5432
Base de datos: per_exams
Usuario: per_user
Contraseña: per_password_change_me
```

### Variables de Entorno (.env)
```bash
DATABASE_NAME=per_exams
DATABASE_USER=per_user
DATABASE_PASSWORD=change_me_secure_password_123
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

### URL de Conexión Completa
```bash
# Formato estándar
postgresql://per_user:per_password_change_me@localhost:5432/per_exams

# Con variables de entorno (producción)
postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}
```

## 🔌 Métodos de Conexión

### 1. Cliente psql Nativo
```bash
# Desde el sistema host
psql -h localhost -p 5432 -U per_user -d per_exams

# Desde dentro del contenedor
docker exec -it per_postgres psql -U per_user -d per_exams
```

### 2. Cliente pgAdmin
- **Host**: `localhost`
- **Puerto**: `5432`
- **Database**: `per_exams`
- **Usuario**: `per_user`
- **Contraseña**: `per_password_change_me`

### 3. DBeaver / DataGrip
- **Driver**: PostgreSQL
- **Host**: `localhost`
- **Puerto**: `5432`
- **Database**: `per_exams`
- **Usuario**: `per_user`
- **Contraseña**: `per_password_change_me`

### 4. Python (psycopg2)
```python
import psycopg2

# Conexión básica
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="per_exams",
    user="per_user",
    password="per_password_change_me"
)

# Con URL de conexión
import psycopg2
conn = psycopg2.connect("postgresql://per_user:per_password_change_me@localhost:5432/per_exams")
```

### 5. SQLAlchemy (Python)
```python
from sqlalchemy import create_engine

# Motor de base de datos
engine = create_engine("postgresql://per_user:per_password_change_me@localhost:5432/per_exams")

# Con pool de conexiones
engine = create_engine(
    "postgresql://per_user:per_password_change_me@localhost:5432/per_exams",
    pool_size=10,
    max_overflow=20
)
```

## 🏗️ Estructura de la Base de Datos

### Tablas Principales
- **`questions`**: Preguntas de examen
- **`question_options`**: Opciones de respuesta
- **`exams`**: Información de exámenes
- **`explanations`**: Explicaciones de preguntas
- **`categories`**: Categorías temáticas

### Esquema de Inicialización
El esquema se carga automáticamente desde:
```
./src/database/schema.sql
```

## 🔧 Scripts de Conexión del Proyecto

### Scripts API
```bash
# API PostgreSQL (puerto 5001)
cd scripts/servidores && python3 api_postgresql.py

# API Explicaciones (puerto 5001)
cd scripts/servidores && python3 api_explicaciones.py
```

### Scripts de Migración
```bash
# Migración simple desde JSON
python3 migrate_simple.py

# Migración de explicaciones
python3 migrate_explicaciones.py
```

### Script MCP Postgres
```bash
# Servidor MCP para PostgreSQL
python3 mcp-postgres.py
```

## 📊 Herramientas de Verificación

### Verificar Estado de la Base de Datos
```bash
# Comprobar que el contenedor está corriendo
docker compose ps postgres

# Verificar conectividad
docker exec per_postgres pg_isready -U per_user

# Ver tamaño de la base de datos
docker exec -it per_postgres psql -U per_user -d per_exams -c "SELECT pg_size_pretty(pg_database_size('per_exams'));"

# Contar preguntas
docker exec -it per_postgres psql -U per_user -d per_exams -c "SELECT COUNT(*) FROM questions;"
```

### Backup y Restore
```bash
# Crear backup completo (RECOMENDADO)
make backup
# o directamente:
./scripts/backup.sh

# Crear backup antes de pruebas
./scripts/backup_before_test.sh

# Restaurar desde backup
make restore FILE=backup_completo_20250928_232240.sql
# o directamente:
./scripts/restore.sh backup_completo_20250928_232240.sql

# Listar backups disponibles
make list-backups

# Comandos manuales (alternativos)
docker exec per_postgres pg_dump -U per_user -d per_exams > backup_$(date +%Y%m%d).sql
cat backup_file.sql | docker exec -i per_postgres psql -U per_user -d per_exams
```

## ⚠️ Solución de Problemas

### Puerto Ocupado
```bash
# Ver qué proceso usa el puerto 5432
lsof -i :5432

# Matar proceso que ocupa el puerto
kill -9 <PID>
```

### Contenedor No Inicia
```bash
# Ver logs detallados
docker logs per_postgres

# Reiniciar contenedor
docker compose restart postgres

# Recrear contenedor
docker compose down postgres
docker compose up -d postgres
```

### Problemas de Permisos
```bash
# Verificar permisos de volumen
ls -la /var/lib/postgresql/data

# Reinicializar datos (⚠️ BORRA TODO)
docker compose down -v
docker compose up -d postgres
```

### Conexión Rechazada
1. Verificar que el contenedor está corriendo: `docker ps`
2. Comprobar puerto: `docker port per_postgres`
3. Verificar firewall local
4. Comprobar configuración de red Docker

## 🌐 Configuración de Red

### Red Docker
- **Nombre**: `per_network`
- **Tipo**: `bridge`
- **Subred**: `172.20.0.0/16`

### Puertos Expuestos
- **PostgreSQL**: `5432:5432`
- **Redis**: `6379:6379` (opcional)
- **API**: `5001:5001`
- **Web**: `8095:80`

## 📚 Referencias Útiles

- [Documentación PostgreSQL](https://www.postgresql.org/docs/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [psycopg2 Documentation](https://www.psycopg.org/docs/)
- [SQLAlchemy PostgreSQL](https://docs.sqlalchemy.org/en/14/dialects/postgresql.html)

---

**💡 Consejo**: Para entornos de producción, cambia siempre las contraseñas por defecto y usa variables de entorno seguras.

**🔒 Seguridad**: Nunca expongas las credenciales de base de datos en el código fuente. Usa siempre archivos `.env` que no estén en el control de versiones.