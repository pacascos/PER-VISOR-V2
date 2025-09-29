#!/bin/bash

# =============================================================================
# 🚀 SCRIPT DE DESPLIEGUE AUTOMATIZADO A GOOGLE CLOUD
# =============================================================================
# Fecha de creación: 2025-01-29
# Versión: 1.0
# Descripción: Despliegue completo y automatizado a Google Cloud Run
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

# URLs de las imágenes
API_IMAGE="europe-west1-docker.pkg.dev/${PROJECT_ID}/per-images/per-api:latest"
FRONTEND_IMAGE="europe-west1-docker.pkg.dev/${PROJECT_ID}/per-images/per-frontend:latest"

log "🚀 Iniciando despliegue automatizado a Google Cloud"
log "📋 Proyecto: ${PROJECT_ID}"
log "🌍 Región: ${REGION}"

# =============================================================================
# ACTUALIZAR VERSIÓN
# =============================================================================

log "📝 Actualizando información de versión..."
./scripts/update-version.sh production

# Copiar archivo de versión al directorio web
cp version.json src/web/
success "Información de versión actualizada"

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
# CONSTRUIR IMÁGENES
# =============================================================================

log "🏗️ Construyendo imágenes Docker..."

# Construir imagen del API
log "📦 Construyendo imagen del API..."
docker build --platform linux/amd64 -t ${API_IMAGE} . > /dev/null 2>&1
success "Imagen del API construida: ${API_IMAGE}"

# Construir imagen del Frontend
log "📦 Construyendo imagen del Frontend..."
docker build --platform linux/amd64 -f frontend.Dockerfile -t ${FRONTEND_IMAGE} . > /dev/null 2>&1
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
# DESPLEGAR SERVICIOS
# =============================================================================

log "🚀 Desplegando servicios en Cloud Run..."

# Desplegar API
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
    --set-env-vars="FLASK_ENV=production" \
    --quiet > /dev/null 2>&1

success "Servicio API desplegado"

# Desplegar Frontend
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
    --quiet > /dev/null 2>&1

success "Servicio Frontend desplegado"

# =============================================================================
# OBTENER URLs Y MOSTRAR RESULTADOS
# =============================================================================

log "🔗 Obteniendo URLs de los servicios..."

API_URL=$(gcloud run services describe ${API_SERVICE_NAME} --region=${REGION} --format='value(status.url)')
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} --region=${REGION} --format='value(status.url)')

echo ""
echo "🎉 ¡DESPLIEGUE COMPLETADO EXITOSAMENTE!"
echo "=========================================="
echo ""
echo "🔗 API URL: ${API_URL}"
echo "🌐 Frontend URL: ${FRONTEND_URL}"
echo ""
echo "📋 Próximos pasos:"
echo "1. ✅ Verificar que los servicios están funcionando"
echo "2. ✅ Probar la aplicación en: ${FRONTEND_URL}"
echo "3. ✅ Verificar logs si hay problemas"
echo ""
echo "🔍 Comandos útiles:"
echo "   Ver logs API: gcloud run services logs read ${API_SERVICE_NAME} --region=${REGION}"
echo "   Ver logs Frontend: gcloud run services logs read ${FRONTEND_SERVICE_NAME} --region=${REGION}"
echo "   Listar servicios: gcloud run services list --region=${REGION}"
echo ""

success "🚀 Despliegue a producción completado!"