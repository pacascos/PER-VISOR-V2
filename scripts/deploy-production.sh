#!/bin/bash

# =============================================================================
# 🚀 SCRIPT DE DESPLIEGUE ROBUSTO A GOOGLE CLOUD
# =============================================================================
# Fecha de creación: 2025-01-29
# Versión: 2.0 - ROBUSTO
# Descripción: Despliegue completo que garantiza regeneración completa
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
# CONFIGURACIÓN
# =============================================================================

# Variables del proyecto
PROJECT_ID="webpersonal-189221"
REGION="europe-west1"
API_SERVICE_NAME="per-api"
FRONTEND_SERVICE_NAME="per-frontend"

# Generar timestamp único para evitar cache
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BUILD_ID="${TIMESTAMP}-$(git rev-parse --short HEAD)"

# URLs de las imágenes con timestamp único
API_IMAGE="europe-west1-docker.pkg.dev/${PROJECT_ID}/per-images/per-api:${BUILD_ID}"
FRONTEND_IMAGE="europe-west1-docker.pkg.dev/${PROJECT_ID}/per-images/per-frontend:${BUILD_ID}"

log "🚀 Iniciando despliegue ROBUSTO a Google Cloud"
log "📋 Proyecto: ${PROJECT_ID}"
log "🌍 Región: ${REGION}"
log "🏷️ Build ID: ${BUILD_ID}"

# =============================================================================
# LIMPIEZA PREVIA
# =============================================================================

log "🧹 Limpiando cache y contenedores locales..."

# Limpiar contenedores Docker locales
docker system prune -f > /dev/null 2>&1 || true

# Limpiar imágenes locales del proyecto
docker images | grep "per-api\|per-frontend" | awk '{print $3}' | xargs -r docker rmi -f > /dev/null 2>&1 || true

# Limpiar cache de Docker BuildKit
docker builder prune -f > /dev/null 2>&1 || true

success "Cache y contenedores locales limpiados"

# =============================================================================
# VERIFICACIONES PREVIAS
# =============================================================================

log "🔍 Verificando prerrequisitos..."

# Verificar que gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    error "gcloud CLI no está instalado. Instálalo desde: https://cloud.google.com/sdk/docs/install"
fi

# Verificar que docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker no está instalado. Instálalo desde: https://docs.docker.com/get-docker/"
fi

# Verificar que git está disponible
if ! command -v git &> /dev/null; then
    error "Git no está instalado"
fi

# Verificar que estamos en un repositorio git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    error "No estamos en un repositorio git"
fi

# Verificar que no hay cambios sin commitear
if ! git diff-index --quiet HEAD --; then
    warning "Hay cambios sin commitear. Asegúrate de hacer commit antes del despliegue."
    echo "¿Quieres continuar de todos modos? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        error "Despliegue cancelado. Haz commit de los cambios primero."
    fi
fi

# Verificar autenticación
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    error "No estás autenticado en gcloud. Ejecuta: gcloud auth login"
fi

# Configurar proyecto
log "⚙️ Configurando proyecto..."
gcloud config set project ${PROJECT_ID} > /dev/null 2>&1

# Habilitar APIs necesarias
log "🔧 Habilitando APIs de Google Cloud..."
gcloud services enable cloudbuild.googleapis.com > /dev/null 2>&1
gcloud services enable run.googleapis.com > /dev/null 2>&1
gcloud services enable artifactregistry.googleapis.com > /dev/null 2>&1

# =============================================================================
# ACTUALIZAR VERSIÓN
# =============================================================================

log "📝 Actualizando información de versión..."
./scripts/update-version.sh production

# Copiar archivo de versión al directorio web
cp version.json src/web/
success "Información de versión actualizada"

# =============================================================================
# CONFIGURAR ARTIFACT REGISTRY
# =============================================================================

log "📦 Configurando Artifact Registry..."

# Crear repositorio si no existe
if ! gcloud artifacts repositories describe per-images --location=${REGION} > /dev/null 2>&1; then
    log "📦 Creando repositorio de imágenes..."
    gcloud artifacts repositories create per-images \
        --repository-format=docker \
        --location=${REGION} \
        --description="Imágenes Docker para PER Sistema" > /dev/null 2>&1
    success "Repositorio creado: europe-west1-docker.pkg.dev/${PROJECT_ID}/per-images"
else
    log "✅ Repositorio ya existe: europe-west1-docker.pkg.dev/${PROJECT_ID}/per-images"
fi

# Configurar autenticación Docker
log "🔐 Configurando autenticación Docker..."
gcloud auth configure-docker europe-west1-docker.pkg.dev > /dev/null 2>&1

# =============================================================================
# CONSTRUIR IMÁGENES CON CACHE LIMPIO
# =============================================================================

log "🏗️ Construyendo imágenes Docker (sin cache)..."

# Construir imagen del API sin cache
log "📦 Construyendo imagen del API (sin cache)..."
docker build \
    --platform linux/amd64 \
    --no-cache \
    --pull \
    -t ${API_IMAGE} \
    . > /dev/null 2>&1
success "Imagen del API construida: ${API_IMAGE}"

# Construir imagen del Frontend sin cache
log "📦 Construyendo imagen del Frontend (sin cache)..."
docker build \
    --platform linux/amd64 \
    --no-cache \
    --pull \
    -f frontend.Dockerfile \
    -t ${FRONTEND_IMAGE} \
    . > /dev/null 2>&1
success "Imagen del Frontend construida: ${FRONTEND_IMAGE}"

# =============================================================================
# SUBIR IMÁGENES
# =============================================================================

log "⬆️ Subiendo imágenes a Artifact Registry..."

# Subir imagen del API
log "⬆️ Subiendo imagen del API..."
docker push ${API_IMAGE} > /dev/null 2>&1
success "Imagen del API subida"

# Subir imagen del Frontend
log "⬆️ Subiendo imagen del Frontend..."
docker push ${FRONTEND_IMAGE} > /dev/null 2>&1
success "Imagen del Frontend subida"

# =============================================================================
# DESPLEGAR SERVICIOS CON FORCE UPDATE
# =============================================================================

log "🚀 Desplegando servicios en Cloud Run (forzando actualización)..."

# Desplegar API con force update
log "🔧 Desplegando servicio API..."
gcloud run deploy ${API_SERVICE_NAME} \
    --image=${API_IMAGE} \
    --platform=managed \
    --region=${REGION} \
    --allow-unauthenticated \
    --memory=1Gi \
    --cpu=1000m \
    --concurrency=100 \
    --max-instances=10 \
    --timeout=300 \
    --set-env-vars="FLASK_ENV=production,BUILD_ID=${BUILD_ID}" \
    --quiet > /dev/null 2>&1

success "Servicio API desplegado"

# =============================================================================
# APLICAR MIGRACIONES DE BASE DE DATOS
# =============================================================================

log "🗄️ Aplicando migraciones de base de datos..."
if ./scripts/apply-migrations.sh -e production; then
    success "Migraciones aplicadas correctamente"
else
    error "Error aplicando migraciones de base de datos"
fi

# Desplegar Frontend con force update
log "🌐 Desplegando servicio Frontend..."
gcloud run deploy ${FRONTEND_SERVICE_NAME} \
    --image=${FRONTEND_IMAGE} \
    --platform=managed \
    --region=${REGION} \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=1000m \
    --concurrency=1000 \
    --max-instances=5 \
    --set-env-vars="BUILD_ID=${BUILD_ID}" \
    --quiet > /dev/null 2>&1

success "Servicio Frontend desplegado"

# =============================================================================
# VERIFICAR DESPLIEGUE
# =============================================================================

log "🔍 Verificando despliegue..."

# Esperar un poco para que los servicios estén listos
sleep 10

# Obtener URLs
API_URL=$(gcloud run services describe ${API_SERVICE_NAME} --region=${REGION} --format='value(status.url)')
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} --region=${REGION} --format='value(status.url)')

# Verificar API
log "🔍 Verificando API..."
if curl -f -s "${API_URL}/health" > /dev/null; then
    success "API funcionando correctamente"
else
    warning "API no responde correctamente"
fi

# Verificar Frontend
log "🔍 Verificando Frontend..."
if curl -f -s "${FRONTEND_URL}" > /dev/null; then
    success "Frontend funcionando correctamente"
else
    warning "Frontend no responde correctamente"
fi

# =============================================================================
# MOSTRAR RESULTADOS
# =============================================================================

echo ""
echo "🎉 ¡DESPLIEGUE ROBUSTO COMPLETADO EXITOSAMENTE!"
echo "================================================"
echo ""
echo "🏷️ Build ID: ${BUILD_ID}"
echo "🔗 API URL: ${API_URL}"
echo "🌐 Frontend URL: ${FRONTEND_URL}"
echo ""
echo "📋 Servicios desplegados:"
echo "  - ${API_SERVICE_NAME} (API) - Imagen: ${API_IMAGE}"
echo "  - ${FRONTEND_SERVICE_NAME} (Frontend) - Imagen: ${FRONTEND_IMAGE}"
echo ""
echo "🔍 Comandos útiles:"
echo "   Ver logs API: gcloud run services logs read ${API_SERVICE_NAME} --region=${REGION}"
echo "   Ver logs Frontend: gcloud run services logs read ${FRONTEND_SERVICE_NAME} --region=${REGION}"
echo "   Listar servicios: gcloud run services list --region=${REGION}"
echo ""
echo "🧹 Para limpiar imágenes antiguas:"
echo "   gcloud artifacts docker images delete ${API_IMAGE} --quiet"
echo "   gcloud artifacts docker images delete ${FRONTEND_IMAGE} --quiet"
echo ""

success "🚀 Despliegue robusto a producción completado!"
