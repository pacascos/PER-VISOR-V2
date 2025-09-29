#!/bin/bash

# =============================================================================
# 🚀 SCRIPT DE DESPLIEGUE AUTOMATIZADO A STAGING (GOOGLE CLOUD)
# =============================================================================
# Fecha de creación: 2025-01-29
# Versión: 1.0
# Descripción: Despliegue automático a entorno de staging
# =============================================================================

set -e  # Salir si hay cualquier error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# =============================================================================
# CONFIGURACIÓN STAGING
# =============================================================================

PROJECT_ID="webpersonal-189221"
REGION="europe-west1"
API_SERVICE_NAME="per-api-staging"
FRONTEND_SERVICE_NAME="per-frontend-staging"

# URLs de las imágenes con tag staging
API_IMAGE="europe-west1-docker.pkg.dev/${PROJECT_ID}/per-images/per-api:staging"
FRONTEND_IMAGE="europe-west1-docker.pkg.dev/${PROJECT_ID}/per-images/per-frontend:staging"

log "🚀 Desplegando a STAGING..."
log "📋 Proyecto: ${PROJECT_ID}"
log "🌍 Región: ${REGION}"

# =============================================================================
# DESPLEGAR A STAGING
# =============================================================================

# Construir con tag staging
log "🏗️ Construyendo imágenes para staging..."
docker build -t ${API_IMAGE} . > /dev/null 2>&1
docker build -f frontend.Dockerfile -t ${FRONTEND_IMAGE} . > /dev/null 2>&1

# Subir imágenes
log "⬆️ Subiendo imágenes a staging..."
docker push ${API_IMAGE} > /dev/null 2>&1
docker push ${FRONTEND_IMAGE} > /dev/null 2>&1

# Desplegar servicios de staging
log "🚀 Desplegando servicios de staging..."

gcloud run deploy ${API_SERVICE_NAME} \
    --image=${API_IMAGE} \
    --platform=managed \
    --region=${REGION} \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=500m \
    --concurrency=50 \
    --max-instances=3 \
    --set-env-vars="FLASK_ENV=staging" \
    --quiet > /dev/null 2>&1

gcloud run deploy ${FRONTEND_SERVICE_NAME} \
    --image=${FRONTEND_IMAGE} \
    --platform=managed \
    --region=${REGION} \
    --allow-unauthenticated \
    --memory=256Mi \
    --cpu=500m \
    --concurrency=500 \
    --max-instances=2 \
    --quiet > /dev/null 2>&1

# Obtener URLs
API_URL=$(gcloud run services describe ${API_SERVICE_NAME} --region=${REGION} --format='value(status.url)')
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} --region=${REGION} --format='value(status.url)')

echo ""
echo "🎉 ¡STAGING DESPLEGADO EXITOSAMENTE!"
echo "===================================="
echo ""
echo "🔗 API Staging: ${API_URL}"
echo "🌐 Frontend Staging: ${FRONTEND_URL}"
echo ""

success "🚀 Staging listo para pruebas!"
