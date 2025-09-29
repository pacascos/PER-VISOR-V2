# 🗄️ Sistema de Backup y Restauración - PER Cloude

## 📋 Resumen

Sistema completo de copias de seguridad y restauración para la base de datos PostgreSQL del sistema PER Cloude.

## 🚀 Comandos Rápidos

### Backup
```bash
# Crear backup completo (RECOMENDADO)
make backup

# Listar backups disponibles
make list-backups
```

### Restauración
```bash
# Restaurar desde backup
make restore FILE=backup_completo_20250928_232240.sql

# Ver ayuda del script de restauración
./scripts/restore.sh --help
```

## 📁 Archivos del Sistema

### Scripts Principales
- **`scripts/backup.sh`** - Script principal de backup completo
- **`scripts/restore.sh`** - Script de restauración con validaciones
- **`scripts/backup_before_test.sh`** - Backup rápido antes de pruebas

### Configuración
- **`docker-compose.yml`** - Servicio de backup automatizado (perfil `backup`)
- **`Makefile`** - Comandos integrados `make backup`, `make restore`, `make list-backups`

### Directorio de Backups
- **`/backups/`** - Almacena todos los archivos de backup
- Formato: `backup_completo_YYYYMMDD_HHMMSS.sql`

## 🔧 Funcionalidades

### ✅ Sistema de Backup (`scripts/backup.sh`)

**Características:**
- ✅ Verificación automática de conexión PostgreSQL
- ✅ Información detallada de la base de datos antes del backup
- ✅ Backup completo con todas las tablas, índices y datos
- ✅ Validación del formato del archivo generado
- ✅ Logging detallado del proceso
- ✅ Información de tamaño y ubicación del backup

**Datos incluidos:**
- 📚 **5,356 preguntas** del PER
- 👤 **2 usuarios** registrados
- 📝 **154 exámenes** realizados
- 📊 **Estadísticas completas** (niveles, XP, logros)
- 🔍 **Índices y restricciones**
- 🛠️ **Funciones y procedimientos**

### ✅ Sistema de Restauración (`scripts/restore.sh`)

**Características:**
- ✅ Validación del archivo de backup
- ✅ Verificación de formato PostgreSQL
- ✅ Backup de seguridad automático antes de restaurar
- ✅ Confirmación del usuario (escribe "SI" para confirmar)
- ✅ Verificación de datos restaurados
- ✅ Manejo de errores con opciones de recuperación

**Seguridad:**
- 🛡️ **Backup de seguridad automático** antes de restaurar
- ⚠️ **Confirmación obligatoria** del usuario
- 🔍 **Validación completa** del archivo de backup
- 📊 **Verificación de datos** después de la restauración

## 📊 Información de Backups

### Backups Actuales
```
📄 backup_before_test_20250914_135048.sql    (6.2MB) - Backup de prueba
📄 backup_completo_20250916_155823.sql       (6.4MB) - Backup completo anterior  
📄 backup_completo_20250928_232240.sql       (7.3MB) - Backup completo actual
```

### Tamaño de la Base de Datos
- **Tamaño actual**: 20MB
- **Preguntas**: 5,356
- **Usuarios**: 2
- **Exámenes realizados**: 154

## 🎯 Casos de Uso

### 1. Backup Regular
```bash
# Crear backup antes de cambios importantes
make backup
```

### 2. Backup antes de Pruebas
```bash
# Backup rápido antes de testing
./scripts/backup_before_test.sh
```

### 3. Restauración por Error
```bash
# Listar backups disponibles
make list-backups

# Restaurar desde backup específico
make restore FILE=backup_completo_20250928_232240.sql
```

### 4. Migración de Datos
```bash
# Crear backup en servidor origen
make backup

# Transferir archivo y restaurar en servidor destino
make restore FILE=backup_completo_20250928_232240.sql
```

## ⚠️ Consideraciones Importantes

### Antes de Restaurar
1. **Verificar que Docker esté corriendo**
2. **El sistema crea backup de seguridad automáticamente**
3. **La restauración reemplaza TODOS los datos actuales**
4. **Confirmar escribiendo "SI" cuando se solicite**

### Mantenimiento
```bash
# Limpiar backups antiguos (más de 30 días)
find backups -name '*.sql' -mtime +30 -delete

# Verificar espacio en disco
du -sh backups/
```

## 🔧 Solución de Problemas

### Error: Contenedor no está corriendo
```bash
# Iniciar servicios Docker
docker compose up -d

# Verificar estado
docker ps | grep per_postgres
```

### Error: Archivo de backup no encontrado
```bash
# Listar backups disponibles
make list-backups

# Verificar ruta correcta
ls -la backups/
```

### Error: Permisos de archivo
```bash
# Dar permisos de ejecución
chmod +x scripts/backup.sh scripts/restore.sh
```

## 📚 Comandos de Referencia

### Makefile
```bash
make backup          # Crear backup completo
make restore FILE=   # Restaurar desde backup
make list-backups    # Listar backups disponibles
```

### Scripts Directos
```bash
./scripts/backup.sh                    # Backup completo
./scripts/restore.sh archivo.sql       # Restaurar
./scripts/restore.sh --help           # Ayuda
./scripts/backup_before_test.sh       # Backup rápido
```

### Docker (Comandos Manuales)
```bash
# Backup manual
docker exec per_postgres pg_dump -U per_user -d per_exams > backup.sql

# Restauración manual
cat backup.sql | docker exec -i per_postgres psql -U per_user -d per_exams
```

## 🎉 Estado del Sistema

✅ **Sistema de Backup**: Completamente funcional  
✅ **Sistema de Restauración**: Completamente funcional  
✅ **Integración Makefile**: Completamente funcional  
✅ **Documentación**: Actualizada y completa  
✅ **Pruebas**: Verificadas y funcionando  

---

**💡 Consejo**: Siempre crea un backup antes de hacer cambios importantes en la base de datos.
