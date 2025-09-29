#!/bin/bash

# =============================================================================
# 🔗 CONFIGURACIÓN CLOUD SQL PROXY PARA CONEXIONES SEGURAS
# =============================================================================
# Fecha de creación: 2025-09-29
# Descripción: Configura Cloud SQL Proxy para conexiones seguras y confiables
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
# CONFIGURACIÓN
# =============================================================================

PROJECT_ID="webpersonal-189221"
REGION="europe-west1"
INSTANCE_NAME="per-db-instance"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
LOCAL_PORT="5433"

log "🚀 Configurando Cloud SQL Proxy"
log "📋 Proyecto: ${PROJECT_ID}"
log "🌍 Región: ${REGION}"
log "💾 Instancia: ${INSTANCE_NAME}"
log "🔌 Puerto local: ${LOCAL_PORT}"

# =============================================================================
# VERIFICACIONES
# =============================================================================

# Verificar gcloud auth
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    error "No estás autenticado en gcloud. Ejecuta: gcloud auth login"
fi

# Verificar permisos
log "🔍 Verificando permisos de Cloud SQL..."
if ! gcloud sql instances describe ${INSTANCE_NAME} --project=${PROJECT_ID} > /dev/null 2>&1; then
    error "No tienes permisos para acceder a la instancia ${INSTANCE_NAME}"
fi

# =============================================================================
# INSTALAR CLOUD SQL PROXY
# =============================================================================

log "📦 Verificando Cloud SQL Proxy..."

PROXY_PATH="/usr/local/bin/cloud_sql_proxy"

if [ ! -f "$PROXY_PATH" ]; then
    log "📥 Descargando Cloud SQL Proxy..."

    # Detectar arquitectura
    case $(uname -m) in
        x86_64) ARCH="amd64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) error "Arquitectura no soportada: $(uname -m)" ;;
    esac

    # Descargar la versión apropiada
    curl -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.${ARCH}
    chmod +x cloud_sql_proxy
    sudo mv cloud_sql_proxy ${PROXY_PATH}

    success "Cloud SQL Proxy instalado en ${PROXY_PATH}"
else
    success "Cloud SQL Proxy ya está instalado"
fi

# =============================================================================
# INICIAR PROXY
# =============================================================================

log "🔗 Iniciando Cloud SQL Proxy..."

# Verificar si ya está corriendo
if lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    warning "Puerto ${LOCAL_PORT} ya está en uso"
    log "🔍 Proceso actual:"
    lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN

    echo "¿Quieres matar el proceso existente? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        sudo kill $(lsof -t -i:${LOCAL_PORT}) || true
        sleep 2
    else
        error "No se puede iniciar el proxy - puerto ocupado"
    fi
fi

# Iniciar proxy en background
log "🚀 Iniciando proxy para ${CONNECTION_NAME}..."
${PROXY_PATH} -instances=${CONNECTION_NAME}=tcp:${LOCAL_PORT} &
PROXY_PID=$!

# Guardar PID para poder matarlo después
echo ${PROXY_PID} > /tmp/cloud_sql_proxy.pid

# Esperar a que el proxy esté listo
log "⏳ Esperando que el proxy esté listo..."
for i in {1..30}; do
    if lsof -Pi :${LOCAL_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
        success "✅ Cloud SQL Proxy listo en puerto ${LOCAL_PORT}"
        break
    fi

    if [ $i -eq 30 ]; then
        error "❌ Timeout esperando que el proxy esté listo"
    fi

    sleep 1
done

# =============================================================================
# INFORMACIÓN DE CONEXIÓN
# =============================================================================

echo ""
echo "🎉 ¡CLOUD SQL PROXY CONFIGURADO!"
echo "================================"
echo ""
echo "🔌 Conexión local disponible en:"
echo "   Host: localhost"
echo "   Puerto: ${LOCAL_PORT}"
echo "   Base de datos: per_exams"
echo "   Usuario: per_user"
echo ""
echo "📋 Comandos útiles:"
echo "   # Conectar via psql:"
echo "   psql -h localhost -p ${LOCAL_PORT} -U per_user -d per_exams"
echo ""
echo "   # Parar el proxy:"
echo "   kill $(cat /tmp/cloud_sql_proxy.pid)"
echo ""
echo "   # Ver logs del proxy:"
echo "   tail -f /var/log/cloud_sql_proxy.log"
echo ""

# =============================================================================
# FUNCIÓN DE LIMPIEZA
# =============================================================================

cleanup() {
    log "🧹 Deteniendo Cloud SQL Proxy..."
    if [ -f /tmp/cloud_sql_proxy.pid ]; then
        kill $(cat /tmp/cloud_sql_proxy.pid) 2>/dev/null || true
        rm -f /tmp/cloud_sql_proxy.pid
    fi
}

# Registrar función de limpieza
trap cleanup EXIT

# Mantener el script corriendo
log "✅ Cloud SQL Proxy corriendo (PID: ${PROXY_PID})"
log "📝 Presiona Ctrl+C para detener"

wait ${PROXY_PID}