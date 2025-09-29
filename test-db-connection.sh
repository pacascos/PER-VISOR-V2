#!/bin/bash

echo "🔍 Probando conexión a base de datos desde GitHub Actions..."

# Obtener contraseña
DB_PASSWORD=$(gcloud secrets versions access latest --secret="database-password" --project="webpersonal-189221" 2>/dev/null || echo "")
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ No se pudo obtener la contraseña"
    exit 1
fi
echo "✅ Contraseña obtenida"

# Probar conexión simple
echo "🔍 Probando conexión con gcloud sql connect..."
echo "SELECT 1;" | gcloud sql connect per-db-instance --user=per_user --database=per_exams --project=webpersonal-189221 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Conexión exitosa"
else
    echo "❌ Error de conexión"
    exit 1
fi
