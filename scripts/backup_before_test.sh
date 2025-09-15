#!/bin/bash
# Script para hacer backup antes de cualquier prueba en la base de datos

BACKUP_DIR="/Users/cascos/code/PER_Cloude/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_before_test_$TIMESTAMP.sql"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "🔄 Creando backup antes de pruebas..."
docker exec per_postgres pg_dump -U per_user -d per_exams > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup creado exitosamente: $BACKUP_FILE"
    echo "📊 Tamaño: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "❌ Error creando backup"
    exit 1
fi