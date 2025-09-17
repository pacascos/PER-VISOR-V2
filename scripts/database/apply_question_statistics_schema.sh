#!/bin/bash

# ====================================
# Script para aplicar el esquema de estadísticas de preguntas
# ====================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración de base de datos
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-per_exam_system}
DB_USER=${DB_USER:-postgres}

echo -e "${BLUE}🚀 Aplicando esquema de estadísticas de preguntas...${NC}"

# Verificar que PostgreSQL esté disponible
echo -e "${YELLOW}📡 Verificando conexión a PostgreSQL...${NC}"
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; then
    echo -e "${RED}❌ Error: No se puede conectar a PostgreSQL en $DB_HOST:$DB_PORT${NC}"
    echo -e "${YELLOW}💡 Asegúrate de que PostgreSQL esté ejecutándose y las credenciales sean correctas${NC}"
    exit 1
fi

# Crear backup antes de aplicar cambios
echo -e "${YELLOW}💾 Creando backup de seguridad...${NC}"
BACKUP_FILE="backups/backup_before_question_stats_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p backups
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > $BACKUP_FILE
echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE${NC}"

# Aplicar el esquema
echo -e "${YELLOW}📊 Aplicando esquema de estadísticas de preguntas...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/database/question_statistics_schema.sql

# Verificar que las tablas se crearon correctamente
echo -e "${YELLOW}🔍 Verificando tablas creadas...${NC}"
TABLES=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'question_global_stats',
        'question_user_stats', 
        'question_category_stats',
        'question_attempt_details',
        'question_failure_rankings'
    );
")

if [ "$TABLES" -eq 5 ]; then
    echo -e "${GREEN}✅ Todas las tablas se crearon correctamente${NC}"
else
    echo -e "${RED}❌ Error: Solo se crearon $TABLES de 5 tablas esperadas${NC}"
    exit 1
fi

# Verificar que las vistas se crearon correctamente
echo -e "${YELLOW}🔍 Verificando vistas creadas...${NC}"
VIEWS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'most_failed_questions_by_category',
        'user_question_performance',
        'category_performance_summary'
    );
")

if [ "$VIEWS" -eq 3 ]; then
    echo -e "${GREEN}✅ Todas las vistas se crearon correctamente${NC}"
else
    echo -e "${RED}❌ Error: Solo se crearon $VIEWS de 3 vistas esperadas${NC}"
    exit 1
fi

# Verificar que las funciones se crearon correctamente
echo -e "${YELLOW}🔍 Verificando funciones creadas...${NC}"
FUNCTIONS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
    SELECT COUNT(*) FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN (
        'update_question_global_stats',
        'update_question_user_stats',
        'update_failure_rankings'
    );
")

if [ "$FUNCTIONS" -eq 3 ]; then
    echo -e "${GREEN}✅ Todas las funciones se crearon correctamente${NC}"
else
    echo -e "${RED}❌ Error: Solo se crearon $FUNCTIONS de 3 funciones esperadas${NC}"
    exit 1
fi

# Mostrar resumen de tablas creadas
echo -e "${BLUE}📋 Resumen de tablas creadas:${NC}"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
        table_name as 'Tabla',
        table_type as 'Tipo'
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE 'question_%' OR table_name LIKE 'most_%' OR table_name LIKE 'user_%' OR table_name LIKE 'category_%')
    ORDER BY table_name;
"

echo -e "${GREEN}🎉 ¡Esquema de estadísticas de preguntas aplicado exitosamente!${NC}"
echo -e "${BLUE}📊 Funcionalidades disponibles:${NC}"
echo -e "   • Estadísticas globales por pregunta"
echo -e "   • Estadísticas por usuario y pregunta"
echo -e "   • Estadísticas por categoría UT"
echo -e "   • Rankings de preguntas más falladas"
echo -e "   • Registro detallado de intentos"
echo -e ""
echo -e "${YELLOW}💡 Próximos pasos:${NC}"
echo -e "   1. Implementar captura de datos en el frontend"
echo -e "   2. Crear endpoints API para consultar estadísticas"
echo -e "   3. Desarrollar interfaz de visualización"
echo -e "   4. Configurar actualización automática de rankings"
