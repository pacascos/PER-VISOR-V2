#!/bin/bash

# ====================================
# Script de Restauración de Base de Datos PER
# ====================================

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}🔄 SCRIPT DE RESTAURACIÓN DE BASE DE DATOS PER${NC}"
    echo "====================================================="
    echo ""
    echo -e "${YELLOW}Uso:${NC}"
    echo "  ./scripts/restore.sh [archivo_backup]"
    echo "  make restore FILE=archivo_backup"
    echo ""
    echo -e "${YELLOW}Ejemplos:${NC}"
    echo "  ./scripts/restore.sh backup_completo_20250916_155823.sql"
    echo "  ./scripts/restore.sh backups/backup_before_test_20250914_135048.sql"
    echo ""
    echo -e "${YELLOW}Archivos de backup disponibles:${NC}"
    if [ -d "/Users/cascos/code/PER_Cloude/backups" ]; then
        ls -la /Users/cascos/code/PER_Cloude/backups/*.sql 2>/dev/null | while read line; do
            echo "  📄 $line"
        done
    else
        echo "  ❌ No se encontró el directorio de backups"
    fi
    echo ""
}

# Verificar argumentos
if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

BACKUP_FILE="$1"
BACKUP_DIR="/Users/cascos/code/PER_Cloude/backups"

echo -e "${BLUE}🔄 RESTAURANDO BASE DE DATOS PER${NC}"
echo "====================================="

# Verificar que Docker esté corriendo
if ! docker ps | grep -q per_postgres; then
    echo -e "${RED}❌ Error: El contenedor per_postgres no está corriendo${NC}"
    echo -e "${YELLOW}💡 Inicia los servicios con: docker compose up -d${NC}"
    exit 1
fi

# Resolver ruta del archivo de backup
if [ ! -f "$BACKUP_FILE" ]; then
    # Intentar en el directorio de backups
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        echo -e "${RED}❌ Error: Archivo de backup no encontrado: $BACKUP_FILE${NC}"
        echo ""
        echo -e "${YELLOW}Archivos de backup disponibles:${NC}"
        if [ -d "$BACKUP_DIR" ]; then
            ls -la "$BACKUP_DIR"/*.sql 2>/dev/null | while read line; do
                echo "  📄 $(basename $(echo $line | awk '{print $9}'))"
            done
        fi
        exit 1
    fi
fi

echo -e "${YELLOW}📄 Archivo de backup: $(basename "$BACKUP_FILE")${NC}"
echo -e "${YELLOW}📁 Ruta completa: $BACKUP_FILE${NC}"

# Verificar que el archivo existe y no está vacío
if [ ! -s "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: El archivo de backup está vacío o no existe${NC}"
    exit 1
fi

# Verificar formato del archivo
if ! head -n 5 "$BACKUP_FILE" | grep -q "PostgreSQL database dump"; then
    echo -e "${RED}❌ Error: El archivo no parece ser un backup de PostgreSQL válido${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Archivo de backup válido${NC}"

# Mostrar información del backup
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_FILE" 2>/dev/null || stat -c "%y" "$BACKUP_FILE" 2>/dev/null | cut -d' ' -f1,2)

echo ""
echo -e "${BLUE}📋 Información del backup:${NC}"
echo "------------------------"
echo "📄 Archivo: $(basename "$BACKUP_FILE")"
echo "📊 Tamaño: $BACKUP_SIZE"
echo "🕐 Fecha: $BACKUP_DATE"

# Verificar conexión a la base de datos
echo ""
echo -e "${YELLOW}📡 Verificando conexión a PostgreSQL...${NC}"
if ! docker exec per_postgres pg_isready -U per_user -d per_exams > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: No se puede conectar a la base de datos${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión a PostgreSQL verificada${NC}"

# Crear backup de seguridad antes de restaurar
echo ""
echo -e "${YELLOW}💾 Creando backup de seguridad antes de restaurar...${NC}"
SAFETY_BACKUP="$BACKUP_DIR/safety_backup_before_restore_$(date +%Y%m%d_%H%M%S).sql"
docker exec per_postgres pg_dump -U per_user -d per_exams > "$SAFETY_BACKUP"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup de seguridad creado: $(basename "$SAFETY_BACKUP")${NC}"
else
    echo -e "${RED}❌ Error: No se pudo crear backup de seguridad${NC}"
    exit 1
fi

# Confirmación del usuario
echo ""
echo -e "${RED}⚠️ ADVERTENCIA: Esta operación reemplazará TODOS los datos actuales${NC}"
echo -e "${RED}   de la base de datos per_exams con los datos del backup.${NC}"
echo ""
echo -e "${YELLOW}¿Estás seguro de que quieres continuar? (escribe 'SI' para confirmar):${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo -e "${YELLOW}❌ Restauración cancelada por el usuario${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🚀 Iniciando restauración...${NC}"

# Restaurar la base de datos
echo -e "${YELLOW}📥 Restaurando datos desde el backup...${NC}"
cat "$BACKUP_FILE" | docker exec -i per_postgres psql -U per_user -d per_exams

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Restauración completada exitosamente!${NC}"
    
    # Verificar datos restaurados
    echo ""
    echo -e "${YELLOW}🔍 Verificando datos restaurados...${NC}"
    
    QUESTIONS_COUNT=$(docker exec per_postgres psql -U per_user -d per_exams -t -c "SELECT COUNT(*) FROM questions;" | tr -d ' ')
    USERS_COUNT=$(docker exec per_postgres psql -U per_user -d per_exams -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
    EXAMS_COUNT=$(docker exec per_postgres psql -U per_user -d per_exams -t -c "SELECT COUNT(*) FROM exams;" | tr -d ' ')
    
    echo -e "${GREEN}📚 Preguntas: $QUESTIONS_COUNT${NC}"
    echo -e "${GREEN}👤 Usuarios: $USERS_COUNT${NC}"
    echo -e "${GREEN}📝 Exámenes: $EXAMS_COUNT${NC}"
    
    echo ""
    echo -e "${BLUE}🎯 Próximos pasos:${NC}"
    echo "----------------"
    echo "🔄 Reinicia los servicios: docker compose restart"
    echo "🌐 Verifica la aplicación: http://localhost:8095"
    echo "📊 Revisa las estadísticas: http://localhost:8095/statistics-dashboard.html"
    
    echo ""
    echo -e "${GREEN}🎉 Restauración completada exitosamente!${NC}"
    
else
    echo -e "${RED}❌ Error durante la restauración${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Opciones de recuperación:${NC}"
    echo "1. Restaurar desde el backup de seguridad:"
    echo "   ./scripts/restore.sh $(basename "$SAFETY_BACKUP")"
    echo "2. Verificar logs de error en la consola"
    echo "3. Contactar soporte técnico"
    exit 1
fi
