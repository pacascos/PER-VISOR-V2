#!/bin/bash

# =============================================================================
# 🚀 DESPLIEGUE COMPLETO A PRODUCCIÓN
# =============================================================================
# Descripción: Despliegue completo que incluye:
#   1. Commit y push a GitHub
#   2. Migración de base de datos local → producción (Google Cloud SQL)
#   3. Arranque de servicios en Google Cloud
#   4. Despliegue de aplicaciones
# =============================================================================

set -e  # Salir si hay cualquier error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

info() {
    echo -e "${CYAN}[ℹ]${NC} $1"
}

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

PROJECT_ID="webpersonal-189221"
REGION="europe-west1"
DB_INSTANCE="per-db-instance"
DB_NAME="per_exams"
DB_USER="per_user"

# =============================================================================
# BANNER
# =============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║           🚀 DESPLIEGUE COMPLETO A PRODUCCIÓN 🚀             ║"
echo "║                                                              ║"
echo "║  Este script realizará:                                      ║"
echo "║    1. ✅ Commit y push a GitHub                              ║"
echo "║    2. 🗄️  Migración de base de datos local → producción     ║"
echo "║    3. ☁️  Arranque de servicios en Google Cloud              ║"
echo "║    4. 🚀 Despliegue de aplicaciones                          ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# CONFIRMACIÓN
# =============================================================================

# Check for --confirm flag
SKIP_CONFIRMATION=false
if [ "$1" = "--confirm" ]; then
    SKIP_CONFIRMATION=true
    info "Saltando confirmación interactiva (--confirm flag)"
fi

if [ "$SKIP_CONFIRMATION" = false ]; then
    warning "⚠️  ADVERTENCIA: Esta operación va a:"
    echo "   - Reemplazar COMPLETAMENTE la base de datos de producción"
    echo "   - Perder TODOS los datos actuales en producción"
    echo "   - Usar los datos de tu base de datos local"
    echo ""
    read -p "¿Estás SEGURO de que quieres continuar? (escribe 'SI' para confirmar): " confirmation

    if [ "$confirmation" != "SI" ]; then
        error "Despliegue cancelado por el usuario"
    fi
else
    warning "⚠️  CONFIRMACIÓN AUTOMÁTICA: Reemplazando base de datos de producción"
fi

echo ""

# =============================================================================
# PASO 1: COMMIT Y PUSH A GITHUB
# =============================================================================

log "📝 PASO 1/4: Commit y push a GitHub"
echo ""

# Verificar si hay cambios
if git diff-index --quiet HEAD --; then
    info "No hay cambios para commitear"
else
    # Mostrar cambios
    info "Cambios pendientes:"
    git status --short
    echo ""

    read -p "Mensaje del commit: " commit_message

    if [ -z "$commit_message" ]; then
        commit_message="Despliegue a producción $(date +'%Y-%m-%d %H:%M:%S')"
    fi

    log "Haciendo commit..."
    git add -A
    git commit -m "$commit_message" || true

    success "Commit realizado"
fi

# Push a GitHub
log "Subiendo a GitHub..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "$CURRENT_BRANCH" || error "Error al hacer push a GitHub"

success "Código subido a GitHub (rama: $CURRENT_BRANCH)"
echo ""

# =============================================================================
# PASO 2: MIGRACIÓN DE BASE DE DATOS
# =============================================================================

log "🗄️  PASO 2/4: Migración de base de datos local → producción"
echo ""

# Configurar proyecto
log "Configurando proyecto Google Cloud..."
gcloud config set project ${PROJECT_ID} > /dev/null 2>&1

# Crear dump de la base de datos local
log "Exportando base de datos local..."
DUMP_FILE="/tmp/per_local_dump_$(date +%Y%m%d_%H%M%S).sql"

docker exec per_postgres pg_dump -U per_user -d per_exams \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists > "$DUMP_FILE" || error "Error al exportar base de datos local"

success "Base de datos local exportada a: $DUMP_FILE"

# Limpiar el dump para Google Cloud SQL
log "Preparando dump para Google Cloud SQL..."
CLEAN_DUMP_FILE="/tmp/per_clean_dump_$(date +%Y%m%d_%H%M%S).sql"

# Remover comandos no soportados por Cloud SQL
sed \
    -e '/^CREATE ROLE/d' \
    -e '/^ALTER ROLE/d' \
    -e '/^GRANT/d' \
    -e '/^REVOKE/d' \
    -e '/OWNER TO/d' \
    -e 's/OWNER TO [^;]*;//g' \
    "$DUMP_FILE" > "$CLEAN_DUMP_FILE"

success "Dump limpiado y preparado"

# Subir dump a Cloud Storage
log "Subiendo dump a Cloud Storage..."
BUCKET_NAME="${PROJECT_ID}-db-backups"

# Crear bucket si no existe
if ! gsutil ls -b gs://${BUCKET_NAME} > /dev/null 2>&1; then
    log "Creando bucket de backups..."
    gsutil mb -l ${REGION} gs://${BUCKET_NAME} || error "Error al crear bucket"
fi

# Subir archivo
DUMP_GCS_PATH="gs://${BUCKET_NAME}/per_production_restore_$(date +%Y%m%d_%H%M%S).sql"
gsutil cp "$CLEAN_DUMP_FILE" "$DUMP_GCS_PATH" || error "Error al subir dump a Cloud Storage"

success "Dump subido a: $DUMP_GCS_PATH"

# Verificar que la instancia de BD está corriendo
log "Verificando estado de la instancia de base de datos..."
DB_STATUS=$(gcloud sql instances describe ${DB_INSTANCE} --format='get(state)' 2>/dev/null || echo "NOT_FOUND")

if [ "$DB_STATUS" = "NOT_FOUND" ]; then
    error "La instancia de base de datos no existe: $DB_INSTANCE"
elif [ "$DB_STATUS" != "RUNNABLE" ]; then
    log "Arrancando instancia de base de datos..."
    gcloud sql instances patch ${DB_INSTANCE} --activation-policy=ALWAYS --quiet

    # Esperar a que esté lista
    log "Esperando a que la instancia esté lista..."
    sleep 30
fi

success "Instancia de base de datos lista"

# Importar dump a Cloud SQL
log "Importando datos a Cloud SQL (esto puede tardar varios minutos)..."
warning "⚠️  Esto va a REEMPLAZAR todos los datos en producción"

# Obtener URI del dump (sin el prefijo gs://)
DUMP_URI="${DUMP_GCS_PATH#gs://}"

gcloud sql import sql ${DB_INSTANCE} \
    "gs://${DUMP_URI}" \
    --database=${DB_NAME} \
    --quiet || error "Error al importar datos a Cloud SQL"

success "Base de datos importada exitosamente"

# Limpiar archivos temporales
rm -f "$DUMP_FILE" "$CLEAN_DUMP_FILE"

echo ""

# =============================================================================
# PASO 3: ARRANCAR SERVICIOS EN GOOGLE CLOUD
# =============================================================================

log "☁️  PASO 3/4: Arrancar servicios en Google Cloud"
echo ""

# Verificar si el script de control de servicios existe
if [ -f "./scripts/gcloud-services-control.sh" ]; then
    log "Arrancando todos los servicios..."
    ./scripts/gcloud-services-control.sh start || warning "Algunos servicios pueden ya estar corriendo"
    success "Servicios de Google Cloud iniciados"
else
    warning "Script de control de servicios no encontrado, continuando..."
fi

echo ""

# =============================================================================
# PASO 4: DESPLEGAR APLICACIONES
# =============================================================================

log "🚀 PASO 4/4: Desplegar aplicaciones"
echo ""

# Verificar si el script de despliegue existe
if [ -f "./scripts/deploy-production.sh" ]; then
    log "Ejecutando despliegue de aplicaciones..."
    ./scripts/deploy-production.sh || error "Error en el despliegue de aplicaciones"
else
    error "Script de despliegue no encontrado: ./scripts/deploy-production.sh"
fi

echo ""

# =============================================================================
# RESUMEN FINAL
# =============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          ✅ DESPLIEGUE COMPLETADO EXITOSAMENTE ✅            ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

success "1. Código subido a GitHub"
success "2. Base de datos migrada a producción"
success "3. Servicios de Google Cloud arrancados"
success "4. Aplicaciones desplegadas"

echo ""
info "📊 Obtener URLs de servicios:"
echo "   gcloud run services list --region=${REGION}"
echo ""
info "📋 Ver logs de API:"
echo "   gcloud run services logs read per-api --region=${REGION} --limit=50"
echo ""
info "🗄️  Conectar a base de datos:"
echo "   gcloud sql connect ${DB_INSTANCE} --user=${DB_USER} --database=${DB_NAME}"
echo ""

# Obtener URLs de servicios
log "📍 URLs de servicios desplegados:"
API_URL=$(gcloud run services describe per-api --region=${REGION} --format='value(status.url)' 2>/dev/null || echo "No disponible")
FRONTEND_URL=$(gcloud run services describe per-frontend --region=${REGION} --format='value(status.url)' 2>/dev/null || echo "No disponible")

echo ""
echo "   🔗 API: $API_URL"
echo "   🌐 Frontend: $FRONTEND_URL"
echo ""

success "🎉 ¡Despliegue a producción completado!"
