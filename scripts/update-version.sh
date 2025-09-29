#!/bin/bash

# =============================================================================
# 📝 SCRIPT DE ACTUALIZACIÓN DE VERSIÓN
# =============================================================================
# Fecha de creación: 2025-01-29
# Versión: 1.0
# Descripción: Actualiza automáticamente el archivo version.json
# =============================================================================

set -e  # Salir si hay cualquier error

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

VERSION_FILE="version.json"
BUILD_DATE=$(date +'%Y-%m-%d-%H%M')
DEPLOY_TIME=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
COMMIT_HASH=$(git rev-parse --short HEAD)
ENVIRONMENT=${1:-"production"}

# =============================================================================
# ACTUALIZAR VERSIÓN
# =============================================================================

log "📝 Actualizando archivo de versión..."

# Leer versión actual si existe
if [ -f "$VERSION_FILE" ]; then
    CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$VERSION_FILE" | cut -d'"' -f4)
    VERSION_PARTS=($(echo $CURRENT_VERSION | tr '.' ' '))
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}
    
    # Incrementar patch version
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
else
    NEW_VERSION="1.0.0"
fi

log "📋 Versión anterior: ${CURRENT_VERSION:-"N/A"}"
log "📋 Nueva versión: $NEW_VERSION"
log "📋 Build: $BUILD_DATE"
log "📋 Commit: $COMMIT_HASH"
log "📋 Entorno: $ENVIRONMENT"

# Crear nuevo archivo de versión
cat > "$VERSION_FILE" << EOF
{
  "version": "$NEW_VERSION",
  "build": "$BUILD_DATE",
  "commit": "$COMMIT_HASH",
  "environment": "$ENVIRONMENT",
  "deployed_at": "$DEPLOY_TIME",
  "features": [
    "Sistema de roles de usuario",
    "Panel de administración", 
    "URLs relativas automáticas",
    "Proxy nginx optimizado",
    "Despliegue automatizado",
    "Sistema de versionado"
  ]
}
EOF

success "✅ Archivo de versión actualizado: $NEW_VERSION"

# Mostrar contenido
echo ""
echo "📄 Contenido del archivo de versión:"
echo "=================================="
cat "$VERSION_FILE"
echo ""
