# Guía de Migración de Base de Datos a Producción

## 📋 Resumen del Problema

La migración de esquema de base de datos desde desarrollo local (Docker) a Google Cloud SQL presentó múltiples incompatibilidades que causaron errores repetidos.

## 🚫 Problemas Encontrados

### 1. **Comandos incompatibles con Cloud SQL**
Los backups generados con `pg_dump` desde PostgreSQL local contienen comandos que no funcionan en Cloud SQL:

```sql
-- ❌ INCOMPATIBLE: Cloud SQL no permite DROP DATABASE
DROP DATABASE per_exams;

-- ❌ INCOMPATIBLE: Comandos internos de psql
\restrict YtZFe45zGxIvCbgRcqjWZqCW6jhqpDxlbmLXfe2K4OkJ9gtliqvVbsiTRjYpKo4
\unrestrict YtZFe45zGxIvCbgRcqjWZqCW6jhqpDxlbmLXfe2K4OkJ9gtliqvVbsiTRjYpKo4

-- ❌ INCOMPATIBLE: Configuraciones que Cloud SQL maneja automáticamente
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET row_security = off;
SELECT pg_catalog.set_config('search_path', '', false);
```

### 2. **Sintaxis específica de PostgreSQL local**
```sql
-- ❌ NO SOPORTADO en Cloud SQL
CREATE TRIGGER IF NOT EXISTS trigger_name ...

-- ✅ CORRECTO
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...
```

### 3. **Transacciones implícitas**
Cloud SQL ejecuta imports dentro de transacciones, lo que impide ciertos comandos:
```
ERROR: DROP DATABASE cannot run inside a transaction block
```

## ✅ Solución: Enfoque Correcto para Migraciones

### **Opción 1: Migraciones con Archivos SQL Limpios** (RECOMENDADO)

#### Paso 1: Crear archivo de migración limpio

```bash
# Exportar SOLO las tablas nuevas (schema only, sin datos)
docker exec per_postgres pg_dump -U per_user -d per_exams \
  --schema-only \
  --no-owner \
  --no-privileges \
  -t nueva_tabla1 \
  -t nueva_tabla2 \
  > migration_$(date +%Y%m%d).sql
```

#### Paso 2: Limpiar comandos incompatibles

```bash
# Eliminar comandos incompatibles con Cloud SQL
cat migration_20251002.sql | \
  grep -v "^\\\\restrict" | \
  grep -v "^\\\\unrestrict" | \
  grep -v "^SET statement_timeout" | \
  grep -v "^SET lock_timeout" | \
  grep -v "^SET idle_in_transaction_session_timeout" | \
  grep -v "^SET row_security" | \
  grep -v "^SELECT pg_catalog.set_config" | \
  grep -v "^DROP DATABASE" | \
  cat > migration_20251002_clean.sql
```

#### Paso 3: Usar CREATE IF NOT EXISTS

Modificar el SQL para usar construcciones seguras:

```sql
-- ✅ Seguro para re-ejecutar
CREATE TABLE IF NOT EXISTS nueva_tabla (...);
CREATE INDEX IF NOT EXISTS idx_name ON table_name(...);

-- ✅ Para triggers
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...;

-- ✅ Para funciones
CREATE OR REPLACE FUNCTION function_name() ...;
```

#### Paso 4: Backup de producción ANTES de migrar

```bash
# SIEMPRE crear backup antes de modificar producción
gcloud sql backups create \
  --instance=per-db-instance \
  --description="Backup antes de migración $(date +%Y%m%d_%H%M%S)"
```

#### Paso 5: Subir y aplicar migración

```bash
# Subir archivo a Cloud Storage
gsutil cp migration_20251002_clean.sql \
  gs://per-database-backups/migrations/

# Aplicar migración
gcloud sql import sql per-db-instance \
  gs://per-database-backups/migrations/migration_20251002_clean.sql \
  --database=per_exams \
  --user=per_user \
  --quiet
```

### **Opción 2: Sistema de Migraciones con Versionado** (MEJOR A LARGO PLAZO)

Crear sistema de migraciones numeradas:

```
migrations/
  ├── 001_initial_schema.sql
  ├── 002_add_user_stats.sql
  ├── 003_add_study_mode.sql
  └── migration_tracker.sql
```

#### Estructura de archivo de migración:

```sql
-- Migration: 003_add_study_mode.sql
-- Description: Añade tablas para modo estudio
-- Date: 2025-10-02
-- Author: Sistema

BEGIN;

-- Crear tablas
CREATE TABLE IF NOT EXISTS study_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ...
);

-- Registrar migración
INSERT INTO schema_migrations (migration_name, applied_at)
VALUES ('003_add_study_mode', CURRENT_TIMESTAMP)
ON CONFLICT (migration_name) DO NOTHING;

COMMIT;
```

#### Script de aplicación:

```bash
#!/bin/bash
# apply_migration.sh

MIGRATION_FILE=$1
INSTANCE="per-db-instance"
DATABASE="per_exams"

echo "📦 Aplicando migración: $MIGRATION_FILE"

# 1. Backup automático
gcloud sql backups create --instance=$INSTANCE \
  --description="Pre-migration: $MIGRATION_FILE"

# 2. Subir a GCS
gsutil cp migrations/$MIGRATION_FILE \
  gs://per-database-backups/migrations/

# 3. Aplicar
gcloud sql import sql $INSTANCE \
  gs://per-database-backups/migrations/$MIGRATION_FILE \
  --database=$DATABASE \
  --user=per_user

echo "✅ Migración aplicada"
```

## 📝 Template de Migración Segura

```sql
-- Migration: XXX_descriptive_name.sql
-- Description: Brief description
-- Date: YYYY-MM-DD

-- Verificar versión PostgreSQL (opcional)
-- DO $$ BEGIN
--   ASSERT (SELECT current_setting('server_version_num')::int >= 140000);
-- END $$;

-- Crear tablas
CREATE TABLE IF NOT EXISTS nueva_tabla (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campo1 varchar(100),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_nueva_tabla PRIMARY KEY (id)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_nueva_tabla_campo1
ON nueva_tabla (campo1);

-- Crear funciones
CREATE OR REPLACE FUNCTION funcion_ejemplo()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers (con DROP previo)
DROP TRIGGER IF EXISTS trigger_ejemplo ON nueva_tabla;
CREATE TRIGGER trigger_ejemplo
    BEFORE UPDATE ON nueva_tabla
    FOR EACH ROW
    EXECUTE FUNCTION funcion_ejemplo();

-- Registrar migración
INSERT INTO schema_migrations (migration_name, applied_at)
VALUES ('XXX_descriptive_name', CURRENT_TIMESTAMP)
ON CONFLICT (migration_name) DO NOTHING;
```

## 🔧 Herramientas Útiles

### Script de limpieza de dumps:

```bash
#!/bin/bash
# clean_dump_for_cloudsql.sh

INPUT=$1
OUTPUT="${INPUT%.sql}_clean.sql"

cat $INPUT | \
  grep -v "^\\\\restrict" | \
  grep -v "^\\\\unrestrict" | \
  grep -v "^SET statement_timeout" | \
  grep -v "^SET lock_timeout" | \
  grep -v "^SET idle_in_transaction_session_timeout" | \
  grep -v "^SET row_security" | \
  grep -v "^SELECT pg_catalog.set_config" | \
  grep -v "^DROP DATABASE" | \
  grep -v "^CREATE DATABASE" | \
  sed 's/CREATE TRIGGER IF NOT EXISTS/DROP TRIGGER IF EXISTS/g' > $OUTPUT

echo "✅ Dump limpio creado: $OUTPUT"
```

### Verificar migración antes de aplicar:

```bash
# Verificar sintaxis localmente
docker exec -i per_postgres psql -U per_user -d per_exams --dry-run < migration.sql

# Ver qué cambios haría (sin ejecutar)
cat migration.sql | grep -E "^(CREATE|ALTER|DROP|INSERT INTO schema_migrations)"
```

## 📊 Comparación de Enfoques

| Enfoque | Pros | Contras | Cuándo usar |
|---------|------|---------|-------------|
| **SQL Limpio Manual** | - Simple<br>- Control total | - Propenso a errores<br>- No versionado | Cambios pequeños, urgentes |
| **Migraciones Versionadas** | - Auditable<br>- Reproducible<br>- Rollback fácil | - Requiere setup inicial | Proyecto en crecimiento |
| **ORM Migrations** | - Automático<br>- Cross-DB | - Less control<br>- Dependencia | Apps con ORM (Django, Rails) |
| **Import completo** | - Sincronización total | - ❌ NO FUNCIONA en Cloud SQL<br>- Downtime | ❌ EVITAR en Cloud SQL |

## 🎯 Recomendación Final

**Para este proyecto PER:**

1. ✅ **Adoptar sistema de migraciones versionadas**
   - Crear carpeta `migrations/`
   - Numerar archivos: `001_`, `002_`, etc.
   - Usar template seguro arriba

2. ✅ **Script de deployment automatizado**
   ```bash
   ./deploy_migration.sh 003_add_study_mode.sql
   ```

3. ✅ **Tabla de tracking**
   ```sql
   CREATE TABLE IF NOT EXISTS schema_migrations (
       id serial PRIMARY KEY,
       migration_name varchar(255) UNIQUE NOT NULL,
       applied_at timestamp DEFAULT CURRENT_TIMESTAMP
   );
   ```

4. ✅ **Proceso estándar**
   - Desarrollar cambios en local
   - Crear archivo de migración limpio
   - Testear en local
   - Backup de producción
   - Aplicar migración
   - Verificar resultado

## 🚨 Lo que NO hacer

❌ NO usar `pg_dump` completo para migrar a Cloud SQL
❌ NO incluir `DROP DATABASE` o `CREATE DATABASE`
❌ NO usar comandos `\` de psql en archivos SQL
❌ NO olvidar hacer backup antes de migrar
❌ NO usar `CREATE TRIGGER IF NOT EXISTS`
❌ NO asumir que comandos locales funcionarán en Cloud SQL

## 📚 Referencias

- [Cloud SQL Import Requirements](https://cloud.google.com/sql/docs/postgres/import-export/import-export-sql)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/backup-dump.html)
- [Schema Migration Patterns](https://martinfowler.com/articles/evodb.html)
