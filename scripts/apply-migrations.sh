#!/bin/bash

# =============================================================================
# 🗄️ SCRIPT DE APLICACIÓN DE MIGRACIONES DE BASE DE DATOS
# =============================================================================
# Fecha de creación: 2025-01-29
# Versión: 1.0
# Descripción: Aplica migraciones de base de datos de forma segura
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

# Variables por defecto
ENVIRONMENT="local"
MIGRATIONS_DIR="scripts/database/migrations"
VERBOSE=false
DRY_RUN=false

# Función de ayuda
show_help() {
    echo "Uso: $0 [OPCIONES]"
    echo ""
    echo "Opciones:"
    echo "  -e, --environment ENV    Entorno (local|production) [default: local]"
    echo "  -d, --dry-run           Solo mostrar qué migraciones se aplicarían"
    echo "  -v, --verbose           Mostrar output detallado"
    echo "  -h, --help              Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0                      # Aplicar migraciones en local"
    echo "  $0 -e production        # Aplicar migraciones en producción"
    echo "  $0 -d -v                # Dry run con output detallado"
}

# Procesar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Opción desconocida: $1"
            ;;
    esac
done

# Validar entorno
if [[ "$ENVIRONMENT" != "local" && "$ENVIRONMENT" != "production" ]]; then
    error "Entorno debe ser 'local' o 'production'"
fi

log "🗄️ Iniciando aplicación de migraciones"
log "🌍 Entorno: ${ENVIRONMENT}"
log "📁 Directorio de migraciones: ${MIGRATIONS_DIR}"

# =============================================================================
# CONFIGURAR CONEXIÓN A BASE DE DATOS
# =============================================================================

if [ "$ENVIRONMENT" = "local" ]; then
    # Configuración local - usar Docker
    log "🔗 Conectando a base de datos local via Docker..."
    
    # Verificar que el contenedor de PostgreSQL está corriendo
    if ! docker ps | grep -q "per_postgres"; then
        error "El contenedor per_postgres no está corriendo. Ejecuta: docker-compose up -d postgres"
    fi
    
    # Función para ejecutar comandos SQL en Docker
    execute_sql() {
        docker exec per_postgres psql -U per_user -d per_exams -c "$1" 2>/dev/null
    }
    
    execute_sql_file() {
        docker exec -i per_postgres psql -U per_user -d per_exams < "$1" 2>/dev/null
    }
    
elif [ "$ENVIRONMENT" = "production" ]; then
    # Configuración de producción usando Cloud SQL Proxy
    DB_NAME="per_exams"
    DB_USER="per_user"
    PROJECT_ID="webpersonal-189221"
    INSTANCE_CONNECTION_NAME="webpersonal-189221:europe-west1:per-db-instance"

    log "🔗 Conectando a base de datos de producción via Cloud SQL Proxy..."

    # Verificar que estamos autenticados en gcloud
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        error "No estás autenticado en gcloud. Ejecuta: gcloud auth login"
    fi

    # Función para ejecutar comandos SQL en producción usando Cloud SQL Proxy
    execute_sql() {
        echo "🔍 Ejecutando SQL: $1" >&2
        echo "$1" | gcloud beta sql connect per-db-instance --user=per_user --database=per_exams --project=${PROJECT_ID} 2>&1
    }

    execute_sql_file() {
        echo "🔍 Ejecutando archivo SQL: $1" >&2
        gcloud beta sql connect per-db-instance --user=per_user --database=per_exams --project=${PROJECT_ID} < "$1" 2>&1
    }
fi

# =============================================================================
# CREAR TABLA DE CONTROL DE MIGRACIONES
# =============================================================================

log "🔍 Verificando tabla de control de migraciones..."

# Crear tabla de migraciones si no existe
CREATE_MIGRATIONS_TABLE="
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    environment VARCHAR(50) NOT NULL
);
"

if [ "$DRY_RUN" = true ]; then
    log "🔍 [DRY RUN] Crear tabla schema_migrations si no existe"
else
    if [ "$VERBOSE" = true ]; then
        execute_sql "$CREATE_MIGRATIONS_TABLE"
    else
        execute_sql "$CREATE_MIGRATIONS_TABLE"
    fi
    success "Tabla de control de migraciones verificada"
fi

# =============================================================================
# ENCONTRAR MIGRACIONES PENDIENTES
# =============================================================================

log "🔍 Buscando migraciones pendientes..."

# Obtener lista de migraciones aplicadas
APPLIED_MIGRATIONS=""
if [ "$DRY_RUN" = false ]; then
    APPLIED_MIGRATIONS=$(execute_sql "SELECT migration_name FROM schema_migrations WHERE environment = '$ENVIRONMENT';" | tr -d ' ' || echo "")
fi

# Obtener lista de archivos de migración
MIGRATION_FILES=$(find "$MIGRATIONS_DIR" -name "*.sql" ! -name "*_rollback.sql" | sort)

if [ -z "$MIGRATION_FILES" ]; then
    warning "No se encontraron archivos de migración en $MIGRATIONS_DIR"
    exit 0
fi

# Filtrar migraciones pendientes
PENDING_MIGRATIONS=""
for migration_file in $MIGRATION_FILES; do
    migration_name=$(basename "$migration_file" .sql)
    
    if [ "$DRY_RUN" = true ] || ! echo "$APPLIED_MIGRATIONS" | grep -q "$migration_name"; then
        PENDING_MIGRATIONS="$PENDING_MIGRATIONS $migration_file"
    fi
done

if [ -z "$PENDING_MIGRATIONS" ]; then
    success "✅ No hay migraciones pendientes"
    exit 0
fi

log "📋 Migraciones pendientes encontradas:"
for migration in $PENDING_MIGRATIONS; do
    echo "  - $(basename "$migration")"
done

# =============================================================================
# APLICAR MIGRACIONES
# =============================================================================

if [ "$DRY_RUN" = true ]; then
    log "🔍 [DRY RUN] Se aplicarían las siguientes migraciones:"
    for migration in $PENDING_MIGRATIONS; do
        echo "  - $(basename "$migration")"
    done
    exit 0
fi

log "🚀 Aplicando migraciones..."

for migration_file in $PENDING_MIGRATIONS; do
    migration_name=$(basename "$migration_file" .sql)
    
    log "📦 Aplicando migración: $migration_name"
    
    # Calcular checksum del archivo
    checksum=$(md5sum "$migration_file" | cut -d' ' -f1)
    
    # Aplicar migración
    if [ "$VERBOSE" = true ]; then
        execute_sql_file "$migration_file"
    else
        execute_sql_file "$migration_file"
    fi
    
    if [ $? -eq 0 ]; then
        # Registrar migración aplicada
        INSERT_MIGRATION="
        INSERT INTO schema_migrations (migration_name, checksum, environment) 
        VALUES ('$migration_name', '$checksum', '$ENVIRONMENT')
        ON CONFLICT (migration_name) DO NOTHING;
        "
        
        execute_sql "$INSERT_MIGRATION"
        
        success "✅ Migración $migration_name aplicada exitosamente"
    else
        error "❌ Error aplicando migración $migration_name"
    fi
done

# =============================================================================
# MOSTRAR RESUMEN
# =============================================================================

echo ""
echo "🎉 ¡MIGRACIONES APLICADAS EXITOSAMENTE!"
echo "======================================="
echo ""

# Mostrar migraciones aplicadas en este entorno
log "📋 Migraciones aplicadas en $ENVIRONMENT:"
APPLIED_LIST=$(execute_sql "SELECT migration_name, applied_at FROM schema_migrations WHERE environment = '$ENVIRONMENT' ORDER BY applied_at;")

if [ -n "$APPLIED_LIST" ]; then
    echo "$APPLIED_LIST" | while read -r line; do
        if [ -n "$line" ]; then
            echo "  ✅ $line"
        fi
    done
else
    echo "  (No hay migraciones aplicadas)"
fi

echo ""

success "🗄️ Aplicación de migraciones completada!"
