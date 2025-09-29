#!/bin/bash

# =============================================================================
# 🧹 SCRIPT DE LIMPIEZA DE IMÁGENES ANTIGUAS
# =============================================================================
# Fecha de creación: 2025-01-29
# Versión: 1.0
# Descripción: Limpia imágenes Docker antiguas de Artifact Registry
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
REPOSITORY="per-images"
KEEP_IMAGES=5  # Mantener las últimas 5 imágenes

log "🧹 Iniciando limpieza de imágenes antiguas"
log "📋 Proyecto: ${PROJECT_ID}"
log "🌍 Región: ${REGION}"
log "📦 Repositorio: ${REPOSITORY}"
log "💾 Mantener últimas: ${KEEP_IMAGES} imágenes"

# =============================================================================
# LIMPIAR IMÁGENES DEL API
# =============================================================================

log "🔍 Limpiando imágenes del API..."

# Obtener lista de imágenes del API ordenadas por fecha (más recientes primero)
API_IMAGES=$(gcloud artifacts docker images list \
    europe-west1-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/per-api \
    --format="value(name)" \
    --sort-by="~createTime" \
    2>/dev/null || echo "")

if [ -z "$API_IMAGES" ]; then
    warning "No se encontraron imágenes del API"
else
    # Convertir a array
    IFS=$'\n' read -rd '' -a api_images_array <<< "$API_IMAGES"
    
    total_api=${#api_images_array[@]}
    log "📊 Total de imágenes del API: ${total_api}"
    
    if [ $total_api -gt $KEEP_IMAGES ]; then
        images_to_delete=$((total_api - KEEP_IMAGES))
        log "🗑️ Eliminando ${images_to_delete} imágenes antiguas del API..."
        
        for ((i=KEEP_IMAGES; i<total_api; i++)); do
            image_name="${api_images_array[$i]}"
            log "🗑️ Eliminando: ${image_name}"
            gcloud artifacts docker images delete "${image_name}" --quiet > /dev/null 2>&1 || warning "No se pudo eliminar: ${image_name}"
        done
        
        success "Limpieza del API completada"
    else
        log "✅ No hay imágenes antiguas del API para eliminar"
    fi
fi

# =============================================================================
# LIMPIAR IMÁGENES DEL FRONTEND
# =============================================================================

log "🔍 Limpiando imágenes del Frontend..."

# Obtener lista de imágenes del Frontend ordenadas por fecha (más recientes primero)
FRONTEND_IMAGES=$(gcloud artifacts docker images list \
    europe-west1-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/per-frontend \
    --format="value(name)" \
    --sort-by="~createTime" \
    2>/dev/null || echo "")

if [ -z "$FRONTEND_IMAGES" ]; then
    warning "No se encontraron imágenes del Frontend"
else
    # Convertir a array
    IFS=$'\n' read -rd '' -a frontend_images_array <<< "$FRONTEND_IMAGES"
    
    total_frontend=${#frontend_images_array[@]}
    log "📊 Total de imágenes del Frontend: ${total_frontend}"
    
    if [ $total_frontend -gt $KEEP_IMAGES ]; then
        images_to_delete=$((total_frontend - KEEP_IMAGES))
        log "🗑️ Eliminando ${images_to_delete} imágenes antiguas del Frontend..."
        
        for ((i=KEEP_IMAGES; i<total_frontend; i++)); do
            image_name="${frontend_images_array[$i]}"
            log "🗑️ Eliminando: ${image_name}"
            gcloud artifacts docker images delete "${image_name}" --quiet > /dev/null 2>&1 || warning "No se pudo eliminar: ${image_name}"
        done
        
        success "Limpieza del Frontend completada"
    else
        log "✅ No hay imágenes antiguas del Frontend para eliminar"
    fi
fi

# =============================================================================
# MOSTRAR RESUMEN
# =============================================================================

echo ""
echo "🎉 ¡LIMPIEZA COMPLETADA!"
echo "========================"
echo ""

# Mostrar imágenes restantes del API
log "📊 Imágenes del API restantes:"
API_REMAINING=$(gcloud artifacts docker images list \
    europe-west1-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/per-api \
    --format="table(name,createTime)" \
    --sort-by="~createTime" \
    2>/dev/null || echo "No hay imágenes")

echo "$API_REMAINING"
echo ""

# Mostrar imágenes restantes del Frontend
log "📊 Imágenes del Frontend restantes:"
FRONTEND_REMAINING=$(gcloud artifacts docker images list \
    europe-west1-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/per-frontend \
    --format="table(name,createTime)" \
    --sort-by="~createTime" \
    2>/dev/null || echo "No hay imágenes")

echo "$FRONTEND_REMAINING"
echo ""

success "🧹 Limpieza de imágenes antiguas completada!"
