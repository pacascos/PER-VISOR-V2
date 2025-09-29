#!/bin/bash

# =============================================================================
# 🚀 SCRIPT DE DESPLIEGUE AUTOMATIZADO VIA GIT
# =============================================================================
# Fecha de creación: 2025-01-29
# Versión: 1.0
# Descripción: Despliegue automático basado en la rama de Git
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

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# =============================================================================
# DETECCIÓN DE ENTORNO POR RAMA
# =============================================================================

# Obtener la rama actual
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

log "🌿 Rama actual: ${CURRENT_BRANCH}"

# Determinar entorno basado en la rama
case ${CURRENT_BRANCH} in
    "main")
        ENVIRONMENT="production"
        log "🎯 Entorno detectado: PRODUCCIÓN"
        ;;
    "develop")
        ENVIRONMENT="staging"
        log "🎯 Entorno detectado: STAGING"
        ;;
    *)
        ENVIRONMENT="development"
        log "🎯 Entorno detectado: DESARROLLO"
        warning "Esta rama no tiene despliegue automático configurado"
        echo "Ramas con despliegue automático:"
        echo "  - main → PRODUCCIÓN"
        echo "  - develop → STAGING"
        exit 0
        ;;
esac

# =============================================================================
# VERIFICACIONES PREVIAS
# =============================================================================

log "🔍 Verificando estado del repositorio..."

# Verificar que no hay cambios sin commitear
if ! git diff-index --quiet HEAD --; then
    error "Hay cambios sin commitear. Haz commit antes del despliegue."
fi

# Verificar que estamos en la rama correcta y actualizada
log "🔄 Actualizando repositorio..."
git fetch origin > /dev/null 2>&1

if [ "${CURRENT_BRANCH}" != "main" ] && [ "${CURRENT_BRANCH}" != "develop" ]; then
    error "No puedes desplegar desde la rama ${CURRENT_BRANCH}. Usa main (producción) o develop (staging)."
fi

# Verificar que la rama está actualizada
if ! git status -uno | grep -q "Your branch is up to date"; then
    warning "Tu rama local no está actualizada con el remoto."
    echo "¿Quieres hacer pull antes del despliegue? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        git pull origin ${CURRENT_BRANCH}
        success "Rama actualizada"
    fi
fi

# =============================================================================
# DESPLEGAR SEGÚN ENTORNO
# =============================================================================

case ${ENVIRONMENT} in
    "production")
        log "🚀 Iniciando despliegue a PRODUCCIÓN..."
        ./scripts/deploy-production.sh
        ;;
    "staging")
        log "🚀 Iniciando despliegue a STAGING..."
        ./scripts/deploy-staging.sh
        ;;
    *)
        error "Entorno no reconocido: ${ENVIRONMENT}"
        ;;
esac

success "🎉 Despliegue completado para entorno: ${ENVIRONMENT}"
