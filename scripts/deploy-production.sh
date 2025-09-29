#!/bin/bash
# scripts/deploy-production.sh
# Script para desplegar a producción desde la rama main

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

set -e # Salir si algún comando falla

echo -e "${BLUE}🚀 DESPLEGANDO A PRODUCCIÓN${NC}"
echo "=================================="

# Verificar que estamos en la rama main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Error: Debes estar en la rama 'main' para desplegar a producción${NC}"
    echo -e "${YELLOW}💡 Cambia a main con: git checkout main${NC}"
    exit 1
fi

# Verificar que main está actualizada
echo -e "${YELLOW}📡 Verificando que main está actualizada...${NC}"
git pull origin main

# Verificar que gcloud está disponible
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud no está disponible en PATH${NC}"
    echo -e "${YELLOW}💡 Añade gcloud al PATH: export PATH=\"/Users/cascos/google-cloud-sdk/bin:\$PATH\"${NC}"
    exit 1
fi

# Configurar PATH para gcloud
export PATH="/Users/cascos/google-cloud-sdk/bin:$PATH"

echo -e "${YELLOW}🔨 Construyendo imagen de la API...${NC}"
docker build --platform linux/amd64 -t europe-west1-docker.pkg.dev/webpersonal-189221/per-repo/per-api:latest .

echo -e "${YELLOW}📤 Subiendo imagen de la API...${NC}"
docker push europe-west1-docker.pkg.dev/webpersonal-189221/per-repo/per-api:latest

echo -e "${YELLOW}🚀 Desplegando API a Cloud Run...${NC}"
gcloud run deploy per-api \
  --image=europe-west1-docker.pkg.dev/webpersonal-189221/per-repo/per-api:latest \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=10 \
  --add-cloudsql-instances=webpersonal-189221:europe-west1:per-db-instance \
  --update-env-vars="DATABASE_URL=postgresql://per_user:U56csCarzJp43B9K507Y4xp/3h7uRSgf0DuBWTwuLhs=@/per_exams?host=/cloudsql/webpersonal-189221:europe-west1:per-db-instance"

echo -e "${YELLOW}🔨 Construyendo imagen del Frontend...${NC}"
docker build --platform linux/amd64 -t europe-west1-docker.pkg.dev/webpersonal-189221/per-repo/per-frontend:latest -f frontend.Dockerfile .

echo -e "${YELLOW}📤 Subiendo imagen del Frontend...${NC}"
docker push europe-west1-docker.pkg.dev/webpersonal-189221/per-repo/per-frontend:latest

echo -e "${YELLOW}🚀 Desplegando Frontend a Cloud Run...${NC}"
gcloud run deploy per-frontend \
  --image=europe-west1-docker.pkg.dev/webpersonal-189221/per-repo/per-frontend:latest \
  --region=europe-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=80

echo ""
echo -e "${GREEN}✅ DESPLIEGUE COMPLETADO EXITOSAMENTE${NC}"
echo "=================================="
echo -e "${BLUE}🌐 URLs de Producción:${NC}"
echo -e "   Frontend: ${GREEN}https://bancotest.com${NC}"
echo -e "   API: ${GREEN}https://per-api-435987927843.europe-west1.run.app${NC}"
echo ""
echo -e "${YELLOW}🔍 Verificaciones recomendadas:${NC}"
echo "   1. Probar login en https://bancotest.com"
echo "   2. Verificar favicon de producción (rojo/azul)"
echo "   3. Comprobar que las estadísticas funcionan"
echo "   4. Probar generación de exámenes"
echo ""
echo -e "${BLUE}📝 Logs disponibles en:${NC}"
echo "   gcloud run logs read per-api --region=europe-west1"
echo "   gcloud run logs read per-frontend --region=europe-west1"
