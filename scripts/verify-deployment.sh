#!/bin/bash

# =============================================================================
# 🔍 SCRIPT DE VERIFICACIÓN DE DESPLIEGUE
# =============================================================================
# Fecha de creación: 2025-01-29
# Versión: 1.0
# Descripción: Verifica que el despliegue fue exitoso y todo funciona
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

PROJECT_ID="webpersonal-189221"
REGION="europe-west1"
API_SERVICE_NAME="per-api"
FRONTEND_SERVICE_NAME="per-frontend"

log "🔍 Iniciando verificación de despliegue"
log "📋 Proyecto: ${PROJECT_ID}"
log "🌍 Región: ${REGION}"

# =============================================================================
# VERIFICAR SERVICIOS EN CLOUD RUN
# =============================================================================

log "🔍 Verificando servicios en Cloud Run..."

# Verificar API
log "🔍 Verificando servicio API..."
API_STATUS=$(gcloud run services describe ${API_SERVICE_NAME} --region=${REGION} --format='value(status.conditions[0].status)' 2>/dev/null || echo "NOT_FOUND")

if [ "$API_STATUS" = "True" ]; then
    success "✅ Servicio API está funcionando"
    
    # Obtener URL del API
    API_URL=$(gcloud run services describe ${API_SERVICE_NAME} --region=${REGION} --format='value(status.url)')
    log "🔗 API URL: ${API_URL}"
    
    # Obtener información de la revisión
    API_REVISION=$(gcloud run services describe ${API_SERVICE_NAME} --region=${REGION} --format='value(status.latestReadyRevisionName)')
    log "📋 API Revisión: ${API_REVISION}"
    
    # Obtener imagen actual
    API_IMAGE=$(gcloud run services describe ${API_SERVICE_NAME} --region=${REGION} --format='value(spec.template.spec.template.spec.containers[0].image)')
    log "🐳 API Imagen: ${API_IMAGE}"
    
else
    error "❌ Servicio API no está funcionando (Estado: ${API_STATUS})"
fi

# Verificar Frontend
log "🔍 Verificando servicio Frontend..."
FRONTEND_STATUS=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} --region=${REGION} --format='value(status.conditions[0].status)' 2>/dev/null || echo "NOT_FOUND")

if [ "$FRONTEND_STATUS" = "True" ]; then
    success "✅ Servicio Frontend está funcionando"
    
    # Obtener URL del Frontend
    FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} --region=${REGION} --format='value(status.url)')
    log "🔗 Frontend URL: ${FRONTEND_URL}"
    
    # Obtener información de la revisión
    FRONTEND_REVISION=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} --region=${REGION} --format='value(status.latestReadyRevisionName)')
    log "📋 Frontend Revisión: ${FRONTEND_REVISION}"
    
    # Obtener imagen actual
    FRONTEND_IMAGE=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} --region=${REGION} --format='value(spec.template.spec.template.spec.containers[0].image)')
    log "🐳 Frontend Imagen: ${FRONTEND_IMAGE}"
    
else
    error "❌ Servicio Frontend no está funcionando (Estado: ${FRONTEND_STATUS})"
fi

# =============================================================================
# VERIFICAR ENDPOINTS
# =============================================================================

log "🔍 Verificando endpoints..."

# Verificar API Health
log "🔍 Probando API Health..."
if curl -f -s "${API_URL}/health" > /dev/null; then
    success "✅ API Health endpoint funciona"
else
    error "❌ API Health endpoint no responde"
fi

# Verificar Frontend
log "🔍 Probando Frontend..."
if curl -f -s "${FRONTEND_URL}" > /dev/null; then
    success "✅ Frontend responde correctamente"
else
    error "❌ Frontend no responde"
fi

# Verificar API Login
log "🔍 Probando API Login..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username": "testuser", "password": "123"}' 2>/dev/null || echo "ERROR")

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    success "✅ API Login funciona correctamente"
    
    # Verificar que devuelve el campo role
    if echo "$LOGIN_RESPONSE" | grep -q '"role":'; then
        success "✅ API devuelve campo role"
    else
        warning "⚠️ API no devuelve campo role"
    fi
else
    warning "⚠️ API Login no funciona correctamente"
fi

# =============================================================================
# VERIFICAR VERSIÓN
# =============================================================================

log "🔍 Verificando información de versión..."

# Verificar si existe version.json en el frontend
VERSION_RESPONSE=$(curl -s "${FRONTEND_URL}/version.json" 2>/dev/null || echo "ERROR")

if echo "$VERSION_RESPONSE" | grep -q '"version":'; then
    success "✅ Información de versión disponible"
    VERSION=$(echo "$VERSION_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    BUILD=$(echo "$VERSION_RESPONSE" | grep -o '"build":"[^"]*"' | cut -d'"' -f4)
    COMMIT=$(echo "$VERSION_RESPONSE" | grep -o '"commit":"[^"]*"' | cut -d'"' -f4)
    
    log "📋 Versión: ${VERSION}"
    log "📋 Build: ${BUILD}"
    log "📋 Commit: ${COMMIT}"
else
    warning "⚠️ Información de versión no disponible"
fi

# =============================================================================
# MOSTRAR RESUMEN
# =============================================================================

echo ""
echo "🎉 ¡VERIFICACIÓN COMPLETADA!"
echo "============================"
echo ""
echo "✅ Servicios funcionando:"
echo "  - API: ${API_SERVICE_NAME} (${API_REVISION})"
echo "  - Frontend: ${FRONTEND_SERVICE_NAME} (${FRONTEND_REVISION})"
echo ""
echo "🔗 URLs:"
echo "  - API: ${API_URL}"
echo "  - Frontend: ${FRONTEND_URL}"
echo ""
echo "🐳 Imágenes:"
echo "  - API: ${API_IMAGE}"
echo "  - Frontend: ${FRONTEND_IMAGE}"
echo ""
echo "🔍 Comandos útiles:"
echo "  Ver logs API: gcloud run services logs read ${API_SERVICE_NAME} --region=${REGION}"
echo "  Ver logs Frontend: gcloud run services logs read ${FRONTEND_SERVICE_NAME} --region=${REGION}"
echo "  Listar servicios: gcloud run services list --region=${REGION}"
echo ""

success "🔍 Verificación de despliegue completada exitosamente!"
