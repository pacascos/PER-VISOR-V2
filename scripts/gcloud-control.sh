#!/bin/bash

# =============================================================================
# 🚀 ALIAS CORTO PARA CONTROL DE SERVICIOS GOOGLE CLOUD
# =============================================================================
# Fecha de creación: 2025-09-29
# Descripción: Alias corto para el script de control de servicios
# =============================================================================

# Obtener el directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ejecutar el script principal
exec "$SCRIPT_DIR/gcloud-services-control.sh" "$@"
