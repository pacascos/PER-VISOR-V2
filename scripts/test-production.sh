#!/bin/bash
# Script wrapper para ejecutar tests de producción

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🧪 Iniciando tests de producción..."
echo ""

# Verificar que playwright está instalado
if ! npx playwright --version &>/dev/null; then
    echo "⚠️  Playwright no está instalado. Instalando..."
    cd "$PROJECT_ROOT"
    npm install playwright
    npx playwright install chromium
fi

# Ejecutar tests
cd "$PROJECT_ROOT"
node scripts/test_production.js

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Todos los tests pasaron correctamente"
else
    echo ""
    echo "❌ Algunos tests fallaron. Revisa los resultados y screenshots."
fi

exit $EXIT_CODE
