#!/bin/bash
# clean_dump_for_cloudsql.sh
# Limpia un dump de PostgreSQL para que sea compatible con Cloud SQL

set -e

if [ -z "$1" ]; then
    echo "❌ Error: Falta archivo de entrada"
    echo "Uso: $0 <archivo_dump.sql>"
    echo "Ejemplo: $0 backup_completo.sql"
    exit 1
fi

INPUT=$1
OUTPUT="${INPUT%.sql}_clean.sql"

echo "🧹 Limpiando dump para Cloud SQL..."
echo "📄 Input:  $INPUT"
echo "📄 Output: $OUTPUT"

cat "$INPUT" | \
  grep -v "^\\\\restrict" | \
  grep -v "^\\\\unrestrict" | \
  grep -v "^SET statement_timeout" | \
  grep -v "^SET lock_timeout" | \
  grep -v "^SET idle_in_transaction_session_timeout" | \
  grep -v "^SET row_security" | \
  grep -v "^SELECT pg_catalog.set_config" | \
  grep -v "^DROP DATABASE" | \
  grep -v "^CREATE DATABASE" | \
  sed 's/CREATE TRIGGER IF NOT EXISTS/DROP TRIGGER IF EXISTS/g' > "$OUTPUT"

ORIGINAL_LINES=$(wc -l < "$INPUT")
CLEAN_LINES=$(wc -l < "$OUTPUT")
REMOVED=$((ORIGINAL_LINES - CLEAN_LINES))

echo ""
echo "✅ Dump limpio creado"
echo "📊 Líneas originales: $ORIGINAL_LINES"
echo "📊 Líneas limpias:    $CLEAN_LINES"
echo "📊 Líneas removidas:  $REMOVED"
echo ""
echo "▶️  Siguiente paso:"
echo "   gsutil cp $OUTPUT gs://per-database-backups/import/"
