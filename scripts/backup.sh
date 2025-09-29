#!/bin/bash

# ====================================
# Script de Backup Completo de Base de Datos PER
# ====================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
BACKUP_DIR="/Users/cascos/code/PER_Cloude/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_completo_$TIMESTAMP.sql"

echo -e "${BLUE}🔄 CREANDO BACKUP COMPLETO DE LA BASE DE DATOS PER${NC}"
echo "=================================================="

# Verificar que Docker esté corriendo
if ! docker ps | grep -q per_postgres; then
    echo -e "${RED}❌ Error: El contenedor per_postgres no está corriendo${NC}"
    echo -e "${YELLOW}💡 Inicia los servicios con: docker compose up -d${NC}"
    exit 1
fi

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}📁 Directorio de backup: $BACKUP_DIR${NC}"
echo -e "${YELLOW}📄 Archivo de backup: backup_completo_$TIMESTAMP.sql${NC}"
echo ""

# Verificar conexión a la base de datos
echo -e "${YELLOW}📡 Verificando conexión a PostgreSQL...${NC}"
if ! docker exec per_postgres pg_isready -U per_user -d per_exams > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: No se puede conectar a la base de datos${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión a PostgreSQL verificada${NC}"

# Mostrar información de la base de datos antes del backup
echo ""
echo -e "${YELLOW}📊 Información de la base de datos:${NC}"
echo "----------------------------------------"

# Contar preguntas
QUESTIONS_COUNT=$(docker exec per_postgres psql -U per_user -d per_exams -t -c "SELECT COUNT(*) FROM questions;" | tr -d ' ')
echo "📚 Preguntas: $QUESTIONS_COUNT"

# Contar usuarios
USERS_COUNT=$(docker exec per_postgres psql -U per_user -d per_exams -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
echo "👤 Usuarios: $USERS_COUNT"

# Contar exámenes realizados
EXAMS_COUNT=$(docker exec per_postgres psql -U per_user -d per_exams -t -c "SELECT COUNT(*) FROM exams;" | tr -d ' ')
echo "📝 Exámenes realizados: $EXAMS_COUNT"

# Tamaño de la base de datos
DB_SIZE=$(docker exec per_postgres psql -U per_user -d per_exams -t -c "SELECT pg_size_pretty(pg_database_size('per_exams'));" | tr -d ' ')
echo "💾 Tamaño de BD: $DB_SIZE"

echo ""
echo -e "${YELLOW}🚀 Iniciando backup...${NC}"

# Crear el backup
docker exec per_postgres pg_dump -U per_user -d per_exams \
    --verbose \
    --no-password \
    --format=plain \
    --encoding=UTF8 \
    --clean \
    --create \
    > "$BACKUP_FILE"

# Verificar que el backup se creó correctamente
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ Backup creado exitosamente!${NC}"
    echo -e "${GREEN}📄 Archivo: backup_completo_$TIMESTAMP.sql${NC}"
    echo -e "${GREEN}📊 Tamaño: $BACKUP_SIZE${NC}"
    echo -e "${GREEN}📁 Ubicación: $BACKUP_DIR${NC}"
    
    # Mostrar información del archivo
    echo ""
    echo -e "${BLUE}📋 Información del backup:${NC}"
    echo "------------------------"
    echo "🕐 Fecha: $(date)"
    echo "📄 Archivo: $(basename "$BACKUP_FILE")"
    echo "📊 Tamaño: $BACKUP_SIZE"
    echo "🗄️ Base de datos: per_exams"
    echo "👤 Usuario: per_user"
    
    # Mostrar primeros bytes para verificar formato
    echo ""
    echo -e "${YELLOW}🔍 Verificando contenido del backup...${NC}"
    if head -n 5 "$BACKUP_FILE" | grep -q "PostgreSQL database dump"; then
        echo -e "${GREEN}✅ Formato del backup correcto${NC}"
    else
        echo -e "${RED}⚠️ Advertencia: El formato del backup podría no ser correcto${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🎯 Comandos útiles:${NC}"
    echo "-------------------"
    echo "📥 Restaurar: ./scripts/restore.sh backup_completo_$TIMESTAMP.sql"
    echo "📋 Listar backups: ls -la $BACKUP_DIR/"
    echo "🗑️ Limpiar backups antiguos: find $BACKUP_DIR -name '*.sql' -mtime +30 -delete"
    
else
    echo -e "${RED}❌ Error creando backup${NC}"
    echo -e "${YELLOW}💡 Verifica que:${NC}"
    echo "   • El contenedor per_postgres esté corriendo"
    echo "   • Tengas permisos de escritura en $BACKUP_DIR"
    echo "   • La base de datos per_exams exista"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Backup completado exitosamente!${NC}"
