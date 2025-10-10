#!/bin/bash

# =============================================================================
# 🚀 SCRIPT DE DEPLOYMENT CON SOPORTE PARA SCRIPTS SQL
# =============================================================================
# Fecha: 10 Octubre 2025
# Versión: 3.0
# Descripción: Deployment completo con capacidad de ejecutar scripts SQL en producción
# Uso: ./deploy-with-sql-scripts.sh [--sql-script path/to/script.sql] [--skip-sql]
# =============================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# =============================================================================
# CONFIGURACIÓN Y ARGUMENTOS
# =============================================================================

PROJECT_ID="webpersonal-189221"
REGION="europe-west1"
DB_INSTANCE="per-db-instance"
DB_NAME="per_exams"
DB_USER="per_user"

SQL_SCRIPT=""
SKIP_SQL=false
SKIP_MIGRATIONS=false

# Procesar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --sql-script)
            SQL_SCRIPT="$2"
            shift 2
            ;;
        --skip-sql)
            SKIP_SQL=true
            shift
            ;;
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --help)
            echo "Uso: $0 [opciones]"
            echo ""
            echo "Opciones:"
            echo "  --sql-script PATH    Ejecutar script SQL en producción antes de desplegar código"
            echo "  --skip-sql           No ejecutar scripts SQL"
            echo "  --skip-migrations    No ejecutar migraciones de BD"
            echo "  --help               Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0 --sql-script consultas/anular_duplicados_produccion.sql"
            echo "  $0 --skip-sql"
            exit 0
            ;;
        *)
            echo "Opción desconocida: $1"
            echo "Usa --help para ver opciones disponibles"
            exit 1
            ;;
    esac
done

# Banner
echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  🚀 DEPLOYMENT A PRODUCCIÓN - Con Soporte SQL                       ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

log "📋 Configuración:"
log "   Proyecto: ${PROJECT_ID}"
log "   Región: ${REGION}"
log "   Base de datos: ${DB_INSTANCE}/${DB_NAME}"
log "   Script SQL: ${SQL_SCRIPT:-'ninguno'}"
log "   Skip SQL: ${SKIP_SQL}"
echo ""

# =============================================================================
# PASO 1: BACKUP DE BASE DE DATOS
# =============================================================================

if [ "$SKIP_SQL" = false ]; then
    log "📦 PASO 1: Creando backup de base de datos..."
    
    BACKUP_DESCRIPTION="Auto backup antes de deployment - $(date +%Y%m%d_%H%M%S)"
    
    if gcloud sql backups create \
        --instance=${DB_INSTANCE} \
        --project=${PROJECT_ID} \
        --description="${BACKUP_DESCRIPTION}" 2>&1; then
        success "Backup de Cloud SQL creado"
    else
        warning "No se pudo crear backup automático"
    fi
    
    log "Esperando 5 segundos..."
    sleep 5
else
    log "⏭️ Saltando backup (--skip-sql activado)"
fi

# =============================================================================
# PASO 2: EJECUTAR SCRIPT SQL (SI SE PROPORCIONÓ)
# =============================================================================

if [ "$SKIP_SQL" = false ] && [ -n "$SQL_SCRIPT" ]; then
    log "📊 PASO 2: Ejecutando script SQL en producción..."
    
    if [ ! -f "$SQL_SCRIPT" ]; then
        error "Script SQL no encontrado: $SQL_SCRIPT"
    fi
    
    log "Script: $SQL_SCRIPT"
    
    # Obtener contraseña de Secret Manager
    log "🔐 Obteniendo contraseña de Secret Manager..."
    DB_PASSWORD=$(gcloud secrets versions access latest \
        --secret="database-password" \
        --project=${PROJECT_ID} 2>/dev/null)
    
    if [ -z "$DB_PASSWORD" ]; then
        warning "No se pudo obtener contraseña de Secret Manager"
        DB_PASSWORD="change_me_secure_password_123"
    fi
    
    # Método 1: Intentar con gcloud sql connect
    log "Ejecutando script SQL..."
    
    if echo "$DB_PASSWORD" | gcloud sql connect ${DB_INSTANCE} \
        --user=${DB_USER} \
        --database=${DB_NAME} \
        --project=${PROJECT_ID} \
        < "$SQL_SCRIPT" 2>&1 | tee /tmp/sql_execution.log | tail -20; then
        success "Script SQL ejecutado exitosamente"
        
        # Mostrar resultado
        echo ""
        log "📊 Resultado de la ejecución:"
        tail -10 /tmp/sql_execution.log
        echo ""
    else
        warning "Error ejecutando script SQL vía gcloud sql connect"
        warning "Ejecuta manualmente:"
        echo ""
        echo "  gcloud sql connect ${DB_INSTANCE} --user=${DB_USER} --database=${DB_NAME}"
        echo "  \\i $(pwd)/${SQL_SCRIPT}"
        echo ""
        echo "¿Continuar con deployment de código? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            error "Deployment cancelado"
        fi
    fi
    
elif [ "$SKIP_SQL" = false ]; then
    log "⏭️ PASO 2: No se proporcionó script SQL (usar --sql-script)"
else
    log "⏭️ PASO 2: Scripts SQL deshabilitados (--skip-sql)"
fi

# =============================================================================
# PASO 3: DESPLEGAR CÓDIGO A CLOUD RUN
# =============================================================================

log "🚀 PASO 3: Desplegando código a Cloud Run..."

if [ -f "./scripts/deploy-production.sh" ]; then
    if [ "$SKIP_MIGRATIONS" = true ]; then
        ./scripts/deploy-production.sh --skip-migrations
    else
        ./scripts/deploy-production.sh
    fi
    success "Código desplegado en Cloud Run"
else
    error "Script deploy-production.sh no encontrado"
fi

# =============================================================================
# PASO 4: VERIFICACIÓN POST-DEPLOYMENT
# =============================================================================

log "✅ PASO 4: Verificación post-deployment..."

# Obtener URLs
API_URL=$(gcloud run services describe per-api --region=${REGION} --format='value(status.url)' --project=${PROJECT_ID})
FRONTEND_URL=$(gcloud run services describe per-frontend --region=${REGION} --format='value(status.url)' --project=${PROJECT_ID})

# Esperar a que los servicios estén listos
log "Esperando 10 segundos para que los servicios se estabilicen..."
sleep 10

# Verificar API
log "🔍 Verificando API..."
if curl -f -s "${API_URL}/api/health" > /dev/null 2>&1; then
    success "API funcionando: ${API_URL}/api/health"
else
    warning "API no responde en /api/health"
fi

# Verificar Frontend
log "🔍 Verificando Frontend..."
if curl -f -s "${FRONTEND_URL}" > /dev/null 2>&1; then
    success "Frontend funcionando: ${FRONTEND_URL}"
else
    warning "Frontend no responde"
fi

# =============================================================================
# PASO 5: VERIFICAR BASE DE DATOS (SI SE EJECUTÓ SQL)
# =============================================================================

if [ "$SKIP_SQL" = false ] && [ -n "$SQL_SCRIPT" ]; then
    log "🔍 PASO 5: Verificando cambios en base de datos..."
    
    # Verificación simple de estado
    log "Consultando estado de preguntas..."
    
    if echo "$DB_PASSWORD" | gcloud sql connect ${DB_INSTANCE} \
        --user=${DB_USER} \
        --database=${DB_NAME} \
        --project=${PROJECT_ID} \
        << 'SQLEOF' 2>&1 | tail -10; then
SELECT 
    COUNT(*) FILTER (WHERE anulada = false) AS preguntas_activas,
    COUNT(*) FILTER (WHERE anulada = true) AS preguntas_anuladas
FROM questions q
JOIN exams e ON q.exam_id = e.id
WHERE e.tipo_examen IN ('PER_NORMAL', 'PER_LIBERADO');
SQLEOF
        success "Verificación de BD completada"
    else
        warning "No se pudo verificar BD automáticamente"
    fi
fi

# =============================================================================
# RESUMEN FINAL
# =============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                   ✅ DEPLOYMENT COMPLETADO                           ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

log "📦 Deployment completado exitosamente"
echo ""
echo "🔗 URLs de producción:"
echo "   API:      ${API_URL}"
echo "   Frontend: ${FRONTEND_URL}"
echo ""

if [ -n "$SQL_SCRIPT" ]; then
    echo "📊 Script SQL ejecutado: ${SQL_SCRIPT}"
    echo ""
fi

echo "📋 Próximos pasos:"
echo "   1. Verificar funcionalidad en ${FRONTEND_URL}"
echo "   2. Probar generación de exámenes"
echo "   3. Probar tests de estudio consecutivos"
echo "   4. Monitorear logs: gcloud run services logs read per-api --region=${REGION}"
echo ""

success "🎉 Deployment completado - Sistema en producción"

# =============================================================================
# EJEMPLOS DE USO
# =============================================================================
: << 'EXAMPLES'

# Ejemplo 1: Deployment simple (sin SQL)
./deploy-with-sql-scripts.sh

# Ejemplo 2: Deployment con script SQL
./deploy-with-sql-scripts.sh \
    --sql-script consultas/anular_duplicados_produccion.sql

# Ejemplo 3: Deployment con SQL y sin migraciones
./deploy-with-sql-scripts.sh \
    --sql-script consultas/actualizar_estadisticas.sql \
    --skip-migrations

# Ejemplo 4: Solo código (sin BD)
./deploy-with-sql-scripts.sh --skip-sql

# Ejemplo 5: Múltiples scripts SQL (ejecutar en secuencia)
./deploy-with-sql-scripts.sh --sql-script consultas/script1.sql
./deploy-with-sql-scripts.sh --sql-script consultas/script2.sql --skip-sql

EXAMPLES

