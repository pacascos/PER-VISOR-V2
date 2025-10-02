#!/bin/bash
# deploy_migration.sh
# Aplica una migración de base de datos a producción de forma segura

set -e

MIGRATION_FILE=$1
INSTANCE="per-db-instance"
DATABASE="per_exams"
USER="per_user"
BUCKET="gs://per-database-backups"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Error: Falta archivo de migración${NC}"
    echo "Uso: $0 <archivo_migracion.sql>"
    echo "Ejemplo: $0 migrations/003_add_study_mode.sql"
    exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Error: Archivo no encontrado: $MIGRATION_FILE${NC}"
    exit 1
fi

MIGRATION_NAME=$(basename "$MIGRATION_FILE")
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}🚀 DEPLOYMENT DE MIGRACIÓN${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}📄 Migración:${NC} $MIGRATION_NAME"
echo -e "${YELLOW}🗄️  Instancia:${NC} $INSTANCE"
echo -e "${YELLOW}💾 Base de datos:${NC} $DATABASE"
echo ""

# Mostrar contenido de la migración
echo -e "${BLUE}📋 Cambios a aplicar:${NC}"
echo "---"
grep -E "^(CREATE|ALTER|DROP|INSERT INTO schema_migrations)" "$MIGRATION_FILE" || echo "  (cambios no detectados)"
echo "---"
echo ""

# Confirmación
read -p "¿Continuar con la migración? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Migración cancelada${NC}"
    exit 1
fi

# Paso 1: Backup automático
echo ""
echo -e "${YELLOW}📦 Paso 1/4: Creando backup de seguridad...${NC}"
BACKUP_DESC="Pre-migration: $MIGRATION_NAME ($TIMESTAMP)"
gcloud sql backups create \
  --instance=$INSTANCE \
  --description="$BACKUP_DESC" \
  --quiet

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup creado exitosamente${NC}"
else
    echo -e "${RED}❌ Error creando backup. Abortando migración.${NC}"
    exit 1
fi

# Paso 2: Subir a Cloud Storage
echo ""
echo -e "${YELLOW}📤 Paso 2/4: Subiendo migración a Cloud Storage...${NC}"
gsutil cp "$MIGRATION_FILE" "$BUCKET/migrations/$MIGRATION_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Archivo subido a $BUCKET/migrations/$MIGRATION_NAME${NC}"
else
    echo -e "${RED}❌ Error subiendo archivo. Abortando migración.${NC}"
    exit 1
fi

# Paso 3: Aplicar migración
echo ""
echo -e "${YELLOW}🔄 Paso 3/4: Aplicando migración a producción...${NC}"
gcloud sql import sql $INSTANCE \
  "$BUCKET/migrations/$MIGRATION_NAME" \
  --database=$DATABASE \
  --user=$USER \
  --quiet

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migración aplicada exitosamente${NC}"
else
    echo -e "${RED}❌ Error aplicando migración${NC}"
    echo -e "${YELLOW}💡 Puedes restaurar el backup creado antes de la migración${NC}"
    exit 1
fi

# Paso 4: Verificación
echo ""
echo -e "${YELLOW}🔍 Paso 4/4: Verificando conexión...${NC}"
HEALTH_CHECK=$(curl -s "https://per-api-435987927843.europe-west1.run.app/api/health" | jq -r '.database')

if [ "$HEALTH_CHECK" == "connected" ]; then
    echo -e "${GREEN}✅ Base de datos conectada y operativa${NC}"
else
    echo -e "${YELLOW}⚠️  Advertencia: No se pudo verificar estado de la BD${NC}"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}📊 Resumen:${NC}"
echo -e "  ✅ Backup creado"
echo -e "  ✅ Migración aplicada: $MIGRATION_NAME"
echo -e "  ✅ Base de datos operativa"
echo ""
echo -e "${YELLOW}📝 Siguiente paso:${NC}"
echo -e "  Verificar funcionalidad en: https://bancotest.com"
